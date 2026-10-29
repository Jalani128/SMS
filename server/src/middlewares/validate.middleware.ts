import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/apiError.js';
import mongoose from 'mongoose';

/**
 * Validates request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(
          ApiError.badRequest(
            `Validation failed: ${issues.map((i) => i.message).join('; ')}`,
            issues
          )
        );
      }
      next(error);
    }
  };
};

/**
 * Validates request query against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(
          ApiError.badRequest(
            `Query validation failed: ${issues.map((i) => i.message).join('; ')}`,
            issues
          )
        );
      }
      next(error);
    }
  };
};

/**
 * Middleware ensuring route parameter is a valid 24-character hexadecimal MongoDB ObjectId
 */
export const validateObjectIdParam = (paramName = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const rawValue = req.params[paramName];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

    if (!value || typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
      return next(
        ApiError.badRequest(
          `Invalid resource identifier format for parameter '${paramName}': "${value}". Must be a valid 24-character hex ObjectId.`
        )
      );
    }
    next();
  };
};
