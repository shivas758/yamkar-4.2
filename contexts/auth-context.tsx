"use client";

import type React from "react";
import type { User } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useEffect, useRef } from "react";

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const lastActiveTime = useRef<number>(Date.now());
  const supabaseReconnectInProgress = useRef<boolean>(false);

  // Handle visibility change events
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("Tab became visible, checking session status");
        
        // Prevent concurrent reconnection attempts
        if (supabaseReconnectInProgress.current) {
          console.log("Reconnection already in progress, skipping");
          return;
        }
        
        try {
          supabaseReconnectInProgress.current = true;
          
          // Check if we were away for a significant time (more than 30 seconds)
          const now = Date.now();
          const inactivityTime = now - lastActiveTime.current;
          const longInactivity = inactivityTime > 30000; // 30 seconds threshold
          
          console.log(`Inactive for ${inactivityTime/1000} seconds`);
          
          if (longInactivity) {
            console.log("Long inactivity detected, performing full reconnection");
            await ensureSupabaseConnection(true);
          } else {
            console.log("Short inactivity, verifying session only");
            await ensureSupabaseConnection(false);
          }
        } catch (error) {
          console.error("Error recovering session after visibility change:", error);
        } finally {
          // Update last active time
          lastActiveTime.current = Date.now();
          supabaseReconnectInProgress.current = false;
        }
      } else if (document.visibilityState === 'hidden') {
        // Update last active time when tab becomes hidden
        lastActiveTime.current = Date.now();
      }
    };

    // Robust reconnection function
    const ensureSupabaseConnection = async (forceFullReconnect: boolean) => {
      try {
        console.log("Ensuring Supabase connection...");
        
        // Step 1: Check current session without doing a network request
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !forceFullReconnect) {
          console.log("No session found and no force reconnect, nothing to recover");
          setUser(null);
          return;
        }
        
        // Step 2: For long inactivity or if explicitly forced, perform a token refresh
        if (forceFullReconnect) {
          console.log("Forcing session refresh");
          try {
            // Try to refresh the token
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error) {
              console.error("Error refreshing session:", error);
              // If refresh fails, check if we should try to recover from localStorage
              const storedSession = localStorage.getItem('supabase.auth.token');
              if (!storedSession) {
                console.log("No stored session found, can't recover");
                setUser(null);
                return;
              }
            }
            
            // If we refreshed successfully, get the current user
            if (data?.session) {
              // Force-update the client's internal session state
              await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
              });
              
              // Fetch user profile
              const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.session.user.id)
                .single();
              
              if (profileError) {
                console.error("Error fetching user profile after refresh:", profileError);
              } else {
                setUser(userProfile);
              }
            }
          } catch (refreshError) {
            console.error("Critical error during session refresh:", refreshError);
          }
        } else if (session) {
          // For short inactivity with existing session, just verify session is working
          console.log("Verifying existing session");
          
          try {
            // Test the session with a simple query to make sure it's functioning
            const { error: testError } = await supabase
              .from('users')
              .select('id')
              .limit(1);
            
            if (testError) {
              console.warn("Session verification failed, forcing full reconnect:", testError);
              // If verification fails, try a full reconnection
              await ensureSupabaseConnection(true);
            } else {
              // Session is working, make sure user state is in sync
              if (session.user && !user) {
                const { data: userProfile, error: profileError } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();
                
                if (!profileError) {
                  setUser(userProfile);
                }
              }
            }
          } catch (verifyError) {
            console.error("Error verifying session:", verifyError);
          }
        }
        
        // Step 3: Force reconnection of realtime subscriptions (if any)
        try {
          // Force reconnect any realtime subscriptions
          await supabase.realtime.disconnect();
          await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for cleanup
          await supabase.realtime.connect();
        } catch (realtimeError) {
          console.error("Error reconnecting realtime:", realtimeError);
          // Non-fatal, continue
        }
        
        console.log("Supabase connection recovery completed");
      } catch (error) {
        console.error("Fatal error in ensureSupabaseConnection:", error);
        // For fatal errors, we might need to force a page reload as last resort
        // But avoiding that in this implementation to prevent disrupting user experience
      }
    };

    // Add event listener for tab visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [user]);

  useEffect(() => {
    // Add a global event listener for auth state changes
    const authEventHandler = (event: StorageEvent) => {
      if (event.key === 'auth_logout_in_progress' && event.newValue === 'true') {
        console.log("Auth event detected: logout in progress");
        // Clear user state when logout is detected
        setUser(null);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', authEventHandler);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', authEventHandler);
      }
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!error) {
          setUser(userProfile);
        } else {
          console.error("Error fetching user profile:", error);
        }
      }
      setIsLoading(false);
    };
    
    checkSession();
    
    // Also set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change event:", event);
        
        if (event === 'SIGNED_OUT') {
          console.log("User signed out, clearing state");
          setUser(null);
          
          // Ensure other components know about the logout
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_logout_in_progress', 'true');
            
            // Remove after a delay
            setTimeout(() => {
              localStorage.removeItem('auth_logout_in_progress');
            }, 3000);
          }
          
          return;
        }
        
        if (session) {
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!error) {
            setUser(userProfile);
          } else {
            console.error("Error fetching user profile:", error);
          }
        } else {
          setUser(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (phone: string, password: string) => {
    setIsLoading(true);
    try {
      // Create pseudo-email from phone
      const pseudoEmail = `${phone}@pseudo.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password: password,
      });

      if (error) {
        console.error("Error signing in:", error);
        setIsLoading(false);
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        setIsLoading(false);
        return;
      }

      // Check if user is approved
      if (userProfile.status !== 'approved') {
        // Sign out the user if not approved
        await supabase.auth.signOut();
        throw new Error("Your account is pending admin approval. Please wait for approval before logging in.");
      }

      setUser(userProfile);
      setIsLoading(false);
      router.push(`/${userProfile.role}`);
    } catch (error: any) {
      console.error("Error during login:", error);
      setIsLoading(false);
      throw error; // Re-throw the error to be handled by the login page
    }
  };

  const logout = async () => {
    console.log("Logout process started");
    setIsLoading(true);
    
    try {
      // Clear user state first
      setUser(null);
      
      // Sign out from supabase
      console.log("Signing out from Supabase");
      
      // Force kill any active background processes first
      if (typeof window !== 'undefined') {
        // Set a flag in localStorage that we're logging out
        // This will be checked by background processes
        localStorage.setItem('auth_logout_in_progress', 'true');
        
        // Wait a moment to ensure all background processes notice
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error("Error signing out:", error);
      }

      // Clear any local storage related to auth
      console.log("Clearing local storage");
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('auth_logout_in_progress');
      
      // Clear cookies (this might be redundant with signOut, but being thorough)
      console.log("Clearing cookies");
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.includes('supabase') || name.includes('sb-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      // Navigate to login page first using router
      console.log("Navigating to login page");
      router.push("/");
      
      // Then force a complete page reload to clear any cached state
      console.log("Forcing page reload");
      // Add a slight delay to ensure router navigation has started
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
      
      console.log("Logout process completed");
    } catch (error: any) {
      console.error("Error during logout:", error);
      // Even if there's an error, we should force a logout
      window.location.href = "/";
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
