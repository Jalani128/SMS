import { ReportService } from '../services/report.service.js';
import { reportQuerySchema, studentReportParamsSchema } from '../validations/report.validation.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/User.model.js';
const getContext = async (req) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId) {
        throw ApiError.unauthorized('School tenant context required.');
    }
    let user = req.currentUser;
    if (!user && req.user?.userId) {
        user = (await User.findById(req.user.userId)) || undefined;
    }
    if (!user) {
        throw ApiError.unauthorized('Authenticated user record not found.');
    }
    return { schoolId, user };
};
/**
 * 1. Overview Dashboard Analytics
 * GET /api/reports/dashboard
 */
export const getDashboardAnalyticsHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getDashboardAnalytics(schoolId, user, parsed.data);
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 2. Attendance Reports
 * GET /api/reports/attendance
 */
export const getAttendanceReportHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getAttendanceReport(schoolId, user, parsed.data);
        if (parsed.data.format === 'csv') {
            const csv = ReportService.generateCsv('attendance', data);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${Date.now()}.csv"`);
            res.status(200).send(csv);
            return;
        }
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
/**
 * GET /api/reports/attendance/export
 */
export const exportAttendanceCsvHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getAttendanceReport(schoolId, user, parsed.data);
        const csv = ReportService.generateCsv('attendance', data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${Date.now()}.csv"`);
        res.status(200).send(csv);
    }
    catch (err) {
        next(err);
    }
};
/**
 * 3. Fee and Financial Reports
 * GET /api/reports/fees
 */
export const getFeeFinanceReportHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getFeeFinanceReport(schoolId, user, parsed.data);
        if (parsed.data.format === 'csv') {
            const csv = ReportService.generateCsv('fees', data);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="finance_report_${Date.now()}.csv"`);
            res.status(200).send(csv);
            return;
        }
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
/**
 * GET /api/reports/fees/export
 */
export const exportFeeFinanceCsvHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getFeeFinanceReport(schoolId, user, parsed.data);
        const csv = ReportService.generateCsv('fees', data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="finance_report_${Date.now()}.csv"`);
        res.status(200).send(csv);
    }
    catch (err) {
        next(err);
    }
};
/**
 * 4. Student and Enrollment Reports
 * GET /api/reports/students
 */
export const getStudentEnrollmentReportHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getStudentEnrollmentReport(schoolId, user, parsed.data);
        if (parsed.data.format === 'csv') {
            const csv = ReportService.generateCsv('students', data);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="enrollment_report_${Date.now()}.csv"`);
            res.status(200).send(csv);
            return;
        }
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
/**
 * GET /api/reports/students/export
 */
export const exportStudentEnrollmentCsvHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getStudentEnrollmentReport(schoolId, user, parsed.data);
        const csv = ReportService.generateCsv('students', data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="enrollment_report_${Date.now()}.csv"`);
        res.status(200).send(csv);
    }
    catch (err) {
        next(err);
    }
};
/**
 * 5. Academic Performance Reports
 * GET /api/reports/academic-performance
 */
export const getAcademicPerformanceReportHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getAcademicPerformanceReport(schoolId, user, parsed.data);
        if (parsed.data.format === 'csv') {
            const csv = ReportService.generateCsv('academic', data);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="academic_performance_${Date.now()}.csv"`);
            res.status(200).send(csv);
            return;
        }
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
/**
 * GET /api/reports/academic-performance/export
 */
export const exportAcademicPerformanceCsvHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getAcademicPerformanceReport(schoolId, user, parsed.data);
        const csv = ReportService.generateCsv('academic', data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="academic_performance_${Date.now()}.csv"`);
        res.status(200).send(csv);
    }
    catch (err) {
        next(err);
    }
};
/**
 * 6. Homework Completion Reports
 * GET /api/reports/homework
 */
export const getHomeworkReportHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getHomeworkReport(schoolId, user, parsed.data);
        if (parsed.data.format === 'csv') {
            const csv = ReportService.generateCsv('homework', data);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="homework_report_${Date.now()}.csv"`);
            res.status(200).send(csv);
            return;
        }
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
/**
 * GET /api/reports/homework/export
 */
export const exportHomeworkCsvHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getHomeworkReport(schoolId, user, parsed.data);
        const csv = ReportService.generateCsv('homework', data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="homework_report_${Date.now()}.csv"`);
        res.status(200).send(csv);
    }
    catch (err) {
        next(err);
    }
};
/**
 * 7. Individual Student Report
 * GET /api/reports/student/:studentId
 */
export const getStudentReportHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = studentReportParamsSchema.safeParse(req.params);
        if (!parsed.success) {
            throw ApiError.badRequest('Invalid student ID parameter.');
        }
        const data = await ReportService.getStudentReport(schoolId, user, parsed.data.studentId);
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 8. Comprehensive Advanced Analytics Overview (Phase 25)
 * GET /api/reports/advanced-overview
 */
export const getAdvancedAnalyticsOverviewHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getAdvancedAnalyticsOverview(schoolId, user, parsed.data);
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 9. Export Comprehensive Advanced Analytics CSV (Phase 25)
 * GET /api/reports/advanced-overview/export
 */
export const exportAdvancedAnalyticsCsvHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getContext(req);
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid query parameters.');
        }
        const data = await ReportService.getAdvancedAnalyticsOverview(schoolId, user, parsed.data);
        const csv = ReportService.exportAdvancedAnalyticsCsv(data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="advanced_analytics_${Date.now()}.csv"`);
        res.status(200).send(csv);
    }
    catch (err) {
        next(err);
    }
};
