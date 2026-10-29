import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, enforceSchoolContext, requireActiveSchool, } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { ApiError } from '../../utils/apiError.js';
import { chatHandler, homeworkHelpHandler, quizGeneratorHandler, reportCardCommentHandler, feeReminderHandler, noticeGeneratorHandler, schoolInsightsHandler, } from '../../controllers/ai.controller.js';
const router = Router();
// Configurable AI rate limiter (30 requests per 15 minutes per IP/client)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
        next(ApiError.tooManyRequests('AI rate limit reached. Please wait a few minutes before making further AI requests.'));
    },
});
// All AI endpoints require authentication, tenant isolation, active school status, and rate limiting
router.use(authenticate);
router.use(enforceSchoolContext);
router.use(requireActiveSchool);
router.use(aiLimiter);
/**
 * @route   POST /api/ai/chat
 * @desc    Contextual role-scoped chat assistant for all school members
 * @access  Private (All authenticated roles)
 */
router.post('/chat', chatHandler);
/**
 * @route   POST /api/ai/homework-help
 * @desc    Guided explanations, hints, and practice questions for students
 * @access  Private (Students, parents, faculty)
 */
router.post('/homework-help', homeworkHelpHandler);
/**
 * @route   POST /api/ai/quiz-generator
 * @desc    Structured quiz creation adhering to teacher assignments and strict JSON schemas
 * @access  Private (Admin, Teacher)
 */
router.post('/quiz-generator', requireRole(['admin', 'teacher']), quizGeneratorHandler);
/**
 * @route   POST /api/ai/report-card-comment
 * @desc    Factual report-card comments based exclusively on real marks and attendance
 * @access  Private (Admin, Teacher)
 */
router.post('/report-card-comment', requireRole(['admin', 'teacher']), reportCardCommentHandler);
/**
 * @route   POST /api/ai/fee-reminder
 * @desc    Draft fee reminders reflecting verified unpaid invoice balances
 * @access  Private (Admin only)
 */
router.post('/fee-reminder', requireRole(['admin']), feeReminderHandler);
/**
 * @route   POST /api/ai/notice-generator
 * @desc    Draft official school notices, event plans, and parent announcements
 * @access  Private (Admin, Teacher)
 */
router.post('/notice-generator', requireRole(['admin', 'teacher']), noticeGeneratorHandler);
/**
 * @route   POST /api/ai/school-insights
 * @desc    Deterministic analytics summaries (counts, rates, attendance) computed in backend
 * @access  Private (Admin, Teacher)
 */
router.post('/school-insights', requireRole(['admin', 'teacher']), schoolInsightsHandler);
export default router;
