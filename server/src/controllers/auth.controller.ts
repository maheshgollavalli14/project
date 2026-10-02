import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerIndividualSchema, loginSchema } from '../validators/auth.validator.js';
import { setAuthCookie, clearAuthCookie, COOKIE_NAME, verifyToken, verifyTokenIgnoringExpiration } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

export class AuthController {
  static async registerIndividual(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerIndividualSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
      const userAgent = req.headers['user-agent'] as string | undefined;
      const result = await AuthService.registerIndividual(validated, { ip, userAgent });

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

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
      const userAgent = req.headers['user-agent'] as string | undefined;
      const result = await AuthService.login(validated, { ip, userAgent });

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
        data: {
          user: currentUser,
          sessionId: req.user.sessionId,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      let sessionId = req.user?.sessionId || (req.body && req.body.sessionId);
      let userId = req.user?.userId || (req.body && req.body.userId);
      const email = req.user?.email || (req.body && req.body.email);

      const token = req.cookies?.[COOKIE_NAME] ||
        (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined);

      if (token) {
        const payload = verifyToken(token) || verifyTokenIgnoringExpiration(token);
        if (payload) {
          sessionId = sessionId || payload.sessionId;
          userId = userId || payload.userId;
        }
      }

      if (!userId && email) {
        try {
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true },
          });
          if (user) {
            userId = user.id;
          }
        } catch {}
      }

      logger.info('Processing logout request', 'Auth', { sessionId, userId, email });

      if (sessionId) {
        try {
          const session = await prisma.userSession.findUnique({
            where: { id: sessionId },
            select: { userId: true },
          });
          if (session?.userId && !userId) {
            userId = session.userId;
          }
        } catch {}
        await AuthService.invalidateSession(sessionId);
      }
      if (userId) {
        await AuthService.invalidateUserActiveSessions(userId);
      }
    } catch (err) {
      logger.error('Error invalidating session during logout', 'Auth', { error: err });
    }

    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }
}
