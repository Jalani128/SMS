/**
 * Database & Query Observability Module
 * Instruments MongoDB connection lifecycle events and detects slow query executions.
 */

import mongoose from 'mongoose';
import { logger } from './logger.js';
import { alertManager } from './alertManager.js';
import { sanitizeMongoUri } from '../config/db.js';

export interface SlowQueryRecord {
  collection: string;
  operation: string;
  durationMs: number;
  timestamp: string;
}

class DatabaseObservability {
  private slowQueries: SlowQueryRecord[] = [];
  private readonly maxSlowQueries = 50;
  private slowThresholdMs = 100;
  private isInitialized = false;

  /**
   * Initializes database connection listeners and slow query hooks.
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Connection Lifecycle Observability
    mongoose.connection.on('disconnected', () => {
      logger.warn('[Database] Connection lost (disconnected event).');
      alertManager.triggerAlert(
        'DATABASE_DISCONNECTED',
        'MongoDB database connection was dropped or lost.'
      );
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('[Database] Connection restored and reconnected successfully.');
    });

    mongoose.connection.on('error', (err: any) => {
      const sanitized = sanitizeMongoUri(err?.message || 'Database connection error');
      logger.error(`[Database] Connection event error: ${sanitized}`);
    });
  }

  /**
   * Records and logs a slow query event (sanitized).
   */
  public recordSlowQuery(collection: string, operation: string, durationMs: number): void {
    if (durationMs < this.slowThresholdMs) return;

    const record: SlowQueryRecord = {
      collection,
      operation,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
    };

    this.slowQueries.unshift(record);
    if (this.slowQueries.length > this.maxSlowQueries) {
      this.slowQueries.pop();
    }

    logger.warn(
      `[Database:SlowQuery] Slow query on collection "${collection}" (${operation}) - took ${record.durationMs}ms (threshold: ${this.slowThresholdMs}ms)`,
      { collection, operation, durationMs: record.durationMs }
    );
  }

  /**
   * Returns list of recent slow query records.
   */
  public getSlowQueries(): SlowQueryRecord[] {
    return [...this.slowQueries];
  }

  /**
   * Sets slow query threshold (for tests or tuning).
   */
  public setSlowThresholdMs(thresholdMs: number): void {
    this.slowThresholdMs = thresholdMs;
  }

  /**
   * Clears records (for tests).
   */
  public clear(): void {
    this.slowQueries = [];
  }
}

export const dbObservability = new DatabaseObservability();
