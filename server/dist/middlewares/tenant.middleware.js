import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';
/**
 * Tenant scoping middleware
 * Extracts the school identifier from headers, query parameter, or authenticated JWT user.
 * Attaches req.schoolId to the request context to guarantee multi-tenant data isolation.
 */
export const tenantMiddleware = (req, _res, next) => {
    let schoolId;
    // 1. If user is authenticated, enforce their verified token's schoolId (unless platform super_admin)
    if (req.user) {
        if (req.user.role === 'super_admin') {
            schoolId = req.headers['x-school-id'] || req.user.schoolId;
        }
        else if (req.user.schoolId) {
            schoolId = req.user.schoolId;
        }
    }
    // 2. If unauthenticated public request, check x-school-id header
    if (!schoolId) {
        schoolId = req.headers['x-school-id'];
    }
    // 3. Fallback to default demo school in development environment
    if (!schoolId && env.NODE_ENV === 'development') {
        schoolId = env.DEFAULT_DEMO_SCHOOL_ID;
    }
    if (!schoolId) {
        return next(ApiError.badRequest('Multi-tenant header "x-school-id" is missing. Request cannot be routed to a school partition.'));
    }
    req.schoolId = schoolId;
    next();
};
