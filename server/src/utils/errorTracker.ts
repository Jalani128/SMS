/**
 * Provider-Neutral Error Tracking Service
 * Redacts sensitive credentials, extracts correlation context, and records error incidents.
 */

import { logger, redactSensitiveData } from './logger.js';
import { alertManager } from './alertManager.js';

export interface ErrorReportContext {
  correlationId?: string;
  schoolId?: string;
  userId?: string;
  userRole?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

export interface CapturedErrorEvent {
  eventId: string;
  timestamp: string;
  name: string;
  message: string;
  stack?: string;
  correlationId?: string;
  schoolId?: string;
  userId?: string;
  path?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

class ErrorTracker {
  private recentErrors: CapturedErrorEvent[] = [];
  private readonly maxErrors = 50;

  /**
   * Captures and records an exception safely without leaking credentials.
   */
  public captureException(error: Error | any, context: ErrorReportContext = {}): string {
    const eventId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const isErrorInstance = error instanceof Error;
    const name = isErrorInstance ? error.name : 'UnknownError';
    const message = isErrorInstance ? error.message : String(error);
    const stack = isErrorInstance && process.env.NODE_ENV !== 'production' ? error.stack : undefined;

    const sanitizedContext = (redactSensitiveData(context) as ErrorReportContext) || {};

    const event: CapturedErrorEvent = {
      eventId,
      timestamp: new Date().toISOString(),
      name,
      message,
      stack,
      correlationId: sanitizedContext.correlationId,
      schoolId: sanitizedContext.schoolId,
      userId: sanitizedContext.userId,
      path: sanitizedContext.path,
      statusCode: sanitizedContext.statusCode || 500,
      metadata: sanitizedContext.metadata,
    };

    this.recentErrors.unshift(event);
    if (this.recentErrors.length > this.maxErrors) {
      this.recentErrors.pop();
    }

    logger.error(`[ErrorTracker] [${eventId}] ${name}: ${message}`, {
      eventId,
      ...sanitizedContext,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    });

    // Check if error warrants alert evaluation
    alertManager.evaluateMetrics();

    return eventId;
  }

  /**
   * Returns list of recently captured error events (sanitized).
   */
  public getRecentErrors(): CapturedErrorEvent[] {
    return [...this.recentErrors];
  }

  /**
   * Clears in-memory error buffer.
   */
  public clear(): void {
    this.recentErrors = [];
  }
}

export const errorTracker = new ErrorTracker();
