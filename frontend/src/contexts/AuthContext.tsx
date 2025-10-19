import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { auth } from '../services/supabase';
import api from '../services/api';

// Authentication context interface - defines what auth data is available
interface AuthContextType {
  user: User | null;                    // Current authenticated user
  session: Session | null;              // Current session with tokens
  loading: boolean;                     // Loading state for auth operations
  profile: any | null;                  // Extended user profile data
  signOut: () => Promise<void>;         // Sign out function
  refreshProfile: () => Promise<void>;  // Refresh user profile data
}

// Create authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to access auth context - ensures it's used within provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Main authentication provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State management for authentication
  const [user, setUser] = useState<User | null>(null);           // Current user
  const [session, setSession] = useState<Session | null>(null); // Current session
  const [profile, setProfile] = useState<any | null>(null);     // User profile data
  const [loading, setLoading] = useState(true);                 // Loading state

  // Fetch extended user profile from backend API
  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const response = await api.get('/auth/profile');
      if (response.data.success) {
        setProfile(response.data.data.user);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
    }
  };

  // Sign out function - clears all auth state
  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Initialize authentication and listen for changes
  useEffect(() => {
    // Get initial session on app load
    const getInitialSession = async () => {
      try {
        const { session } = await auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for authentication state changes (login/logout)
    const { data: { subscription } } = auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Note: Profile API is currently returning 404, so we'll use user metadata instead
        // await refreshProfile();
        setProfile(null);
      } else {
        setProfile(null);
      }
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Note: Profile API is currently returning 404, so we'll use user metadata instead
  // useEffect(() => {
  //   if (user && !profile) {
  //     refreshProfile();
  //   }
  // }, [user]);

  // Context value object - provides all auth data and functions
  const value = {
    user,
    session,
    loading,
    profile,
    signOut,
    refreshProfile
  };

  // Provide auth context to all child components
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
