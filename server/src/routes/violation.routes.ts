import { Router } from 'express';
import { ViolationController } from '../controllers/violation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, ViolationController.logViolation);

export default router;
