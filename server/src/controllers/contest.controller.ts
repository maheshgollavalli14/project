import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { TimerService } from '../services/timer.service.js';
import { QualificationService } from '../services/qualification.service.js';
import { ContestService } from '../services/contest.service.js';
import { FullscreenTimerService } from '../services/fullscreenTimer.service.js';
import { z } from 'zod';

const saveCodeSchema = z.object({
  code: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  selectedOptionId: z.string().nullable().optional(),
  markedForReview: z.boolean().nullable().optional(),
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
          req.user.role
        );

        const userScore = await prisma.score.findFirst({
          where: {
            contestId: contest.id,
            userId: req.user.userId,
          },
        });

        userQualification = {
          isQualified: userScore?.isQualified ?? false,
          canAccessRound3: access.allowed,
          reason: access.reason || null,
          cutoff: access.cutoff || contest.qualificationCutoff || 20,
        };
      }

      // Fetch participant round progress for this user
      const participantProgressMap = new Map<string, any>();
      if (req.user?.userId) {
        const progressList = await prisma.participantRoundProgress.findMany({
          where: { userId: req.user.userId },
        });
        for (const p of progressList) {
          participantProgressMap.set(p.roundId, p);
        }
      }

      // Compute server remaining seconds and arena status for each round
      const roundsWithTime = contest.rounds.map((r) => {
        const prog = participantProgressMap.get(r.id);
        const isLocked = prog?.status === 'SUBMITTED' || prog?.status === 'LOCKED';
        const isArenaOpen = r.status === 'ACTIVE' && !isLocked && (
          r.roundNumber !== 3 || req.user?.role === 'ADMIN' || userQualification?.canAccessRound3
        );

        return {
          ...r,
          remainingSeconds: TimerService.getRemainingSeconds(r.endTime),
          isArenaOpen: Boolean(isArenaOpen),
          isFinalized: Boolean(isLocked),
          isLocked: Boolean(isLocked),
          participantStatus: prog?.status || 'NOT_STARTED',
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

        // PERMANENT SUBMISSION LOCK: Check if participant already submitted this round
        const progress = await prisma.participantRoundProgress.findUnique({
          where: {
            userId_roundId: {
              userId: userId!,
              roundId: round.id,
            },
          },
        });

        if (progress?.status === 'SUBMITTED' || progress?.status === 'LOCKED') {
          const fullscreenExitCount = await prisma.violation.count({
            where: {
              userId: userId!,
              roundId: round.id,
              type: 'FULLSCREEN_EXIT',
            },
          });

          res.status(403).json({
            success: false,
            code: 'ROUND_LOCKED',
            message:
              fullscreenExitCount >= 3
                ? 'Your round has been automatically submitted and locked.'
                : 'This round has already been submitted and is locked.',
            isLocked: true,
            isFinalized: true,
            status: 'SUBMITTED',
            fullscreenExitCount,
          });
          return;
        }

        // 3. Strict Round 3 Qualification Check
        if (round.roundNumber === 3) {
          const access = await QualificationService.canUserAccessRound(
            3,
            round.contestId,
            userId!,
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

        // Mark round as IN_PROGRESS if not already started
        if (!progress || progress.status === 'NOT_STARTED') {
          await prisma.participantRoundProgress.upsert({
            where: {
              userId_roundId: {
                userId: userId!,
                roundId: round.id,
              },
            },
            update: {
              status: 'IN_PROGRESS',
              startedAt: progress?.startedAt || new Date(),
            },
            create: {
              userId: userId!,
              roundId: round.id,
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            },
          });
        }
      }

      // Fetch saved codes/answers for this user
      const savedCodes = await prisma.savedCode.findMany({
        where: {
          question: { roundId: round.id },
          userId: userId!,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const savedMap = new Map();
      for (const s of savedCodes) {
        if (!savedMap.has(s.questionId)) {
          savedMap.set(s.questionId, s);
        }
      }

      const isAdmin = req.user?.role === 'ADMIN';

      // Attach saved states
      const questionsWithState = (round.questions as any[]).map((q: any) => {
        const saved = savedMap.get(q.id);

        // For non-admin participants, NEVER expose expectedOutput on coding/debugging/jumbled questions or Round 2
        const isSolutionExposedType = round.roundNumber === 2 || q.type === 'DEBUGGING' || q.type === 'JUMBLED' || q.type === 'CODING';
        const expectedOutput = (!isAdmin && isSolutionExposedType) ? undefined : q.expectedOutput;

        return {
          ...q,
          expectedOutput,
          currentLock: null,
          savedState: saved || null,
        };
      });

      // Authoritative count of fullscreen exits for this user in this round
      const fullscreenExitCount = userId
        ? await prisma.violation.count({
            where: {
              userId,
              roundId: round.id,
              type: 'FULLSCREEN_EXIT',
            },
          })
        : 0;

      const activeCountdown = userId
        ? FullscreenTimerService.getActiveCountdown(userId, round.id)
        : null;

      res.status(200).json({
        success: true,
        data: {
          round: {
            ...round,
            isFinalized: false,
            isLocked: false,
            remainingSeconds: TimerService.getRemainingSeconds(round.endTime),
            fullscreenExitCount,
            activeFullscreenCountdown: activeCountdown?.active ? activeCountdown : null,
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

      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: { id: true, roundId: true },
      });

      if (!question) {
        res.status(404).json({ success: false, message: 'Question not found', code: 'NOT_FOUND' });
        return;
      }

      // Block draft saving if round has already been submitted
      if (req.user?.role !== 'ADMIN') {
        const progress = await prisma.participantRoundProgress.findUnique({
          where: {
            userId_roundId: {
              userId,
              roundId: question.roundId,
            },
          },
        });

        if (progress?.status === 'SUBMITTED' || progress?.status === 'LOCKED') {
          res.status(403).json({
            success: false,
            code: 'ROUND_LOCKED',
            message: 'This round has already been submitted and is locked.',
          });
          return;
        }
      }

      const validated = saveCodeSchema.parse(req.body);
      const markedForReview = validated.markedForReview != null ? Boolean(validated.markedForReview) : undefined;

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
          markedForReview,
        },
        create: {
          questionId,
          userId,
          code: validated.code,
          language: validated.language,
          selectedOptionId: validated.selectedOptionId,
          markedForReview: markedForReview ?? false,
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
   * Finalize round submission for the participant
   */
  static async finalizeRound(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roundId = req.params.id as string;
      const userId = req.user!.userId;

      const round = await prisma.contestRound.findUnique({
        where: { id: roundId },
      });

      if (!round) {
        res.status(404).json({ success: false, message: 'Round not found', code: 'NOT_FOUND' });
        return;
      }

      if (req.user?.role !== 'ADMIN') {
        const result = await ContestService.finalizeParticipantRound(
          userId,
          roundId,
          round.contestId,
          'MANUAL_FINAL_SUBMISSION',
          req.user!.email
        );

        if (result.alreadySubmitted) {
          res.status(409).json({
            success: false,
            code: 'ROUND_ALREADY_SUBMITTED',
            message: 'This round has already been submitted and is locked.',
          });
          return;
        }
      } else {
        await prisma.auditLog.create({
          data: {
            actorId: userId,
            actorEmail: req.user!.email,
            action: 'FINAL_ROUND_SUBMISSION',
            entity: 'ContestRound',
            entityId: roundId,
            metadata: JSON.stringify({ userId, finalizedAt: new Date() }),
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Round submitted successfully. This round is now locked and cannot be reopened.',
        data: {
          status: 'SUBMITTED',
          isLocked: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
