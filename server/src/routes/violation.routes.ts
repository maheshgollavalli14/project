import { Router } from 'express';
import { ViolationController } from '../controllers/violation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, ViolationController.logViolation);
router.post('/resolve-fullscreen', authenticate, ViolationController.resolveFullscreen);
router.post('/fullscreen-return', authenticate, ViolationController.resolveFullscreen);
router.post('/fullscreen-timeout', authenticate, ViolationController.timeoutFullscreen);
router.post('/clear-countdown', authenticate, ViolationController.clearCountdown);

export default router;
