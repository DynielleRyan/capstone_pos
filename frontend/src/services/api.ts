/**
 * ============================================================================
 * API SERVICE - Axios HTTP Client Configuration
 * ============================================================================
 * 
 * This file configures Axios for making HTTP requests to the backend API.
 * It includes request and response interceptors that automatically handle
 * authentication and error management, reducing boilerplate in components.
 * 
 * KEY FEATURES:
 * - Automatic JWT token injection (request interceptor)
 * - Global 401 error handling with auto-logout (response interceptor)
 * - Configurable base URL (environment-based)
 * - Request timeout protection
 * 
 * USAGE:
 *   import api from './services/api';
 *   const response = await api.get('/products');
 *   const response = await api.post('/transactions', data);
 * 
 * All requests automatically include the JWT token, and 401 errors trigger
 * automatic logout and redirect to login page.
 */

import axios from 'axios';
import { supabase } from './supabase';

/**
 * API Base URL Configuration
 * 
 * Determines the backend API URL based on environment:
 * - Production: Uses VITE_API_URL from environment variables
 * - Development: Falls back to localhost (assumes backend runs on port 3000)
 * 
 * Vite requires environment variables to be prefixed with VITE_ to be accessible
 * in the browser. These are embedded at build time.
 * 
 * Example production URL: https://backend.railway.app/api
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Axios Instance Configuration
 * 
 * Creates a configured Axios instance with:
 * - baseURL: All relative URLs are prefixed with this (e.g., '/products' becomes
 *   'http://localhost:3000/api/products')
 * - timeout: Requests fail after 20 seconds (prevents hanging on slow connections)
 * - headers: Default Content-Type header for JSON requests
 * 
 * This instance is used for all API calls throughout the application, ensuring
 * consistent configuration and allowing interceptors to work globally.
 */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * ============================================================================
 * REQUEST INTERCEPTOR - Automatic Token Injection
 * ============================================================================
 * 
 * Automatically adds JWT authentication token to every API request before it's
 * sent to the backend. This eliminates the need to manually add tokens in every
 * component, reducing code duplication and ensuring consistent authentication.
 * 
 * HOW IT WORKS:
 * 1. Intercepts request before it leaves the browser
 * 2. Retrieves current Supabase session (contains JWT token)
 * 3. Extracts access_token from session
 * 4. Adds "Authorization: Bearer {token}" header to request
 * 5. Request proceeds to backend with authentication
 * 
 * PROTECTED ENDPOINT DETECTION:
 * Some endpoints require authentication. If no token is available and the endpoint
 * is protected, the request is rejected immediately rather than sending an
 * unauthenticated request that will fail on the backend.
 * 
 * This prevents unnecessary network requests and provides faster error feedback.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      /**
       * Check for Existing Authorization Header
       * 
       * Some requests might explicitly set the Authorization header (e.g., OTP
       * verification uses a temporary session token). If a header already exists,
       * we don't override it, allowing for special cases.
       */
      if (config.headers.Authorization) {
        return config;
      }

      /**
       * Retrieve Current Session
       * 
       * Gets the current Supabase session from localStorage. The session contains
       * the JWT access token that the backend uses to identify and authenticate
       * the user. If the user is not logged in, session will be null.
       */
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        /**
         * Add JWT Token to Request Header
         * 
         * The "Bearer" prefix is part of the HTTP authentication standard for
         * token-based auth. The backend expects this format and extracts the token
         * from the Authorization header to validate the user's identity.
         */
        config.headers.Authorization = `Bearer ${session.access_token}`;
      } else {
        /**
         * No Token Available - Check if Endpoint Requires Auth
         * 
         * Some endpoints are public (like /auth/register), while others require
         * authentication. We check the URL to determine if this is a protected
         * endpoint, and if so, reject the request immediately rather than sending
         * an unauthenticated request that will fail on the backend.
         * 
         * This provides faster error feedback and reduces unnecessary network traffic.
         */
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
      /**
       * Error Handling
       * 
       * If retrieving the session fails (e.g., localStorage is blocked), we only
       * reject the request if it's a protected endpoint. Public endpoints can
       * proceed without authentication.
       */
      console.error('Error getting session:', error);
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
    /**
     * Interceptor Error Handler
     * 
     * If the interceptor itself encounters an error (rare), we reject the request
     * to prevent it from proceeding with invalid configuration.
     */
    return Promise.reject(error);
  }
);

