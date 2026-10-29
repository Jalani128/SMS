import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apiError.js';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: any) =>
    req.headers?.['x-test-rate-limit'] === 'true'
      ? 5
      : process.env.NODE_ENV === 'development'
      ? 200
      : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many login attempts from this IP. Please try again after 15 minutes.'));
  },
});

export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 OTP send requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many OTP verification requests. Please wait 15 minutes before requesting a new code.'));
  },
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP verification attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many OTP verification attempts. Please wait 15 minutes before trying again.'));
  },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 password reset attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many password reset requests. Please try again in 15 minutes.'));
  },
});

/**
 * General API rate limiter to protect against scraping, flooding, and denial-of-service
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return true;
    }
    return false;
  },
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many API requests from this IP. Please slow down and try again shortly.'));
  },
});

/**
 * Strict rate limiter for resource-intensive CSV/PDF exports and bulk data generation
 */
export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 export requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return true;
    }
    return false;
  },
  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        'Export rate limit exceeded. Please wait a few minutes before downloading more reports or exports.'
      )
    );
  },
});
