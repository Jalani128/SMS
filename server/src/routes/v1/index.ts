import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import teacherRoutes from './teacher.routes.js';
import parentRoutes from './parent.routes.js';
import academicContextRoutes from './academicContext.routes.js';
import attendanceRoutes from './attendance.routes.js';
import feeRoutes from './fee.routes.js';
import homeworkRoutes from './homework.routes.js';
import timetableRoutes from './timetable.routes.js';
import examRoutes from './exam.routes.js';
import studyMaterialRoutes from './studyMaterial.routes.js';
import messagingRoutes from './messaging.routes.js';
import aiRoutes from './ai.routes.js';
import reportRoutes from './report.routes.js';
import notificationRoutes, { notificationPreferenceRouter } from './notification.routes.js';
import schoolSettingsRoutes from './schoolSettings.routes.js';
import userRoutes from './user.routes.js';
import onboardingRoutes from './onboarding.routes.js';
import operationsRoutes from './operations.routes.js';
import {
  sessionRouter,
  classRouter,
  sectionRouter,
  subjectRouter,
  assignmentRouter,
  enrollmentRouter,
  academicSummaryRouter,
} from './academic.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/academic-context', academicContextRoutes);

// Phase 6: Academic Management Routes
router.use('/academic-sessions', sessionRouter);
router.use('/classes', classRouter);
router.use('/sections', sectionRouter);
router.use('/subjects', subjectRouter);
router.use('/subject-assignments', assignmentRouter);
router.use('/enrollments', enrollmentRouter);
router.use('/academic', academicSummaryRouter);

// Phase 7: Attendance Management Routes
router.use('/attendance', attendanceRoutes);

// Phase 8: Fees Management Module Routes
router.use('/fees', feeRoutes);

// Phase 9: Homework and Assignments Management Routes
router.use('/homework', homeworkRoutes);

// Phase 10: Timetable Management Module Routes
router.use('/timetable', timetableRoutes);

// Phase 11: Exams and Results Management Routes
router.use('/exams', examRoutes);

// Phase 12: Study Materials Management Routes
router.use('/study-materials', studyMaterialRoutes);

// Phase 13: Real-Time Communication & Messaging Routes
router.use('/conversations', messagingRoutes);
router.use('/messages', messagingRoutes);

// Phase 14: AI Assistant Integration Routes
router.use('/ai', aiRoutes);

// Phase 15: Reports & Analytics Routes
router.use('/reports', reportRoutes);

// Phase 16: System Notifications & Email Automation Routes
router.use('/notifications', notificationRoutes);
router.use('/notification-preferences', notificationPreferenceRouter);

// Phase 17: School Settings & Configuration Routes
router.use('/school-settings', schoolSettingsRoutes);

// Phase 18: User Profile & Account Management Routes
router.use('/users', userRoutes);

// Phase 23: School Onboarding & Initial Data Import Routes
router.use('/onboarding', onboardingRoutes);

// Phase 24: School Operations, Daily Administration & Workflow Automation Routes
router.use('/operations', operationsRoutes);

export default router;
