import { Router } from 'express';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, getNotificationPreferences, updateNotificationPreferences, triggerNotification, getNotificationDiagnostics, } from '../../controllers/notification.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
// ===========================================================================
// Notifications Router
// ===========================================================================
const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.use(tenantMiddleware);
// Core Notification Endpoints
notificationRouter.get('/', getNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.patch('/read-all', markAllNotificationsRead);
notificationRouter.patch('/:id/read', markNotificationRead);
// Preferences routes directly under /notifications/preferences as alias
notificationRouter.get('/preferences', getNotificationPreferences);
notificationRouter.patch('/preferences', updateNotificationPreferences);
// Admin diagnostic & manual testing triggers
notificationRouter.get('/diagnostics', requireRole(['admin', 'super_admin']), getNotificationDiagnostics);
notificationRouter.post('/trigger', requireRole(['admin', 'super_admin', 'teacher']), triggerNotification);
// ===========================================================================
// Dedicated Notification Preferences Router (/api/notification-preferences)
// ===========================================================================
export const notificationPreferenceRouter = Router();
notificationPreferenceRouter.use(authenticate);
notificationPreferenceRouter.use(tenantMiddleware);
notificationPreferenceRouter.get('/', getNotificationPreferences);
notificationPreferenceRouter.patch('/', updateNotificationPreferences);
export default notificationRouter;
