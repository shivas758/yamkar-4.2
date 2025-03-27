"use client";

import { supabase } from './supabaseClient';
import { eventBus, EVENTS } from './eventBus';

// Connection status enum
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  AUTHENTICATING = 'authenticating',
  READY = 'ready',
  ERROR = 'error'
}

// Global singleton state
let connectionStatus = ConnectionStatus.CONNECTED;
let reconnectionInProgress = false;
let lastActiveTime = Date.now();
let isInitialized = false;
let visibilityChangeListener: ((event: Event) => void) | null = null;
let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize the connection manager
 * Should be called during app initialization
 */
export function initConnectionManager(source: string = 'unknown') {
  // Prevent multiple initialization
  if (isInitialized) {
    console.log(`Connection manager already initialized, skipping (requested by: ${source})`);
    return;
  }
  
  console.log(`Connection manager being initialized by: ${source}`);
  
  if (typeof window !== 'undefined') {
    // Remove any existing listeners just in case
    if (visibilityChangeListener) {
      document.removeEventListener('visibilitychange', visibilityChangeListener);
    }
    
    // Create a new listener
    visibilityChangeListener = (event) => handleVisibilityChange();
    
    // Set up visibility change listener
    document.addEventListener('visibilitychange', visibilityChangeListener);
    
    // Mark as initialized
    isInitialized = true;
    console.log('Connection manager initialized');
  }
}

/**
 * Handles visibility change events
 * This is the core function that manages reconnection when the app becomes visible
 */
async function handleVisibilityChange() {
  // Only process when document becomes visible
  if (document.visibilityState !== 'visible') {
    lastActiveTime = Date.now();
    return;
  }
  
  console.log('Tab became visible, connection manager handling reconnection');
  
  // Prevent concurrent reconnection
  if (reconnectionInProgress) {
    console.log('Reconnection already in progress, skipping');
    return;
  }
  
  // Clear any existing timeout
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
  
  try {
    reconnectionInProgress = true;
    
    // Set a timeout to prevent hanging in reconnection state
    reconnectTimeoutId = setTimeout(() => {
      console.error('Reconnection timed out after 10 seconds');
      connectionStatus = ConnectionStatus.ERROR;
      eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
      reconnectionInProgress = false;
      reconnectTimeoutId = null;
    }, 10000); // 10 second timeout
    
    // Signal reconnection has started
    connectionStatus = ConnectionStatus.RECONNECTING;
    eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
    
    // Check if we were inactive long enough to warrant reconnection
    const now = Date.now();
    const inactivityTime = now - lastActiveTime;
    console.log(`App was inactive for ${inactivityTime / 1000} seconds`);
    
    // Step 1: Verify and refresh auth session
    connectionStatus = ConnectionStatus.AUTHENTICATING;
    eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
    
    // Get the current session with a timeout
    const sessionPromise = Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Session check timed out')), 5000))
    ]);
    
    try {
      const { data: { session } } = await sessionPromise as any;
      
      if (!session) {
        console.log('No active session found');
        connectionStatus = ConnectionStatus.DISCONNECTED;
        eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
        
        // Clear the timeout
        if (reconnectTimeoutId) {
          clearTimeout(reconnectTimeoutId);
          reconnectTimeoutId = null;
        }
        
        reconnectionInProgress = false;
        return;
      }
      
      console.log('Session found, verifying connection');
      
      // If inactive for more than 10 seconds, do a full reconnection
      if (inactivityTime > 10000) {
        console.log('Long inactivity detected, performing full session refresh');
        
        // Refresh the session with a timeout
        const refreshPromise = Promise.race([
          supabase.auth.refreshSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Session refresh timed out')), 5000))
        ]);
        
        try {
          const { data, error } = await refreshPromise as any;
          
          if (error) {
            console.error('Error refreshing session:', error);
            connectionStatus = ConnectionStatus.ERROR;
            eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
            
            // Clear the timeout
            if (reconnectTimeoutId) {
              clearTimeout(reconnectTimeoutId);
              reconnectTimeoutId = null;
            }
            
            reconnectionInProgress = false;
            return;
          }
          
          console.log('Session refreshed successfully');
        } catch (refreshError) {
          console.error('Session refresh timed out or failed:', refreshError);
          // Continue anyway - we'll try to use the existing session
        }
      }
      
      // Step 2: Reconnect realtime
      try {
        console.log('Reconnecting realtime...');
        // Disconnect and reconnect to reset the connection
        await supabase.realtime.disconnect();
        await new Promise(resolve => setTimeout(resolve, 300));
        await supabase.realtime.connect();
        console.log('Realtime reconnected');
      } catch (e) {
        console.warn('Error during realtime reconnect:', e);
        // Continue despite errors - realtime isn't critical for all operations
      }
      
      // Step 3: Verify connection with a test query
      try {
        console.log('Testing connection with a query...');
        const queryPromise = Promise.race([
          supabase.from('users').select('id').limit(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timed out')), 5000))
        ]);
        
        const { error: testError } = await queryPromise as any;
          
        if (testError) {
          console.error('Connection test failed:', testError);
          connectionStatus = ConnectionStatus.ERROR;
          eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
          
          // Clear the timeout
          if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
          }
          
          reconnectionInProgress = false;
          return;
        }
      } catch (e) {
        console.error('Error during connection test:', e);
        connectionStatus = ConnectionStatus.ERROR;
        eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
        
        // Clear the timeout
        if (reconnectTimeoutId) {
          clearTimeout(reconnectTimeoutId);
          reconnectTimeoutId = null;
        }
        
        reconnectionInProgress = false;
        return;
      }
      
      // All checks passed - connection is ready!
      connectionStatus = ConnectionStatus.READY;
      console.log('Connection fully restored, ready for data fetching');
      
      // Notify all listeners that it's safe to fetch data
      eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
      eventBus.publish(EVENTS.CONNECTION_RESTORED);
      eventBus.publish(EVENTS.DATA_REFRESH_NEEDED);
      
      // Update last active time
      lastActiveTime = Date.now();
    } catch (sessionError) {
      console.error('Session check timed out or failed:', sessionError);
      connectionStatus = ConnectionStatus.ERROR;
      eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
    }
  } catch (error) {
    console.error('Critical error during connection recovery:', error);
    connectionStatus = ConnectionStatus.ERROR;
    eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
  } finally {
    // Clear the timeout
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
    
    reconnectionInProgress = false;
  }
}

/**
 * Get the current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

/**
 * Force a connection refresh
 */
export async function forceConnectionRefresh(): Promise<boolean> {
  if (reconnectionInProgress) {
    console.log('Reconnection already in progress, skipping forced refresh');
    return false;
  }
  
  try {
    // Simulate a visibility change to trigger reconnection
    await handleVisibilityChange();
    return connectionStatus === ConnectionStatus.READY;
  } catch (e) {
    console.error('Error during forced connection refresh:', e);
    return false;
  }
}

/**
 * Clean up the connection manager
 */
export function cleanupConnectionManager() {
  if (typeof window !== 'undefined' && visibilityChangeListener) {
    document.removeEventListener('visibilitychange', visibilityChangeListener);
    visibilityChangeListener = null;
  }
  
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
  
  isInitialized = false;
} 