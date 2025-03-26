# Android Implementation Steps for Yamkar App

This guide walks you through the steps to complete the Android implementation of your Yamkar app with background location tracking.

## Step 1: Run the Setup Script

First, run the setup script to install all dependencies and initialize Capacitor:

```bash
# Execute from your project root
sh setup-capacitor-android.sh
```

## Step 2: Configure Android Manifest

After the setup script completes, you need to modify the Android Manifest file:

1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```

2. In Android Studio, navigate to:
   `app/src/main/AndroidManifest.xml`

3. Replace the contents with the pre-configured template from `android-manifest-template.xml`
   - Ensure the package name matches your app (`com.yamkar.app`)
   - The manifest includes all required permissions for background location

## Step 3: Update MainActivity.java

Add code to request runtime permissions:

1. Navigate to:
   `app/src/main/java/com/yamkar/app/MainActivity.java`

2. Modify it to handle runtime permissions:

```java
package com.yamkar.app;

import android.os.Bundle;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 101;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Check if we have location permissions
        if (!hasLocationPermissions()) {
            requestLocationPermissions();
        }
    }
    
    private boolean hasLocationPermissions() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED &&
               ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    
    private void requestLocationPermissions() {
        ActivityCompat.requestPermissions(
            this,
            new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            },
            PERMISSION_REQUEST_CODE
        );
    }
    
    // For Android 10+ (API 29+), request background location permission after granting foreground
    public void requestBackgroundLocationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                PERMISSION_REQUEST_CODE + 1
            );
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            
            if (allGranted && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                // If foreground location was granted, request background location on Android 10+
                requestBackgroundLocationPermission();
            }
        }
    }
}
```

## Step 4: Integrate App Components

1. Create an app initialization component to start tracking:

```tsx
// app/components/CapacitorInitializer.tsx
"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import capacitorAuthService from '@/lib/capacitor/authService';
import backgroundLocationService from '@/lib/capacitor/backgroundLocationService';

export default function CapacitorInitializer() {
  const [isNative, setIsNative] = useState(false);
  
  useEffect(() => {
    const initCapacitor = async () => {
      // Check if running on native platform
      const isNativePlatform = Capacitor.isNativePlatform();
      setIsNative(isNativePlatform);
      
      if (isNativePlatform) {
        console.log('Running on native platform, initializing Capacitor services');
        
        // Initialize auth service
        await capacitorAuthService.initialize();
        
        // Initialize background location service
        await backgroundLocationService.initialize({
          updateInterval: 120000, // 2 minutes
          distanceFilter: 10 // 10 meters
        });
      }
    };
    
    initCapacitor();
  }, []);
  
  // This component doesn't render anything visible
  return null;
}
```

2. Add this initializer to your layout:

```tsx
// app/layout.tsx (or similar)
import CapacitorInitializer from '@/components/CapacitorInitializer';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CapacitorInitializer />
        {children}
      </body>
    </html>
  );
}
```

3. Replace your existing LocationTracker component with CapacitorLocationTracker

## Step 5: App Icons and Splash Screen

1. Update app icons in:
   `android/app/src/main/res/mipmap-*`

2. For the splash screen, update:
   `android/app/src/main/res/drawable/splash.png`

## Step 6: Build and Test

1. After making all changes, sync your web code with Capacitor:
   ```bash
   npm run build
   npx cap sync android
   ```

2. Open Android Studio and run the app:
   ```bash
   npx cap open android
   ```

3. In Android Studio:
   - Select a device or emulator
   - Click the Run button (green triangle)

## Common Issues and Solutions

### Permission Issues

If location tracking isn't working:

1. Check permissions in device settings (Settings > Apps > Yamkar > Permissions)
2. Ensure "Allow all the time" is selected for location

### Background Tracking Stops

If tracking stops in the background:

1. Check battery optimization settings (Settings > Apps > Yamkar > Battery)
2. Disable battery optimization for the app
3. For some devices, you may need to "lock" the app in recents

### Authentication Problems

If authentication fails:

1. Check that capacitorAuthService is properly initialized
2. Verify network connectivity
3. Check for any errors in Android Studio's Logcat

## Testing Background Location

To verify background location is working:

1. Start the app and log in
2. Navigate to a screen with the CapacitorLocationTracker
3. Enable location tracking
4. Move to a different location
5. Put the app in the background (press home button)
6. Wait for at least 2 minutes
7. Return to the app and check if new location points were recorded

## Building Release Version

When ready to create a release APK:

1. In Android Studio, select Build > Generate Signed Bundle / APK
2. Follow the wizard to create a signed APK
3. Choose "APK" as the build type
4. Create or select your keystore
5. Build the release APK