/**
 * ============================================================================
 * RESPONSE INTERCEPTOR - Global Error Handling
 * ============================================================================
 * 
 * Intercepts all API responses to handle errors globally, especially authentication
 * errors (401 Unauthorized). This provides a consistent error handling strategy
 * across the entire application without requiring error handling in every component.
 * 
 * 401 ERROR HANDLING:
 * When the backend returns 401, it means:
 * - JWT token has expired (typically after 1 hour)
 * - JWT token is invalid or malformed
 * - User is not authenticated
 * 
 * The interceptor automatically:
 * 1. Signs out the user (clears Supabase session)
 * 2. Redirects to login page
 * 3. Prevents the user from accessing protected content
 * 
 * EXCEPTIONS:
 * Some endpoints legitimately return 401 and should not trigger auto-logout:
 * - /auth/profile: May return 401 if user not logged in (component handles gracefully)
 * - /auth/verify-pharmacist-admin: Returns 401 for invalid credentials (expected)
 * - OTP endpoints: Return 401 for invalid OTP (component shows error message)
 * 
 * These endpoints are excluded from auto-logout to allow proper error handling
 * in the components.
 */

/**
 * Redirect State Management
 * 
 * Prevents multiple simultaneous redirects that could occur if multiple API
 * requests fail with 401 at the same time. The debounce timer ensures we
 * only redirect once, even if multiple requests fail simultaneously.
 */
let isRedirecting = false;
let redirectTimeout: ReturnType<typeof setTimeout> | null = null;

api.interceptors.response.use(
  /**
   * Success Handler
   * 
   * For successful responses, simply return the response as-is. No processing
   * needed - let the component handle the data.
   */
  (response) => response,
  
  /**
   * Error Handler
   * 
   * Processes all error responses, with special handling for 401 errors that
   * indicate authentication failure.
   */
  async (error) => {
    /**
     * Identify Endpoints That Should Not Trigger Auto-Logout
     * 
     * These endpoints return 401 for legitimate reasons (invalid credentials,
     * not logged in, etc.) and should be handled by the component, not trigger
     * automatic logout. This allows for proper user feedback in these cases.
     */
    const isProfileEndpoint = error.config?.url?.includes('/auth/profile');
    const isVerificationEndpoint = error.config?.url?.includes('/auth/verify-pharmacist-admin');
    const isOTPVerificationEndpoint = error.config?.url?.includes('/auth/verify-otp');
    const isOTPSendEndpoint = error.config?.url?.includes('/auth/send-otp');
    const isFirstLoginCheckEndpoint = error.config?.url?.includes('/auth/check-first-login');
    
    /**
     * Handle 401 Unauthorized Errors
     * 
     * 401 status indicates authentication failure. We automatically log out
     * the user and redirect to login, but only if:
     * 1. Not already redirecting (prevent multiple redirects)
     * 2. Not an excluded endpoint (component handles these)
     * 3. Not already on login/reset-password page (prevent redirect loops)
     */
    if (error.response?.status === 401 && 
        !isRedirecting && 
        !isProfileEndpoint && 
        !isVerificationEndpoint && 
        !isOTPVerificationEndpoint && 
        !isOTPSendEndpoint && 
        !isFirstLoginCheckEndpoint) {
      
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/reset-password')) {
        /**
         * Debounce Redirect
         * 
         * Clear any pending redirect and set a new one. The 500ms delay prevents
         * rapid redirects if multiple requests fail simultaneously. This ensures
         * a smooth user experience and prevents redirect loops.
         */
        if (redirectTimeout) {
          clearTimeout(redirectTimeout);
        }
        
        redirectTimeout = setTimeout(async () => {
          if (!isRedirecting) {
            isRedirecting = true;
            try {
              /**
               * Sign Out User
               * 
               * Clears the Supabase session from localStorage, invalidating the
               * JWT token. This ensures the user cannot make authenticated requests
               * until they log in again.
               */
              await supabase.auth.signOut();
              
              /**
               * Redirect to Login
               * 
               * Uses window.location.replace() instead of React Router's navigate()
               * because:
               * 1. We're in an interceptor, not a React component
               * 2. replace() replaces the current history entry, preventing back
               *    button from returning to the protected page
               * 3. Forces a full page reload, clearing any component state
               */
              window.location.replace('/login');
            } catch (err) {
              /**
               * Error During Sign Out
               * 
               * Even if sign out fails (e.g., localStorage blocked), we still
               * redirect to login. The user will need to log in again anyway,
               * and the redirect ensures they can't access protected content.
               */
              console.error('Error during sign out:', err);
              window.location.replace('/login');
            }
          }
        }, 500);
      }
    }
    
    /**
     * Reject Error for Component Handling
     * 
     * Always reject the error so components can handle it if needed. This allows
     * components to show specific error messages or perform custom error handling
     * for non-401 errors (e.g., 400 validation errors, 500 server errors).
     */
    return Promise.reject(error);
  }
);

export default api;