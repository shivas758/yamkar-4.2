"use client";

import { useEffect, useCallback, useRef } from 'react';
import { eventBus, EVENTS } from '@/lib/eventBus';
import { useAuth } from '@/contexts/auth-context'; // Import auth context

/**
 * Hook to subscribe to reconnection events and automatically refresh data.
 * Only triggers callbacks when user is authenticated.
 * 
 * @param onReconnect Function to call when a reconnection event happens
 * @param debounceMs Optional debounce time in milliseconds (default: 200ms)
 * @returns void
 * 
 * @example
 * function MyComponent() {
 *   const [data, setData] = useState([]);
 *   
 *   const fetchData = useCallback(async () => {
 *     const response = await fetch('/api/data');
 *     setData(await response.json());
 *   }, []);
 *   
 *   // Initial data fetch
 *   useEffect(() => {
 *     fetchData();
 *   }, [fetchData]);
 *   
 *   // Set up reconnection handler
 *   useReconnection(fetchData);
 *   
 *   return <div>{data.map(item => <div key={item.id}>{item.name}</div>)}</div>;
 * }
 */
export function useReconnection(
  onReconnect: () => void | Promise<void>,
  debounceMs: number = 200
) {
  // Get authentication state
  const { user, isLoading: authLoading } = useAuth();
  
  // Use a ref to track the timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create a debounced version of the callback
  const debouncedCallback = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      onReconnect();
      timeoutRef.current = null;
    }, debounceMs);
  }, [onReconnect, debounceMs]);
  
  useEffect(() => {
    // Only subscribe if user is authenticated and auth loading is complete
    if (!user || authLoading) {
      return;
    }
    
    // Subscribe to data refresh event
    const unsubscribe = eventBus.subscribe(EVENTS.DATA_REFRESH_NEEDED, debouncedCallback);
    
    // Cleanup on unmount or auth state change
    return () => {
      unsubscribe();
      
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedCallback, user, authLoading]);
} 