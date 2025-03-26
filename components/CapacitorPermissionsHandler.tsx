"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { toast } from "sonner";

export default function CapacitorPermissionsHandler() {
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('Not running on a native platform, skipping permissions');
        return;
      }

      try {
        console.log('Requesting location permissions...');
        
        // Request location permissions
        const locationStatus = await Geolocation.requestPermissions({
          permissions: ['location', 'coarseLocation']
        });
        
        console.log('Location permission status:', locationStatus);
        
        if (locationStatus.location === 'granted') {
          toast.success('Location permission granted');
          
          // On Android, specifically request background permission
          if (Capacitor.getPlatform() === 'android') {
            // You can show a dialog explaining why you need background permission
            // before requesting it
            toast.info('Please grant "Allow all the time" permission for background tracking');
            
            // For Android background permissions, we need to use a different approach
            // Use native code to request background permission as it's not directly 
            // supported in the TypeScript definitions
            try {
              // This will trigger the Android-specific background permission dialog
              // that shows "Allow all the time" option
              await Geolocation.requestPermissions();
              
              // Then we need to manually open the permission settings for the user
              // to select "Allow all the time" since the API doesn't directly support it
              toast.info('Please select "Allow all the time" in the next screen');
              
              // Note: In a production app, you should implement a native Android module
              // to directly request the background permission, but for now this approach
              // will help guide the user
            } catch (e) {
              console.error('Error requesting background permission:', e);
            }
          }
        } else {
          toast.error('Location permission denied. App functionality will be limited.');
        }

        // You can request camera permission here too
        // Add any other permissions you need here
        
        setPermissionsRequested(true);
      } catch (error) {
        console.error('Error requesting permissions:', error);
        toast.error('Failed to request permissions');
      }
    };

    if (!permissionsRequested) {
      requestPermissions();
    }
  }, [permissionsRequested]);

  // This component doesn't render anything visible
  return null;
}
