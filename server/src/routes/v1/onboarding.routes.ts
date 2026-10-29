import { Router } from 'express';
import {
  getOnboardingStatus,
  saveOnboardingStep,
  completeOnboarding,
  getTemplate,
  previewImport,
  confirmImport,
  getImportHistory,
  downloadErrorReport,
} from '../../controllers/onboarding.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';

const router = Router();

// All onboarding endpoints require authentication and tenant binding
router.use(authenticate);
router.use(tenantMiddleware);

// School Admins and Super Admins only
router.use(requireRole(['admin', 'super_admin']));

// Onboarding progress & status
router.get('/status', getOnboardingStatus);
router.put('/step', saveOnboardingStep);
router.post('/complete', completeOnboarding);

// CSV Templates
router.get('/templates/:type', getTemplate);

// Bulk Import Workflow
router.post('/import/preview', previewImport);
router.post('/import/confirm', confirmImport);
router.get('/import/history', getImportHistory);
router.get('/import/errors/:batchId', downloadErrorReport);

export default router;
