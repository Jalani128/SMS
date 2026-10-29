import { Router } from 'express';
import { getSettings, updateProfile, updateBranding, updateRegional, updateAcademic, getAcademicCalendar, addHoliday, updateHoliday, deleteHoliday, updateAttendancePolicy, updateFeePolicy, updateNotificationSettings, getGradingPolicy, updateGradingPolicy, } from '../../controllers/schoolSettings.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
const router = Router();
router.use(authenticate);
router.use(tenantMiddleware);
// Core settings overview (Read accessible to authenticated users)
router.get('/', getSettings);
// Profile & Branding (Admin only)
router.patch('/profile', requireRole(['admin', 'super_admin']), updateProfile);
router.patch('/branding', requireRole(['admin', 'super_admin']), updateBranding);
// Regional & Localization (Admin only)
router.patch('/regional', requireRole(['admin', 'super_admin']), updateRegional);
// Academic calendar & holidays
router.get('/academic-calendar', getAcademicCalendar);
router.patch('/academic', requireRole(['admin', 'super_admin']), updateAcademic);
router.post('/academic-calendar/holidays', requireRole(['admin', 'super_admin']), addHoliday);
router.patch('/academic-calendar/holidays/:id', requireRole(['admin', 'super_admin']), updateHoliday);
router.delete('/academic-calendar/holidays/:id', requireRole(['admin', 'super_admin']), deleteHoliday);
// Departmental & Operational Policies (Admin only)
router.patch('/attendance', requireRole(['admin', 'super_admin']), updateAttendancePolicy);
router.patch('/fees', requireRole(['admin', 'super_admin']), updateFeePolicy);
router.patch('/notifications', requireRole(['admin', 'super_admin']), updateNotificationSettings);
// Grading Policies
router.get('/grading', getGradingPolicy);
router.patch('/grading', requireRole(['admin', 'super_admin']), updateGradingPolicy);
export default router;
