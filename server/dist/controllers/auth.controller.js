import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { User } from '../models/User.model.js';
import { School } from '../models/School.model.js';
import { OTPVerification } from '../models/OTPVerification.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Student } from '../models/Student.model.js';
import { Parent } from '../models/Parent.model.js';
import { Section } from '../models/Section.model.js';
import { Timetable } from '../models/Timetable.model.js';
import { sendEmail } from '../config/mailer.js';
import { logger } from '../utils/logger.js';
import { setAuthCookie, clearAuthCookie } from '../middlewares/auth.middleware.js';
import { getRolePermissions } from '../config/permissions.js';
import { registerSchoolSchema, verifySchoolOtpSchema, resendSchoolOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, } from '../validations/auth.validation.js';
/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
const generateSecureOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};
const OFFLINE_DEMO_USERS = {
    'admin@greenwood.edu': {
        id: '64bf11111111111111111111',
        email: 'admin@greenwood.edu',
        name: 'Dr. Arthur Vance',
        role: 'admin',
        schoolId: '64bf00000000000000000001',
        schoolName: 'Greenwood International Academy',
    },
    'superadmin@edumanage.global': {
        id: '64bf00000000000000000000',
        email: 'superadmin@edumanage.global',
        name: 'Global Platform Admin',
        role: 'super_admin',
        schoolId: '64bf00000000000000000001',
        schoolName: 'System Administration',
    },
    'superadmin@edumanage.example.com': {
        id: '64bf00000000000000000000',
        email: 'superadmin@edumanage.example.com',
        name: 'Global Platform Admin',
        role: 'super_admin',
        schoolId: '64bf00000000000000000001',
        schoolName: 'System Administration',
    },
    'clara.oswald@greenwood.edu': {
        id: '64bf22222222222222222222',
        email: 'clara.oswald@greenwood.edu',
        name: 'Prof. Clara Oswald',
        role: 'teacher',
        schoolId: '64bf00000000000000000001',
        schoolName: 'Greenwood International Academy',
    },
    'teacher@greenwood.edu': {
        id: '64bf22222222222222222222',
        email: 'teacher@greenwood.edu',
        name: 'Prof. Clara Oswald',
        role: 'teacher',
        schoolId: '64bf00000000000000000001',
        schoolName: 'Greenwood International Academy',
    },
    'liam.chen@student.greenwood.edu': {
        id: '64bf33333333333333333333',
        email: 'liam.chen@student.greenwood.edu',
        name: 'Liam Chen',
        role: 'student',
        schoolId: '64bf00000000000000000001',
        schoolName: 'Greenwood International Academy',
    },
    'student@greenwood.edu': {
        id: '64bf33333333333333333333',
        email: 'student@greenwood.edu',
        name: 'Liam Chen',
        role: 'student',
        schoolId: '64bf00000000000000000001',
        schoolName: 'Greenwood International Academy',
    },
    'sarah.chen@parent.example.com': {
        id: '64bf44444444444444444444',
        email: 'sarah.chen@parent.example.com',
        name: 'Sarah Chen (Parent of Liam)',
        role: 'parent',
        schoolId: '64bf00000000000000000001',
        schoolName: 'Greenwood International Academy',
    },
    'parent@greenwood.edu': {
        id: '64bf44444444444444444444',
        email: 'parent@greenwood.edu',
        name: 'Sarah Chen (Parent of Liam)',
        role: 'parent',
        schoolId: '64bf00000000000000000001',
        schoolName: 'Greenwood International Academy',
    },
};
/**
 * POST /api/auth/register-school
 * Self-service multi-school onboarding.
 * Validates school and admin details, registers pending entities,
 * issues a 6-digit hashed OTP with 5-minute expiry, and sends verification email.
 */
