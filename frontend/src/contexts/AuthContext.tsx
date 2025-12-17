/**
 * ============================================================================
 * AUTHENTICATION CONTEXT - Global Auth State Management
 * ============================================================================
 * 
 * Provides global authentication state to the entire application using React
 * Context. This allows any component to access user information, session data,
 * and authentication functions without prop drilling.
 * 
 * FEATURES:
 * - Global auth state (user, session, profile)
 * - Automatic session synchronization with Supabase
 * - Profile data fetching from backend API
 * - Sign out functionality
 * - Loading states for async operations
 * 
 * USAGE:
 *   const { user, profile, signOut } = useAuth();
 * 
 * The context is provided at the app root (App.tsx), making auth state
 * available to all components throughout the application.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { auth } from '../services/supabase';
import api from '../services/api';

/**
 * Authentication Context Type
 * 
 * Defines the shape of the authentication context. All components using
 * useAuth() will receive an object matching this interface.
 */
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/**
 * Create Authentication Context
 * 
 * Creates a React Context for authentication. The context is undefined by
 * default, which helps catch errors when useAuth() is used outside of
 * AuthProvider.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * useAuth Hook
 * 
 * Custom hook to access the authentication context. This hook:
 * 1. Retrieves the context value
 * 2. Validates that it's being used within AuthProvider
 * 3. Returns the auth state and functions
 * 
 * If used outside AuthProvider, throws an error to help catch configuration issues.
 */
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

