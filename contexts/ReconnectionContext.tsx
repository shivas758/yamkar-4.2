import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { eventBus, EVENTS } from '@/lib/eventBus';

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
  
  useEffect(() => {
    // Subscribe to reconnection events
    const reconnectingSub = eventBus.subscribe(EVENTS.SUPABASE_RECONNECTED, () => {
      setIsReconnecting(true);
    });
    
    const refreshSub = eventBus.subscribe(EVENTS.DATA_REFRESH_NEEDED, () => {
      setIsReconnecting(false);
      setLastReconnection(new Date());
    });
    
    return () => {
      reconnectingSub();
      refreshSub();
    };
  }, []);
  
  // Function to manually trigger a global data refresh
  const triggerManualRefresh = () => {
    eventBus.publish(EVENTS.DATA_REFRESH_NEEDED);
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