export const registerSchool = async (req, res) => {
    const validatedData = registerSchoolSchema.parse(req.body);
    const schoolEmail = validatedData.schoolEmail.toLowerCase().trim();
    const adminEmail = validatedData.adminEmail.toLowerCase().trim();
    const slug = validatedData.slug.toLowerCase().trim();
    const code = validatedData.code.toUpperCase().trim();
    // Check for uniqueness conflicts
    const existingSchool = await School.findOne({
        $or: [{ email: schoolEmail }, { slug }, { code }],
    });
    if (existingSchool) {
        if (existingSchool.email === schoolEmail) {
            throw ApiError.conflict('A school with this email address is already registered.');
        }
        if (existingSchool.slug === slug) {
            throw ApiError.conflict('This school slug identifier is already in use.');
        }
        if (existingSchool.code === code) {
            throw ApiError.conflict('This school code is already in use.');
        }
    }
    // Check if admin user email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
        throw ApiError.conflict('An administrator account with this email address already exists.');
    }
    // Atomic sequential creation with compensatory rollback
    let createdSchool = null;
    let createdAdmin = null;
    try {
        // 1. Create School record in 'pending' status
        createdSchool = await School.create({
            name: validatedData.name.trim(),
            slug,
            code,
            email: schoolEmail,
            phone: validatedData.phone?.trim(),
            address: validatedData.address,
            timezone: validatedData.timezone || 'UTC',
            currency: validatedData.currency || 'USD',
            status: 'pending',
            emailVerificationStatus: 'pending',
        });
        // 2. Hash admin password with bcrypt (12 rounds)
        const passwordSalt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(validatedData.password, passwordSalt);
        // 3. Create Admin User linked to School
        createdAdmin = await User.create({
            name: validatedData.adminName.trim(),
            email: adminEmail,
            passwordHash,
            role: 'admin',
            schoolId: createdSchool._id,
            isActive: true,
            emailVerified: false,
            tokenVersion: 0,
            phone: validatedData.adminPhone?.trim(),
        });
        // 4. Invalidate any prior active OTPs for this school email
        await OTPVerification.updateMany({ identifier: schoolEmail, isUsed: false }, { $set: { isUsed: true } });
        // 5. Generate cryptographically secure 6-digit OTP
        const rawOtp = generateSecureOtp();
        const otpSalt = await bcrypt.genSalt(10);
        const hashedOTP = await bcrypt.hash(rawOtp, otpSalt);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await OTPVerification.create({
            schoolId: createdSchool._id,
            identifier: schoolEmail,
            hashedOTP,
            purpose: 'school_activation',
            expiresAt,
            isUsed: false,
            attempts: 0,
            maxAttempts: 5,
        });
        // 6. Send OTP verification email via configured transporter (never log raw OTP)
        await sendEmail({
            to: schoolEmail,
            subject: 'EduManage - Verify Your School Registration',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a; margin-top: 0;">School Registration Verification</h2>
          <p>Welcome to EduManage, <strong>${createdSchool.name}</strong>!</p>
          <p>Your 6-digit email verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e40af; background: #eff6ff; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
            ${rawOtp}
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in <strong>5 minutes</strong>. If you did not initiate this registration, please disregard this email.</p>
        </div>
      `,
        });
        return ApiResponse.created(res, {
            school: {
                id: createdSchool._id,
                name: createdSchool.name,
                slug: createdSchool.slug,
                code: createdSchool.code,
                email: createdSchool.email,
                status: createdSchool.status,
                emailVerificationStatus: createdSchool.emailVerificationStatus,
            },
            admin: {
                id: createdAdmin._id,
                name: createdAdmin.name,
                email: createdAdmin.email,
                role: createdAdmin.role,
            },
            verification: {
                emailSentTo: schoolEmail,
                expiresInSeconds: 300,
            },
        }, 'School registered successfully. Verification OTP dispatched to school contact email.');
    }
    catch (error) {
        // Compensatory rollback in case of partial creation
        if (createdAdmin?._id) {
            await User.findByIdAndDelete(createdAdmin._id);
        }
        if (createdSchool?._id) {
            await School.findByIdAndDelete(createdSchool._id);
        }
        throw error;
    }
};
/**
 * POST /api/auth/verify-school-otp
 * Verifies the 6-digit OTP code against bcrypt hash.
 * Enforces attempt limits (max 5) and expiration (5 minutes).
 * Atomically marks OTP as used to prevent replay attacks.
 * Updates School emailVerificationStatus and applies activation policy.
 */
export const verifySchoolOtp = async (req, res) => {
    const { email, otp } = verifySchoolOtpSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    // Find active, unused OTP for school activation or email verification
    const otpDoc = await OTPVerification.findOne({
        identifier: normalizedEmail,
        purpose: { $in: ['school_activation', 'email_verification'] },
        isUsed: false,
        expiresAt: { $gt: new Date() },
    }).select('+hashedOTP');
    if (!otpDoc) {
        throw ApiError.badRequest('Invalid or expired verification code. Please request a new OTP.');
    }
    // Guard against brute force
    if (otpDoc.attempts >= otpDoc.maxAttempts) {
        otpDoc.isUsed = true;
        await otpDoc.save();
        throw ApiError.badRequest('Maximum verification attempts exceeded. Please request a new OTP.');
    }
    // Verify candidate OTP
    const isMatch = await otpDoc.verifyCandidateOTP(otp);
    if (!isMatch) {
        const remaining = otpDoc.maxAttempts - otpDoc.attempts;
        throw ApiError.badRequest(remaining > 0
            ? `Invalid verification code. ${remaining} attempt(s) remaining.`
            : 'Maximum verification attempts exceeded. Please request a new OTP.');
    }
    // Successful verification: update School and Admin records
    const school = await School.findOne({ email: normalizedEmail });
    if (school) {
        school.emailVerificationStatus = 'verified';
        // School activation policy: auto-activate in dev or if config allows; otherwise keep pending admin approval
        if (env.AUTO_ACTIVATE_SCHOOLS) {
            school.status = 'active';
            school.activatedAt = new Date();
        }
        else {
            school.status = 'pending';
        }
        await school.save();
        // Mark admin user email verified
        await User.updateMany({ schoolId: school._id, role: 'admin' }, { $set: { emailVerified: true } });
    }
    // Also verify user directly if user email matches
    await User.updateOne({ email: normalizedEmail }, { $set: { emailVerified: true } });
    return ApiResponse.success(res, {
        emailVerified: true,
        schoolStatus: school ? school.status : 'active',
        schoolVerificationStatus: school ? school.emailVerificationStatus : 'verified',
        activationNotice: school?.status === 'active'
            ? 'School account is active. You may now log in.'
            : 'Email verified. Account pending administrative activation.',
    }, 'Email verification successful.');
};
/**
 * POST /api/auth/resend-school-otp
 * Resends a newly generated 6-digit OTP code to the school contact email.
 * Enforces a 60-second cooldown between requests and invalidates previous codes.
 */
export const resendSchoolOtp = async (req, res) => {
    const { email } = resendSchoolOtpSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const school = await School.findOne({ email: normalizedEmail });
    // Generic response if school does not exist to prevent enumeration
    if (!school) {
        return ApiResponse.success(res, { dispatched: true }, 'If an unverified school registration exists for this email, a new verification code has been dispatched.');
    }
    if (school.emailVerificationStatus === 'verified') {
        throw ApiError.badRequest('This school email address has already been verified.');
    }
    // 60-second cooldown check
    const recentOtp = await OTPVerification.findOne({
        identifier: normalizedEmail,
        createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });
    if (recentOtp) {
        throw ApiError.tooManyRequests('Please wait at least 60 seconds before requesting a new verification code.');
    }
    // Invalidate any active OTPs
    await OTPVerification.updateMany({ identifier: normalizedEmail, isUsed: false }, { $set: { isUsed: true } });
    // Generate new OTP
    const rawOtp = generateSecureOtp();
    const otpSalt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(rawOtp, otpSalt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await OTPVerification.create({
        schoolId: school._id,
        identifier: normalizedEmail,
        hashedOTP,
        purpose: 'school_activation',
        expiresAt,
        isUsed: false,
        attempts: 0,
        maxAttempts: 5,
    });
    // Send email (never log raw OTP)
    await sendEmail({
        to: normalizedEmail,
        subject: 'EduManage - New Verification Code',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e3a8a;">New Verification Code</h2>
        <p>A new 6-digit verification code has been generated for <strong>${school.name}</strong>:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e40af; background: #eff6ff; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
          ${rawOtp}
        </div>
        <p style="color: #64748b; font-size: 14px;">This code expires in 5 minutes. Previous verification codes are now invalid.</p>
      </div>
    `,
    });
    return ApiResponse.success(res, { dispatched: true, cooldownSeconds: 60 }, 'New verification code dispatched.');
};
/**
 * POST /api/auth/login
 * Validates email and password, enforces school activation and account status,
 * returns dual-mode auth (HttpOnly cookie + Bearer token), and updates lastLoginAt.
 */
