"use client";

import { useEffect, useState, useRef } from 'react';
import { initConnectionManager, ConnectionStatus, getConnectionStatus, cleanupConnectionManager } from '@/lib/connectionManager';
import { eventBus, EVENTS } from '@/lib/eventBus';

/**
 * Hidden component that initializes and manages the Supabase connection
 * Handles reconnection, session recovery, and connection status
 */
const ConnectionManager = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTED);
  const initialized = useRef(false);
  
  useEffect(() => {
    // Only initialize once
    if (initialized.current) {
      console.log('ConnectionManager component already initialized, skipping');
      return;
    }
    
    console.log('ConnectionManager component initializing connection manager');
    initialized.current = true;
    
    // Initialize the connection manager with this component as the source
    // This will log if it's already been initialized
    initConnectionManager('ConnectionManager.tsx');
    
    // Listen for status changes
    const statusListener = eventBus.subscribe(EVENTS.CONNECTION_STATUS_CHANGED, ({ status }) => {
      console.log(`ConnectionManager component: Setting status to: ${status}`);
      setStatus(status);
    });
    
    // Initial status
    setStatus(getConnectionStatus());
    
    return () => {
      statusListener();
      console.log('ConnectionManager component unmounting');
      // Don't clean up the connection manager on unmount
      // It should persist throughout the app lifetime
      // cleanupConnectionManager(); - removing this to prevent disruptions
      initialized.current = false;
    };
  }, []);
  
  // This component doesn't render anything visible
  // But we could add a connection status indicator if needed
  if (status === ConnectionStatus.RECONNECTING || status === ConnectionStatus.AUTHENTICATING) {
    // Optionally show a global reconnecting indicator
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md shadow-md text-sm z-50 flex items-center">
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-yellow-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Reconnecting...
      </div>
    );
  }
  
  if (status === ConnectionStatus.ERROR) {
    // Show a connection error indicator
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 text-red-800 px-4 py-2 rounded-md shadow-md text-sm z-50 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Connection Error
      </div>
    );
  }
  
  // No visible UI needed for connected state
  return null;
};

export default ConnectionManager; 