"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import capacitorAuthService from '@/lib/capacitor/authService';
import backgroundLocationService from '@/lib/capacitor/backgroundLocationService';
import { toast } from "sonner";

export default function CapacitorInitializer() {
  const [isNative, setIsNative] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    const initCapacitor = async () => {
      try {
        // Check if running on native platform
        const isNativePlatform = Capacitor.isNativePlatform();
        setIsNative(isNativePlatform);
        
        if (isNativePlatform) {
          console.log('Running on native platform, initializing Capacitor services');
          
          // Initialize auth service
          const authInitialized = await capacitorAuthService.initialize();
          console.log('Auth service initialized:', authInitialized);
          
          // Check if user is authenticated
          const isAuthenticated = await capacitorAuthService.isAuthenticated();
          console.log('User is authenticated:', isAuthenticated);
          
          // Initialize background location service
          const locationInitialized = await backgroundLocationService.initialize({
            updateInterval: 120000, // 2 minutes
            distanceFilter: 10 // 10 meters
          });
          console.log('Background location service initialized:', locationInitialized);
          
          // Get current tracking status
          const trackingStatus = await backgroundLocationService.getTrackingStatus();
          console.log('Tracking status:', trackingStatus);
          
          // Retry any failed location updates
          if (isAuthenticated) {
            const retriedCount = await backgroundLocationService.retryFailedUpdates();
            if (retriedCount > 0) {
              console.log(`Retried ${retriedCount} failed location updates`);
            }
          }
          
          setIsInitialized(true);
        } else {
          console.log('Running in browser environment, skipping Capacitor initialization');
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing Capacitor services:', error);
        toast.error('Error initializing app services');
      }
    };
    
    initCapacitor();
    
    return () => {
      // Clean-up if needed
    };
  }, []);
  
  // This component doesn't render anything visible
  return null;
}
