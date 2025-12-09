import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    allEnvVars: import.meta.env
  });
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with authentication configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,        // Automatically refresh expired tokens
    persistSession: true,          // Persist session in localStorage
    detectSessionInUrl: true       // Detect session from URL (for password reset)
  }
});

// Authentication helper functions
export const auth = {
  // Sign up new user with email, password, and additional user data
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

  // Sign in existing user with email and password
  signIn: async (email: string, password: string, rememberMe: boolean = false) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // If remember me is checked, set session to persist for 30 days
    if (data.session && rememberMe) {
      // Store remember me preference
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberMeExpiry', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    } else if (data.session) {
      // Clear remember me if not checked
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberMeExpiry');
    }
    
    return { data, error };
  },

  // Sign out current user
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current authenticated user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Get current session with tokens
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Send password reset email to user
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { data, error };
  },

  // Update user's password
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  },

  // Set session manually (used for password reset flow)
  setSession: async (session: { access_token: string; refresh_token: string }) => {
    const { data, error } = await supabase.auth.setSession(session);
    return { data, error };
  },

  // Listen to authentication state changes (login/logout)
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

export default supabase;
