import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';
import { initSocketIO } from './config/socket.js';
import { initMailer, verifyMailerConnection } from './config/mailer.js';
import { initCloudinary } from './config/cloudinary.js';
import { logger } from './utils/logger.js';
const startServer = async () => {
    const app = createApp();
    const server = http.createServer(app);
    // Initialize Socket.IO engine
    initSocketIO(server);
    // Initialize third-party service architectures
    initMailer();
    initCloudinary();
    // Attempt database connection (continues even if MongoDB offline in Phase 1)
    await connectDB();
    await verifyMailerConnection();
    // Start HTTP listener
    server.listen(env.PORT, () => {
        logger.info(`=======================================================`);
        logger.info(` EduManage Multi-School API Server (Phase 1)`);
        logger.info(` Running at: http://localhost:${env.PORT}`);
        logger.info(` Health Check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
        logger.info(` Environment: ${env.NODE_ENV}`);
        logger.info(` Multi-Tenant Scoping: Active (Default Demo: ${env.DEFAULT_DEMO_SCHOOL_ID})`);
        logger.info(`=======================================================`);
    });
    // Graceful shutdown handling
    const shutdown = async (signal) => {
        logger.info(`Received ${signal}. Initiating graceful shutdown...`);
        server.close(async () => {
            logger.info('HTTP server closed.');
            await closeDB();
            process.exit(0);
        });
        // Force close if graceful shutdown hangs
        setTimeout(() => {
            logger.error('Forced shutdown due to timeout.');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};
startServer().catch((err) => {
    logger.error('Fatal error during server startup:', err);
    process.exit(1);
});
