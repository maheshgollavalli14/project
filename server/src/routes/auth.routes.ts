import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register/individual', authLimiter, AuthController.registerIndividual);
router.post('/register/team', authLimiter, AuthController.registerTeam);
router.post('/login', authLimiter, AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.post('/logout', AuthController.logout);

export default router;
