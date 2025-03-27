import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from "@/lib/supabaseClient";
import { forceReconnectSupabase } from "@/lib/supabaseClient";
import { eventBus, EVENTS } from "@/lib/eventBus";
import { initConnectionManager } from "@/lib/connectionManager";

// Constants
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_DATA_KEY = 'auth_user_data';
const SESSION_EXPIRY_KEY = 'auth_session_expiry';
const LAST_ACTIVE_TIME_KEY = 'auth_last_active_time';
const RECOVERY_IN_PROGRESS_KEY = 'auth_recovery_in_progress';

/**
 * Authentication service for Capacitor integration
 * Handles token storage and session management
 */
class CapacitorAuthService {
  private refreshInterval: any = null;
  private appStateChangeListener: any = null;
  private recoveryInProgress: boolean = false;
  private visibilityChangeListener: any = null;

  /**
   * Initialize the auth service
   */
  async initialize() {
    // Check if we're running in a native context
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // For native platforms, try to restore the session on init
      await this.restoreSession();
      
      // Set up refresh timer if needed
      this.setupTokenRefresh();
      
      // Set up app state change listener to handle resume events
      this.setupAppStateListener();
      
      // Update the last active timestamp
      await this.updateLastActiveTime();
    }
    
    return isNative;
  }

  /**
   * Check if a user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return Boolean(token);
  }

  /**
   * Get the stored auth token
   */
  async getAuthToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
    return value;
  }

  /**
   * Get the stored user data
   */
  async getUserData(): Promise<any | null> {
    try {
      const { value } = await Preferences.get({ key: USER_DATA_KEY });
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Store a session
   */
  private async storeSession(session: any): Promise<void> {
    try {
      // Store the auth token
      await Preferences.set({
        key: AUTH_TOKEN_KEY,
        value: session.access_token
      });
      
      // Store the refresh token
      await Preferences.set({
        key: REFRESH_TOKEN_KEY,
        value: session.refresh_token
      });
      
      // Store the session expiry time (convert to timestamp)
      const expiryTime = Math.floor(new Date(session.expires_at).getTime() / 1000);
      await Preferences.set({
        key: SESSION_EXPIRY_KEY,
        value: expiryTime.toString()
      });
      
      // Store the user data if available
      if (session.user) {
        await Preferences.set({
          key: USER_DATA_KEY,
          value: JSON.stringify(session.user)
        });
      }
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  /**
   * Check if the current session is expired
   */
  async isSessionExpired(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: SESSION_EXPIRY_KEY });
      if (!value) return true;
      
      const expiryTime = parseInt(value, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      
      return currentTime >= expiryTime;
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return true;
    }
  }
  
  /**
   * Restore a session from storage
   */
  async restoreSession(): Promise<boolean> {
    try {
      // Check if we have a stored token
      const token = await this.getAuthToken();
      if (!token) return false;
      
      // Check if session is expired
      if (await this.isSessionExpired()) {
        // Try to refresh the token
        return await this.refreshToken();
      }
      
      // Set the token in supabase client
      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: (await Preferences.get({ key: REFRESH_TOKEN_KEY })).value || ''
      });
      
      if (error) {
        console.error('Error restoring session:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error restoring session:', error);
      return false;
    }
  }
  
  /**
   * Refresh the auth token
   */
  async refreshToken(): Promise<boolean> {
    try {
      // Get the refresh token
      const { value: refreshToken } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
      if (!refreshToken) {
        console.error('No refresh token available');
        return false;
      }
      
      // Refresh the session
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });
      
      if (error || !data.session) {
        console.error('Error refreshing token:', error);
        return false;
      }
      
      // Store the new session
      await this.storeSession(data.session);
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }
  
  /**
   * Sets up a listener for app state changes to handle resume events
   */
  private setupAppStateListener() {
    if (this.appStateChangeListener) {
      // Remove any existing listener
      this.appStateChangeListener.remove();
    }
    
    // Listen for app state changes (for native mobile apps)
    this.appStateChangeListener = App.addListener('appStateChange', async ({ isActive }) => {
      console.log(`App state changed: ${isActive ? 'active' : 'inactive'}`);
      
      if (isActive) {
        console.log('App resumed, checking session status');
        
        // Check if there's already a recovery in progress
        if (this.recoveryInProgress) {
          console.log('Recovery already in progress, skipping');
          return;
        }
        
        // Set flag to prevent concurrent recovery attempts
        this.recoveryInProgress = true;
        
        try {
          // For native apps, we'll focus on session tokens and let the connection manager handle reconnection
          const isExpired = await this.isSessionExpired();
          if (isExpired) {
            console.log('Session expired, refreshing token');
            await this.refreshToken();
          } else {
            await this.ensureClientSession();
          }
          
          // Now let the central connection manager handle the reconnection
          await forceReconnectSupabase();
        } catch (error) {
          console.error('Error during app resume session recovery:', error);
        } finally {
          await this.updateLastActiveTime();
          this.recoveryInProgress = false;
        }
      } else {
        // App going inactive - store the current time
        await this.updateLastActiveTime();
      }
    });
    
    // For browser visibility changes, we'll delegate to the connection manager
    // Initialize the connection manager
    if (typeof document !== 'undefined') {
      // Remove any existing visibility change listener
      if (this.visibilityChangeListener) {
        document.removeEventListener('visibilitychange', this.visibilityChangeListener);
        this.visibilityChangeListener = null;
      }
      
      // Let the central connection manager handle visibility changes
      initConnectionManager('capacitorAuthService.ts');
    }
  }

  /**
   * Performs a full session recovery, reconnecting all Supabase services
   * This is more thorough than just refreshing the token and is used
   * after long periods of inactivity
   */
  private async performFullSessionRecovery(): Promise<boolean> {
    console.log('Starting full session recovery process');
    
    try {
      // Step 1: Try to refresh the token
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        console.warn('Token refresh failed during full recovery');
        // Still proceed, as we'll try to use the existing token below
      }
      
      // Step 2: Get the current auth token and refresh token
      const token = await this.getAuthToken();
      const { value: refreshToken } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
      
      if (!token) {
        console.error('No auth token available for recovery');
        return false;
      }
      
      // Step 3: Force reconnect all Supabase services
      
      // First, force set the session in the client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken || ''
      });
      
      if (sessionError) {
        console.error('Error setting session during recovery:', sessionError);
        return false;
      }
      
      // Step 4: Reconnect realtime subscriptions if available
      try {
        // Disconnect and reconnect realtime to reset all subscriptions
        if (supabase.realtime) {
          await supabase.realtime.disconnect();
          // Small delay to ensure clean disconnect
          await new Promise(resolve => setTimeout(resolve, 300));
          await supabase.realtime.connect();
        }
      } catch (realtimeError) {
        console.error('Error reconnecting realtime services:', realtimeError);
        // Non-fatal, continue with recovery
      }
      
      // Step 5: Verify recovery by making a simple query
      try {
        // Test with a simple query
        const { error: testError } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        if (testError) {
          console.warn('Session recovery verification failed:', testError);
          // If this basic test fails, our session might still have issues
          return false;
        }
      } catch (testError) {
        console.error('Error testing recovered session:', testError);
        return false;
      }
      
      console.log('Full session recovery completed successfully');
      return true;
    } catch (error) {
      console.error('Critical error during full session recovery:', error);
      return false;
    }
  }

  /**
   * Ensures the Supabase client has the correct session
   * This helps fix issues after screen lock/unlock
   */
  private async ensureClientSession(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      const refreshToken = (await Preferences.get({ key: REFRESH_TOKEN_KEY })).value || '';
      
      if (!token || !refreshToken) {
        console.log('No tokens found, attempting full session recovery');
        return await this.performFullSessionRecovery();
      }
      
      // Re-set the session in the client
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('Error ensuring client session:', error);
        return false;
      }
      
      // Store any new tokens that might have been returned
      if (data?.session?.refresh_token && data.session.refresh_token !== refreshToken) {
        console.log('New refresh token received, updating storage');
        await Preferences.set({
          key: REFRESH_TOKEN_KEY,
          value: data.session.refresh_token
        });
        
        // Also update the auth token if provided
        if (data.session.access_token) {
          await Preferences.set({
            key: AUTH_TOKEN_KEY,
            value: data.session.access_token
          });
        }
      }
      
      // Also verify the session with a simple query
      try {
        const { error: testError } = await supabase
          .from('users')
          .select('id')
          .limit(1);
          
        if (testError) {
          console.warn('Session verification failed after ensuring client session:', testError);
          // If verification fails, we might need more thorough recovery
          return await this.performFullSessionRecovery();
        }
      } catch (testError) {
        console.error('Error testing session after ensure:', testError);
      }
      
      return true;
    } catch (error) {
      console.error('Error ensuring client session:', error);
      return false;
    }
  }

  /**
   * Check if the app was inactive for too long
   */
  private async checkInactivityPeriod(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: LAST_ACTIVE_TIME_KEY });
      if (!value) return true;
      
      const lastActiveTime = parseInt(value, 10);
      const currentTime = Date.now();
      const inactivityPeriod = currentTime - lastActiveTime;
      
      // If inactive for more than 30 seconds, consider it a "long" inactivity
      // Reduced from 60s to 30s to be more aggressive with session recovery
      return inactivityPeriod > 30000;
    } catch (error) {
      console.error('Error checking inactivity period:', error);
      return true; // Assume long inactivity on error
    }
  }

  /**
   * Update the last active time
   */
  private async updateLastActiveTime(): Promise<void> {
    try {
      const currentTime = Date.now();
      await Preferences.set({
        key: LAST_ACTIVE_TIME_KEY,
        value: currentTime.toString()
      });
    } catch (error) {
      console.error('Error updating last active time:', error);
    }
  }
  
  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string): Promise<{
    success: boolean;
    error?: string;
    user?: any;
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      // Store the session
      await this.storeSession(data.session);
      
      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Sign out the current user
   */
  async signOut(): Promise<boolean> {
    try {
      // Sign out from supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Clear stored tokens
      await Preferences.remove({ key: AUTH_TOKEN_KEY });
      await Preferences.remove({ key: REFRESH_TOKEN_KEY });
      await Preferences.remove({ key: USER_DATA_KEY });
      await Preferences.remove({ key: SESSION_EXPIRY_KEY });
      await Preferences.remove({ key: LAST_ACTIVE_TIME_KEY });
      await Preferences.remove({ key: RECOVERY_IN_PROGRESS_KEY });
      
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }

  /**
   * Clean up all listeners and intervals
   */
  cleanup() {
    // Remove app state change listener
    if (this.appStateChangeListener) {
      this.appStateChangeListener.remove();
      this.appStateChangeListener = null;
    }
    
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Remove visibility change listener
    if (typeof document !== 'undefined' && this.visibilityChangeListener) {
      document.removeEventListener('visibilitychange', this.visibilityChangeListener);
      this.visibilityChangeListener = null;
    }
  }

  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Schedule token refresh check
    this.refreshInterval = setInterval(async () => {
      try {
        // Skip refresh if recovery is in progress
        if (this.recoveryInProgress) {
          console.log('Skipping scheduled token refresh - recovery in progress');
          return;
        }

        // Check if token needs refresh (if it expires in less than 5 minutes)
        const { value } = await Preferences.get({ key: SESSION_EXPIRY_KEY });
        if (!value) return;
        
        const expiryTime = parseInt(value, 10);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiryTime - currentTime;
        
        // If token expires in less than 5 minutes, refresh it
        if (timeUntilExpiry > 0 && timeUntilExpiry < 300) {
          console.log('Token expiring soon, refreshing');
          await this.refreshToken();
        }
        
        // Periodically ensure client session even if not expiring soon
        // This adds an extra layer of protection against dropped connections
        if (Math.random() < 0.2) { // 20% chance each minute
          await this.ensureClientSession();
        }
      } catch (error) {
        console.error('Error in token refresh check:', error);
      }
    }, 60000); // Check every minute
  }
}

// Create a singleton instance
const capacitorAuthService = new CapacitorAuthService();
export default capacitorAuthService;
