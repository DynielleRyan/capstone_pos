/**
 * ============================================================================
 * API SERVICE - AXIOS CONFIGURATION
 * ============================================================================
 * 
 * This file configures Axios (HTTP client) for making API requests to the backend.
 * It sets up interceptors to automatically handle authentication tokens and errors.
 * 
 * KEY FEATURES:
 * - Base URL configuration (points to backend server)
 * - Request interceptor: Automatically adds JWT token to all requests
 * - Response interceptor: Handles authentication errors (401) globally
 * - Timeout configuration for long-running queries
 * 
 * USAGE:
 * import api from './services/api';
 * const response = await api.get('/products');
 * const response = await api.post('/transactions', data);
 */

import axios from 'axios';
import { supabase } from './supabase';

/**
 * API BASE URL CONFIGURATION
 * 
 * Uses environment variable VITE_API_URL if available (production)
 * Falls back to localhost for development
 * 
 * Environment variables in Vite must start with VITE_ to be accessible
 * Example: VITE_API_URL=https://backend.railway.app/api
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * CREATE AXIOS INSTANCE
 * 
 * This creates a configured Axios instance that will be used for all API calls.
 * 
 * Configuration:
 * - baseURL: All requests will be prefixed with this URL
 * - timeout: Request will fail after 60 seconds (for large product queries)
 * - headers: Default headers sent with every request
 */
export const api = axios.create({
  baseURL: API_URL,  // Base URL for all API requests
  timeout: 20000,    // 20 second timeout (increased to handle slow database queries)
  headers: {
    'Content-Type': 'application/json',  // Tell server we're sending JSON
  },
});

/**
 * ============================================================================
 * REQUEST INTERCEPTOR
 * ============================================================================
 * 
 * PURPOSE: Automatically add JWT authentication token to every API request
 * 
 * HOW IT WORKS:
 * 1. Intercepts every request BEFORE it's sent to the server
 * 2. Gets the current user's session from Supabase
 * 3. Extracts the access token (JWT)
 * 4. Adds token to Authorization header as "Bearer {token}"
 * 5. Sends request with authentication
 * 
 * BENEFIT: Don't need to manually add token to every API call
 * 
 * FLOW:
 * Frontend: api.get('/products')
 *   ↓
 * Interceptor: Gets token from Supabase session
 *   ↓
 * Interceptor: Adds "Authorization: Bearer {token}" header
 *   ↓
 * Backend: Receives request with token, validates it
 */
api.interceptors.request.use(
  async (config) => {
    try {
      /**
       * CHECK IF TOKEN ALREADY SET
       * 
       * Some requests might explicitly set Authorization header
       * If so, don't override it
       */
      if (config.headers.Authorization) {
        return config;  // Use existing token
      }

      /**
       * GET CURRENT USER SESSION
       * 
       * Supabase stores the user's session (including JWT token)
       * This session is created when user logs in
       */
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        /**
         * ADD TOKEN TO REQUEST HEADER
         * 
         * Format: "Bearer {token}"
         * Backend expects this format for JWT authentication
         */
        config.headers.Authorization = `Bearer ${session.access_token}`;
      } else {
        /**
         * NO TOKEN AVAILABLE
         * 
         * Some endpoints don't require authentication (like login)
         * Only reject if it's a protected endpoint
         */
        const isProtectedEndpoint = config.url?.includes('/auth/profile') || 
                                   config.url?.includes('/auth/update') ||
                                   config.url?.includes('/auth/change-password') ||
                                   config.url?.includes('/auth/deactivate');
        
        if (isProtectedEndpoint) {
          // Protected endpoint without token - reject request
          console.warn('No session available for protected endpoint:', config.url);
          return Promise.reject(new Error('No authentication session available'));
        }
      }
    } catch (error) {
      // Error getting session - only reject for protected endpoints
      console.error('Error getting session:', error);
      const isProtectedEndpoint = config.url?.includes('/auth/profile') || 
                                 config.url?.includes('/auth/update') ||
                                 config.url?.includes('/auth/change-password') ||
                                 config.url?.includes('/auth/deactivate');
      
      if (isProtectedEndpoint) {
        return Promise.reject(new Error('Failed to get authentication session'));
      }
    }
    return config;  // Return config with token (or without if not needed)
  },
  (error) => {
    // If interceptor itself fails, reject the request
    return Promise.reject(error);
  }
);

