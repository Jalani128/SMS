import { OperationsService } from '../services/operations.service.js';
import { DisasterRecoveryService } from '../services/disasterRecovery.service.js';
import { DataIntegrityService } from '../services/dataIntegrity.service.js';
import { metricsCollector } from '../utils/metrics.js';
import { alertManager } from '../utils/alertManager.js';
import { errorTracker } from '../utils/errorTracker.js';
import { createTaskSchema, updateTaskStatusSchema, createApprovalSchema, reviewApprovalSchema, runAutomationSchema, } from '../validations/operations.validation.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
// Express async handler wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
/**
 * GET /api/v1/operations/dashboard
 * Aggregated daily operations dashboard overview
 */
export const getOperationsDashboard = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const result = await OperationsService.getOperationsDashboard(schoolId);
    return ApiResponse.success(res, result, 'Operations dashboard retrieved successfully');
});
/**
 * GET /api/v1/operations/tasks
 * List operational tasks with filtering and pagination
 */
export const getTasks = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const result = await OperationsService.listTasks(schoolId, { _id: user.userId || user._id, role: user.role }, {
        status: req.query.status,
        category: req.query.category,
        priority: req.query.priority,
        assignedTo: req.query.assignedTo,
        search: req.query.search,
        page: Math.max(1, parseInt(req.query.page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)),
    });
    return ApiResponse.success(res, result, 'Operational tasks retrieved successfully');
});
/**
 * POST /api/v1/operations/tasks
 * Create a new operational task
 */
export const createTask = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const validated = createTaskSchema.parse(req.body);
    const task = await OperationsService.createTask(schoolId, { _id: user.userId || user._id, role: user.role, name: user.name }, validated);
    return ApiResponse.created(res, task, 'Operational task created successfully');
});
/**
 * PATCH /api/v1/operations/tasks/:id/status
 * Update status of an operational task
 */
export const updateTaskStatus = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const validated = updateTaskStatusSchema.parse(req.body);
    const task = await OperationsService.updateTaskStatus(schoolId, req.params.id, { _id: user.userId || user._id, role: user.role }, validated);
    return ApiResponse.success(res, task, 'Task status updated successfully');
});
/**
 * DELETE /api/v1/operations/tasks/:id
 * Delete/cancel an operational task
 */
export const deleteTask = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    await OperationsService.deleteTask(schoolId, req.params.id, {
        _id: user.userId || user._id,
        role: user.role,
    });
    return ApiResponse.success(res, { deleted: true }, 'Task deleted successfully');
});
/**
 * GET /api/v1/operations/approvals
 * List administrative approval requests
 */
export const getApprovals = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const result = await OperationsService.listApprovals(schoolId, { _id: user.userId || user._id, role: user.role }, {
        status: req.query.status,
        type: req.query.type,
        priority: req.query.priority,
        page: Math.max(1, parseInt(req.query.page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)),
    });
    return ApiResponse.success(res, result, 'Approval requests retrieved successfully');
});
/**
 * POST /api/v1/operations/approvals
 * Submit an administrative approval request
 */
export const createApproval = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const validated = createApprovalSchema.parse(req.body);
    const approval = await OperationsService.createApproval(schoolId, { _id: user.userId || user._id, role: user.role }, validated);
    return ApiResponse.created(res, approval, 'Approval request submitted successfully');
});
/**
 * PATCH /api/v1/operations/approvals/:id/review
 * Approve or reject an administrative request (with maker-checker guard)
 */
export const reviewApproval = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const validated = reviewApprovalSchema.parse(req.body);
    const result = await OperationsService.reviewApproval(schoolId, req.params.id, { _id: user.userId || user._id, role: user.role, name: user.name }, validated);
    return ApiResponse.success(res, result, `Approval request ${validated.action} successfully`);
});
/**
 * POST /api/v1/operations/automation/run-daily-check
 * Trigger automated operations checks (attendance reminders, fee reminders, homework follow-ups)
 */
export const runDailyAutomation = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const validated = runAutomationSchema.parse(req.body);
    const result = await OperationsService.runDailyOperationsCheck(schoolId, user.userId || user._id, validated.types);
    return ApiResponse.success(res, result, 'Daily operations automation executed successfully');
});
/**
 * POST /api/v1/operations/reminders/attendance
 * Send attendance reminders for missing classes
 */
export const triggerAttendanceReminders = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const result = await OperationsService.sendAttendanceReminders(schoolId, user.userId || user._id);
    return ApiResponse.success(res, result, 'Attendance reminders processed successfully');
});
/**
 * POST /api/v1/operations/reminders/fees
 * Send fee reminders for overdue & due-soon invoices
 */
export const triggerFeeReminders = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const user = req.user;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const result = await OperationsService.sendFeeReminders(schoolId, user.userId || user._id);
    return ApiResponse.success(res, result, 'Fee reminders processed successfully');
});
/**
 * GET /api/v1/operations/backups
 * Retrieve backup inventory with pagination and status filters
 */
export const getBackups = asyncHandler(async (req, res) => {
    const result = await DisasterRecoveryService.getBackupInventory({
        page: Math.max(1, parseInt(req.query.page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)),
        status: req.query.status,
        verificationStatus: req.query.verificationStatus,
    });
    return ApiResponse.success(res, result, 'Backup inventory retrieved successfully');
});
/**
 * POST /api/v1/operations/backups
 * Trigger on-demand backup snapshot
 */
export const triggerBackup = asyncHandler(async (req, res) => {
    const user = req.user;
    const schoolId = req.schoolId || user?.schoolId;
    const result = await DisasterRecoveryService.triggerBackup({
        backupType: req.body.backupType || 'manual',
        scope: req.body.scope || 'platform',
        schoolId,
        triggeredBy: {
            userId: user?.userId || user?._id,
            userEmail: user?.email,
            triggerType: 'manual',
        },
        metadata: req.body.metadata,
    });
    return ApiResponse.created(res, result, 'Backup initiated and registered successfully');
});
/**
 * POST /api/v1/operations/backups/:backupId/verify
 * Verify an existing backup artifact's integrity
 */
export const verifyBackup = asyncHandler(async (req, res) => {
    const backupId = Array.isArray(req.params.backupId) ? req.params.backupId[0] : req.params.backupId;
    if (!backupId)
        throw ApiError.badRequest('Backup identifier is required.');
    const result = await DisasterRecoveryService.verifyBackup(backupId);
    return ApiResponse.success(res, result, 'Backup verified successfully');
});
/**
 * GET /api/v1/operations/data-integrity
 * Run non-destructive data integrity audit
 */
export const getDataIntegrityReport = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const result = await DataIntegrityService.runIntegrityAudit(schoolId);
    return ApiResponse.success(res, result, 'Data integrity audit completed successfully');
});
/**
 * GET /api/v1/operations/metrics
 * System performance metrics, latency percentiles, error rates, and job telemetry (Admins/SuperAdmin)
 */
export const getSystemMetrics = asyncHandler(async (_req, res) => {
    const snapshot = metricsCollector.getSnapshot();
    const alerts = alertManager.getActiveAlerts();
    const recentErrors = errorTracker.getRecentErrors();
    return ApiResponse.success(res, {
        metrics: snapshot,
        activeAlerts: alerts,
        recentErrors: recentErrors.slice(0, 10),
    }, 'System metrics retrieved successfully');
});
