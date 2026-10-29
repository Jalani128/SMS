import { Router } from 'express';
import {
  authenticate,
  enforceSchoolContext,
  requireActiveSchool,
} from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import {
  listTimetable,
  getTimetableById,
  createTimetableSlot,
  updateTimetableSlot,
  archiveTimetableSlot,
  deleteTimetableSlot,
  getTodaySchedule,
  copyDaySchedule,
  duplicateTimetable,
  getClassTimetable,
  getSectionTimetable,
  getTeacherTimetable,
} from '../../controllers/timetable.controller.js';

const router = Router();

// Apply authentication and school context to all timetable routes
router.use(authenticate);
router.use(enforceSchoolContext);
router.use(requireActiveSchool);

// Schedule & Calendar queries
router.get('/', listTimetable);
router.get('/today', getTodaySchedule);

// Class, Section & Teacher accessors
router.get('/class/:classId', getClassTimetable);
router.get('/section/:sectionId', getSectionTimetable);
router.get('/teacher/:teacherId', getTeacherTimetable);

// Administrative mutations
router.post('/', requireRole(['admin', 'teacher']), createTimetableSlot);
router.post('/copy-day', requireRole(['admin']), copyDaySchedule);
router.post('/duplicate', requireRole(['admin']), duplicateTimetable);

// Slot ID CRUD
router.get('/:id', getTimetableById);
router.put('/:id', requireRole(['admin']), updateTimetableSlot);
router.patch('/:id', requireRole(['admin']), updateTimetableSlot);
router.patch('/:id/archive', requireRole(['admin']), archiveTimetableSlot);
router.delete('/:id', requireRole(['admin']), deleteTimetableSlot);

export default router;