/**
 * ============================================================================
 * RESPONSE INTERCEPTOR
 * ============================================================================
 * 
 * PURPOSE: Handle errors globally, especially authentication errors (401)
 * 
 * HOW IT WORKS:
 * 1. Intercepts every response AFTER it comes back from server
 * 2. Checks response status code
 * 3. If 401 (Unauthorized): Token expired or invalid
 * 4. Automatically logs out user and redirects to login
 * 
 * BENEFIT: Don't need to handle 401 errors in every component
 * 
 * FLOW:
 * Backend: Returns 401 (token expired)
 *   ↓
 * Interceptor: Detects 401 status
 *   ↓
 * Interceptor: Logs out user (clears session)
 *   ↓
 * Interceptor: Redirects to /login page
 */

// Prevent multiple simultaneous redirects
let isRedirecting = false;

// Debounce timer to prevent rapid redirects
let redirectTimeout: ReturnType<typeof setTimeout> | null = null;

api.interceptors.response.use(
  // Success handler: Just return the response as-is
  (response) => response,
  
  // Error handler: Process errors
  async (error) => {
    /**
     * IDENTIFY ENDPOINTS THAT SHOULD NOT TRIGGER AUTO-REDIRECT
     * 
     * Some endpoints return 401 for valid reasons:
     * - /auth/profile: User might not be logged in (component handles this)
     * - /auth/verify-pharmacist-admin: Invalid credentials (expected)
     * - OTP endpoints: Invalid OTP (component handles this)
     */
    const isProfileEndpoint = error.config?.url?.includes('/auth/profile');
    const isVerificationEndpoint = error.config?.url?.includes('/auth/verify-pharmacist-admin');
    const isOTPVerificationEndpoint = error.config?.url?.includes('/auth/verify-otp');
    const isOTPSendEndpoint = error.config?.url?.includes('/auth/send-otp');
    const isFirstLoginCheckEndpoint = error.config?.url?.includes('/auth/check-first-login');
    
    /**
     * HANDLE 401 UNAUTHORIZED ERRORS
     * 
     * Status 401 means:
     * - Token expired
     * - Token invalid
     * - User not authenticated
     * 
     * Action: Log out and redirect to login
     */
    if (error.response?.status === 401 && 
        !isRedirecting && 
        !isProfileEndpoint && 
        !isVerificationEndpoint && 
        !isOTPVerificationEndpoint && 
        !isOTPSendEndpoint && 
        !isFirstLoginCheckEndpoint) {
      
      // Only redirect if not already on login/reset-password page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/reset-password')) {
        // Clear any pending redirect (debounce)
        if (redirectTimeout) {
          clearTimeout(redirectTimeout);
        }
        
        /**
         * DEBOUNCE REDIRECT
         * 
         * Wait 500ms before redirecting
         * Prevents multiple rapid redirects if multiple requests fail simultaneously
         */
        redirectTimeout = setTimeout(async () => {
          if (!isRedirecting) {
            isRedirecting = true;
            try {
              // Sign out user from Supabase (clears session)
      await supabase.auth.signOut();
              
              // Redirect to login page
              // Use replace() instead of push() to prevent back button issues
              window.location.replace('/login');
            } catch (err) {
              console.error('Error during sign out:', err);
              // Even if sign out fails, still redirect to login
              window.location.replace('/login');
            }
          }
        }, 500); // 500ms debounce delay
      }
    }
    
    // Reject the error so components can handle it if needed
    return Promise.reject(error);
  }
);

export default api;