/**
 * Security Event Logger & Audit Integration
 * Tracks authentication failures, permission denials, and cross-school violation attempts.
 */
import { logger, redactSensitiveData } from './logger.js';
import { AuditLog } from '../models/AuditLog.model.js';
import mongoose from 'mongoose';
export const logSecurityEvent = async (event) => {
    const sanitizedMeta = redactSensitiveData(event.metadata || {}) || {};
    // 1. Structured Security Log
    logger.warn(`[Security] ${event.action} - Resource: ${event.targetResource || 'N/A'}`, {
        action: event.action,
        actorId: event.actorId,
        actorRole: event.actorRole,
        schoolId: event.schoolId,
        ip: event.ipAddress,
        targetResource: event.targetResource,
        ...sanitizedMeta,
    });
    // 2. Persist to AuditLog if database connection is active
    try {
        if (mongoose.connection.readyState === 1) {
            await AuditLog.create({
                actorId: event.actorId ? new mongoose.Types.ObjectId(event.actorId) : undefined,
                actorRole: event.actorRole || 'ANONYMOUS',
                schoolId: event.schoolId ? new mongoose.Types.ObjectId(event.schoolId) : undefined,
                action: `SECURITY_${event.action}`,
                targetResource: event.targetResource || 'SYSTEM_SECURITY',
                targetResourceId: event.targetResourceId,
                ipAddress: event.ipAddress,
                userAgent: event.userAgent,
                metadata: sanitizedMeta,
                timestamp: new Date(),
            });
        }
    }
    catch (err) {
        // Audit log persistence failure must never break security logging flow
        logger.debug(`[Security] Could not persist audit log to DB: ${err.message}`);
    }
};
