import { Router } from 'express';
import { ContestController } from '../controllers/contest.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/current', optionalAuthenticate, ContestController.getCurrentContest);
router.get('/rounds/:id', authenticate, ContestController.getRound);
router.post('/rounds/:id/finalize', authenticate, ContestController.finalizeRound);
router.post('/questions/:id/save', authenticate, ContestController.saveState);

export default router;
