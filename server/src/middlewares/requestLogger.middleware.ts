import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { metricsCollector } from '../utils/metrics.js';
import { alertManager } from '../utils/alertManager.js';

/**
 * Normalizes URL path templates to prevent metric cardinality explosion.
 * Replaces ObjectIds, UUIDs, and numeric IDs with parameter tokens.
 */
export const normalizePath = (rawPath: string): string => {
  if (!rawPath || rawPath === '/') return '/';

  // Strip query string and hash
  const pathWithoutQuery = rawPath.split('?')[0].split('#')[0];

  return pathWithoutQuery
    // Replace 24-char MongoDB ObjectIds
    .replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '/:id')
    // Replace 36-char UUIDs
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=\/|$)/g, '/:id')
    // Replace backup IDs like bkp_20261023...
    .replace(/\/bkp_[0-9a-zA-Z_]+(?=\/|$)/g, '/:id')
    // Replace standalone numeric route IDs
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    // Normalize trailing slash
    .replace(/\/+$/, '') || '/';
};

/**
 * Request monitoring and performance tracking middleware.
 * Records latency percentiles, status counts, and warns on slow requests.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startHrTime = process.hrtime.bigint();
  const normalizedPath = normalizePath(req.originalUrl || req.url);

  res.on('finish', () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1_000_000;
    const roundedMs = Math.round(durationMs * 100) / 100;

    // Record in memory metrics
    metricsCollector.recordHttpRequest(req.method, normalizedPath, res.statusCode, roundedMs);

    // Detect slow requests exceeding threshold (>500ms)
    if (roundedMs >= 500) {
      logger.warn(
        `[Observability] Slow request detected: ${req.method} ${normalizedPath} (${res.statusCode}) - ${roundedMs}ms`,
        {
          method: req.method,
          path: normalizedPath,
          statusCode: res.statusCode,
          durationMs: roundedMs,
          correlationId: req.requestId,
        }
      );
    }

    // Evaluate alerts if response is 5xx
    if (res.statusCode >= 500) {
      alertManager.evaluateMetrics();
    }
  });

  next();
};
