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

// Connection manager state
let connectionStatus = ConnectionStatus.CONNECTED;
let reconnectionInProgress = false;
let lastActiveTime = Date.now();
let isInitialized = false;

/**
 * Initialize the connection manager
 * Should be called during app initialization
 */
export function initConnectionManager() {
  if (isInitialized) return;
  
  if (typeof window !== 'undefined') {
    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
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
  
  try {
    reconnectionInProgress = true;
    
    // Signal reconnection has started
    connectionStatus = ConnectionStatus.RECONNECTING;
    eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
    
    // Check if we were inactive long enough to warrant reconnection
    const now = Date.now();
    const inactivityTime = now - lastActiveTime;
    console.log(`App was inactive for ${inactivityTime / 1000} seconds`);
    
    // For any inactivity, ensure session is valid before allowing data fetching
    
    // Step 1: Verify and refresh auth session
    connectionStatus = ConnectionStatus.AUTHENTICATING;
    eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('No active session found');
      connectionStatus = ConnectionStatus.DISCONNECTED;
      eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
      return;
    }
    
    // If inactive for more than 10 seconds, do a full reconnection
    if (inactivityTime > 10000) {
      console.log('Long inactivity detected, performing full session refresh');
      
      // Refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        connectionStatus = ConnectionStatus.ERROR;
        eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
        return;
      }
    }
    
    // Step 2: Reconnect realtime
    try {
      // Disconnect and reconnect to reset the connection
      await supabase.realtime.disconnect();
      await new Promise(resolve => setTimeout(resolve, 300));
      await supabase.realtime.connect();
    } catch (e) {
      console.warn('Error during realtime reconnect:', e);
      // Continue despite errors - realtime isn't critical for all operations
    }
    
    // Step 3: Verify connection with a test query
    try {
      const { error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('Connection test failed:', testError);
        connectionStatus = ConnectionStatus.ERROR;
        eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
        return;
      }
    } catch (e) {
      console.error('Error during connection test:', e);
      connectionStatus = ConnectionStatus.ERROR;
      eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
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
  } catch (error) {
    console.error('Critical error during connection recovery:', error);
    connectionStatus = ConnectionStatus.ERROR;
    eventBus.publish(EVENTS.CONNECTION_STATUS_CHANGED, { status: connectionStatus });
  } finally {
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
  if (typeof window !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  
  isInitialized = false;
} 