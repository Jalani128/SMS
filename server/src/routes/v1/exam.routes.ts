import { Router } from 'express';
import {
  authenticate,
  enforceSchoolContext,
  requireActiveSchool,
} from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import {
  listExams,
  getExamById,
  createExam,
  updateExam,
  archiveExam,
  deleteExam,
  listExamSubjects,
  createExamSubject,
  updateExamSubject,
  deleteExamSubject,
  getSubjectRosterAndMarks,
  bulkSaveMarks,
  verifyExamMarks,
  publishExamResults,
  correctMark,
  getStudentReportCard,
  getExamClassAnalytics,
  exportExamResultsCsv,
  listGradingScales,
  createGradingScale,
} from '../../controllers/exam.controller.js';

const router = Router();

// Enforce auth & tenant context across all exam routes
router.use(authenticate);
router.use(enforceSchoolContext);
router.use(requireActiveSchool);

// ----------------------------------------------------------------------------
// 1. Grading Scale Routes
// ----------------------------------------------------------------------------
router.get('/grading-scales', listGradingScales);
router.post('/grading-scales', requireRole(['admin', 'super_admin']), createGradingScale);

// ----------------------------------------------------------------------------
// 2. Examination Lifecycle Routes
// ----------------------------------------------------------------------------
router.get('/', listExams);
router.get('/:id', getExamById);
router.post('/', requireRole(['admin', 'super_admin']), createExam);
router.patch('/:id', requireRole(['admin', 'super_admin']), updateExam);
router.patch('/:id/archive', requireRole(['admin', 'super_admin']), archiveExam);
router.delete('/:id', requireRole(['admin', 'super_admin']), deleteExam);

// ----------------------------------------------------------------------------
// 3. Exam Subjects & Schedules
// ----------------------------------------------------------------------------
router.get('/:examId/subjects', listExamSubjects);
router.post('/:examId/subjects', requireRole(['admin', 'super_admin']), createExamSubject);
router.patch('/:examId/subjects/:subjectId', requireRole(['admin', 'super_admin']), updateExamSubject);
router.delete('/:examId/subjects/:subjectId', requireRole(['admin', 'super_admin']), deleteExamSubject);

// ----------------------------------------------------------------------------
// 4. Marks Entry & Verification
// ----------------------------------------------------------------------------
router.get(
  '/:examId/subjects/:subjectId/marks',
  requireRole(['admin', 'super_admin', 'teacher']),
  getSubjectRosterAndMarks
);
router.post(
  '/:examId/subjects/:subjectId/marks/bulk',
  requireRole(['admin', 'super_admin', 'teacher']),
  bulkSaveMarks
);
router.post(
  '/:examId/verify',
  requireRole(['admin', 'super_admin']),
  verifyExamMarks
);
router.post(
  '/:examId/publish',
  requireRole(['admin', 'super_admin']),
  publishExamResults
);

// ----------------------------------------------------------------------------
// 5. Post-Publication Mark Correction
// ----------------------------------------------------------------------------
router.patch(
  '/marks/:markId/correct',
  requireRole(['admin', 'super_admin']),
  correctMark
);

// ----------------------------------------------------------------------------
// 6. Report Cards & Analytics
// ----------------------------------------------------------------------------
router.get(
  '/:examId/report-card/:studentId',
  getStudentReportCard
);
router.get(
  '/:examId/analytics',
  requireRole(['admin', 'super_admin', 'teacher']),
  getExamClassAnalytics
);
router.get(
  '/:examId/export-csv',
  requireRole(['admin', 'super_admin']),
  exportExamResultsCsv
);

export default router;
