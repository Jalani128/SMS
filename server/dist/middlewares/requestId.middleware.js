import crypto from 'node:crypto';
import { runWithLogContext } from '../utils/logger.js';
/**
 * Validates and normalizes request correlation IDs.
 * Accepts alphanumeric characters, hyphens, and underscores up to 128 characters.
 */
const sanitizeRequestId = (id) => {
    if (!id || typeof id !== 'string')
        return null;
    const trimmed = id.trim();
    if (trimmed.length > 0 && trimmed.length <= 128 && /^[a-zA-Z0-9_\-.:]+$/.test(trimmed)) {
        return trimmed;
    }
    return null;
};
/**
 * Express middleware to assign, propagate, and track correlation IDs across the request lifecycle.
 */
export const requestIdMiddleware = (req, res, next) => {
    const incoming = (req.headers['x-request-id'] || req.headers['x-correlation-id']);
    const sanitized = sanitizeRequestId(incoming);
    const requestId = sanitized || `req_${crypto.randomUUID()}`;
    // Attach correlation ID to request object for route handlers & error middleware
    req.id = requestId;
    req.requestId = requestId;
    req.correlationId = requestId;
    // Echo request ID in response headers for client-side tracing
    res.setHeader('x-request-id', requestId);
    // Wrap remaining middleware chain within async log context
    runWithLogContext({
        correlationId: requestId,
        schoolId: req.headers['x-school-id'] || undefined,
    }, () => {
        next();
    });
};
