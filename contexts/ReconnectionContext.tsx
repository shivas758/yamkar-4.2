"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { eventBus, EVENTS } from '@/lib/eventBus';
import { useAuth } from '@/contexts/auth-context'; // Import the auth context

interface ReconnectionContextType {
  lastReconnection: Date | null;
  isReconnecting: boolean;
  triggerManualRefresh: () => void;
}

const ReconnectionContext = createContext<ReconnectionContextType>({
  lastReconnection: null,
  isReconnecting: false,
  triggerManualRefresh: () => {}
});

interface ReconnectionProviderProps {
  children: ReactNode;
}

export function ReconnectionProvider({ children }: ReconnectionProviderProps) {
  const [lastReconnection, setLastReconnection] = useState<Date | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const { user, isLoading: authLoading } = useAuth(); // Get auth state
  
  useEffect(() => {
    // Only set up event handlers if user is authenticated and auth loading is complete
    if (!user || authLoading) {
      return; // Don't initialize event handlers yet
    }
    
    console.log("Initializing reconnection event handlers for authenticated user");
    
    // Subscribe to reconnection events
    const reconnectingSub = eventBus.subscribe(EVENTS.SUPABASE_RECONNECTED, () => {
      setIsReconnecting(true);
    });
    
    const refreshSub = eventBus.subscribe(EVENTS.DATA_REFRESH_NEEDED, () => {
      setIsReconnecting(false);
      setLastReconnection(new Date());
    });
    
    return () => {
      // Clean up subscriptions when auth state changes or component unmounts
      reconnectingSub();
      refreshSub();
    };
  }, [user, authLoading]); // Depend on auth state
  
  // Function to manually trigger a global data refresh
  const triggerManualRefresh = () => {
    // Only publish event if user is authenticated
    if (user) {
      eventBus.publish(EVENTS.DATA_REFRESH_NEEDED);
    }
  };
  
  return (
    <ReconnectionContext.Provider 
      value={{ 
        lastReconnection, 
        isReconnecting,
        triggerManualRefresh
      }}
    >
      {children}
    </ReconnectionContext.Provider>
  );
}

// Custom hook for using the reconnection context
export const useReconnectionContext = () => useContext(ReconnectionContext); 