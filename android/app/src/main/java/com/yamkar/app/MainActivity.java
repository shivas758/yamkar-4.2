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
