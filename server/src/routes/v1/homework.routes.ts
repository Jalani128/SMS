import { Router } from 'express';
import {
  authenticate,
  enforceSchoolContext,
  requireActiveSchool,
} from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import {
  listHomework,
  getHomeworkById,
  createHomework,
  updateHomework,
  publishHomework,
  archiveHomework,
  listSubmissions,
  createSubmission,
  gradeSubmission,
  returnSubmission,
  releaseGrades,
  getHomeworkSummary,
  uploadAttachment,
} from '../../controllers/homework.controller.js';

const router = Router();

// Apply authentication, school context and active status to all homework routes
router.use(authenticate);
router.use(enforceSchoolContext);
router.use(requireActiveSchool);

// --- Homework Queries & Management ---
router.get('/', listHomework);
router.post('/', requireRole(['admin', 'teacher']), createHomework);
router.post('/upload', requireRole(['admin', 'teacher', 'student']), uploadAttachment);

router.get('/:id', getHomeworkById);
router.put('/:id', requireRole(['admin', 'teacher']), updateHomework);
router.patch('/:id', requireRole(['admin', 'teacher']), updateHomework);
router.patch('/:id/publish', requireRole(['admin', 'teacher']), publishHomework);
router.patch('/:id/archive', requireRole(['admin', 'teacher']), archiveHomework);
router.get('/:id/summary', requireRole(['admin', 'teacher']), getHomeworkSummary);

// --- Submissions & Grading ---
router.get('/:id/submissions', listSubmissions);
router.post('/:id/submissions', requireRole(['student']), createSubmission);
router.post('/:id/submissions/resubmit', requireRole(['student']), createSubmission);

router.patch('/submissions/:submissionId/grade', requireRole(['admin', 'teacher']), gradeSubmission);
router.patch('/submissions/:submissionId/return', requireRole(['admin', 'teacher']), returnSubmission);
router.patch('/:id/release-grades', requireRole(['admin', 'teacher']), releaseGrades);

export default router;
