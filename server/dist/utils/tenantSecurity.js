import { Types } from 'mongoose';
import { ApiError } from './apiError.js';
/**
 * Validates that an incoming request's target school context matches the user's
 * authorized tenant boundary.
 *
 * CRITICAL TENANT SECURITY RULE:
 * - A client-supplied header or query parameter ('x-school-id', 'schoolId') is NEVER
 *   trusted on its own.
 * - Non-super-admin users are strictly locked to their session/token `schoolId`.
 * - Cross-school access is permitted ONLY if the authenticated user has the 'super_admin' role.
 * - Schema fields alone do NOT guarantee isolation; server-side validation is required.
 */
export const validateSchoolContext = (user, requestedSchoolId) => {
    if (!user) {
        throw ApiError.unauthorized('Authentication required to access tenant resources');
    }
    // Super admin can explicitly specify target schoolId or act platform-wide
    if (user.role === 'super_admin') {
        if (!requestedSchoolId) {
            throw ApiError.badRequest('Target schoolId must be specified for super_admin tenant-scoped operations');
        }
        return new Types.ObjectId(requestedSchoolId.toString());
    }
    // All other roles must have an assigned schoolId in their verified token/session
    if (!user.schoolId) {
        throw ApiError.forbidden('User has no school affiliation assigned');
    }
    const userSchoolIdStr = user.schoolId.toString();
    // If a specific schoolId was requested, it MUST match the user's assigned schoolId
    if (requestedSchoolId && requestedSchoolId.toString() !== userSchoolIdStr) {
        throw ApiError.forbidden(`Cross-tenant access violation: User belonging to school '${userSchoolIdStr}' cannot access or mutate records for school '${requestedSchoolId.toString()}'`);
    }
    return new Types.ObjectId(userSchoolIdStr);
};
/**
 * Asserts that a fetched document strictly belongs to the expected tenant partition.
 */
export const assertDocumentTenantOwnership = (document, expectedSchoolId) => {
    if (!document) {
        throw ApiError.notFound('Requested resource not found');
    }
    if (!document.schoolId) {
        throw ApiError.internal('Corrupted record: document lacks mandatory schoolId partition key');
    }
    if (document.schoolId.toString() !== expectedSchoolId.toString()) {
        throw ApiError.forbidden('Tenant violation: document does not belong to the authorized school partition');
    }
};
/**
 * Generates verified Mongoose query options for tenant-scoped operations.
 */
export const getTenantQueryOptions = (schoolId, extraOptions) => {
    return {
        schoolId: schoolId.toString(),
        ...extraOptions,
    };
};
