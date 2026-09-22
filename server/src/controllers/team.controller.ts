import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ProblemLockService } from '../services/problemLock.service.js';
import { QualificationService } from '../services/qualification.service.js';
import { z } from 'zod';

const lockSchema = z.object({
  contestId: z.string(),
  roundId: z.string(),
  questionId: z.string(),
});

export class TeamController {
  /**
   * Get team details and live locks
   */
  static async getTeamDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teamId = req.user?.teamId;
      if (!teamId) {
        res.status(400).json({ success: false, message: 'User is not part of a team', code: 'NOT_A_TEAM' });
        return;
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: true,
                },
              },
            },
          },
        },
      });

      if (!team) {
        res.status(404).json({ success: false, message: 'Team not found', code: 'NOT_FOUND' });
        return;
      }

      res.status(200).json({
        success: true,
        data: { team },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Acquire a problem lock
   */
  static async acquireLock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const teamId = req.user?.teamId;

      if (!teamId) {
        // For individual participants, locking is not needed but return success for seamless UX
        res.status(200).json({
          success: true,
          message: 'Lock not required for individual participant',
          data: { isIndividual: true },
        });
        return;
      }

      const validated = lockSchema.parse(req.body);

      // Verify Round 3 qualification access
      const round = await prisma.contestRound.findUnique({
        where: { id: validated.roundId },
        select: { roundNumber: true },
      });

      if (round?.roundNumber === 3 && req.user?.role !== 'ADMIN') {
        const access = await QualificationService.canUserAccessRound(
          3,
          validated.contestId,
          userId,
          teamId,
          req.user?.role
        );

        if (!access.allowed) {
          res.status(403).json({
            success: false,
            code: 'NOT_QUALIFIED',
            message: access.reason || 'Access Denied: Team not qualified for Round 3',
          });
          return;
        }
      }

      const result = await ProblemLockService.acquireLock(
        validated.contestId,
        validated.roundId,
        validated.questionId,
        teamId,
        userId
      );

      res.status(200).json({
        success: true,
        message: result.renewed ? 'Lock renewed' : 'Problem locked successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Release a problem lock
   */
  static async releaseLock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const teamId = req.user?.teamId;

      if (!teamId) {
        res.status(200).json({ success: true, message: 'Released' });
        return;
      }

      const { questionId } = req.body;
      if (!questionId) {
        res.status(400).json({ success: false, message: 'questionId is required', code: 'BAD_REQUEST' });
        return;
      }

      const released = await ProblemLockService.releaseLock(questionId, teamId, userId);

      res.status(200).json({
        success: true,
        message: 'Lock released',
        data: { released },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lock heartbeat
   */
  static async heartbeat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { lockId } = req.body;

      if (!lockId) {
        res.status(400).json({ success: false, message: 'lockId is required', code: 'BAD_REQUEST' });
        return;
      }

      const updated = await ProblemLockService.heartbeat(lockId, userId);

      res.status(200).json({
        success: true,
        data: { lock: updated },
      });
    } catch (err) {
      next(err);
    }
  }
}
