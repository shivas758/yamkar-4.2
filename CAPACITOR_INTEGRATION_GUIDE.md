# Capacitor Integration Guide for Yamkar App

This guide explains how to integrate Capacitor into your Next.js app for hybrid mobile functionality, focusing on background location tracking and authentication.

## Setup Steps

### 1. Install Dependencies

Run the following commands in your project root:

```bash
# Install Capacitor Core and CLI
npm install @capacitor/core @capacitor/cli

# Install platform packages
npm install @capacitor/android @capacitor/ios

# Install required plugins
npm install @capacitor/geolocation @capacitor/splash-screen @capacitor/status-bar @capacitor/preferences @capacitor/network @capacitor/device @capacitor/app
```

Alternatively, you can run the `capacitor-setup.sh` script we've created.

### 2. Initialize Capacitor

After installing dependencies, initialize Capacitor:

```bash
npx cap init Yamkar com.yamkar.app --web-dir=out
```

### 3. Build Your Next.js App

```bash
npm run build
```

This will create the `out` directory that Capacitor will use.

### 4. Add Platforms

```bash
npx cap add android
npx cap add ios
```

## Authentication Integration

### 1. Initialize Auth Service

In your main layout or app entry point:

```tsx
// app/layout.tsx or similar
import { useEffect } from 'react';
import capacitorAuthService from '@/lib/capacitor/authService';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize Capacitor auth service
    const initAuth = async () => {
      await capacitorAuthService.initialize();
    };
    
    initAuth();
  }, []);
  
  return <>{children}</>;
}
```

### 2. Modify Sign In Process

Update your login page to use the Capacitor auth service:

```tsx
// Example login component
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import capacitorAuthService from '@/lib/capacitor/authService';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor auth service for native platforms
        const { success, error, user } = await capacitorAuthService.signInWithPassword(
          email, 
          password
        );
        
        if (success) {
          // Redirect to dashboard or home
          window.location.href = '/dashboard';
        } else {
          // Show error
          console.error('Login failed:', error);
        }
      } else {
        // Use regular supabase auth for web
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          console.error('Login failed:', error.message);
        } else {
          // Redirect to dashboard or home
          window.location.href = '/dashboard';
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };
  
  return (
    // Your login form
  );
}
```

## Background Location Tracking Integration

### 1. Replace LocationTracker with CapacitorLocationTracker

In your components where you're using `LocationTracker`, replace it with `CapacitorLocationTracker`:

```tsx
import CapacitorLocationTracker from '@/components/CapacitorLocationTracker';

// Then use it in your component
<CapacitorLocationTracker 
  attendanceLogId={attendanceLogId} 
  interval={120000} // 2 minutes
/>
```

### 2. Initialize Background Location on App Start

In your main layout or a component that loads early:

```tsx
// Example in a dashboard or home component
import { useEffect } from 'react';
import backgroundLocationService from '@/lib/capacitor/backgroundLocationService';

export default function Dashboard() {
  useEffect(() => {
    // Initialize the background location service
    const initLocation = async () => {
      await backgroundLocationService.initialize();
    };
    
    initLocation();
  }, []);
  
  return (
    // Your dashboard UI
  );
}
```

## Native Platform Configuration

### Android Configuration

After adding the Android platform, you need to update the AndroidManifest.xml:

1. Open `android/app/src/main/AndroidManifest.xml`
2. Add the following permissions:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        
        <!-- ... other application elements ... -->
        
        <!-- Add this service for background location -->
        <service
            android:name="com.getcapacitor.plugin.background.BackgroundLocationService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location" />
    </application>
</manifest>
```

### iOS Configuration

After adding the iOS platform, you need to update Info.plist:

1. Open `ios/App/App/Info.plist`
2. Add the following entries:

```xml
<dict>
    <!-- ... other entries ... -->
    
    <!-- Location permissions -->
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>We need your location for attendance tracking even when the app is in the background.</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>We need your location for attendance tracking.</string>
    <key>UIBackgroundModes</key>
    <array>
        <string>location</string>
        <string>fetch</string>
        <string>processing</string>
    </array>
</dict>
```

## Building & Running Native Apps

### Sync Web Code to Native Projects

After making changes to your web code:

```bash
# Build web app
npm run build

# Sync with native projects
npx cap sync
```

### Open Native Projects in IDEs

```bash
# Open Android Studio
npx cap open android

# Open Xcode (Mac only)
npx cap open ios
```

### Live Development

For live development workflow:

```bash
# Run development server
npm run dev

# Run with live updates (use a different terminal)
npx cap run android --livereload --external
# or
npx cap run ios --livereload --external
```

## Troubleshooting

### Authentication Issues

1. **Session lost after app restart**:
   - Check if `capacitorAuthService.initialize()` is called on app start
   - Verify that tokens are properly stored in Preferences

2. **Login redirect not working**:
   - Make sure you're handling URL schemes correctly in the native apps
   - Check for CORS issues if using OAuth providers

### Location Tracking Issues

1. **Background tracking stops**:
   - Verify proper permissions in AndroidManifest.xml and Info.plist
   - For Android, ensure foreground service is configured correctly
   - For iOS, verify background modes are enabled

2. **High battery usage**:
   - Adjust the `distanceFilter` parameter to a higher value
   - Increase the update interval
   - Consider using `enableHighAccuracy: false` for less precision but better battery

3. **Location updates not reaching server**:
   - Check for network connectivity issues
   - Verify that auth tokens are valid when sending requests
   - Look for failed updates in the local storage

## Final Notes

- Always test thoroughly on real devices
- Consider battery optimization techniques
- Be transparent with users about background location usage
- Follow platform-specific guidelines for app store submissions
