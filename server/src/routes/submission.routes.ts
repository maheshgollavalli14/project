import { Router } from 'express';
import { SubmissionController } from '../controllers/submission.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { executionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/questions/:id/run', authenticate, executionLimiter, SubmissionController.runCode);
router.post('/questions/:id/submit', authenticate, executionLimiter, SubmissionController.submitSolution);
router.get('/submissions', authenticate, SubmissionController.getSubmissions);

export default router;
