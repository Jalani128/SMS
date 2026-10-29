import { Router } from 'express';
import { getHealth, getReadiness } from '../../controllers/health.controller.js';
const router = Router();
/**
 * @route   GET /api/v1/health or /api/health
 * @desc    System health (liveness probe)
 * @access  Public
 */
router.get('/', getHealth);
/**
 * @route   GET /api/v1/health/ready or /api/ready
 * @desc    System readiness probe (database check)
 * @access  Public
 */
router.get('/ready', getReadiness);
export default router;