export const login = async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    // If database is offline, check offline development demo credentials
    if (mongoose.connection.readyState !== 1) {
        if (env.NODE_ENV === 'development') {
            const demoUser = OFFLINE_DEMO_USERS[normalizedEmail];
            if (demoUser) {
                logger.info(`[Auth:OfflineDev] Authenticated demo persona "${normalizedEmail}" in offline development mode.`);
                const tokenPayload = {
                    userId: demoUser.id,
                    email: demoUser.email,
                    role: demoUser.role,
                    schoolId: demoUser.schoolId,
                    name: demoUser.name,
                    tokenVersion: 1,
                };
                const accessToken = signAccessToken(tokenPayload);
                const refreshToken = signRefreshToken(tokenPayload);
                setAuthCookie(res, accessToken);
                return ApiResponse.success(res, {
                    user: {
                        id: demoUser.id,
                        name: demoUser.name,
                        email: demoUser.email,
                        role: demoUser.role,
                        schoolId: demoUser.schoolId,
                        schoolName: demoUser.schoolName,
                        emailVerified: true,
                        lastLoginAt: new Date(),
                    },
                    school: {
                        id: demoUser.schoolId,
                        name: demoUser.schoolName,
                        slug: 'greenwood-international-academy',
                        code: 'GIA-2026',
                        currency: 'USD',
                        timezone: 'America/Los_Angeles',
                        status: 'active',
                    },
                    tokens: {
                        accessToken,
                        refreshToken,
                        tokenType: 'Bearer',
                        expiresIn: env.JWT_EXPIRES_IN,
                    },
                    permissions: getRolePermissions(demoUser.role),
                }, 'Offline development authentication successful.');
            }
        }
        throw ApiError.serviceUnavailable('Database service is currently unreachable. Please ensure MongoDB is running or configure MONGODB_URI in server/.env.');
    }
    // Look up user including passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
        throw ApiError.unauthorized('Invalid email or password.');
    }
    // Verify bcrypt password hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw ApiError.unauthorized('Invalid email or password.');
    }
    // Account active check
    if (!user.isActive) {
        throw ApiError.forbidden('Your account has been deactivated. Please contact your school administrator.');
    }
    // Multi-school status check (except for platform super_admin)
    let school = null;
    if (user.role !== 'super_admin') {
        if (!user.schoolId) {
            throw ApiError.forbidden('User record is not associated with any school partition.');
        }
        school = await School.findById(user.schoolId);
        if (!school) {
            throw ApiError.forbidden('Associated school record could not be found.');
        }
        if (school.status === 'suspended') {
            throw ApiError.forbidden(`School account is suspended. Reason: ${school.suspendedReason || 'Administrative suspension'}. Contact platform administration.`);
        }
        if (school.status === 'pending' || school.emailVerificationStatus !== 'verified') {
            throw ApiError.forbidden('School registration is pending verification or administrative activation.');
        }
    }
    // Update last login timestamp & client information
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    user.lastLoginUserAgent = req.headers['user-agent']?.slice(0, 300) || 'Unknown Browser';
    await user.save();
    // Sign JWT Access & Refresh tokens
    const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId.toString() : undefined,
        name: user.name,
        tokenVersion: user.tokenVersion || 0,
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    // Set HttpOnly Secure SameSite cookie for web browser security against XSS
    setAuthCookie(res, accessToken);
    const permissions = getRolePermissions(user.role);
    return ApiResponse.success(res, {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId,
            schoolName: school ? school.name : 'System Administration',
            avatarUrl: user.avatarUrl,
            emailVerified: user.emailVerified,
            lastLoginAt: user.lastLoginAt,
        },
        school: school
            ? {
                id: school._id,
                name: school.name,
                slug: school.slug,
                code: school.code,
                currency: school.currency,
                timezone: school.timezone,
                status: school.status,
            }
            : null,
        tokens: {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: env.JWT_EXPIRES_IN,
        },
        permissions,
    }, 'Authentication successful.');
};
/**
 * GET /api/auth/me
 * Retrieves current authenticated user identity, tenant school scope, and permissions.
 */
