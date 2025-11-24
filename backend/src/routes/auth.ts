import express from 'express';
import { register, getProfile, updateProfile, changePassword, deactivateAccount, confirmUserEmail } from '../controllers/authController';

const router = express.Router();

// Auth routes
router.post('/register', register);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.delete('/deactivate', deactivateAccount);


router.post('/manual-confirm',confirmUserEmail);

export default router;


