import { Router } from 'express';
import { authenticate, enforceSchoolContext, requireActiveSchool, } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { listStudyMaterials, getStudyMaterialById, createStudyMaterial, updateStudyMaterial, publishStudyMaterial, archiveStudyMaterial, deleteStudyMaterial, uploadMaterialFile, } from '../../controllers/studyMaterial.controller.js';
const router = Router();
// Enforce auth, tenant context, and active school on all routes
router.use(authenticate);
router.use(enforceSchoolContext);
router.use(requireActiveSchool);
// Listing & details (role-scoped in controller)
router.get('/', listStudyMaterials);
router.get('/:id', getStudyMaterialById);
// Upload helper (admin, teacher)
router.post('/upload', requireRole(['admin', 'teacher']), uploadMaterialFile);
// Creation & modification (admin, teacher)
router.post('/', requireRole(['admin', 'teacher']), createStudyMaterial);
router.put('/:id', requireRole(['admin', 'teacher']), updateStudyMaterial);
router.patch('/:id', requireRole(['admin', 'teacher']), updateStudyMaterial);
router.patch('/:id/publish', requireRole(['admin', 'teacher']), publishStudyMaterial);
router.patch('/:id/archive', requireRole(['admin', 'teacher']), archiveStudyMaterial);
router.delete('/:id', requireRole(['admin', 'teacher']), deleteStudyMaterial);
export default router;
