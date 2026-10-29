/**
 * Background Job & Scheduled Task Observability Helper
 * Instruments background operations with execution timing, retry counting, failure tracking, and alerts.
 */
import { logger } from './logger.js';
import { metricsCollector } from './metrics.js';
import { alertManager } from './alertManager.js';
/**
 * Executes and instruments an asynchronous background task.
 */
export const trackJob = async (jobName, jobFn, meta) => {
    const executionId = `job_${jobName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${Date.now()}`;
    const startTime = Date.now();
    logger.info(`[Job] Starting task "${jobName}"`, {
        executionId,
        jobName,
        ...meta,
    });
    try {
        const result = await jobFn();
        const durationMs = Date.now() - startTime;
        metricsCollector.recordJobExecution(jobName, durationMs, true);
        logger.info(`[Job] Successfully completed task "${jobName}" in ${durationMs}ms`, {
            executionId,
            jobName,
            durationMs,
        });
        return result;
    }
    catch (error) {
        const durationMs = Date.now() - startTime;
        const rawError = error?.message || 'Unknown job execution error';
        // Sanitize any potential connection string or sensitive credentials in error message
        const sanitizedError = rawError.replace(/mongodb(\+srv)?:\/\/[^@]+@/i, 'mongodb$1://***:***@');
        metricsCollector.recordJobExecution(jobName, durationMs, false, sanitizedError);
        logger.error(`[Job] Task "${jobName}" failed after ${durationMs}ms: ${sanitizedError}`, {
            executionId,
            jobName,
            durationMs,
            error: sanitizedError,
        });
        // Evaluate if this failure breaches job failure alert rules
        alertManager.evaluateMetrics();
        throw error;
    }
};
