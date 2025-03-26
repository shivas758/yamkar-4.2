import { Capacitor } from '@capacitor/core';
import { Geolocation, Position, PermissionStatus, GeolocationPluginPermissions } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

// Constants
const LOCATION_TRACKING_ENABLED = 'location_tracking_enabled';
const LAST_LOCATION_UPDATE = 'last_location_update';
const ATTENDANCE_LOG_ID = 'attendance_log_id';

// Configuration for background location
interface BackgroundLocationConfig {
  // Time in milliseconds between location updates
  updateInterval: number;
  // Distance in meters before triggering a location update
  distanceFilter: number;
  // If true, will use high accuracy (GPS) instead of network provider
  enableHighAccuracy: boolean;
  // API endpoint to send location updates to
  apiEndpoint: string;
  // If true, displays notification while tracking in background (Android)
  showNotification: boolean;
  // Notification title (Android)
  notificationTitle: string;
  // Notification text (Android)
  notificationText: string;
}

// Default configuration
const defaultConfig: BackgroundLocationConfig = {
  updateInterval: 120000, // 2 minutes
  distanceFilter: 10, // 10 meters
  enableHighAccuracy: true,
  apiEndpoint: '/api/employee/location/update',
  showNotification: true,
  notificationTitle: 'Location Tracking',
  notificationText: 'Your location is being tracked'
};

// Track watch ID for cleanup
let watchId: string | null = null;
// Store user config
let userConfig: BackgroundLocationConfig = { ...defaultConfig };
// Track active status
let isTracking = false;
// Reference to attendance log ID
let currentAttendanceLogId: string | null = null;

/**
 * Background location service for Capacitor
 */
class BackgroundLocationService {
  // Initialization
  async initialize(config: Partial<BackgroundLocationConfig> = {}) {
    // Merge default config with user config
    userConfig = { ...defaultConfig, ...config };
    
    // Check if we're running in native context
    const isNative = Capacitor.isNativePlatform();
    
    // Retrieve stored tracking state
    const { value: trackingValue } = await Preferences.get({ key: LOCATION_TRACKING_ENABLED });
    isTracking = trackingValue === 'true';
    
    // Retrieve stored attendance log ID
    const { value: attendanceLogIdValue } = await Preferences.get({ key: ATTENDANCE_LOG_ID });
    if (attendanceLogIdValue) {
      currentAttendanceLogId = attendanceLogIdValue;
    }
    
    // Set up app state listeners for native platforms
    if (isNative) {
      // Resume tracking when app comes to foreground if it was previously enabled
      App.addListener('appStateChange', async ({ isActive }) => {
        if (isActive && isTracking && !watchId) {
          console.log('App returned to foreground, resuming location tracking');
          await this.startTracking(currentAttendanceLogId);
        }
      });
    }
    
    // If tracking was previously enabled, restart it
    if (isTracking && currentAttendanceLogId) {
      await this.startTracking(currentAttendanceLogId);
    }
    
    return isNative;
  }
  
  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<PermissionStatus> {
    // Request both foreground and background permissions on native platforms
    if (Capacitor.isNativePlatform()) {
      const permissions: GeolocationPluginPermissions = {
        permissions: ['location', 'coarseLocation']
      };
      
      // For Android, we need to specifically request background location
      if (Capacitor.getPlatform() === 'android') {
        permissions.permissions.push('backgroundLocation');
      }
      
      return await Geolocation.requestPermissions(permissions);
    }
    
    // For web, just request regular permissions
    return await Geolocation.requestPermissions();
  }
  
  /**
   * Check if location permissions are granted
   */
  async checkPermissions(): Promise<PermissionStatus> {
    return await Geolocation.checkPermissions();
  }
  
