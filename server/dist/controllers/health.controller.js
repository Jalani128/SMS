import { ApiResponse } from '../utils/apiResponse.js';
import { getDbStatus } from '../config/db.js';
import { env } from '../config/env.js';
/**
 * GET /api/v1/health or /api/health
 * Process liveness check
 */
export const getHealth = (_req, res) => {
    const uptimeSeconds = Math.floor(process.uptime());
    const memoryUsage = process.memoryUsage();
    const dbStatus = getDbStatus();
    return ApiResponse.success(res, {
        status: 'healthy',
        application: 'EduManage School Management System',
        environment: env.NODE_ENV,
        uptime: `${uptimeSeconds}s`,
        database: {
            status: dbStatus.status,
            readyState: dbStatus.readyState,
            ...(env.NODE_ENV !== 'production' && { host: dbStatus.host }),
        },
        services: {
            api: 'operational',
            database: dbStatus.status === 'connected' ? 'operational' : 'degraded',
            socket: 'ready',
            mailer: env.SMTP_USER ? 'configured' : 'stub_mode',
            cloudinary: env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'stub_mode',
        },
        memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        },
        timestamp: new Date().toISOString(),
    }, 'System is healthy.');
};
/**
 * GET /api/v1/health/ready or /api/ready
 * Readiness probe: checks database connection before routing traffic
 */
export const getReadiness = (_req, res) => {
    const dbStatus = getDbStatus();
    const isReady = dbStatus.readyState === 1;
    if (!isReady) {
        return res.status(503).json({
            success: false,
            status: 'not_ready',
            message: 'Service is not ready. Database connection is disconnected or connecting.',
            database: dbStatus.status,
            timestamp: new Date().toISOString(),
        });
    }
    return res.status(200).json({
        success: true,
        status: 'ready',
        message: 'Service is fully ready to accept incoming traffic.',
        database: 'connected',
        timestamp: new Date().toISOString(),
    });
};
