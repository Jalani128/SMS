import { Router } from 'express';
import { getStudents, getStudentById, createStudent, updateStudent, archiveStudent, createStudentEnrollment, getNextAdmissionNumber, } from '../../controllers/student.controller.js';
import { authenticate, enforceSchoolContext } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validateBody, validateQuery, validateObjectIdParam, } from '../../middlewares/validate.middleware.js';
import { createStudentSchema, updateStudentSchema, studentListQuerySchema, createEnrollmentSchema, archiveStudentSchema, } from '../../validations/student.validation.js';
const router = Router();
// All student routes require valid session and active school isolation
router.use(authenticate, enforceSchoolContext);
// Specific routes before parameterized :id
router.get('/next-admission-number', requireRole(['admin', 'super_admin']), getNextAdmissionNumber);
router.get('/', requireRole(['admin', 'super_admin']), validateQuery(studentListQuerySchema), getStudents);
router.post('/', requireRole(['admin', 'super_admin']), validateBody(createStudentSchema), createStudent);
router.get('/:id', validateObjectIdParam('id'), getStudentById);
router.patch('/:id', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateStudentSchema), updateStudent);
router.patch('/:id/archive', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(archiveStudentSchema), archiveStudent);
router.post('/:id/enrollments', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(createEnrollmentSchema), createStudentEnrollment);
export default router;
