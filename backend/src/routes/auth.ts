/**
 * ============================================================================
 * AUTHENTICATION ROUTES - routes/auth.ts
 * ============================================================================
 * 
 * This file defines all authentication-related API endpoints.
 * 
 * ROUTE STRUCTURE:
 * All routes are prefixed with /api/auth (defined in server.ts)
 * 
 * ENDPOINTS:
 * - POST   /api/auth/register              → Create new user account
 * - GET    /api/auth/profile               → Get current user profile
 * - PUT    /api/auth/profile               → Update user profile
 * - PUT    /api/auth/change-password        → Change user password
 * - DELETE /api/auth/deactivate             → Deactivate user account
 * - POST   /api/auth/verify-pharmacist-admin → Verify pharmacist/admin credentials
 * - POST   /api/auth/check-first-login      → Check if first-time login OTP required
 * - POST   /api/auth/send-otp               → Send OTP for first-time login
 * - POST   /api/auth/verify-otp              → Verify OTP and complete first login
 * - POST   /api/auth/manual-confirm         → Manually confirm user email (admin)
 * 
 * AUTHENTICATION:
 * Most routes require JWT token in Authorization header:
 *   Authorization: Bearer {token}
 * 
 * EXCEPTIONS:
 * - /register: Public (no auth required)
 * - /verify-pharmacist-admin: Public (used for authorization verification)
 */

// Import Express Router to create route handlers
import express from 'express';

// Import all authentication controller functions
import { 
  register,              // Create new user
  getProfile,            // Get user profile
  updateProfile,         // Update user profile
  changePassword,        // Change password
  deactivateAccount,    // Deactivate account
  confirmUserEmail,     // Manually confirm email
  verifyPharmacistAdmin, // Verify pharmacist/admin credentials
  checkFirstLogin,      // Check if OTP required
  sendOTP,              // Send OTP email
  verifyOTP             // Verify OTP code
} from '../controllers/authController';

// Create Express router instance
const router = express.Router();

/**
 * ============================================================================
 * USER REGISTRATION AND PROFILE ROUTES
 * ============================================================================
 */

// POST /api/auth/register
// Create a new user account
// Public endpoint (no authentication required)
router.post('/register', register);

// GET /api/auth/profile
// Get current user's profile information
// Requires: JWT token in Authorization header
router.get('/profile', getProfile);

// PUT /api/auth/profile
// Update current user's profile (name, username, contact number)
// Requires: JWT token in Authorization header
router.put('/profile', updateProfile);

// PUT /api/auth/change-password
// Change current user's password
// Requires: JWT token in Authorization header
router.put('/change-password', changePassword);

// DELETE /api/auth/deactivate
// Deactivate current user's account (soft delete)
// Requires: JWT token in Authorization header
router.delete('/deactivate', deactivateAccount);

/**
 * ============================================================================
 * FIRST-TIME LOGIN OTP ROUTES
 * ============================================================================
 * 
 * These routes handle the first-time login OTP verification flow:
 * 1. User logs in → check-first-login checks if OTP required
 * 2. If required → send-otp sends 6-digit code via email
 * 3. User enters code → verify-otp validates and completes login
 */

// POST /api/auth/check-first-login
// Check if user requires first-time login OTP verification
// Checks: HasCompletedFirstLogin flag and trusted device cookie
// Requires: JWT token in Authorization header
router.post('/check-first-login', checkFirstLogin);

// POST /api/auth/send-otp
// Generate and send 6-digit OTP to user's email
// Stores OTP in user metadata (temporary, expires in 10 minutes)
// Requires: JWT token in Authorization header
router.post('/send-otp', sendOTP);

// POST /api/auth/verify-otp
// Verify the OTP code and complete first-time login
// Sets HasCompletedFirstLogin = true
// Creates trusted device record and sets httpOnly cookie
// Requires: JWT token in Authorization header
router.post('/verify-otp', verifyOTP);

/**
 * ============================================================================
 * ADMIN AND VERIFICATION ROUTES
 * ============================================================================
 */

// POST /api/auth/verify-pharmacist-admin
// Verify pharmacist or admin credentials for sensitive operations
// Used when a clerk needs authorization from pharmacist/admin
// Public endpoint (no auth required, but requires valid credentials)
router.post('/verify-pharmacist-admin', verifyPharmacistAdmin);

// POST /api/auth/manual-confirm
// Manually confirm a user's email address (admin operation)
// Used when email confirmation is needed outside normal flow
// Requires: Admin privileges (typically)
router.post('/manual-confirm', confirmUserEmail);

// Export router to be used in server.ts
export default router;


