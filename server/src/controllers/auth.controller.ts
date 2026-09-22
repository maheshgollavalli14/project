import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerIndividualSchema, registerTeamSchema, loginSchema } from '../validators/auth.validator.js';
import { setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

export class AuthController {
  static async registerIndividual(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerIndividualSchema.parse(req.body);
      const result = await AuthService.registerIndividual(validated);

      setAuthCookie(res, result.token);
      logger.info('Individual registered successfully', 'Auth', { userId: result.user.id });

      res.status(201).json({
        success: true,
        message: 'Individual registration successful!',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async registerTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerTeamSchema.parse(req.body);
      const result = await AuthService.registerTeam(validated);

      setAuthCookie(res, result.token);
      logger.info('Team registered successfully', 'Auth', { teamId: result.team.id });

      res.status(201).json({
        success: true,
        message: 'Team registration successful! Both members enrolled.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);

      setAuthCookie(res, result.token);
      logger.info('User logged in', 'Auth', { userId: result.user.id, role: result.user.role });

      res.status(200).json({
        success: true,
        message: 'Login successful!',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const currentUser = await AuthService.getCurrentUser(req.user.userId);
      res.status(200).json({
        success: true,
        data: { user: currentUser },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response) {
    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }
}
