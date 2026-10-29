import { Router } from 'express';
import {
  authenticate,
  enforceSchoolContext,
  requireActiveSchool,
} from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import {
  getDashboardAnalyticsHandler,
  getAttendanceReportHandler,
  exportAttendanceCsvHandler,
  getFeeFinanceReportHandler,
  exportFeeFinanceCsvHandler,
  getStudentEnrollmentReportHandler,
  exportStudentEnrollmentCsvHandler,
  getAcademicPerformanceReportHandler,
  exportAcademicPerformanceCsvHandler,
  getHomeworkReportHandler,
  exportHomeworkCsvHandler,
  getStudentReportHandler,
  getAdvancedAnalyticsOverviewHandler,
  exportAdvancedAnalyticsCsvHandler,
} from '../../controllers/report.controller.js';

const router = Router();

// All reporting endpoints require authentication, tenant context, and active school status
router.use(authenticate);
router.use(enforceSchoolContext);
router.use(requireActiveSchool);

/**
 * @route   GET /api/reports/dashboard
 * @desc    High-level institutional analytics and KPI trends
 * @access  Private (Admin, Teacher)
 */
router.get('/dashboard', getDashboardAnalyticsHandler);

/**
 * @route   GET /api/reports/attendance
 * @desc    Attendance rates, daily trends, and absenteeism rankings
 * @access  Private (Admin, Teacher)
 */
router.get('/attendance', getAttendanceReportHandler);
router.get('/attendance/export', exportAttendanceCsvHandler);

/**
 * @route   GET /api/reports/fees
 * @desc    Tuition collections, outstanding balances, and aging invoice metrics
 * @access  Private (Admin only)
 */
router.get('/fees', requireRole(['admin']), getFeeFinanceReportHandler);
router.get('/fees/export', requireRole(['admin']), exportFeeFinanceCsvHandler);

/**
 * @route   GET /api/reports/students
 * @desc    Student enrollment counts, class breakdowns, and unique admissions
 * @access  Private (Admin, Teacher)
 */
router.get('/students', getStudentEnrollmentReportHandler);
router.get('/students/export', exportStudentEnrollmentCsvHandler);

/**
 * @route   GET /api/reports/academic-performance
 * @desc    Exam results, grade distributions, and subject-wise averages
 * @access  Private (All authenticated roles)
 */
router.get('/academic-performance', getAcademicPerformanceReportHandler);
router.get('/academic-performance/export', exportAcademicPerformanceCsvHandler);

/**
 * @route   GET /api/reports/homework
 * @desc    Assignment completion, on-time submissions, and late trends
 * @access  Private (Admin, Teacher)
 */
router.get('/homework', getHomeworkReportHandler);
router.get('/homework/export', exportHomeworkCsvHandler);

/**
 * @route   GET /api/reports/student/:studentId
 * @desc    Consolidated performance profile for a single student
 * @access  Private (Admin, Assigned Teacher, Self Student, Linked Parent)
 */
router.get('/student/:studentId', getStudentReportHandler);

/**
 * @route   GET /api/reports/advanced-overview
 * @desc    Phase 25: Comprehensive Advanced Analytics Overview with Period Comparisons
 * @access  Private (Admin, Teacher)
 */
router.get('/advanced-overview', getAdvancedAnalyticsOverviewHandler);

/**
 * @route   GET /api/reports/advanced-overview/export
 * @desc    Phase 25: Export Comprehensive Advanced Analytics CSV
 * @access  Private (Admin only)
 */
router.get('/advanced-overview/export', requireRole(['admin', 'super_admin']), exportAdvancedAnalyticsCsvHandler);

export default router;
