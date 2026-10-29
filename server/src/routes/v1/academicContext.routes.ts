import { Router } from 'express';
import { getAcademicContext } from '../../controllers/academicContext.controller.js';
import { authenticate, enforceSchoolContext } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate, enforceSchoolContext);

router.get('/', getAcademicContext);

export default router;
