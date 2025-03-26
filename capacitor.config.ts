import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yamkar.app',
  appName: 'Yamkar',
  webDir: '.next',
  server: {
    androidScheme: 'https',
    // Point to Vercel deployment
    url: 'https://yamkar-4-2.vercel.app', // Update this with your actual Vercel URL when deployed
    cleartext: false
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
    allowMixedContent: false, // Set to false for production
    captureInput: true,
    webContentsDebuggingEnabled: false // Use the modern bridge for better performance
  }
};

export default config;
