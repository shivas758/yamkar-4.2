import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from "@/lib/supabaseClient";

// Constants
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_DATA_KEY = 'auth_user_data';
const SESSION_EXPIRY_KEY = 'auth_session_expiry';
const LAST_ACTIVE_TIME_KEY = 'auth_last_active_time';

/**
 * Authentication service for Capacitor integration
 * Handles token storage and session management
 */
class CapacitorAuthService {
  private refreshInterval: any = null;
  private appStateChangeListener: any = null;

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
   * Store the auth session in secure storage
   */
  async storeSession(session: any) {
    if (!session) {
      console.error('No session to store');
      return false;
    }
    
    try {
      // Store access token
      await Preferences.set({
        key: AUTH_TOKEN_KEY,
        value: session.access_token
      });
      
      // Store refresh token if available
      if (session.refresh_token) {
        await Preferences.set({
          key: REFRESH_TOKEN_KEY,
          value: session.refresh_token
        });
      }
      
      // Store expiry timestamp
      if (session.expires_at) {
        await Preferences.set({
          key: SESSION_EXPIRY_KEY,
          value: session.expires_at.toString()
        });
      }
      
      // Store user data if available
      if (session.user) {
        await Preferences.set({
          key: USER_DATA_KEY,
          value: JSON.stringify(session.user)
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error storing auth session:', error);
      return false;
    }
  }
  
  /**
   * Get the stored auth token
   */
  async getAuthToken(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
      return value;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }
  
  /**
   * Get the current user from storage
   */
  async getCurrentUser(): Promise<any | null> {
    try {
      const { value } = await Preferences.get({ key: USER_DATA_KEY });
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
  
  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token && !(await this.isSessionExpired());
  }
  
  /**
   * Check if the session is expired
   */
  async isSessionExpired(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: SESSION_EXPIRY_KEY });
      if (!value) return true;
      
      const expiryTime = parseInt(value, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Session is expired if the current time is past the expiry time
      return currentTime >= expiryTime;
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return true; // Assume expired if error
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
    
    // Listen for app state changes
    this.appStateChangeListener = App.addListener('appStateChange', async ({ isActive }) => {
      console.log(`App state changed: ${isActive ? 'active' : 'inactive'}`);
      
      if (isActive) {
        console.log('App resumed, checking session status');
        
        // Check if we were inactive for a significant period (more than 1 minute)
        const wasInactiveTooLong = await this.checkInactivityPeriod();
        
        if (wasInactiveTooLong) {
          console.log('App was inactive for too long, refreshing session');
          // Force a session refresh when coming back from long inactivity
          const refreshed = await this.refreshToken();
          if (!refreshed) {
            // If refresh failed, try to restore session from storage
            await this.restoreSession();
          }
        } else {
          // For shorter inactivity periods, just ensure the session is valid
          const isExpired = await this.isSessionExpired();
          if (isExpired) {
            console.log('Session expired, refreshing token');
            await this.refreshToken();
          } else {
            // Even if not expired, ensure the client has the correct session
            await this.ensureClientSession();
          }
        }
        
        // Update the last active time
        await this.updateLastActiveTime();
      }
    });
  }

  /**
   * Ensures the Supabase client has the correct session
   * This helps fix issues after screen lock/unlock
   */
  private async ensureClientSession(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      const refreshToken = (await Preferences.get({ key: REFRESH_TOKEN_KEY })).value || '';
      
      if (!token || !refreshToken) return false;
      
      // Re-set the session in the client
      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('Error ensuring client session:', error);
        return false;
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
      
      // If inactive for more than 1 minute (60000ms), consider it a "long" inactivity
      return inactivityPeriod > 60000;
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
      
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }

  /**
   * Cleans up resources when the service is no longer needed
   */
  cleanup() {
    // Clear any refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Remove app state listener
    if (this.appStateChangeListener) {
      this.appStateChangeListener.remove();
      this.appStateChangeListener = null;
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
      } catch (error) {
        console.error('Error in token refresh check:', error);
      }
    }, 60000); // Check every minute
  }
}

// Create a singleton instance
const capacitorAuthService = new CapacitorAuthService();
export default capacitorAuthService;
