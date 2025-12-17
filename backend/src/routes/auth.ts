/**
 * ============================================================================
 * AUTHENTICATION ROUTES
 * ============================================================================
 * 
 * This file defines all authentication and user management API endpoints.
 * Routes are mounted at /api/auth in server.ts, so all endpoints here are
 * prefixed with that path.
 * 
 * AUTHENTICATION REQUIREMENTS:
 * Most routes require a valid JWT token in the Authorization header:
 *   Authorization: Bearer {token}
 * 
 * The token is obtained when a user logs in via Supabase Auth and is validated
 * by the controller functions before processing requests.
 * 
 * PUBLIC ENDPOINTS (No Auth Required):
 * - POST /api/auth/register - User registration (creates new account)
 * - POST /api/auth/verify-pharmacist-admin - Credential verification for clerks
 * 
 * These endpoints are public because they're used before authentication or for
 * authorization purposes that require separate credential verification.
 */

import express from 'express';
import { 
  register,
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  confirmUserEmail,
  verifyPharmacistAdmin,
  checkFirstLogin,
  sendOTP,
  verifyOTP
} from '../controllers/authController';

/**
 * Express Router Instance
 * 
 * Creates a router that will handle all authentication-related routes.
 * This router is then mounted in server.ts at /api/auth, so a route defined
 * here as '/profile' becomes accessible at /api/auth/profile.
 */
const router = express.Router();

/**
 * ============================================================================
 * USER REGISTRATION AND PROFILE MANAGEMENT
 * ============================================================================
 */

/**
 * User Registration
 * 
 * Creates a new user account in both Supabase Auth and the User table.
 * This is a public endpoint (no authentication required) because users
 * need to register before they can log in.
 * 
 * The registration process:
 * 1. Creates user in Supabase Auth (handles password hashing)
 * 2. Creates corresponding record in User table (stores additional profile data)
 * 3. If user is a pharmacist, creates Pharmacist record
 * 
 * Returns the created user data (excluding sensitive information like password).
 */
router.post('/register', register);

/**
 * Get User Profile
 * 
 * Retrieves the current authenticated user's profile information from the User table.
 * The user is identified by their JWT token, which contains their Supabase Auth user ID.
 * 
 * Also updates the DateTimeLastLoggedIn field to track user activity.
 * 
 * Returns user data including name, username, contact number, role, and first login status.
 */
router.get('/profile', getProfile);

/**
 * Update User Profile
 * 
 * Allows users to update their profile information (name, username, contact number).
 * The username must be unique, so the controller checks for conflicts before updating.
 * 
 * Only the authenticated user can update their own profile (enforced by JWT validation).
 * The UpdatedAt timestamp is automatically set to track when the profile was last modified.
 */
router.put('/profile', updateProfile);

/**
 * Change Password
 * 
 * Updates the user's password in Supabase Auth. The old password is not required
 * because the JWT token already proves the user's identity. This is a common pattern
 * for password changes when the user is already authenticated.
 * 
 * Password must be at least 6 characters long (enforced by Supabase).
 */
router.put('/change-password', changePassword);

/**
 * Deactivate Account
 * 
 * Soft deletes the user account by setting IsActive = false. This is a soft delete
 * because the user data is preserved for audit purposes, but the account is marked
 * as inactive and cannot be used for login.
 * 
 * The user record remains in the database but is excluded from active user queries.
 */
router.delete('/deactivate', deactivateAccount);

/**
 * ============================================================================
 * FIRST-TIME LOGIN OTP VERIFICATION
 * ============================================================================
 * 
 * These routes implement a security feature that requires new users to verify
 * their email address via OTP (One-Time Password) on their first login. This
 * prevents unauthorized access if someone gains access to user credentials.
 * 
 * FLOW:
 * 1. User logs in successfully → Frontend calls check-first-login
 * 2. Backend checks HasCompletedFirstLogin flag and device cookie
 * 3. If OTP required → Frontend calls send-otp to generate and email code
 * 4. User enters 6-digit code → Frontend calls verify-otp
 * 5. Backend validates code → Sets HasCompletedFirstLogin = true, creates device cookie
 * 6. Future logins on same device → Device cookie present → Skip OTP
 * 
 * SECURITY BENEFITS:
 * - Verifies email address ownership
 * - Creates device trust (httpOnly cookie prevents JavaScript access)
 * - OTP expires in 10 minutes (time-limited security)
 * - Device-based trust reduces friction for returning users
 */

