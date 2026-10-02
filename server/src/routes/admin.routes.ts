import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Strict server-side RBAC guard for all /api/admin endpoints
router.use(authenticate);
router.use(requireRole([Role.ADMIN]));

router.get('/dashboard', AdminController.getDashboardMetrics);
router.get('/participants', AdminController.getParticipants);
router.get('/questions', AdminController.getQuestions);
router.post('/questions', AdminController.createQuestion);
router.post('/questions/seed-template', AdminController.seedRoundTemplate);
router.patch('/questions/:id', AdminController.updateQuestion);
router.delete('/questions/:id', AdminController.deleteQuestion);

router.get('/submissions', AdminController.getSubmissions);

router.post('/contest/start-round', AdminController.startRound);
router.post('/contest/end-round', AdminController.endRound);
router.post('/contest/schedule-round', AdminController.scheduleRound);
router.post('/contest/schedule-all-rounds', AdminController.scheduleAllRounds);
router.post('/qualification/calculate', AdminController.calculateQualification);

router.get('/violations', AdminController.getViolations);
router.patch('/violations/:id', AdminController.reviewViolation);

router.get('/settings', AdminController.getSettings);
router.patch('/settings', AdminController.updateSettings);

export default router;
