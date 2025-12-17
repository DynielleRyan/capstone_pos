/**
 * ============================================================================
 * ROOT APP COMPONENT - App.tsx
 * ============================================================================
 * 
 * This is the root component of the React application. It sets up:
 * - React Router for navigation between pages
 * - Authentication context provider (global auth state)
 * - Toast notifications (success/error messages)
 * - Route protection (requires login for certain pages)
 * 
 * COMPONENT STRUCTURE:
 * - AuthProvider: Wraps entire app to provide auth state globally
 * - BrowserRouter: Enables client-side routing
 * - Routes: Defines all application routes
 * - Toaster: Displays toast notifications
 * 
 * ROUTE TYPES:
 * - Public Routes: Login, Reset Password (redirect to dashboard if logged in)
 * - Protected Routes: Dashboard, History (require authentication)
 */

// Import React Router components for navigation
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import toast notification component
import { Toaster } from 'react-hot-toast';

// Import authentication context and hook
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import page components
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

/**
 * ============================================================================
 * PROTECTED ROUTE COMPONENT
 * ============================================================================
 * 
 * PURPOSE: Prevents unauthorized access to protected pages
 * 
 * HOW IT WORKS:
 * 1. Uses useAuth() hook to get current user and loading state
 * 2. Shows loading spinner while checking authentication
 * 3. If user is authenticated: Render the protected page
 * 4. If user is NOT authenticated: Redirect to /login
 * 
 * USAGE:
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * 
 * This ensures users must be logged in to access the dashboard
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Get authentication state from context
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-brand-blue"></div>
      </div>
    );
  }

  // If user exists, render the protected page
  // Otherwise, redirect to login page
  // replace prop: Replaces current history entry (prevents back button issues)
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

/**
 * ============================================================================
 * PUBLIC ROUTE COMPONENT
 * ============================================================================
 * 
 * PURPOSE: Redirects logged-in users away from public pages (like login)
 * 
 * HOW IT WORKS:
 * 1. Uses useAuth() hook to get current user and loading state
 * 2. Shows loading spinner while checking authentication
 * 3. Special case: If user is in OTP verification mode, allow access
 * 4. If user is logged in: Redirect to /dashboard
 * 5. If user is NOT logged in: Render the public page (login, etc.)
 * 
 * USAGE:
 * <PublicRoute>
 *   <LoginPage />
 * </PublicRoute>
 * 
 * This prevents logged-in users from seeing the login page
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  // Get authentication state from context
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-brand-blue"></div>
      </div>
    );
  }

  /**
   * OTP VERIFICATION MODE CHECK
   * 
   * When a user logs in for the first time, they need to verify with OTP.
   * During this process, we set a flag in sessionStorage to prevent
   * automatic redirects that would interrupt the OTP flow.
   */
  const isOTPVerification = sessionStorage.getItem('otpVerification') === 'true';
  
  // If user exists but is in OTP verification, allow access to login page
  // This prevents redirect loops during OTP verification
  if (user && isOTPVerification) {
    return <>{children}</>;
  }
  
  // If user is logged in, redirect to dashboard
  // Otherwise, render the public page (login, reset password, etc.)
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

/**
 * ============================================================================
 * APP ROUTES COMPONENT
 * ============================================================================
 * 
 * Defines all application routes and their protection levels
 * 
 * ROUTE STRUCTURE:
 * - "/" → Redirects to /login
 * - "/login" → Public route (LoginPage)
 * - "/reset-password" → Public route (ResetPasswordPage)
 * - "/dashboard" → Protected route (DashboardPage)
 * - "/history" → Protected route (HistoryPage)
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Root path - redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Login page - public route (redirects if already logged in) */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      
      {/* Password reset page - public route (no redirect needed) */}
      <Route 
        path="/reset-password" 
        element={<ResetPasswordPage />} 
      />
      
      {/* Dashboard page - protected route (requires authentication) */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Transaction history page - protected route (requires authentication) */}
      <Route 
        path="/history" 
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

/**
 * ============================================================================
 * MAIN APP COMPONENT
 * ============================================================================
 * 
 * This is the root component that wraps the entire application.
 * 
 * COMPONENT HIERARCHY:
 * AuthProvider (provides auth state to all children)
 *   └── BrowserRouter (enables client-side routing)
 *       └── AppRoutes (defines all routes)
 *       └── Toaster (displays toast notifications)
 * 
 * AUTH PROVIDER:
 * - Wraps entire app to make authentication state available everywhere
 * - Components can use useAuth() hook to access user, session, profile
 * 
 * BROWSER ROUTER:
 * - Enables client-side routing (no page reloads)
 * - Manages browser history
 * - Handles URL changes
 * 
 * TOASTER:
 * - Global toast notification system
 * - Displays success/error messages
 * - Configured with custom styles and durations
 */
function App() {
  return (
    // AuthProvider: Makes authentication state available to all components
    <AuthProvider>
      {/* BrowserRouter: Enables client-side routing */}
      <BrowserRouter>
        {/* AppRoutes: Defines all application routes */}
        <AppRoutes />
        
        {/* Toaster: Global toast notification component */}
        <Toaster 
          position="top-center"  // Position at top center of screen
          toastOptions={{
            // Default toast settings
            duration: 3000,  // Show for 3 seconds
            style: {
              background: '#363636',  // Dark gray background
              color: '#fff',  // White text
            },
            // Success toast settings (green)
            success: {
              duration: 4000,  // Show for 4 seconds
              style: {
                background: '#10B981',  // Green background
                color: '#fff',  // White text
              },
            },
            // Error toast settings (red)
            error: {
              duration: 4000,  // Show for 4 seconds
              style: {
                background: '#EF4444',  // Red background
                color: '#fff',  // White text
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
