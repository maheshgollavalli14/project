import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ViolationType, Severity } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const violationSchema = z.object({
  contestId: z.string(),
  roundId: z.string().optional(),
  type: z.enum([
    'FULLSCREEN_EXIT',
    'TAB_SWITCH',
    'COPY',
    'PASTE',
    'WINDOW_BLUR',
    'SUSPICIOUS_ACTIVITY',
  ]),
  metadata: z.record(z.any()).optional(),
});

export class ViolationController {
  static async logViolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const teamId = req.user?.teamId || null;
      const validated = violationSchema.parse(req.body);

      // Determine severity
      let severity: Severity = 'LOW';
      if (validated.type === 'FULLSCREEN_EXIT') severity = 'MEDIUM';
      if (validated.type === 'COPY' || validated.type === 'PASTE') severity = 'MEDIUM';
      if (validated.type === 'SUSPICIOUS_ACTIVITY') severity = 'HIGH';

      const violation = await prisma.violation.create({
        data: {
          userId,
          teamId,
          contestId: validated.contestId,
          roundId: validated.roundId || null,
          type: validated.type as ViolationType,
          severity,
          metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
        },
      });

      // Count total violations for user in this contest
      const count = await prisma.violation.count({
        where: { userId, contestId: validated.contestId },
      });

      logger.security('Anti-cheating violation logged', 'ViolationController', {
        violationId: violation.id,
        userId,
        teamId,
        type: validated.type,
        totalViolations: count,
      });

      res.status(201).json({
        success: true,
        message: 'Violation recorded',
        data: {
          violationId: violation.id,
          totalViolations: count,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
