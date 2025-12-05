import express from 'express';
import { register, getProfile, updateProfile, changePassword, deactivateAccount, confirmUserEmail, verifyPharmacistAdmin, checkFirstLogin, sendOTP, verifyOTP } from '../controllers/authController';

const router = express.Router();

// Auth routes
router.post('/register', register);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.delete('/deactivate', deactivateAccount);
router.post('/verify-pharmacist-admin', verifyPharmacistAdmin);

// First-time login OTP routes
router.post('/check-first-login', checkFirstLogin);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

router.post('/manual-confirm',confirmUserEmail);

export default router;


