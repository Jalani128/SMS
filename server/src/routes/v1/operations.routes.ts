import { Router } from 'express';
import {
  getOperationsDashboard,
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getApprovals,
  createApproval,
  reviewApproval,
  runDailyAutomation,
  triggerAttendanceReminders,
  triggerFeeReminders,
  getBackups,
  triggerBackup,
  verifyBackup,
  getDataIntegrityReport,
  getSystemMetrics,
} from '../../controllers/operations.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validateObjectIdParam } from '../../middlewares/validate.middleware.js';

const router = Router();

// Base middleware: authenticate and lock to tenant school
router.use(authenticate);
router.use(tenantMiddleware);

// 1. Operations Dashboard Overview (Admins)
router.get(
  '/dashboard',
  requireRole(['admin', 'super_admin']),
  getOperationsDashboard
);

// 2. Operational Tasks
router.get(
  '/tasks',
  requireRole(['admin', 'super_admin', 'teacher']),
  getTasks
);

router.post(
  '/tasks',
  requireRole(['admin', 'super_admin']),
  createTask
);

router.patch(
  '/tasks/:id/status',
  requireRole(['admin', 'super_admin', 'teacher']),
  validateObjectIdParam('id'),
  updateTaskStatus
);

router.delete(
  '/tasks/:id',
  requireRole(['admin', 'super_admin']),
  validateObjectIdParam('id'),
  deleteTask
);

// 3. Administrative Approval Workflows
router.get(
  '/approvals',
  requireRole(['admin', 'super_admin', 'teacher']),
  getApprovals
);

router.post(
  '/approvals',
  requireRole(['admin', 'super_admin', 'teacher']),
  createApproval
);

router.patch(
  '/approvals/:id/review',
  requireRole(['admin', 'super_admin']),
  validateObjectIdParam('id'),
  reviewApproval
);

// 4. Daily Automation & Reminders (Admins)
router.post(
  '/automation/run-daily-check',
  requireRole(['admin', 'super_admin']),
  runDailyAutomation
);

router.post(
  '/reminders/attendance',
  requireRole(['admin', 'super_admin']),
  triggerAttendanceReminders
);

router.post(
  '/reminders/fees',
  requireRole(['admin', 'super_admin']),
  triggerFeeReminders
);

// 5. Disaster Recovery, Backups & Data Integrity (Phase 28)
router.get(
  '/backups',
  requireRole(['admin', 'super_admin']),
  getBackups
);

router.post(
  '/backups',
  requireRole(['super_admin']),
  triggerBackup
);

router.post(
  '/backups/:backupId/verify',
  requireRole(['super_admin']),
  verifyBackup
);

router.get(
  '/data-integrity',
  requireRole(['admin', 'super_admin']),
  getDataIntegrityReport
);

// 6. Observability, System Performance Metrics & Telemetry (Phase 29)
router.get(
  '/metrics',
  requireRole(['admin', 'super_admin']),
  getSystemMetrics
);

export default router;
