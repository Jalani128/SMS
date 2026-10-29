import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { errorTracker } from '../utils/errorTracker.js';
export const notFoundHandler = (req, _res, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
export const errorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    const isApiError = err instanceof ApiError;
    let statusCode = isApiError ? err.statusCode : 500;
    const requestId = req.requestId || req.id;
    const isProd = env.NODE_ENV === 'production' ||
        env.NODE_ENV === 'staging' ||
        process.env.NODE_ENV === 'production' ||
        process.env.NODE_ENV === 'staging';
    // Map Mongoose buffering and database disconnect errors to 503 Service Unavailable
    const isDbUnavailable = err.name === 'MongooseError' ||
        err.name === 'MongoServerSelectionError' ||
        err.message?.includes('buffering timed out') ||
        err.message?.includes('ECONNREFUSED');
    if (isDbUnavailable) {
        statusCode = 503;
    }
    const message = isApiError
        ? err.message
        : isDbUnavailable
            ? 'Database service is currently unreachable. Please ensure MongoDB is running or configure MONGODB_URI in server/.env.'
            : isProd
                ? 'An unexpected internal server error occurred.'
                : err.message || 'Internal Server Error';
    const errors = isApiError ? err.errors : undefined;
    // Log structured error with correlation context
    logger.error(`[${statusCode}] ${message}`, {
        correlationId: requestId,
        path: req.originalUrl,
        method: req.method,
        stack: !isProd && (env.NODE_ENV === 'development' || process.env.NODE_ENV === 'development') ? err.stack : undefined,
    });
    // Report 500-level internal errors to central error tracking
    if (statusCode >= 500) {
        errorTracker.captureException(err, {
            correlationId: requestId,
            schoolId: req.schoolId,
            userId: req.user?.userId,
            userRole: req.user?.role,
            method: req.method,
            path: req.originalUrl,
            statusCode,
        });
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(errors && { errors }),
        ...(!isProd && (env.NODE_ENV === 'development' || process.env.NODE_ENV === 'development') && { stack: err.stack }),
        meta: {
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            ...(requestId && { requestId }),
        },
    });
};
