"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';
import { Keyboard } from '@capacitor/keyboard';
import { toast } from "sonner";
import capacitorAuthService from "@/lib/capacitor/authService";
import backgroundLocationService from "@/lib/capacitor/backgroundLocationService";

export default function CapacitorIntegration() {
  const [isNative, setIsNative] = useState(false);
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  // Handle permissions
  useEffect(() => {
    const requestPermissions = async () => {
      if (!Capacitor.isNativePlatform()) {
        console.log('Not running on a native platform, skipping permissions');
        return;
      }

      try {
        console.log('Requesting permissions...');
        
        // Request location permissions
        const locationStatus = await Geolocation.requestPermissions({
          permissions: ['location', 'coarseLocation']
        });
        
        console.log('Location permission status:', locationStatus);
        
        if (locationStatus.location === 'granted') {
          toast.success('Location permission granted');
          
          // On Android, request camera permission
          if (Capacitor.getPlatform() === 'android') {
            try {
              const cameraStatus = await Camera.requestPermissions();
              console.log('Camera permission status:', cameraStatus);
              
              if (cameraStatus.camera === 'granted') {
                toast.success('Camera permission granted');
              } else {
                toast.error('Camera permission denied. Some features might not work.');
              }
              
              // Guide user for background location permission
              toast.info('For background tracking, please grant "Allow all the time" in Settings');
            } catch (e) {
              console.error('Error requesting camera permission:', e);
            }
          }
        } else {
          toast.error('Location permission denied. App functionality will be limited.');
        }
        
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

  // Setup keyboard behavior
  useEffect(() => {
    const setupKeyboard = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        // Listen for keyboard events
        Keyboard.addListener('keyboardWillShow', () => {
          // You can add additional handling here if needed
          console.log('Keyboard will show');
          
          // Add a class to the body to adjust content when keyboard is visible
          document.body.classList.add('keyboard-visible');
        });
        
        Keyboard.addListener('keyboardWillHide', () => {
          console.log('Keyboard will hide');
          
          // Remove the class when keyboard is hidden
          document.body.classList.remove('keyboard-visible');
        });
      } catch (error) {
        console.error('Error setting up keyboard:', error);
      }
    };
    
    setupKeyboard();
    
    // Cleanup
    return () => {
      if (Capacitor.isNativePlatform()) {
        Keyboard.removeAllListeners();
      }
    };
  }, []);

  // Initialize services
  useEffect(() => {
    const initServices = async () => {
      try {
        // Check if running on native platform
        const isNativePlatform = Capacitor.isNativePlatform();
        setIsNative(isNativePlatform);
        
        if (isNativePlatform) {
          console.log('Running on native platform, initializing Capacitor services');
          
          // Initialize auth service
          const authInitialized = await capacitorAuthService.initialize();
          console.log('Auth service initialized:', authInitialized);
          
          // Initialize background location service
          const locationInitialized = await backgroundLocationService.initialize({
            updateInterval: 120000, // 2 minutes
            distanceFilter: 10 // 10 meters
          });
          console.log('Background location service initialized:', locationInitialized);
          
          // Add any other service initializations here
        } else {
          console.log('Not running on native platform, skipping Capacitor services');
        }
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };
    
    initServices();
  }, []);

  // Mobile-specific CSS adjustments
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Add a class to the html element for mobile-specific styling
      document.documentElement.classList.add('capacitor-app');
      
      // Add meta viewport tag with initial-scale=1 to prevent zoom issues
      const existingViewport = document.querySelector('meta[name="viewport"]');
      if (existingViewport) {
        existingViewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no');
      }
      
      // Add CSS for fixing keyboard overlap issues
      const style = document.createElement('style');
      style.innerHTML = `
        /* Prevent content from being hidden under keyboard */
        body.keyboard-visible .form-field:focus,
        body.keyboard-visible input:focus,
        body.keyboard-visible textarea:focus,
        body.keyboard-visible select:focus {
          /* Ensure focused elements are visible above keyboard */
          position: relative;
          z-index: 2;
        }
        
        /* Add padding to ensure content is not hidden by keyboard */
        body.keyboard-visible {
          padding-bottom: 250px !important;
        }
        
        /* Add smooth transitions for form elements */
        input, textarea, select, .form-field {
          transition: all 0.2s ease;
        }
        
        /* Fix for fixed positioned elements */
        .capacitor-app [data-fixed="true"],
        .capacitor-app .fixed {
          transform: translateZ(0);
        }
      `;
      document.head.appendChild(style);
    }
    
    return () => {
      if (Capacitor.isNativePlatform()) {
        document.documentElement.classList.remove('capacitor-app');
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}
