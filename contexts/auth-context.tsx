"use client";

import type React from "react";
import type { User } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useEffect } from "react";

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