export const getMe = async (req, res) => {
    if (!req.user || !req.currentUser) {
        throw ApiError.unauthorized('No authenticated session context found.');
    }
    const user = req.currentUser;
    let school = null;
    if (user.schoolId && mongoose.connection.readyState === 1) {
        school = await School.findById(user.schoolId);
    }
    const permissions = getRolePermissions(user.role);
    return ApiResponse.success(res, {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId,
            schoolName: school ? school.name : 'System Administration',
            avatarUrl: user.avatarUrl,
            phone: user.phone,
            emailVerified: user.emailVerified,
            lastLoginAt: user.lastLoginAt,
        },
        school: school
            ? {
                id: school._id,
                name: school.name,
                slug: school.slug,
                code: school.code,
                status: school.status,
                emailVerificationStatus: school.emailVerificationStatus,
                currency: school.currency,
                timezone: school.timezone,
            }
            : null,
        permissions,
    }, 'Authenticated profile session resolved.');
};
/**
 * POST /api/auth/logout
 * Clears the HttpOnly auth cookie and increments user tokenVersion
 * to immediately invalidate any issued JWT access tokens.
 */
export const logout = async (req, res) => {
    clearAuthCookie(res);
    if (req.currentUser) {
        req.currentUser.tokenVersion = (req.currentUser.tokenVersion || 0) + 1;
        await req.currentUser.save();
    }
    return ApiResponse.success(res, { loggedOut: true }, 'Successfully logged out. All active sessions have been invalidated.');
};
/**
 * POST /api/auth/forgot-password
 * Initiates password reset flow.
 * Returns generic success message regardless of email existence to prevent user enumeration.
 * Generates cryptographically secure token, bcrypt hashes it, and emails the reset link.
 */
