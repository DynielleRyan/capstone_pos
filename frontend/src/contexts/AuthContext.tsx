import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  const isFetchingProfileRef = useRef(false); // Prevent concurrent fetches using ref
  const previousUserIdRef = useRef<string | null>(null); // Track previous user ID to prevent unnecessary fetches
  const profileFetchedRef = useRef(false); // Track if profile was already fetched for current user
  const profileFetchErrorCountRef = useRef(0); // Track consecutive errors to prevent infinite retries

  // Fetch extended user profile from backend API
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      profileFetchedRef.current = false;
      return;
    }

    // Prevent concurrent profile fetches
    if (isFetchingProfileRef.current) {
      return;
    }

    // Prevent fetching if we already fetched for this user ID
    if (previousUserIdRef.current === user.id && profileFetchedRef.current) {
      return;
    }

    isFetchingProfileRef.current = true;
    try {
      const response = await api.get('/auth/profile');
      if (response.data.success) {
        setProfile(response.data.data.user);
        previousUserIdRef.current = user.id; // Mark as fetched for this user
        profileFetchedRef.current = true; // Mark that we've fetched
      }
    } catch (error: any) {
      // Don't log 401 errors as they're handled by the interceptor
      if (error.response?.status !== 401) {
      console.error('Failed to fetch profile:', error);
      }
      // Only clear profile if it's not a 401 (401 means unauthenticated, handled by interceptor)
      if (error.response?.status !== 401) {
      setProfile(null);
        profileFetchedRef.current = false;
      }
    } finally {
      isFetchingProfileRef.current = false;
    }
  }, [user]);

  // Sign out function - clears all auth state
  const signOut = async () => {
    try {
      isFetchingProfileRef.current = false; // Reset fetch flag
      profileFetchedRef.current = false; // Reset fetched flag
      previousUserIdRef.current = null; // Reset user ID ref
      profileFetchErrorCountRef.current = 0; // Reset error count
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
