import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import v1Routes from './routes/v1/index.js';
import healthRoutes from './routes/v1/health.routes.js';
import authRoutes from './routes/v1/auth.routes.js';
import studentRoutes from './routes/v1/student.routes.js';
import teacherRoutes from './routes/v1/teacher.routes.js';
import parentRoutes from './routes/v1/parent.routes.js';
import {
  sessionRouter,
  classRouter,
  sectionRouter,
  subjectRouter,
  assignmentRouter,
  enrollmentRouter,
  academicSummaryRouter,
} from './routes/v1/academic.routes.js';
import attendanceRoutes from './routes/v1/attendance.routes.js';
import feeRoutes from './routes/v1/fee.routes.js';
import homeworkRoutes from './routes/v1/homework.routes.js';
import timetableRoutes from './routes/v1/timetable.routes.js';
import examRoutes from './routes/v1/exam.routes.js';
import studyMaterialRoutes from './routes/v1/studyMaterial.routes.js';
import messagingRoutes from './routes/v1/messaging.routes.js';
import aiRoutes from './routes/v1/ai.routes.js';
import reportRoutes from './routes/v1/report.routes.js';
import notificationRoutes, { notificationPreferenceRouter } from './routes/v1/notification.routes.js';
import schoolSettingsRoutes from './routes/v1/schoolSettings.routes.js';
import userRoutes from './routes/v1/user.routes.js';
import onboardingRoutes from './routes/v1/onboarding.routes.js';
import operationsRoutes from './routes/v1/operations.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';
import { mongoSanitize } from './middlewares/sanitize.middleware.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { logger } from './utils/logger.js';

export const createApp = (): Express => {
  const app = express();

  // 1. Correlation & Request ID tracking (Mounted first to encompass all downstream middleware)
  app.use(requestIdMiddleware);

  // 2. HTTP Request Performance and Latency Monitoring
  app.use(requestLogger);

  // Security HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows cross-origin REST clients and Swagger/health dashboards
      crossOriginEmbedderPolicy: false,
      xContentTypeOptions: true,
      xFrameOptions: { action: 'sameorigin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hidePoweredBy: true,
      hsts:
        env.NODE_ENV === 'production'
          ? { maxAge: 31536000, includeSubDomains: true, preload: true }
          : false,
    })
  );

  // Trust reverse proxy (e.g. Render, Railway, AWS ALB, Cloudflare, Nginx) for accurate client IPs and secure cookies
  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
    app.set('trust proxy', 1);
  }

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (env.ALLOWED_ORIGINS.indexOf(origin) !== -1 || env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'x-request-id', 'x-correlation-id'],
      exposedHeaders: ['x-request-id'],
    })
  );

  // Body parsers (hardened payload limit)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // NoSQL query injection sanitization middleware
  app.use(mongoSanitize);

  // Request logger in development
  if (env.NODE_ENV === 'development') {
    app.use((req: Request, _res: Response, next) => {
      logger.debug(`${req.method} ${req.url} - Tenant: ${req.headers['x-school-id'] || 'none'}`);
      next();
    });
  }

  // Root welcome route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'EduManage SMS API Engine',
      version: '1.0.0 (Phase 1)',
      healthCheck: `${env.API_PREFIX}/health`,
      documentation: 'See README.md for setup instructions and architecture specs',
    });
  });

  // Public Health & Readiness Probes
  app.use('/api/health', healthRoutes);
  app.use('/health', healthRoutes);
  app.use('/api/ready', healthRoutes);
  app.use('/ready', healthRoutes);

  // Apply general API rate limiter to all API endpoints
  app.use('/api', apiLimiter);

  // Mount API v1 router and direct route aliases
  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/teachers', teacherRoutes);
  app.use('/api/parents', parentRoutes);
  app.use('/api/academic-sessions', sessionRouter);
  app.use('/api/classes', classRouter);
  app.use('/api/sections', sectionRouter);
  app.use('/api/subjects', subjectRouter);
  app.use('/api/subject-assignments', assignmentRouter);
  app.use('/api/enrollments', enrollmentRouter);
  app.use('/api/academic', academicSummaryRouter);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/fees', feeRoutes);
  app.use('/api/homework', homeworkRoutes);
  app.use('/api/timetable', timetableRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/study-materials', studyMaterialRoutes);
  app.use('/api/conversations', messagingRoutes);
  app.use('/api/messages', messagingRoutes);
  app.use('/api/users/messaging-contacts', messagingRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/notification-preferences', notificationPreferenceRouter);
  app.use('/api/school-settings', schoolSettingsRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/operations', operationsRoutes);
  app.use(env.API_PREFIX, v1Routes);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
};
