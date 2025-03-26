import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yamkar.app',
  appName: 'Yamkar',
  webDir: '.next',
  server: {
    androidScheme: 'https',
    // For development testing, use this to point to your development server
    url: 'http://10.0.2.2:3000', // This connects to localhost from Android emulator
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    CapacitorHttp: {
      enabled: true
    },
    CapacitorCookies: {
      enabled: true // Enable cookies for auth
    },
    Geolocation: {
      // Android-specific configuration
      permissions: {
        request: true, // Ask for permission when needed
        requireAlways: true // Require background permission
      }
    }
  },
  android: {
    // Android specific configuration
    backgroundColor: "#FFFFFF",
    allowMixedContent: true, // For development
    captureInput: true,
    webContentsDebuggingEnabled: true, // For development
  }
};

export default config;
