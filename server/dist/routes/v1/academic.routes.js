import { Router } from 'express';
import { getSessions, getSessionById, createSession, updateSession, activateSession, archiveSession, getClasses, getClassById, createClass, updateClass, archiveClass, getSections, getSectionById, createSection, updateSection, archiveSection, getSubjects, getSubjectById, createSubject, updateSubject, archiveSubject, getSubjectAssignments, createSubjectAssignment, updateSubjectAssignment, archiveSubjectAssignment, getEnrollments, createEnrollment, transferStudent, getStudentEnrollmentHistory, getAcademicSummary, } from '../../controllers/academic.controller.js';
import { authenticate, enforceSchoolContext } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validateBody, validateObjectIdParam, } from '../../middlewares/validate.middleware.js';
import { createAcademicSessionSchema, updateAcademicSessionSchema, createClassSchema, updateClassSchema, createSectionSchema, updateSectionSchema, createSubjectSchema, updateSubjectSchema, createSubjectAssignmentSchema, updateSubjectAssignmentSchema, enrollStudentSchema, transferStudentSchema, } from '../../validations/academic.validation.js';
// Router for academic sessions: /academic-sessions
export const sessionRouter = Router();
sessionRouter.use(authenticate, enforceSchoolContext);
sessionRouter.get('/', getSessions);
sessionRouter.get('/:id', validateObjectIdParam('id'), getSessionById);
sessionRouter.post('/', requireRole(['admin', 'super_admin']), validateBody(createAcademicSessionSchema), createSession);
sessionRouter.patch('/:id', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateAcademicSessionSchema), updateSession);
sessionRouter.patch('/:id/activate', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), activateSession);
sessionRouter.patch('/:id/archive', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), archiveSession);
// Router for classes: /classes
export const classRouter = Router();
classRouter.use(authenticate, enforceSchoolContext);
classRouter.get('/', getClasses);
classRouter.get('/:id', validateObjectIdParam('id'), getClassById);
classRouter.post('/', requireRole(['admin', 'super_admin']), validateBody(createClassSchema), createClass);
classRouter.patch('/:id', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateClassSchema), updateClass);
classRouter.patch('/:id/archive', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), archiveClass);
// Router for sections: /sections
export const sectionRouter = Router();
sectionRouter.use(authenticate, enforceSchoolContext);
sectionRouter.get('/', getSections);
sectionRouter.get('/:id', validateObjectIdParam('id'), getSectionById);
sectionRouter.post('/', requireRole(['admin', 'super_admin']), validateBody(createSectionSchema), createSection);
sectionRouter.patch('/:id', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateSectionSchema), updateSection);
sectionRouter.patch('/:id/archive', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), archiveSection);
// Router for subjects: /subjects
export const subjectRouter = Router();
subjectRouter.use(authenticate, enforceSchoolContext);
subjectRouter.get('/', getSubjects);
subjectRouter.get('/:id', validateObjectIdParam('id'), getSubjectById);
subjectRouter.post('/', requireRole(['admin', 'super_admin']), validateBody(createSubjectSchema), createSubject);
subjectRouter.patch('/:id', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateSubjectSchema), updateSubject);
subjectRouter.patch('/:id/archive', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), archiveSubject);
// Router for subject assignments: /subject-assignments
export const assignmentRouter = Router();
assignmentRouter.use(authenticate, enforceSchoolContext);
assignmentRouter.get('/', getSubjectAssignments);
assignmentRouter.post('/', requireRole(['admin', 'super_admin']), validateBody(createSubjectAssignmentSchema), createSubjectAssignment);
assignmentRouter.patch('/:id', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateSubjectAssignmentSchema), updateSubjectAssignment);
assignmentRouter.patch('/:id/archive', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), archiveSubjectAssignment);
// Router for enrollments & transfers: /enrollments
export const enrollmentRouter = Router();
enrollmentRouter.use(authenticate, enforceSchoolContext);
enrollmentRouter.get('/', requireRole(['admin', 'super_admin']), getEnrollments);
enrollmentRouter.post('/', requireRole(['admin', 'super_admin']), validateBody(enrollStudentSchema), createEnrollment);
enrollmentRouter.post('/:id/transfer', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(transferStudentSchema), transferStudent);
enrollmentRouter.get('/student/:studentId', validateObjectIdParam('studentId'), getStudentEnrollmentHistory);
// Router for academic summary: /academic
export const academicSummaryRouter = Router();
academicSummaryRouter.use(authenticate, enforceSchoolContext);
academicSummaryRouter.get('/summary', getAcademicSummary);
