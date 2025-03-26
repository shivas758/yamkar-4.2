#!/bin/bash
# Complete script to set up Capacitor for Android

echo "Setting up Capacitor for Android..."

# Step 1: Install dependencies
echo "Installing Capacitor dependencies..."
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npm install @capacitor/geolocation @capacitor/splash-screen @capacitor/status-bar @capacitor/preferences @capacitor/network @capacitor/device @capacitor/app

# Step 2: Initialize Capacitor
echo "Initializing Capacitor..."
npx cap init Yamkar com.yamkar.app --web-dir=out

# Step 3: Build Next.js app
echo "Building Next.js app..."
npm run build

# Step 4: Add Android platform
echo "Adding Android platform..."
npx cap add android

# Step 5: Sync web code with Android
echo "Syncing with Android..."
npx cap sync android

echo "Capacitor setup for Android complete!"
echo "Next steps:"
echo "1. Configure AndroidManifest.xml for location permissions"
echo "2. Open Android Studio with: npx cap open android"
echo "3. Build and run the app on your device"
