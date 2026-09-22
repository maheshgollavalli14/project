import { Router } from 'express';
import { TeamController } from '../controllers/team.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, TeamController.getTeamDetails);
router.post('/problem-lock', authenticate, TeamController.acquireLock);
router.delete('/problem-lock', authenticate, TeamController.releaseLock);
router.post('/heartbeat', authenticate, TeamController.heartbeat);

export default router;
