import { Router } from 'express';
import { getAttendanceList, getDailyAttendance, getStudentAttendance, getClassSummary, submitBulkAttendance, updateAttendanceRecord, getMonthlyReport, exportAttendanceCsv, } from '../../controllers/attendance.controller.js';
import { authenticate, enforceSchoolContext } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validateBody, validateObjectIdParam, } from '../../middlewares/validate.middleware.js';
import { bulkAttendanceSchema, updateAttendanceSchema, } from '../../validations/attendance.validation.js';
const router = Router();
// Base middleware: authenticate and lock to tenant school
router.use(authenticate, enforceSchoolContext);
// 1. GET /api/attendance - List attendance records with filters
router.get('/', getAttendanceList);
// 2. GET /api/attendance/daily - Class section daily roster & marking overview
router.get('/daily', getDailyAttendance);
// 3. GET /api/attendance/student/:studentId - Individual student attendance history
router.get('/student/:studentId', validateObjectIdParam('studentId'), getStudentAttendance);
// 4. GET /api/attendance/class-summary - Class summary stats for a date
router.get('/class-summary', getClassSummary);
// 5. POST /api/attendance/bulk - Idempotent bulk attendance marking (admin & assigned teachers)
router.post('/bulk', requireRole(['admin', 'super_admin', 'teacher']), validateBody(bulkAttendanceSchema), submitBulkAttendance);
// 6. PATCH /api/attendance/:id - Single attendance correction with audit logging
router.patch('/:id', requireRole(['admin', 'super_admin', 'teacher']), validateObjectIdParam('id'), validateBody(updateAttendanceSchema), updateAttendanceRecord);
// 7. GET /api/attendance/reports/monthly - Monthly aggregated attendance matrices
router.get('/reports/monthly', getMonthlyReport);
// 8. GET /api/attendance/reports/export - Sanitized CSV download
router.get('/reports/export', exportAttendanceCsv);
export default router;
