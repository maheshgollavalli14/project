import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload, COOKIE_NAME } from '../utils/jwt.js';
import { prisma } from '../config/db.js';
import { Role } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & {
    fullName?: string;
    participantId?: string;
    college?: string;
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  let token = req.cookies?.[COOKIE_NAME];

  // Fallback to Bearer token in header for API clients / testing
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please log in again.',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  // Verify user still exists in database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { profile: true, teamMember: true },
  });

  if (!user || !user.isActive) {
    res.status(403).json({
      success: false,
      message: 'User account is inactive or not found.',
      code: 'ACCOUNT_DISABLED',
    });
    return;
  }

  req.user = {
    userId: user.id,
    email: user.email,
    role: user.role,
    teamId: user.teamMember?.teamId || null,
    fullName: user.profile?.fullName,
    participantId: user.profile?.participantId,
    college: user.profile?.college,
  };

  next();
}

/**
 * Optional authentication: populates req.user if a valid token is present,
 * but allows the request to continue unauthenticated otherwise.
 */
export async function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  let token = req.cookies?.[COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { profile: true, teamMember: true },
      });

      if (user && user.isActive) {
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role,
          teamId: user.teamMember?.teamId || null,
          fullName: user.profile?.fullName,
          participantId: user.profile?.participantId,
          college: user.profile?.college,
        };
      }
    }
  } catch {
    // If token is malformed or invalid, proceed as guest
  }

  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.security('Forbidden role access attempt', 'AuthMiddleware', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.originalUrl,
      });

      res.status(403).json({
        success: false,
        message: 'Access forbidden: insufficient permissions.',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}
