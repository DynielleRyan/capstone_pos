import axios from 'axios';
import { supabase } from './supabase';

// API base URL - uses environment variable or defaults to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default configuration
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,                    // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - automatically add authentication token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      // If Authorization header is already set (e.g., from explicit call), use it
      if (config.headers.Authorization) {
        return config;
      }

      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Add Bearer token to Authorization header
        config.headers.Authorization = `Bearer ${session.access_token}`;
      } else {
        // Only reject for truly protected endpoints that require authentication
        // OTP endpoints need session but we'll let them handle the error
        const isProtectedEndpoint = config.url?.includes('/auth/profile') || 
                                   config.url?.includes('/auth/update') ||
                                   config.url?.includes('/auth/change-password') ||
                                   config.url?.includes('/auth/deactivate');
        
        if (isProtectedEndpoint) {
          console.warn('No session available for protected endpoint:', config.url);
          return Promise.reject(new Error('No authentication session available'));
        }
      }
    } catch (error) {
      console.error('Error getting session:', error);
      // Only reject for truly protected endpoints
      const isProtectedEndpoint = config.url?.includes('/auth/profile') || 
                                 config.url?.includes('/auth/update') ||
                                 config.url?.includes('/auth/change-password') ||
                                 config.url?.includes('/auth/deactivate');
      
      if (isProtectedEndpoint) {
        return Promise.reject(new Error('Failed to get authentication session'));
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle authentication errors globally
let isRedirecting = false; // Prevent multiple redirects
let redirectTimeout: ReturnType<typeof setTimeout> | null = null; // Debounce redirects

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't redirect on profile endpoint 401s - let the component handle it
    const isProfileEndpoint = error.config?.url?.includes('/auth/profile');
    // Don't redirect on verification endpoint 401s - these are expected for invalid credentials
    const isVerificationEndpoint = error.config?.url?.includes('/auth/verify-pharmacist-admin');
    // Don't redirect on OTP verification endpoint 401s - let the component handle it
    const isOTPVerificationEndpoint = error.config?.url?.includes('/auth/verify-otp');
    // Don't redirect on OTP send endpoint 401s - let the component handle it
    const isOTPSendEndpoint = error.config?.url?.includes('/auth/send-otp');
    // Don't redirect on first login check endpoint 401s - let the component handle it
    const isFirstLoginCheckEndpoint = error.config?.url?.includes('/auth/check-first-login');
    
    if (error.response?.status === 401 && !isRedirecting && !isProfileEndpoint && !isVerificationEndpoint && !isOTPVerificationEndpoint && !isOTPSendEndpoint && !isFirstLoginCheckEndpoint) {
      // Only redirect if we're not already on the login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/reset-password')) {
        // Clear any pending redirect
        if (redirectTimeout) {
          clearTimeout(redirectTimeout);
        }
        
        // Debounce redirect to prevent rapid successive redirects
        redirectTimeout = setTimeout(async () => {
          if (!isRedirecting) {
            isRedirecting = true;
            try {
              await supabase.auth.signOut();
              // Use replace to prevent back button issues
              window.location.replace('/login');
            } catch (err) {
              console.error('Error during sign out:', err);
              // Even if sign out fails, redirect to login
              window.location.replace('/login');
            }
          }
        }, 500); // 500ms debounce
      }
    }
    return Promise.reject(error);
  }
);

export default api;