export const forgotPassword = async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isActive: true });
    if (user) {
        // Invalidate previous reset tokens
        await OTPVerification.updateMany({ identifier: normalizedEmail, purpose: 'password_reset', isUsed: false }, { $set: { isUsed: true } });
        // Generate secure 32-byte hex token
        const rawResetToken = crypto.randomBytes(32).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedOTP = await bcrypt.hash(rawResetToken, salt);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await OTPVerification.create({
            schoolId: user.schoolId,
            identifier: normalizedEmail,
            hashedOTP,
            purpose: 'password_reset',
            expiresAt,
            isUsed: false,
            attempts: 0,
            maxAttempts: 5,
        });
        const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawResetToken}&email=${encodeURIComponent(normalizedEmail)}`;
        await sendEmail({
            to: normalizedEmail,
            subject: 'EduManage - Password Reset Request',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">Password Reset Instructions</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password for your EduManage account.</p>
          <p>Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">This link will expire in <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
        });
    }
    // Always return identical generic message to prevent email enumeration
    return ApiResponse.success(res, { dispatched: true }, 'If an account exists with this email address, password reset instructions have been sent.');
};
/**
 * POST /api/auth/reset-password
 * Completes password reset. Verifies token hash, validates password strength,
 * updates user passwordHash, marks token used, and increments tokenVersion.
 */
export const resetPassword = async (req, res) => {
    const { email, token, newPassword } = resetPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    // Find active, unused password reset token
    const otpDoc = await OTPVerification.findOne({
        identifier: normalizedEmail,
        purpose: 'password_reset',
        isUsed: false,
        expiresAt: { $gt: new Date() },
    }).select('+hashedOTP');
    if (!otpDoc) {
        throw ApiError.badRequest('Invalid or expired password reset token. Please request a new reset link.');
    }
    // Verify candidate reset token
    const isMatch = await otpDoc.verifyCandidateOTP(token);
    if (!isMatch) {
        throw ApiError.badRequest('Invalid or expired password reset token. Please request a new reset link.');
    }
    // Find user
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
        throw ApiError.badRequest('Unable to reset password for the requested account.');
    }
    // Hash new password with bcrypt
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    // Invalidate all previously issued tokens and record password change timestamp
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.passwordChangedAt = new Date();
    await user.save();
    // Atomically mark token as used
    otpDoc.isUsed = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();
    return ApiResponse.success(res, { passwordReset: true }, 'Password has been successfully updated. All active sessions have been terminated. Please log in with your new password.');
};
// ============================================================================
// Fine-Grained RBAC & Resource-Level Protected Example Endpoints
// ============================================================================
/**
 * GET /api/v1/auth/examples/admin-only
 * Demonstrates Admin & Super Admin restricted access
 */
export const getAdminExample = async (req, res) => {
    return ApiResponse.success(res, {
        scope: 'admin',
        schoolId: req.schoolId,
        message: 'Access granted: Administrator resource accessed successfully.',
        timestamp: new Date(),
    }, 'Admin resource verified.');
};
/**
 * GET /api/v1/auth/examples/teacher-class/:classId
 * Demonstrates fine-grained teacher assignment verification
 */
export const getTeacherClassExample = async (req, res) => {
    const { classId } = req.params;
    if (req.user?.role === 'super_admin' || req.user?.role === 'admin') {
        return ApiResponse.success(res, { classId, access: 'administrative_override' });
    }
    if (req.user?.role !== 'teacher') {
        throw ApiError.forbidden('Only teachers assigned to this class may view these class records.');
    }
    // Check if teacher profile exists
    const teacher = await Teacher.findOne({ userId: req.user.userId, schoolId: req.schoolId });
    if (!teacher) {
        throw ApiError.forbidden('Teacher profile not found in current school.');
    }
    // Verify assignment: is teacher class teacher of a section of this class, or in timetable?
    const hasSection = await Section.findOne({
        schoolId: req.schoolId,
        classId,
        classTeacherId: teacher._id,
    });
    const hasTimetable = await Timetable.findOne({
        schoolId: req.schoolId,
        classId,
        teacherId: teacher._id,
    });
    if (!hasSection && !hasTimetable) {
        throw ApiError.forbidden('Access denied. You are not assigned to instruct or manage this class.');
    }
    return ApiResponse.success(res, {
        classId,
        teacherId: teacher._id,
        verifiedAssignment: true,
    }, 'Teacher class access verified.');
};
/**
 * GET /api/v1/auth/examples/student-profile/:studentId
 * Demonstrates student self-ownership resource isolation
 */
export const getStudentProfileExample = async (req, res) => {
    const { studentId } = req.params;
    if (req.user?.role === 'super_admin' || req.user?.role === 'admin') {
        return ApiResponse.success(res, { studentId, access: 'administrative_override' });
    }
    if (req.user?.role === 'student') {
        const student = await Student.findOne({ userId: req.user.userId, schoolId: req.schoolId });
        if (!student || student._id.toString() !== studentId) {
            throw ApiError.forbidden('Access denied. Students may only access their own profile records.');
        }
    }
    return ApiResponse.success(res, {
        studentId,
        ownerVerified: true,
    }, 'Student profile access verified.');
};
/**
 * GET /api/v1/auth/examples/parent-ward/:studentId
 * Demonstrates parent-child relationship link verification
 */
export const getParentWardExample = async (req, res) => {
    const { studentId } = req.params;
    if (req.user?.role === 'super_admin' || req.user?.role === 'admin') {
        return ApiResponse.success(res, { studentId, access: 'administrative_override' });
    }
    if (req.user?.role !== 'parent') {
        throw ApiError.forbidden('Only verified parents or guardians can access student ward records.');
    }
    const parent = await Parent.findOne({ userId: req.user.userId, schoolId: req.schoolId });
    if (!parent) {
        throw ApiError.forbidden('Parent profile record not found.');
    }
    const isLinked = parent.children.some((child) => child.studentProfileId.toString() === studentId);
    if (!isLinked) {
        throw ApiError.forbidden('Access denied. You are not recorded as a guardian for this student.');
    }
    return ApiResponse.success(res, {
        studentId,
        parentProfileId: parent._id,
        verifiedRelationship: true,
    }, 'Parent-ward relationship verified.');
};
/**
 * GET /api/v1/auth/examples/super-admin
 * Demonstrates platform-wide super admin access
 */
export const getSuperAdminExample = async (_req, res) => {
    return ApiResponse.success(res, {
        systemWideAccess: true,
        role: 'super_admin',
        nodeEnv: env.NODE_ENV,
        timestamp: new Date(),
    }, 'Platform super-admin resource verified.');
};
