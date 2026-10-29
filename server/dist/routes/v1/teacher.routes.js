import { Router } from 'express';
import { getTeachers, getTeacherById, createTeacher, updateTeacher, archiveTeacher, } from '../../controllers/teacher.controller.js';
import { authenticate, enforceSchoolContext } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validateBody, validateQuery, validateObjectIdParam, } from '../../middlewares/validate.middleware.js';
import { createTeacherSchema, updateTeacherSchema, teacherListQuerySchema, archiveTeacherSchema, } from '../../validations/teacher.validation.js';
const router = Router();
// All teacher routes require valid session and active school isolation
router.use(authenticate, enforceSchoolContext);
router.get('/', requireRole(['admin', 'super_admin']), validateQuery(teacherListQuerySchema), getTeachers);
router.post('/', requireRole(['admin', 'super_admin']), validateBody(createTeacherSchema), createTeacher);
router.get('/:id', validateObjectIdParam('id'), getTeacherById);
router.patch('/:id', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateTeacherSchema), updateTeacher);
router.patch('/:id/archive', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(archiveTeacherSchema), archiveTeacher);
export default router;
