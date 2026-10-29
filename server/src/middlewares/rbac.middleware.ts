import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

/**
 * Server-enforced Role-Based Access Control (RBAC) middleware
 * Ensures that the authenticated user possesses one of the allowed roles.
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required to access this resource'));
    }

    if (req.user.role === 'super_admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return next(
      ApiError.forbidden(
        `Access denied. Role "${req.user.role}" does not have permission to perform this action. Required: [${allowedRoles.join(
          ', '
        )}]`
      )
    );
  };
};
