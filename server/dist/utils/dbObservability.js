/**
 * Database & Query Observability Module
 * Instruments MongoDB connection lifecycle events and detects slow query executions.
 */
import mongoose from 'mongoose';
import { logger } from './logger.js';
import { alertManager } from './alertManager.js';
import { sanitizeMongoUri } from '../config/db.js';
class DatabaseObservability {
    slowQueries = [];
    maxSlowQueries = 50;
    slowThresholdMs = 100;
    isInitialized = false;
    /**
     * Initializes database connection listeners and slow query hooks.
     */
    init() {
        if (this.isInitialized)
            return;
        this.isInitialized = true;
        // 1. Connection Lifecycle Observability
        mongoose.connection.on('disconnected', () => {
            logger.warn('[Database] Connection lost (disconnected event).');
            alertManager.triggerAlert('DATABASE_DISCONNECTED', 'MongoDB database connection was dropped or lost.');
        });
        mongoose.connection.on('reconnected', () => {
            logger.info('[Database] Connection restored and reconnected successfully.');
        });
        mongoose.connection.on('error', (err) => {
            const sanitized = sanitizeMongoUri(err?.message || 'Database connection error');
            logger.error(`[Database] Connection event error: ${sanitized}`);
        });
    }
    /**
     * Records and logs a slow query event (sanitized).
     */
    recordSlowQuery(collection, operation, durationMs) {
        if (durationMs < this.slowThresholdMs)
            return;
        const record = {
            collection,
            operation,
            durationMs: Math.round(durationMs * 100) / 100,
            timestamp: new Date().toISOString(),
        };
        this.slowQueries.unshift(record);
        if (this.slowQueries.length > this.maxSlowQueries) {
            this.slowQueries.pop();
        }
        logger.warn(`[Database:SlowQuery] Slow query on collection "${collection}" (${operation}) - took ${record.durationMs}ms (threshold: ${this.slowThresholdMs}ms)`, { collection, operation, durationMs: record.durationMs });
    }
    /**
     * Returns list of recent slow query records.
     */
    getSlowQueries() {
        return [...this.slowQueries];
    }
    /**
     * Sets slow query threshold (for tests or tuning).
     */
    setSlowThresholdMs(thresholdMs) {
        this.slowThresholdMs = thresholdMs;
    }
    /**
     * Clears records (for tests).
     */
    clear() {
        this.slowQueries = [];
    }
}
export const dbObservability = new DatabaseObservability();
