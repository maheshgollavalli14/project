import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { TimerService } from '../services/timer.service.js';
import { ProblemLockService } from '../services/problemLock.service.js';
import { QualificationService } from '../services/qualification.service.js';
import { z } from 'zod';

const saveCodeSchema = z.object({
  code: z.string().optional(),
  language: z.string().optional(),
  selectedOptionId: z.string().optional(),
  markedForReview: z.boolean().optional(),
});

export class ContestController {
  /**
   * Get currently active or upcoming contest
   */
  static async getCurrentContest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // 1. Authoritatively synchronize all round statuses with server clock
      await TimerService.syncRoundStatuses();

      const contest = await prisma.contest.findFirst({
        where: {
          status: { in: ['UPCOMING', 'ACTIVE', 'COMPLETED'] },
        },
        include: {
          rounds: {
            orderBy: { roundNumber: 'asc' },
            select: {
              id: true,
              roundNumber: true,
              title: true,
              description: true,
              type: true,
              durationMinutes: true,
              status: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      if (!contest) {
        res.status(404).json({ success: false, message: 'No contest found', code: 'NOT_FOUND' });
        return;
      }

      // Check participant qualification status for Round 3
      let userQualification: any = null;
      if (req.user) {
        const access = await QualificationService.canUserAccessRound(
          3,
          contest.id,
          req.user.userId,
          req.user.teamId,
          req.user.role
        );

        const userScore = await prisma.score.findFirst({
          where: {
            contestId: contest.id,
            ...(req.user.teamId ? { teamId: req.user.teamId } : { userId: req.user.userId }),
          },
        });

        userQualification = {
          isQualified: userScore?.isQualified ?? false,
          canAccessRound3: access.allowed,
          reason: access.reason || null,
          cutoff: access.cutoff || contest.qualificationCutoff || 20,
        };
      }

      // Fetch finalized round IDs for this user
      let finalizedRoundIds = new Set<string>();
      if (req.user?.userId) {
        const finalAudits = await prisma.auditLog.findMany({
          where: {
            actorId: req.user.userId,
            action: 'FINAL_ROUND_SUBMISSION',
            entity: 'ContestRound',
          },
          select: { entityId: true },
        });
        finalizedRoundIds = new Set(finalAudits.map((a) => a.entityId).filter(Boolean) as string[]);
      }

      // Compute server remaining seconds and arena status for each round
      const roundsWithTime = contest.rounds.map((r) => {
        const isArenaOpen = r.status === 'ACTIVE' && (
          r.roundNumber !== 3 || req.user?.role === 'ADMIN' || userQualification?.canAccessRound3
        );

        return {
          ...r,
          remainingSeconds: TimerService.getRemainingSeconds(r.endTime),
          isArenaOpen: Boolean(isArenaOpen),
          isFinalized: finalizedRoundIds.has(r.id),
        };
      });

      res.status(200).json({
        success: true,
        data: {
          contest: {
            ...contest,
            rounds: roundsWithTime,
          },
          userQualification,
          serverTime: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get round details and questions list (public view for participants)
   */
  static async getRound(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user?.userId;
      const teamId = req.user?.teamId;

      // 1. Authoritatively synchronize all round statuses with server clock
      await TimerService.syncRoundStatuses();

      const round = await prisma.contestRound.findUnique({
        where: { id },
        include: {
          questions: {
            where: { isPublished: true },
            orderBy: { orderNumber: 'asc' },
            select: {
              id: true,
              roundId: true,
              orderNumber: true,
              title: true,
              description: true,
              type: true,
              difficulty: true,
              points: true,
              timeLimitMs: true,
              memoryLimitMb: true,
              initialCode: true,
              expectedOutput: true,
              constraints: true,
              allowedLanguages: true,
              options: {
                orderBy: { orderNumber: 'asc' },
                select: {
                  id: true,
                  text: true,
                  orderNumber: true,
                  // Do NOT expose isCorrect or explanation to participants!
                },
              },
              testCases: {
                where: { isPublic: true }, // Only sample test cases!
                select: {
                  id: true,
                  input: true,
                  expectedOutput: true,
                  isPublic: true,
                  weight: true,
                },
              },
            },
          },
        },
      });

      if (!round) {
        res.status(404).json({ success: false, message: 'Round not found', code: 'NOT_FOUND' });
        return;
      }

      // 2. Strict status check for non-admin participants
      if (req.user?.role !== 'ADMIN') {
        if (round.status === 'UPCOMING') {
          res.status(403).json({
            success: false,
            code: 'ROUND_NOT_STARTED',
            message: `Round ${round.roundNumber} has not started yet. Scheduled to begin at ${round.startTime ? new Date(round.startTime).toLocaleTimeString() : 'scheduled time'}.`,
            startTime: round.startTime,
          });
          return;
        }

        if (round.status === 'COMPLETED') {
          res.status(403).json({
            success: false,
            code: 'ROUND_COMPLETED',
            message: `Round ${round.roundNumber} has concluded. Submissions and arena access are now closed.`,
            endTime: round.endTime,
          });
          return;
        }

        // 3. Strict Round 3 Qualification Check
        if (round.roundNumber === 3) {
          const access = await QualificationService.canUserAccessRound(
            3,
            round.contestId,
            userId!,
            teamId,
            req.user?.role
          );

          if (!access.allowed) {
            res.status(403).json({
              success: false,
              code: 'NOT_QUALIFIED',
              message: access.reason || 'Access Denied: You did not qualify for Round 3 (Grand Finale).',
              cutoff: access.cutoff,
            });
            return;
          }
        }
      }

      // Fetch active locks for this team
      let teamLocks: any[] = [];
      if (teamId) {
        teamLocks = await ProblemLockService.getTeamLocks(round.id, teamId);
      }

      // Fetch saved codes/answers for this user/team
      const savedCodes = await prisma.savedCode.findMany({
        where: {
          question: { roundId: round.id },
          ...(teamId ? { teamId } : { userId: userId! }),
        },
      });

      const savedMap = new Map(savedCodes.map((s) => [s.questionId, s]));

      // Attach current locks and saved states
      const questionsWithState = (round.questions as any[]).map((q: any) => {
        const lock = teamLocks.find((l) => l.questionId === q.id);
        const saved = savedMap.get(q.id);

        return {
          ...q,
          currentLock: lock
            ? {
                id: lock.id,
                userId: lock.userId,
                lockedByName: lock.user.profile?.fullName || 'Teammate',
                isLockedByMe: lock.userId === userId,
                expiresAt: lock.expiresAt,
              }
            : null,
          savedState: saved || null,
        };
      });

      // Check if user has finalized this round
      const finalAudit = await prisma.auditLog.findFirst({
        where: {
          actorId: userId,
          action: 'FINAL_ROUND_SUBMISSION',
          entity: 'ContestRound',
          entityId: round.id,
        },
      });
      const isFinalized = Boolean(finalAudit);

      res.status(200).json({
        success: true,
        data: {
          round: {
            ...round,
            isFinalized,
            remainingSeconds: TimerService.getRemainingSeconds(round.endTime),
            questions: questionsWithState,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Autosave code, selected option, or marked for review state
   */
  static async saveState(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.id as string;
      const userId = req.user!.userId;
      const teamId = req.user?.teamId || null;

      const validated = saveCodeSchema.parse(req.body);

      const saved = await prisma.savedCode.upsert({
        where: {
          userId_questionId: {
            userId,
            questionId,
          },
        },
        update: {
          code: validated.code,
          language: validated.language,
          selectedOptionId: validated.selectedOptionId,
          markedForReview: validated.markedForReview,
          teamId,
        },
        create: {
          questionId,
          userId,
          teamId,
          code: validated.code,
          language: validated.language,
          selectedOptionId: validated.selectedOptionId,
          markedForReview: validated.markedForReview || false,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Saved successfully',
        data: { saved },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Finalize round submission for the participant or team
   */
  static async finalizeRound(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roundId = req.params.id as string;
      const userId = req.user!.userId;
      const teamId = req.user?.teamId || null;

      // Release any active locks for this user or team
      if (teamId) {
        await prisma.problemLock.updateMany({
          where: {
            roundId,
            teamId,
            userId,
            status: 'ACTIVE',
          },
          data: { status: 'RELEASED' },
        });
      }

      await prisma.auditLog.create({
        data: {
          actorId: userId,
          actorEmail: req.user!.email,
          action: 'FINAL_ROUND_SUBMISSION',
          entity: 'ContestRound',
          entityId: roundId,
          metadata: JSON.stringify({ userId, teamId, finalizedAt: new Date() }),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Exam round finalized and submitted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}

