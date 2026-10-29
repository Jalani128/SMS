import { Router } from 'express';
import { getParents, getParentById, createParent, updateParent, updateParentChildren, } from '../../controllers/parent.controller.js';
import { authenticate, enforceSchoolContext } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { validateBody, validateQuery, validateObjectIdParam, } from '../../middlewares/validate.middleware.js';
import { createParentSchema, updateParentSchema, parentListQuerySchema, updateParentChildrenSchema, } from '../../validations/parent.validation.js';
const router = Router();
// All parent routes require valid session and active school isolation
router.use(authenticate, enforceSchoolContext);
router.get('/', requireRole(['admin', 'super_admin']), validateQuery(parentListQuerySchema), getParents);
router.post('/', requireRole(['admin', 'super_admin']), validateBody(createParentSchema), createParent);
router.get('/:id', validateObjectIdParam('id'), getParentById);
router.patch('/:id', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateParentSchema), updateParent);
router.put('/:id/children', requireRole(['admin', 'super_admin']), validateObjectIdParam('id'), validateBody(updateParentChildrenSchema), updateParentChildren);
export default router;