/**
 * Authentication Provider Component
 * 
 * Wraps the application and provides authentication state to all child components.
 * This component:
 * - Manages auth state (user, session, profile)
 * - Synchronizes with Supabase Auth
 * - Fetches extended profile data from backend
 * - Handles auth state changes (login, logout, token refresh)
 * 
 * STATE MANAGEMENT:
 * - user: Supabase Auth user object (from JWT token)
 * - session: Supabase session (contains JWT tokens)
 * - profile: Extended user data from backend (name, role, etc.)
 * - loading: Indicates if auth state is being initialized
 * 
 * REFS FOR OPTIMIZATION:
 * - isFetchingProfileRef: Prevents concurrent profile fetches
 * - previousUserIdRef: Tracks which user's profile was fetched
 * - profileFetchedRef: Prevents redundant profile fetches
 * - profileFetchErrorCountRef: Tracks errors to prevent infinite retries
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  /**
   * Authentication State
   * 
   * These state variables hold the current authentication information:
   * - user: The authenticated user from Supabase Auth
   * - session: The session containing JWT tokens
   * - profile: Extended profile data from backend (User table)
   * - loading: True during initial auth check, false once complete
   */
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  /**
   * Refs for Performance Optimization
   * 
   * These refs prevent unnecessary API calls and race conditions:
   * - isFetchingProfileRef: Prevents multiple simultaneous profile fetches
   * - previousUserIdRef: Tracks which user's profile was last fetched
   * - profileFetchedRef: Flags whether profile was already fetched for current user
   * - profileFetchErrorCountRef: Tracks consecutive errors to prevent infinite retries
   */
  const isFetchingProfileRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const profileFetchedRef = useRef(false);
  const profileFetchErrorCountRef = useRef(0);

  /**
   * Refresh User Profile
   * 
   * Fetches extended user profile data from the backend API. This includes
   * information not stored in Supabase Auth, such as:
   * - Full name
   * - Username
   * - Contact number
   * - Role (clerk, pharmacist, admin)
   * - First login status
   * 
   * OPTIMIZATION FEATURES:
   * - Prevents concurrent fetches (isFetchingProfileRef)
   * - Skips fetch if already fetched for current user (previousUserIdRef)
   * - Handles 401 errors gracefully (handled by API interceptor)
   * 
   * The useCallback hook ensures the function reference is stable, preventing
   * unnecessary re-renders in components that depend on it.
   */
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      profileFetchedRef.current = false;
      return;
    }

    /**
     * Prevent Concurrent Fetches
     * 
     * If a profile fetch is already in progress, return early to prevent
     * duplicate API calls. This is important because multiple components
     * might call refreshProfile() simultaneously.
     */
    if (isFetchingProfileRef.current) {
      return;
    }

    /**
     * Skip Redundant Fetches
     * 
     * If we've already fetched the profile for this user ID, skip the fetch
     * to avoid unnecessary API calls. This is especially important during
     * re-renders or when multiple components request profile data.
     */
    if (previousUserIdRef.current === user.id && profileFetchedRef.current) {
      return;
    }

    isFetchingProfileRef.current = true;
    try {
      /**
       * Fetch Profile from Backend
       * 
       * The backend endpoint /auth/profile returns extended user information
       * from the User table. This is separate from Supabase Auth user data
       * because it includes business-specific fields like role and first login status.
       */
      const response = await api.get('/auth/profile');
      if (response.data.success) {
        setProfile(response.data.data.user);
        previousUserIdRef.current = user.id;
        profileFetchedRef.current = true;
      }
    } catch (error: any) {
      /**
       * Error Handling
       * 
       * 401 errors are handled by the API interceptor (auto-logout), so we
       * don't need to handle them here. For other errors, we log them and
       * clear the profile state.
       */
      if (error.response?.status !== 401) {
        console.error('Failed to fetch profile:', error);
      }
      if (error.response?.status !== 401) {
        setProfile(null);
        profileFetchedRef.current = false;
      }
    } finally {
      isFetchingProfileRef.current = false;
    }
  }, [user]);

  /**
   * Sign Out Function
   * 
   * Clears all authentication state and signs out from Supabase. This function:
   * 1. Resets all refs to their initial state
   * 2. Signs out from Supabase (clears session from localStorage)
   * 3. Clears all state variables (user, session, profile)
   * 
   * After sign out, the user is redirected to the login page by the API
   * interceptor if they try to access protected routes.
   */
  const signOut = async () => {
    try {
      isFetchingProfileRef.current = false;
      profileFetchedRef.current = false;
      previousUserIdRef.current = null;
      profileFetchErrorCountRef.current = 0;
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
    let mounted = true; // Track if component is still mounted
    
    // Get initial session on app load
    const getInitialSession = async () => {
      try {
        const { session } = await auth.getSession();
        if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (mounted) {
        setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for authentication state changes (login/logout)
    // Use a debounced handler to prevent rapid state changes
    let authStateTimeout: ReturnType<typeof setTimeout> | null = null;
    const { data: { subscription } } = auth.onAuthStateChange(async (_event, session) => {
      // Clear any pending state update
      if (authStateTimeout) {
        clearTimeout(authStateTimeout);
      }
      
      // Debounce state updates to prevent rapid changes
      authStateTimeout = setTimeout(() => {
        if (!mounted) return;
        
        setSession(session);
        const newUser = session?.user ?? null;
        setUser(newUser);
      
        if (!newUser) {
          // User logged out - clear everything
          setProfile(null);
          previousUserIdRef.current = null;
          profileFetchedRef.current = false;
          isFetchingProfileRef.current = false;
          profileFetchErrorCountRef.current = 0; // Reset error count
      } else {
          // User changed - reset fetch flag to allow new fetch
          if (previousUserIdRef.current !== newUser.id) {
            profileFetchedRef.current = false;
            profileFetchErrorCountRef.current = 0; // Reset error count for new user
      }
        }
      }, 100); // 100ms debounce for auth state changes
    });

    // Cleanup subscription and timeouts on unmount
    return () => {
      mounted = false;
      if (authStateTimeout) {
        clearTimeout(authStateTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Fetch profile when user is available (only once per user)
  // Use a more strict approach to prevent infinite loops
  useEffect(() => {
    // Only proceed if we have a user and haven't fetched yet
    if (!user) {
      // Reset when user logs out
      previousUserIdRef.current = null;
      profileFetchedRef.current = false;
      profileFetchErrorCountRef.current = 0;
      return;
    }

    // Strict check: only fetch if user ID changed AND we haven't fetched for this user
    const currentUserId = user.id;
    const hasUserChanged = previousUserIdRef.current !== currentUserId;
    const hasNotFetched = !profileFetchedRef.current;
    const isNotCurrentlyFetching = !isFetchingProfileRef.current;

    // Only fetch if we haven't had too many consecutive errors (max 2 retries)
    const hasTooManyErrors = profileFetchErrorCountRef.current >= 2;
    
    if (hasUserChanged && hasNotFetched && isNotCurrentlyFetching && !hasTooManyErrors) {
      // Check if we have a valid session before attempting to fetch
      auth.getSession()
        .then(({ session: currentSession }) => {
          // Only fetch if we have a valid session with access token
          if (!currentSession?.access_token) {
            console.warn('No valid session token, skipping profile fetch');
            profileFetchedRef.current = true; // Mark as "fetched" to prevent retries without session
            return;
          }

          // Mark that we're about to fetch for this user
          previousUserIdRef.current = currentUserId;
          isFetchingProfileRef.current = true;
          
          // Fetch profile directly without using refreshProfile to avoid callback dependency issues
          api.get('/auth/profile')
            .then((response) => {
              if (response.data.success) {
                setProfile(response.data.data.user);
                profileFetchedRef.current = true;
                profileFetchErrorCountRef.current = 0; // Reset error count on success
              }
            })
            .catch((error: any) => {
              // Don't log 401 errors as they're handled by the interceptor
              if (error.response?.status !== 401) {
                console.error('Failed to fetch profile:', error);
                setProfile(null);
                profileFetchedRef.current = false;
                profileFetchErrorCountRef.current += 1; // Increment error count
              } else {
                // 401 means unauthenticated - mark as fetched to prevent retries
                profileFetchedRef.current = true; // Mark as "fetched" to prevent retries
                profileFetchErrorCountRef.current = 0; // Don't count 401s as errors
              }
            })
            .finally(() => {
              isFetchingProfileRef.current = false;
            });
        })
        .catch((error) => {
          console.error('Error checking session before profile fetch:', error);
          profileFetchedRef.current = true; // Mark as fetched to prevent retries
          isFetchingProfileRef.current = false;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user ID

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