  /**
   * Start location tracking with the given attendance log ID
   */
  async startTracking(attendanceLogId: string | null): Promise<boolean> {
    if (!attendanceLogId) {
      console.error('No attendance log ID provided');
      return false;
    }
    
    // Store attendance log ID
    currentAttendanceLogId = attendanceLogId;
    await Preferences.set({ key: ATTENDANCE_LOG_ID, value: attendanceLogId });
    
    // Check permissions first
    const permissionStatus = await this.checkPermissions();
    if (permissionStatus.location !== 'granted') {
      console.error('Location permission not granted');
      return false;
    }
    
    // Clear any existing watch
    await this.stopTracking();
    
    try {
      // Options for watchPosition based on config
      const options = {
        enableHighAccuracy: userConfig.enableHighAccuracy,
        timeout: 10000,
        maximumAge: 0
      };
      
      // Start watching position
      watchId = await Geolocation.watchPosition(options, async (position: Position | null) => {
        if (!position) {
          console.error('Received null position');
          return;
        }
        
        try {
          // Send location to server
          await this.sendLocationToServer({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            attendanceLogId: currentAttendanceLogId as string
          });
          
          // Store last update time
          await Preferences.set({
            key: LAST_LOCATION_UPDATE,
            value: JSON.stringify({
              time: Date.now(),
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            })
          });
        } catch (error) {
          console.error('Error sending location:', error);
        }
      });
      
      // Update tracking state
      isTracking = true;
      await Preferences.set({ key: LOCATION_TRACKING_ENABLED, value: 'true' });
      
      console.log('Location tracking started with watchId:', watchId);
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }
  
  /**
   * Stop location tracking
   */
  async stopTracking(): Promise<void> {
    if (watchId) {
      await Geolocation.clearWatch({ id: watchId });
      watchId = null;
    }
    
    isTracking = false;
    await Preferences.set({ key: LOCATION_TRACKING_ENABLED, value: 'false' });
    console.log('Location tracking stopped');
  }
  
  /**
   * Get current tracking status
   */
  async getTrackingStatus(): Promise<{
    isTracking: boolean;
    lastUpdate: any;
    attendanceLogId: string | null;
  }> {
    const { value: lastUpdateValue } = await Preferences.get({ key: LAST_LOCATION_UPDATE });
    
    return {
      isTracking,
      lastUpdate: lastUpdateValue ? JSON.parse(lastUpdateValue) : null,
      attendanceLogId: currentAttendanceLogId
    };
  }
  
  /**
   * Get single current location
   */
  async getCurrentPosition(): Promise<Position> {
    return await Geolocation.getCurrentPosition({
      enableHighAccuracy: userConfig.enableHighAccuracy,
      timeout: 10000,
      maximumAge: 0
    });
  }
  
  /**
   * Send location to server
   */
  async sendLocationToServer(data: {
    latitude: number;
    longitude: number;
    attendanceLogId: string;
  }): Promise<any> {
    try {
      // Get authentication token (implement according to your auth system)
      const authToken = await this.getAuthToken();
      
      // Send location to server
      const response = await fetch(userConfig.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending location to server:', error);
      // Store failed updates to retry later
      await this.storeFailedUpdate(data);
      throw error;
    }
  }
  
  /**
   * Store failed update to retry later
   */
  private async storeFailedUpdate(data: any): Promise<void> {
    try {
      // Get existing failed updates
      const { value } = await Preferences.get({ key: 'failed_location_updates' });
      const failedUpdates = value ? JSON.parse(value) : [];
      
      // Add new failed update with timestamp
      failedUpdates.push({
        ...data,
        timestamp: Date.now()
      });
      
      // Store back to preferences (limit to 50 entries to avoid storage issues)
      await Preferences.set({
        key: 'failed_location_updates',
        value: JSON.stringify(failedUpdates.slice(-50))
      });
    } catch (error) {
      console.error('Error storing failed update:', error);
    }
  }
  
  /**
   * Retry failed updates
   */
  async retryFailedUpdates(): Promise<number> {
    try {
      // Get failed updates
      const { value } = await Preferences.get({ key: 'failed_location_updates' });
      if (!value) return 0;
      
      const failedUpdates = JSON.parse(value);
      if (failedUpdates.length === 0) return 0;
      
      console.log(`Retrying ${failedUpdates.length} failed location updates`);
      
      // Try to send each failed update
      const results = await Promise.allSettled(
        failedUpdates.map(update => this.sendLocationToServer(update))
      );
      
      // Filter out successful updates
      const remainingFailures = failedUpdates.filter((_, index) => {
        return results[index].status === 'rejected';
      });
      
      // Store remaining failures
      await Preferences.set({
        key: 'failed_location_updates',
        value: JSON.stringify(remainingFailures)
      });
      
      return failedUpdates.length - remainingFailures.length;
    } catch (error) {
      console.error('Error retrying failed updates:', error);
      return 0;
    }
  }
  
  /**
   * Get authentication token from secure storage
   */
  private async getAuthToken(): Promise<string> {
    try {
      // Get token from secure storage
      const { value } = await Preferences.get({ key: 'auth_token' });
      if (!value) {
        throw new Error('No authentication token found');
      }
      return value;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }
}

// Create singleton instance
const backgroundLocationService = new BackgroundLocationService();

export default backgroundLocationService;
