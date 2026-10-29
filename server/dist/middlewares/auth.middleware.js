import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.model.js';
import { School } from '../models/School.model.js';
import { env } from '../config/env.js';
export const AUTH_COOKIE_NAME = 'edumanage_jwt';
/**
 * Cookie options helper for secure HttpOnly session delivery
 */
export const getAuthCookieOptions = () => ({
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes matching access token lifespan
    path: '/',
});
export const setAuthCookie = (res, token) => {
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};
export const clearAuthCookie = (res) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
};
/**
 * Authentication middleware
 * Supports dual token extraction: HttpOnly cookie `edumanage_jwt` or `Authorization: Bearer <token>`.
 * Validates JWT signature, claims, user active state, and tokenVersion (instant invalidation).
 */
export const authenticate = async (req, _res, next) => {
    let token;
    // 1. Check HttpOnly cookie first
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
        token = req.cookies[AUTH_COOKIE_NAME];
    }
    // 2. Fall back to Authorization header Bearer token
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }
    if (!token) {
        return next(ApiError.unauthorized('Authentication token missing. Please sign in to continue.'));
    }
    try {
        const decoded = verifyAccessToken(token);
        // Look up persistent user record to enforce real-time status and token invalidation
        let user;
        try {
            user = await User.findById(decoded.userId).select('+passwordHash');
        }
        catch (dbErr) {
            // If database is offline in development mode, proceed using verified token identity
            if (mongoose.connection.readyState !== 1) {
                if (env.NODE_ENV === 'development') {
                    req.user = decoded;
                    req.currentUser = {
                        _id: decoded.userId,
                        name: decoded.name || 'Demo User',
                        email: decoded.email,
                        role: decoded.role,
                        schoolId: decoded.schoolId,
                        isActive: true,
                        emailVerified: true,
                        tokenVersion: decoded.tokenVersion || 0,
                    };
                    if (decoded.schoolId) {
                        req.schoolId = decoded.schoolId;
                    }
                    return next();
                }
                return next(ApiError.serviceUnavailable('Database service is currently unreachable.'));
            }
            throw dbErr;
        }
        if (!user) {
            return next(ApiError.unauthorized('User session invalid or user record not found.'));
        }
        if (!user.isActive) {
            return next(ApiError.forbidden('User account has been deactivated. Contact your school administrator.'));
        }
        // Verify tokenVersion for instant server-side revocation (e.g. after logout or password reset)
        if (decoded.tokenVersion !== undefined &&
            user.tokenVersion !== undefined &&
            decoded.tokenVersion !== user.tokenVersion) {
            return next(ApiError.unauthorized('Session has expired or was revoked. Please sign in again.'));
        }
        req.user = decoded;
        req.currentUser = user;
        if (user.schoolId) {
            req.schoolId = user.schoolId.toString();
        }
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(ApiError.unauthorized('Authentication token has expired. Please sign in again.'));
        }
        return next(ApiError.unauthorized('Invalid authentication token signature or claims.'));
    }
};
/**
 * Role-Based Access Control (RBAC) middleware
 * Enforces that the authenticated user possesses one of the allowed roles.
 * Platform super_admin automatically bypasses school-level role restrictions.
 */
export const authorizeRoles = (...allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentication required to access this resource.'));
        }
        if (req.user.role === 'super_admin' || allowedRoles.includes(req.user.role)) {
            return next();
        }
        return next(ApiError.forbidden(`Access denied. Role "${req.user.role}" does not have permission to access this endpoint.`));
    };
};
/**
 * School Status Middleware
 * Enforces that the tenant school is active and not suspended or pending.
 * Super admins bypass school activation restrictions.
 */
export const requireActiveSchool = async (req, _res, next) => {
    if (req.user?.role === 'super_admin') {
        return next();
    }
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId) {
        return next(ApiError.badRequest('Tenant school context is missing from request.'));
    }
    const school = await School.findById(schoolId);
    if (!school) {
        return next(ApiError.notFound('Tenant school not found.'));
    }
    if (school.status === 'suspended') {
        return next(ApiError.forbidden(`School "${school.name}" is currently suspended. Reason: ${school.suspendedReason || 'Administrative suspension'}. Please contact system support.`));
    }
    if (school.status === 'pending' || school.emailVerificationStatus !== 'verified') {
        return next(ApiError.forbidden(`School registration is pending verification or activation. Status: ${school.status}, Email: ${school.emailVerificationStatus}.`));
    }
    req.school = school;
    next();
};
/**
 * Email verification middleware
 * Ensures the authenticated user's email has been verified.
 */
export const requireVerifiedEmail = (req, _res, next) => {
    if (req.user?.role === 'super_admin') {
        return next();
    }
    if (req.currentUser && !req.currentUser.emailVerified) {
        return next(ApiError.forbidden('Email address verification required before accessing this resource. Please verify your email via OTP.'));
    }
    next();
};
/**
 * School Tenant Isolation Middleware
 * Strictly derives req.schoolId from verified user token to prevent tenant tampering.
 */
export const enforceSchoolContext = (req, _res, next) => {
    if (req.user?.role === 'super_admin') {
        // Super admin can explicitly specify target school via x-school-id header if needed
        const headerSchoolId = req.headers['x-school-id'];
        if (headerSchoolId) {
            req.schoolId = headerSchoolId;
        }
        return next();
    }
    if (!req.user?.schoolId) {
        return next(ApiError.forbidden('Tenant school context not bound to authenticated credentials.'));
    }
    // Overwrite any forged client header with verified token schoolId
    req.schoolId = req.user.schoolId;
    next();
};
