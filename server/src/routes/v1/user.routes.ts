import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  getSecurityInfo,
  logoutOtherSessions,
  logoutAllSessions,
} from '../../controllers/userProfile.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { passwordResetLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

// All user profile and account management routes require active authentication
router.use(authenticate);

// Profile Management (Me aliases)
router.get('/me/profile', getProfile);
router.patch('/me/profile', updateProfile);
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

// Avatar Upload & Deletion
router.post('/me/avatar', uploadAvatar);
router.delete('/me/avatar', deleteAvatar);
router.post('/avatar', uploadAvatar);
router.delete('/avatar', deleteAvatar);

// Change Password
router.post('/me/change-password', passwordResetLimiter, changePassword);
router.post('/change-password', passwordResetLimiter, changePassword);

// Account Security & Session Management
router.get('/me/security', getSecurityInfo);
router.get('/security', getSecurityInfo);
router.post('/me/logout-other-sessions', logoutOtherSessions);
router.post('/logout-other-sessions', logoutOtherSessions);
router.post('/me/logout-all-sessions', logoutAllSessions);
router.post('/logout-all-sessions', logoutAllSessions);

export default router;
