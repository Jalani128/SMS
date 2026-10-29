import { Router } from 'express';
import {
  registerSchool,
  verifySchoolOtp,
  resendSchoolOtp,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  getAdminExample,
  getTeacherClassExample,
  getStudentProfileExample,
  getParentWardExample,
  getSuperAdminExample,
} from '../../controllers/auth.controller.js';
import { changePassword } from '../../controllers/userProfile.controller.js';
import {
  authenticate,
  authorizeRoles,
  enforceSchoolContext,
} from '../../middlewares/auth.middleware.js';
import {
  loginLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
} from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

// ============================================================================
// Public Authentication & Onboarding Routes
// ============================================================================

/**
 * @route   POST /api/v1/auth/register-school
 * @desc    Self-service school registration & sends initial OTP
 * @access  Public
 */
router.post('/register-school', otpSendLimiter, registerSchool);

/**
 * @route   POST /api/v1/auth/verify-school-otp
 * @desc    Verify 6-digit email OTP and apply school activation policy
 * @access  Public
 */
router.post('/verify-school-otp', otpVerifyLimiter, verifySchoolOtp);

/**
 * @route   POST /api/v1/auth/resend-school-otp
 * @desc    Resend OTP to school email with 60s cooldown
 * @access  Public
 */
router.post('/resend-school-otp', otpSendLimiter, resendSchoolOtp);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user credentials, return dual-mode JWT (cookie + bearer)
 * @access  Public
 */
router.post('/login', loginLimiter, login);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset token (generic response prevents user enumeration)
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using verified token and enforce session invalidation
 * @access  Public
 */
router.post('/reset-password', passwordResetLimiter, resetPassword);

// ============================================================================
// Authenticated Session Management
// ============================================================================

/**
 * @route   GET /api/v1/auth/me
 * @desc    Inspect current authenticated identity, tenant school scope, and permissions
 * @access  Protected (Requires HttpOnly cookie or Bearer token)
 */
router.get('/me', authenticate, getMe);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Clear auth cookie and increment tokenVersion for instant server revocation
 * @access  Protected
 */
router.post('/logout', authenticate, logout);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change authenticated user password, invalidate other sessions, and refresh current token
 * @access  Protected
 */
router.post('/change-password', authenticate, passwordResetLimiter, changePassword);

// ============================================================================
// Protected Example Endpoints (Demonstrating Fine-Grained RBAC & Tenant Scoping)
// ============================================================================

/**
 * @route   GET /api/v1/auth/examples/admin-only
 * @desc    Verify admin role access
 * @access  Protected (admin, super_admin)
 */
router.get(
  '/examples/admin-only',
  authenticate,
  enforceSchoolContext,
  authorizeRoles('admin', 'super_admin'),
  getAdminExample
);

/**
 * @route   GET /api/v1/auth/examples/teacher-class/:classId
 * @desc    Verify teacher assigned to specific class
 * @access  Protected (teacher, admin, super_admin)
 */
router.get(
  '/examples/teacher-class/:classId',
  authenticate,
  enforceSchoolContext,
  authorizeRoles('teacher', 'admin', 'super_admin'),
  getTeacherClassExample
);

/**
 * @route   GET /api/v1/auth/examples/student-profile/:studentId
 * @desc    Verify student self-ownership isolation
 * @access  Protected (student, admin, super_admin)
 */
router.get(
  '/examples/student-profile/:studentId',
  authenticate,
  enforceSchoolContext,
  authorizeRoles('student', 'admin', 'super_admin'),
  getStudentProfileExample
);

/**
 * @route   GET /api/v1/auth/examples/parent-ward/:studentId
 * @desc    Verify parent-child guardian relationship
 * @access  Protected (parent, admin, super_admin)
 */
router.get(
  '/examples/parent-ward/:studentId',
  authenticate,
  enforceSchoolContext,
  authorizeRoles('parent', 'admin', 'super_admin'),
  getParentWardExample
);

/**
 * @route   GET /api/v1/auth/examples/super-admin
 * @desc    Verify platform super-admin role
 * @access  Protected (super_admin)
 */
router.get(
  '/examples/super-admin',
  authenticate,
  authorizeRoles('super_admin'),
  getSuperAdminExample
);

export default router;
