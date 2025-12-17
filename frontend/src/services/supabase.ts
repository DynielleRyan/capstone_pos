/**
 * ============================================================================
 * SUPABASE CLIENT - Frontend Configuration
 * ============================================================================
 * 
 * This file configures the Supabase client for frontend use. Unlike the backend
 * client which uses the service role key, this client uses the anon key, which
 * respects Row Level Security (RLS) policies.
 * 
 * AUTHENTICATION FEATURES:
 * - Auto token refresh: Automatically refreshes expired JWT tokens
 * - Session persistence: Stores session in localStorage for "remember me" functionality
 * - URL session detection: Detects session tokens in URL (for password reset flow)
 * 
 * SECURITY:
 * The anon key is safe to expose in frontend code because RLS policies limit
 * what operations can be performed. However, sensitive operations should still
 * go through the backend API which uses the service role key.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Environment Variable Configuration
 * 
 * Vite requires environment variables to be prefixed with VITE_ to be accessible
 * in the browser. These values are embedded at build time, so they're visible
 * in the client-side code (which is why we use the anon key, not the service role key).
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Validate Required Configuration
 * 
 * Throws an error if Supabase credentials are missing. This fails fast at
 * application startup rather than failing later when trying to use Supabase,
 * making debugging easier.
 */
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    allEnvVars: import.meta.env
  });
  throw new Error('Missing Supabase environment variables');
}

/**
 * Supabase Client Instance
 * 
 * Creates the Supabase client with authentication features enabled:
 * 
 * autoRefreshToken: true
 *   Automatically refreshes expired JWT tokens in the background. This prevents
 *   users from being logged out due to token expiration (tokens typically expire
 *   after 1 hour, refresh tokens last longer).
 * 
 * persistSession: true
 *   Stores the session in localStorage, allowing users to remain logged in
 *   across browser sessions. This enables "remember me" functionality.
 * 
 * detectSessionInUrl: true
 *   Detects session tokens in URL query parameters. Used for password reset
 *   flow where Supabase redirects users with tokens in the URL.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * Authentication Helper Functions
 * 
 * Wraps Supabase Auth methods with a consistent interface and additional
 * functionality like "remember me" support. These functions are used throughout
 * the frontend for all authentication operations.
 */
export const auth = {
  /**
   * User Registration
   * 
   * Creates a new user account in Supabase Auth. The user metadata (first name,
   * last name, username, etc.) is stored in Supabase Auth's user_metadata field,
   * which is then used to create a corresponding record in the User table via
   * the backend registration endpoint.
   * 
   * Note: This function only creates the Supabase Auth user. The backend /api/auth/register
   * endpoint should be used for complete registration (creates User table record too).
   */
  signUp: async (email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    username: string;
    contactNumber: string;
    isPharmacist: boolean;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          username: userData.username,
          contact_number: userData.contactNumber,
          is_pharmacist: userData.isPharmacist
        }
      }
    });
    return { data, error };
  },

  /**
   * User Login
   * 
   * Authenticates a user with email and password. On success, Supabase returns
   * a session object containing JWT tokens (access_token and refresh_token).
   * 
   * REMEMBER ME FUNCTIONALITY:
   * If "remember me" is checked, stores a flag in localStorage indicating the
   * session should persist for 30 days. The actual session persistence is handled
   * by Supabase's persistSession configuration, but we track the user's preference
   * for UI purposes (e.g., pre-checking the "remember me" box on return visits).
   * 
   * The session is automatically stored in localStorage by Supabase, so users
   * remain logged in across browser sessions.
   */
  signIn: async (email: string, password: string, rememberMe: boolean = false) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    /**
     * Remember Me Preference Storage
     * 
     * Stores the user's "remember me" preference and expiry date in localStorage.
     * This allows the UI to remember the user's choice and pre-check the box
     * on future visits. The actual session persistence is handled by Supabase.
     */
    if (data.session && rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberMeExpiry', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    } else if (data.session) {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberMeExpiry');
    }
    
    return { data, error };
  },

  /**
   * User Logout
   * 
   * Signs out the current user and clears the session from localStorage. This
   * invalidates the JWT token, so the user cannot make authenticated requests
   * until they log in again.
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get Current User
   * 
   * Retrieves the currently authenticated user from Supabase. This makes a
   * network request to Supabase to validate the token and get fresh user data.
   * 
   * Use this when you need to verify the user is still authenticated or get
   * updated user information.
   */
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  /**
   * Get Current Session
   * 
   * Retrieves the current session (including JWT tokens) from localStorage.
   * This is faster than getCurrentUser because it doesn't make a network request,
   * but the session might be expired (Supabase handles refresh automatically).
   * 
   * Use this when you need the access token for API requests or to check if
   * a user is logged in without making a network call.
   */
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  /**
   * Send Password Reset Email
   * 
   * Sends a password reset email to the user. The email contains a link with
   * session tokens in the URL. When the user clicks the link, they're redirected
   * to /reset-password with the tokens in the URL, which are then used to set
   * the session and allow password update.
   * 
   * The redirectTo URL must be whitelisted in Supabase dashboard for security.
   */
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { data, error };
  },

  /**
   * Update Password
   * 
   * Updates the user's password in Supabase Auth. This requires an active session,
   * which is typically set from the password reset link tokens.
   * 
   * After successful password update, Supabase may invalidate the session for
   * security reasons, requiring the user to log in again with the new password.
   */
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  },

  /**
   * Set Session Manually
   * 
   * Manually sets the Supabase session using provided tokens. This is primarily
   * used in the password reset flow, where tokens come from the URL query parameters.
   * 
   * After setting the session, the user is considered authenticated and can make
   * authenticated API requests.
   */
  setSession: async (session: { access_token: string; refresh_token: string }) => {
    const { data, error } = await supabase.auth.setSession(session);
    return { data, error };
  },

  /**
   * Listen to Auth State Changes
   * 
   * Sets up a listener that fires whenever the authentication state changes
 * (login, logout, token refresh, etc.). This is used by AuthContext to keep
   * the global auth state synchronized with Supabase's internal state.
   * 
   * Returns a subscription object with an unsubscribe method to clean up the listener.
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

export default supabase;
