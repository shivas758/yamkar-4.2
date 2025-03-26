"use client";

import { useState, useEffect, useRef } from "react";
import { Capacitor } from '@capacitor/core';
import backgroundLocationService from "@/lib/capacitor/backgroundLocationService";
import { toast } from "sonner";

interface LocationTrackerProps {
  attendanceLogId: string;
  interval?: number; // Time in milliseconds between location updates
}

export default function CapacitorLocationTracker({ 
  attendanceLogId, 
  interval = 120000 // Default to 2 minutes (120,000 ms)
}: LocationTrackerProps) {
  // State
  const [isNative, setIsNative] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Web fallback refs (used when running in browser)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  
  // Initialize the tracker based on platform
  useEffect(() => {
    const initializeTracker = async () => {
      try {
        // Initialize the background location service
        const isNativePlatform = await backgroundLocationService.initialize({
          updateInterval: interval,
          distanceFilter: 10 // 10 meters
        });
        
        setIsNative(isNativePlatform);
        
        // Check if we have permission
        const permissions = await backgroundLocationService.checkPermissions();
        setHasPermission(permissions.location === 'granted');
        
        // Get tracking status
        const status = await backgroundLocationService.getTrackingStatus();
        setIsTracking(status.isTracking);
        
        // Set last update time if available
        if (status.lastUpdate) {
          const date = new Date(status.lastUpdate.time);
          setLastUpdateTime(date.toLocaleTimeString([], { 
            hour: "2-digit", 
            minute: "2-digit" 
          }));
        }
        
        setIsInitialized(true);
        
        // If we're on a native platform and have a different attendance log ID,
        // restart tracking with the new ID
        if (isNativePlatform && status.isTracking && status.attendanceLogId !== attendanceLogId) {
          console.log('Attendance log ID changed, restarting tracking');
          await startTracking();
        }
      } catch (err) {
        console.error('Error initializing location tracker:', err);
        setError(`Initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    
    initializeTracker();
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [attendanceLogId]);
  
  // Start tracking when component mounts or attendance log ID changes
  useEffect(() => {
    if (isInitialized && attendanceLogId) {
      // Don't auto-start if there was an error or no permission
      if (error || hasPermission === false) {
        return;
      }
      
      // Start tracking
      startTracking();
    }
  }, [isInitialized, attendanceLogId]);
  
  // Function to start location tracking
  const startTracking = async () => {
    if (!attendanceLogId) {
      setError('No attendance log ID provided');
      return;
    }
    
    try {
      setError(null);
      
      // Request permissions if we don't have them yet
      if (hasPermission !== true) {
        const permissions = await backgroundLocationService.requestPermissions();
        const granted = permissions.location === 'granted';
        setHasPermission(granted);
        
        if (!granted) {
          setError('Location permission denied');
          return;
        }
      }
      
      if (isNative) {
        // Use Capacitor for native platforms
        const success = await backgroundLocationService.startTracking(attendanceLogId);
        setIsTracking(success);
        
        if (success) {
          toast.success('Location tracking started');
        } else {
          setError('Failed to start location tracking');
          toast.error('Failed to start location tracking');
        }
      } else {
        // Fallback to web implementation for browser
        setupWebFallback();
        setIsTracking(true);
        toast.success('Location tracking started (web mode)');
      }
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setError(`Error starting tracking: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Error starting location tracking');
    }
  };
  
  // Function to stop location tracking
  const stopTracking = async () => {
    try {
      if (isNative) {
        // Use Capacitor for native platforms
        await backgroundLocationService.stopTracking();
      } else {
        // Clear web interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      
      setIsTracking(false);
      toast.success('Location tracking stopped');
    } catch (err) {
      console.error('Error stopping location tracking:', err);
      toast.error('Error stopping location tracking');
    }
  };
  
  // Web fallback implementation
  const setupWebFallback = () => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Get location immediately
    getCurrentLocationWeb();
    
    // Set up interval for web
    intervalRef.current = setInterval(() => {
      getCurrentLocationWeb();
    }, interval);
  };
  
  // Get current location for web fallback
  const getCurrentLocationWeb = () => {
    // Skip if already updating
    if (isUpdatingRef.current) {
      return;
    }
    
    isUpdatingRef.current = true;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          try {
            // Get user's session token for authentication
            const response = await fetch('/api/employee/location/update', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                attendanceLogId: attendanceLogId
              })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              const currentTime = new Date().toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit" 
              });
              setLastUpdateTime(currentTime);
              setError(null);
            } else {
              console.error("Failed to update location:", data);
              setError(`Failed to update location: ${data.error || 'Unknown error'}`);
            }
          } catch (err) {
            console.error("Error sending location to server:", err);
            setError(`Error sending location: ${err instanceof Error ? err.message : 'Unknown error'}`);
          } finally {
            isUpdatingRef.current = false;
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError(`Location error: ${err.message}`);
          isUpdatingRef.current = false;
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      );
    } else {
      setError("Geolocation is not supported by this browser");
      isUpdatingRef.current = false;
    }
  };
  
  // Don't render anything on the server
  if (typeof window === 'undefined') {
    return null;
  }
  
  return (
    <div className="p-3 bg-slate-50 rounded-md text-sm mt-2">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Location Tracking</h3>
          {isInitialized && (
            <div className="flex space-x-2">
              {isTracking ? (
                <button 
                  onClick={stopTracking}
                  className="bg-red-500 text-white px-2 py-1 rounded-md text-xs"
                >
                  Stop Tracking
                </button>
              ) : (
                <button 
                  onClick={startTracking}
                  className="bg-green-500 text-white px-2 py-1 rounded-md text-xs"
                >
                  Start Tracking
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Platform:</span>
            <span className="font-medium">{isNative ? 'Native' : 'Web'}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`font-medium ${isTracking ? 'text-green-600' : 'text-red-600'}`}>
              {isTracking ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Last Update:</span>
            <span className="font-medium">{lastUpdateTime || 'None'}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Permissions:</span>
            <span className={`font-medium ${
              hasPermission === true ? 'text-green-600' : 
              hasPermission === false ? 'text-red-600' : 'text-gray-600'
            }`}>
              {hasPermission === true ? 'Granted' : 
               hasPermission === false ? 'Denied' : 'Not requested'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Update Interval:</span>
            <span className="font-medium">{interval / 1000} seconds</span>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 p-2 rounded-md text-xs text-red-700 mt-2">
            {error}
          </div>
        )}
        
        {!isNative && (
          <div className="bg-yellow-50 p-2 rounded-md text-xs text-yellow-700 mt-2">
            Running in web mode. Background tracking will not work when the app is closed or in the background.
            Install the mobile app for full background tracking capabilities.
          </div>
        )}
      </div>
    </div>
  );
}
