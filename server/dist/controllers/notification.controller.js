import { Types } from 'mongoose';
import { NotificationService } from '../services/notification.service.js';
import { notificationQuerySchema, notificationIdParamSchema, updatePreferencesSchema, manualTriggerSchema, } from '../validations/notification.validation.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { Notification } from '../models/Notification.model.js';
// Express async handler wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
/**
 * GET /api/notifications
 * Retrieves paginated notifications strictly scoped to the authenticated user and active school.
 */
export const getNotifications = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const recipientId = req.user?.userId;
    if (!schoolId || !recipientId) {
        throw ApiError.unauthorized('Authenticated session and school context are required.');
    }
    const queryParams = notificationQuerySchema.parse(req.query);
    const { notifications, pagination } = await NotificationService.getNotifications(schoolId, recipientId, queryParams);
    return ApiResponse.success(res, notifications, 'Notifications retrieved successfully', 200, {
        pagination,
    });
});
/**
 * GET /api/notifications/unread-count
 * Retrieves the count of unread notifications for the authenticated user.
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const recipientId = req.user?.userId;
    if (!schoolId || !recipientId) {
        throw ApiError.unauthorized('Authenticated session and school context are required.');
    }
    const count = await NotificationService.getUnreadCount(schoolId, recipientId);
    return ApiResponse.success(res, { unreadCount: count }, 'Unread count retrieved');
});
/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 * Enforces recipient ownership: users cannot mark another user's notification as read.
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const recipientId = req.user?.userId;
    if (!schoolId || !recipientId) {
        throw ApiError.unauthorized('Authenticated session and school context are required.');
    }
    const { id } = notificationIdParamSchema.parse(req.params);
    const notification = await NotificationService.markAsRead(schoolId, recipientId, id);
    if (!notification) {
        throw ApiError.notFound('Notification not found, or you do not have permission to modify this notification.');
    }
    return ApiResponse.success(res, notification, 'Notification marked as read');
});
/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications as read for the authenticated recipient.
 */
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const recipientId = req.user?.userId;
    if (!schoolId || !recipientId) {
        throw ApiError.unauthorized('Authenticated session and school context are required.');
    }
    const count = await NotificationService.markAllAsRead(schoolId, recipientId);
    return ApiResponse.success(res, { modifiedCount: count }, `${count} notifications marked as read`);
});
/**
 * GET /api/notification-preferences
 * Retrieves notification channel preferences for the current user.
 */
export const getNotificationPreferences = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?.userId;
    if (!schoolId || !userId) {
        throw ApiError.unauthorized('Authenticated session and school context are required.');
    }
    const preferences = await NotificationService.getPreferences(schoolId, userId);
    return ApiResponse.success(res, preferences, 'Notification preferences retrieved');
});
/**
 * PATCH /api/notification-preferences
 * Updates notification channel preferences for the current user.
 */
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?.userId;
    if (!schoolId || !userId) {
        throw ApiError.unauthorized('Authenticated session and school context are required.');
    }
    const validatedData = updatePreferencesSchema.parse(req.body);
    const preferences = await NotificationService.updatePreferences(schoolId, userId, validatedData);
    return ApiResponse.success(res, preferences, 'Notification preferences updated successfully');
});
/**
 * POST /api/notifications/trigger
 * Administrative & testing trigger for event-based notifications.
 * Restricted to staff/admin roles.
 */
export const triggerNotification = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId) {
        throw ApiError.unauthorized('Active school context required.');
    }
    const { type, targetId, reminderType, attendanceStatus, attendanceDate } = manualTriggerSchema.parse(req.body);
    let result;
    switch (type) {
        case 'attendance': {
            if (!targetId)
                throw ApiError.badRequest('Student targetId required for attendance alert');
            result = await NotificationService.triggerAttendanceAlert({
                schoolId,
                studentId: targetId,
                attendanceDate: attendanceDate || new Date(),
                status: attendanceStatus || 'absent',
                className: 'Class',
            });
            break;
        }
        case 'fee': {
            if (!targetId)
                throw ApiError.badRequest('Invoice targetId required for fee reminder');
            result = await NotificationService.triggerFeeReminder({
                schoolId,
                invoiceId: targetId,
                reminderType: reminderType || 'due_soon',
            });
            break;
        }
        case 'homework': {
            if (!targetId)
                throw ApiError.badRequest('Homework targetId required for homework reminder');
            result = await NotificationService.triggerHomeworkReminder({
                schoolId,
                homeworkId: targetId,
                reminderType: reminderType || 'newly_published',
            });
            break;
        }
        case 'exam': {
            if (!targetId)
                throw ApiError.badRequest('Exam targetId required for exam notice');
            result = await NotificationService.triggerExamScheduleNotice({
                schoolId,
                examId: targetId,
            });
            break;
        }
        case 'results': {
            if (!targetId)
                throw ApiError.badRequest('Exam targetId required for results notice');
            result = await NotificationService.triggerExamResultsNotice({
                schoolId,
                examId: targetId,
            });
            break;
        }
        case 'announcement': {
            if (!targetId)
                throw ApiError.badRequest('Announcement targetId required');
            result = await NotificationService.triggerAnnouncementNotice({
                schoolId,
                announcementId: targetId,
            });
            break;
        }
        case 'retry': {
            result = await NotificationService.retryFailedDeliveries(schoolId);
            break;
        }
        default:
            throw ApiError.badRequest('Unsupported notification trigger type');
    }
    return ApiResponse.success(res, result, `Notification trigger (${type}) processed`);
});
/**
 * GET /api/notifications/diagnostics
 * Returns system-level delivery statistics (Admin / Super Admin only).
 */
export const getNotificationDiagnostics = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId) {
        throw ApiError.unauthorized('School context required.');
    }
    const sId = new Types.ObjectId(schoolId);
    const [total, unread, failed, sent, pending] = await Promise.all([
        Notification.countDocuments({ schoolId: sId, isDeleted: false }),
        Notification.countDocuments({ schoolId: sId, isRead: false, isDeleted: false }),
        Notification.countDocuments({
            schoolId: sId,
            'deliveryStatus.emailStatus': 'failed',
            isDeleted: false,
        }),
        Notification.countDocuments({
            schoolId: sId,
            'deliveryStatus.emailStatus': 'sent',
            isDeleted: false,
        }),
        Notification.countDocuments({
            schoolId: sId,
            'deliveryStatus.emailStatus': 'pending',
            isDeleted: false,
        }),
    ]);
    return ApiResponse.success(res, {
        total,
        unread,
        emailDelivery: {
            sent,
            failed,
            pending,
        },
    }, 'Notification diagnostics retrieved');
});