/**
 * Check First Login Status
 * 
 * Determines if the user needs to complete OTP verification. Checks two conditions:
 * 1. HasCompletedFirstLogin flag in User table (global first login status)
 * 2. Device cookie (device_token_{userId}) - indicates trusted device
 * 
 * If either condition is false, OTP is required. This allows the system to:
 * - Require OTP for first-time users
 * - Require OTP when using a new device/browser (cookie cleared)
 * - Skip OTP for returning users on trusted devices
 * 
 * Returns: { requiresOTP: boolean, hasCompletedFirstLogin: boolean, isDeviceTrusted: boolean }
 */
router.post('/check-first-login', checkFirstLogin);

/**
 * Send OTP Email
 * 
 * Generates a random 6-digit code and sends it to the user's email address via SendGrid.
 * The OTP is temporarily stored in the user's metadata in Supabase Auth with a 10-minute
 * expiration timestamp.
 * 
 * The OTP is stored server-side (not in the database) to prevent database queries during
 * verification, improving performance. After 10 minutes, the OTP becomes invalid.
 * 
 * If SendGrid is not configured, the OTP is returned in the response (development mode only).
 */
router.post('/send-otp', sendOTP);

/**
 * Verify OTP and Complete First Login
 * 
 * Validates the 6-digit OTP code entered by the user. If valid:
 * 1. Sets HasCompletedFirstLogin = true in User table
 * 2. Generates a secure device token (32-byte random hex string)
 * 3. Creates TrustedDevices record in database
 * 4. Sets httpOnly cookie with device token (expires in 1 year)
 * 5. Clears OTP from user metadata
 * 
 * The httpOnly cookie cannot be accessed by JavaScript, providing security against
 * XSS attacks. The cookie persists across browser sessions, so users don't need to
 * verify again on the same device.
 * 
 * If verification fails (invalid code, expired, or not found), returns an error.
 */
router.post('/verify-otp', verifyOTP);

/**
 * ============================================================================
 * ADMIN AND AUTHORIZATION ROUTES
 * ============================================================================
 */

/**
 * Verify Pharmacist/Admin Credentials
 * 
 * This endpoint allows clerks to request authorization from a pharmacist or admin
 * for sensitive operations (like reprinting receipts). It's a public endpoint
 * because the clerk is already authenticated, but needs to verify a higher-privilege
 * user's credentials.
 * 
 * HOW IT WORKS:
 * 1. Clerk provides pharmacist/admin username and password
 * 2. Backend looks up user by username (case-insensitive) or email
 * 3. Verifies user has pharmacist or admin role
 * 4. Creates isolated Supabase client to verify password (prevents session conflicts)
 * 5. Attempts sign-in with provided credentials
 * 6. If successful, returns authorization confirmation
 * 7. Immediately signs out the isolated session (security best practice)
 * 
 * SECURITY: Uses an isolated client to prevent any session interference. The
 * password verification happens server-side, so credentials never leave the backend.
 * 
 * Returns: { success: true, authorizedBy: { userId, username, role } }
 */
router.post('/verify-pharmacist-admin', verifyPharmacistAdmin);

/**
 * Manually Confirm User Email
 * 
 * Admin-only endpoint that manually confirms a user's email address in Supabase Auth.
 * This bypasses the normal email confirmation flow and is useful when:
 * - Email delivery fails
 * - Admin needs to activate an account immediately
 * - Testing scenarios require confirmed accounts
 * 
 * Typically requires admin privileges, though this is enforced at the application
 * level rather than by this route handler.
 */
router.post('/manual-confirm', confirmUserEmail);

export default router;


