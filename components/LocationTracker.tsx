"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

interface LocationTrackerProps {
  attendanceLogId: string;
  interval?: number; // Time in milliseconds between location updates
}

export default function LocationTracker({ 
  attendanceLogId, 
  interval = 120000 // Default to 2 minutes (120,000 ms)
}: LocationTrackerProps) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const retryCountRef = useRef<number>(0);
  const nextScheduledUpdate = useRef<number | null>(null);
  const visibilityChangeListenerAdded = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false); // Lock to prevent concurrent updates

  // Function to get current location
  const getCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return;
    }
    
    // If already updating, skip this call
    if (isUpdatingRef.current) {
      console.log("Location update already in progress, skipping duplicate call");
      return;
    }
    
    // Check if initial location has already been captured
    // Only check during initial location capture, not during interval updates
    if (typeof window !== 'undefined' && 
        localStorage.getItem('initial_location_captured') === 'true' && 
        !lastUpdateRef.current) {
      console.log("Initial location already captured during check-in, skipping this update");
      return;
    }

    // If we've tried more than 3 times in the last minute, back off to avoid excessive calls
    if (retryCountRef.current > 3) {
      const now = Date.now();
      const lastUpdate = lastUpdateRef.current || 0;
      if (now - lastUpdate < 60000) { // Less than a minute since last update
        console.log(`Backing off location requests after ${retryCountRef.current} recent attempts`);
        setTimeout(() => {
          retryCountRef.current = 0; // Reset retry count after backing off
        }, 60000);
        return;
      }
    }

    // Set the updating lock
    isUpdatingRef.current = true;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(newLocation);
        setError(null);
        retryCountRef.current = 0; // Reset retry counter on success
        
        // When location is acquired successfully, send it to the server
        sendLocationToServer(newLocation).finally(() => {
          // Release the lock when done, whether successful or not
          isUpdatingRef.current = false;
        });
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(`Location error: ${err.message}`);
        setLocation(null);
        retryCountRef.current++; // Increment retry counter on failure
        
        // Release the lock
        isUpdatingRef.current = false;
        
        // Schedule a retry in 30 seconds if this was a temporary error
        if (err.code === 1) { // Permission denied
          // No retry for permission issues
        } else if (err.code === 2 || err.code === 3) { // Position unavailable or timeout
          setTimeout(() => {
            console.log("Retrying location acquisition after error");
            getCurrentLocation();
          }, 30000);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  };

  // Function to continuously check if it's time for the next update
  const checkForNextUpdate = () => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const lastUpdate = lastUpdateRef.current || 0;
    const timeSinceLastUpdate = now - lastUpdate;
    
    // If it's been more than the interval time since the last update, trigger a new one
    // Only if we're not already in the process of updating
    if (!isUpdatingRef.current && timeSinceLastUpdate >= interval) {
      console.log(`Time for update: ${timeSinceLastUpdate}ms since last update (interval: ${interval}ms)`);
      getCurrentLocation();
    } else if (!isUpdatingRef.current && nextScheduledUpdate.current && now > nextScheduledUpdate.current) {
      console.log(`Time for scheduled update at ${new Date(nextScheduledUpdate.current).toLocaleTimeString()}`);
      getCurrentLocation();
    }
    
    // Continue checking on each animation frame
    animationFrameRef.current = requestAnimationFrame(checkForNextUpdate);
  };

  // Function to send location to server
  const sendLocationToServer = async (locationData: { latitude: number; longitude: number }) => {
    if (!attendanceLogId || !locationData) return;
    
    try {
      const now = new Date();
      console.log(`[${now.toLocaleTimeString()}] Sending location update for log ${attendanceLogId}: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`);
      
      // Get user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("Authentication error:", sessionError || "No session found");
        setError("Authentication error. Please try refreshing the page.");
        return;
      }
      
      const response = await fetch('/api/employee/location/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
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
        console.log(`Location updated successfully at ${currentTime}:`, data);
        setLastUpdateTime(currentTime);
        lastUpdateRef.current = Date.now();
        
        // Schedule next update exactly 2 minutes from now
        nextScheduledUpdate.current = Date.now() + interval;
        
        // Store last update time in localStorage to track across refreshes
      if (typeof window !== 'undefined') {
          localStorage.setItem('last_location_update', JSON.stringify({
            time: Date.now(),
            nextUpdate: nextScheduledUpdate.current
          }));
        }
      } else {
        console.error("Failed to update location:", data);
        setError(`Failed to update location: ${data.error}`);
        
        // Try again in 30 seconds if there was a server error
        if (response.status >= 500) {
          setTimeout(() => {
            console.log("Retrying location submission after server error");
            sendLocationToServer(locationData);
          }, 30000);
        }
      }
    } catch (err: any) {
      console.error("Error sending location to server:", err);
      setError(`Error sending location: ${err.message}`);
      
      // Retry on network errors
      setTimeout(() => {
        console.log("Retrying location submission after network error");
        sendLocationToServer(locationData);
      }, 30000);
    }
  };

  // Handler for when page visibility changes
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      const lastUpdate = lastUpdateRef.current || 0;
      const timeSinceLastUpdate = now - lastUpdate;
      
      console.log(`Page became visible. Last update was ${timeSinceLastUpdate/1000} seconds ago`);
      
      // If it's been more than 1 minute since the last update
      if (timeSinceLastUpdate > 60000) {
        console.log("Page became visible and it's been over a minute, triggering immediate location update");
        getCurrentLocation();
      }
      
      // Check if we need to restart the animation frame
      if (!animationFrameRef.current) {
        console.log("Restarting requestAnimationFrame loop");
        animationFrameRef.current = requestAnimationFrame(checkForNextUpdate);
      }
    } else {
      // When page becomes hidden, use a setInterval as a fallback
      // This is less accurate but provides a backup mechanism
      console.log("Page hidden, setting up backup interval checking");
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      
      keepAliveIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const lastUpdate = lastUpdateRef.current || 0;
        if (now - lastUpdate > interval) {
          console.log("Backup interval triggered location update while page hidden");
          getCurrentLocation();
        }
      }, interval / 2); // Check twice per interval
    }
  };

  // Set up a single function to start all tracking
  const startTracking = () => {
    // Ensure only one source triggers the first location update
    const sources = [];
    
    // Start the animation frame loop for consistent checking
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(checkForNextUpdate);
      sources.push('animation-frame');
    }
    
    // Set up a traditional interval as a backup, but with a slight offset to avoid collision
    if (!intervalRef.current) {
      // Add 1 second offset to avoid exact collision with animation frame
      intervalRef.current = setInterval(() => {
        // Only log if not updating to reduce console noise
        if (!isUpdatingRef.current) {
          console.log(`Interval check at ${new Date().toLocaleTimeString()}`);
        }
        
        const now = Date.now();
        const lastUpdate = lastUpdateRef.current || 0;
        if (!isUpdatingRef.current && now - lastUpdate > interval) {
          console.log("Interval-based fallback triggered location update");
          getCurrentLocation();
        }
      }, interval + 1000); // 1 second offset
      sources.push('interval');
    }
    
    // Get initial location
    console.log(`Starting location tracking with sources: ${sources.join(', ')}`);
    getCurrentLocation();
  };

  // Set up interval-based tracking when component mounts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if a checkout is in progress
    const checkoutInProgress = localStorage.getItem('checkout_in_progress');
    if (checkoutInProgress === 'true') {
      console.log("Checkout in progress, not starting location tracker");
      setError("Location tracking paused during checkout");
      return;
    }

    // Try to recover last update time from localStorage
    try {
      const lastUpdateData = localStorage.getItem('last_location_update');
      if (lastUpdateData) {
        const { time, nextUpdate } = JSON.parse(lastUpdateData);
        if (time) {
          console.log(`Recovered last update time: ${new Date(time).toLocaleTimeString()}`);
          lastUpdateRef.current = time;
          
          // Format the time for display
          setLastUpdateTime(new Date(time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }));
          
          // Recover next scheduled update time
          if (nextUpdate) {
            nextScheduledUpdate.current = nextUpdate;
          }
        }
      }
    } catch (e) {
      console.error("Error recovering last update time:", e);
    }
    
    // Add visibility change listener if not already added
    if (!visibilityChangeListenerAdded.current && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityChangeListenerAdded.current = true;
      console.log("Visibility change listener added to detect tab switches");
    }
    
    // Check if geolocation is available only on the client side
    if ('geolocation' in navigator) {
      setIsSupported(true);

      // Wait a few seconds before starting tracking to avoid duplicate records at check-in time
      const initialLocationTimeout = setTimeout(() => {
        console.log("Starting location tracking after initial delay");
        startTracking();
      }, 10000); // Reduced to 10 seconds to ensure tracking starts sooner
      
      // Set up a watchdog timer to detect stalled updates
      const watchdogInterval = setInterval(() => {
        const now = Date.now();
        const lastUpdate = lastUpdateRef.current || 0;
        
        // If no update for more than 2.5x the expected interval, force an update
        if (now - lastUpdate > interval * 2.5) {
          console.log("Watchdog detected stalled updates, forcing location update");
          getCurrentLocation();
        }
      }, Math.min(30000, interval)); // Check every 30 seconds or interval time, whichever is shorter
      
      // Cleanup function for when component unmounts
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
        
        clearInterval(watchdogInterval);
        clearTimeout(initialLocationTimeout);
        
        // Remove visibility change listener
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          visibilityChangeListenerAdded.current = false;
        }
      };
    } else {
      setIsSupported(false);
      setError("Geolocation is not supported by this browser.");
    }
  }, [attendanceLogId, interval]);

  // Don't render anything on the server
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 p-2 rounded-md text-sm text-yellow-700 my-2">
        Geolocation is not supported by this browser.
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-2 rounded-md text-sm text-red-700 my-2 flex flex-col">
        <div>{error}</div>
        <button 
          onClick={() => {
            setError(null);
            getCurrentLocation();
          }}
          className="mt-2 text-xs underline self-start"
        >
          Retry Now
        </button>
      </div>
    );
  }

  if (location) {
    return (
      <div className="bg-green-50 p-2 rounded-md text-sm text-green-700 my-2">
        <div className="flex justify-between items-center">
          <div>Location tracking active: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</div>
          <button 
            onClick={() => {
              if (!isUpdatingRef.current) {
                getCurrentLocation();
              } else {
                console.log("Update already in progress");
              }
            }} 
            className={`ml-2 text-xs underline ${isUpdatingRef.current ? 'opacity-50' : ''}`}
            disabled={isUpdatingRef.current}
            title={isUpdatingRef.current ? "Update in progress" : "Force update now"}
          >
            {isUpdatingRef.current ? "Updating..." : "Update Now"}
          </button>
        </div>
        <div className="text-xs mt-1">
          {lastUpdateTime ? 
            `Last update: ${lastUpdateTime}` : 
            `Initialized at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          }
          {nextScheduledUpdate.current && (
            <span className="ml-2">
              (Next update at {new Date(nextScheduledUpdate.current).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-2 rounded-md text-sm text-blue-700 my-2">
      Acquiring location...
    </div>
  );
} 