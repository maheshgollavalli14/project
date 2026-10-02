import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ViolationType, Severity } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { io } from '../app.js';
import { ContestService } from '../services/contest.service.js';
import { FullscreenTimerService } from '../services/fullscreenTimer.service.js';

const violationSchema = z.object({
  contestId: z.string(),
  roundId: z.string().optional(),
  questionId: z.string().optional(),
  type: z.enum([
    'FULLSCREEN_EXIT',
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'COPY',
    'PASTE',
    'CUT',
    'CONTEXT_MENU',
    'SUSPICIOUS_KEYBOARD_SHORTCUT',
    'NAVIGATION_ATTEMPT',
    'MULTIPLE_LOGIN',
    'INVALID_SUBMISSION_ATTEMPT',
    'OTHER_SUSPICIOUS_ACTIVITY',
    'SUSPICIOUS_ACTIVITY',
  ]),
  metadata: z.record(z.any()).optional(),
});

export class ViolationController {
  static async logViolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = violationSchema.parse(req.body);

      // If this is a FULLSCREEN_EXIT for a round, check if round is already submitted/locked
      if (validated.type === 'FULLSCREEN_EXIT' && validated.roundId && req.user?.role !== 'ADMIN') {
        const progress = await prisma.participantRoundProgress.findUnique({
          where: {
            userId_roundId: {
              userId,
              roundId: validated.roundId,
            },
          },
        });

        if (progress?.status === 'SUBMITTED' || progress?.status === 'LOCKED') {
          const fullscreenCount = await prisma.violation.count({
            where: {
              userId,
              roundId: validated.roundId,
              type: 'FULLSCREEN_EXIT',
            },
          });

          res.status(200).json({
            success: true,
            message: 'Your round has been automatically submitted and locked.',
            data: {
              type: 'FULLSCREEN_EXIT',
              fullscreenExitCount: Math.max(3, fullscreenCount),
              warningNumber: 3,
              maxWarnings: 2,
              isAutoSubmitted: true,
              isLocked: true,
              countdownSeconds: 0,
              deadline: null,
            },
          });
          return;
        }

        // Double-counting protection / Deduplication:
        // Ignore rapid duplicate browser events within 3000ms (1 physical exit = exactly 1 violation)
        const recentExit = await prisma.violation.findFirst({
          where: {
            userId,
            roundId: validated.roundId,
            type: 'FULLSCREEN_EXIT',
            createdAt: { gte: new Date(Date.now() - 3000) },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (recentExit) {
          const fullscreenCount = await prisma.violation.count({
            where: {
              userId,
              roundId: validated.roundId,
              type: 'FULLSCREEN_EXIT',
            },
          });

          let timerInfo: { deadline?: string; remainingSeconds?: number } = {};
          if (fullscreenCount < 3) {
            const active = FullscreenTimerService.getActiveCountdown(userId, validated.roundId);
            if (active.active) {
              timerInfo = { deadline: active.deadline, remainingSeconds: active.remainingSeconds };
            } else {
              const started = FullscreenTimerService.startCountdown(
                userId,
                validated.roundId,
                validated.contestId,
                req.user?.email || 'system@codebreak.dev',
                fullscreenCount
              );
              timerInfo = { deadline: started.deadline, remainingSeconds: started.countdownSeconds };
            }
          }

          res.status(200).json({
            success: true,
            message:
              fullscreenCount >= 3
                ? 'Your round has been automatically submitted and locked.'
                : `Fullscreen violation ${fullscreenCount} recorded`,
            data: {
              violationId: recentExit.id,
              type: 'FULLSCREEN_EXIT',
              fullscreenExitCount: fullscreenCount,
              warningNumber: Math.min(fullscreenCount, 3),
              maxWarnings: 2,
              isAutoSubmitted: fullscreenCount >= 3,
              isLocked: fullscreenCount >= 3,
              countdownSeconds: fullscreenCount >= 3 ? 0 : timerInfo.remainingSeconds ?? 10,
              deadline: fullscreenCount >= 3 ? null : timerInfo.deadline,
            },
          });
          return;
        }
      }

      // Determine severity based on violation type and occurrence
      let severity: Severity = 'LOW';
      switch (validated.type) {
        case 'WINDOW_BLUR':
        case 'CONTEXT_MENU':
        case 'COPY':
          severity = 'LOW';
          break;
        case 'FULLSCREEN_EXIT': {
          const previousExits = validated.roundId
            ? await prisma.violation.count({
                where: {
                  userId,
                  roundId: validated.roundId,
                  type: 'FULLSCREEN_EXIT',
                },
              })
            : 0;
          severity = previousExits >= 2 ? 'CRITICAL' : previousExits === 1 ? 'HIGH' : 'MEDIUM';
          break;
        }
        case 'TAB_SWITCH':
        case 'PASTE':
        case 'CUT':
        case 'NAVIGATION_ATTEMPT':
          severity = 'MEDIUM';
          break;
        case 'SUSPICIOUS_KEYBOARD_SHORTCUT':
        case 'INVALID_SUBMISSION_ATTEMPT':
        case 'SUSPICIOUS_ACTIVITY':
        case 'OTHER_SUSPICIOUS_ACTIVITY':
          severity = 'HIGH';
          break;
        case 'MULTIPLE_LOGIN':
          severity = 'CRITICAL';
          break;
        default:
          severity = 'MEDIUM';
      }

      const violation = await prisma.violation.create({
        data: {
          userId,
          contestId: validated.contestId,
          roundId: validated.roundId || null,
          questionId: validated.questionId || null,
          type: validated.type as ViolationType,
          severity,
          metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
        },
      });

      // Count total violations for user in this contest
      const count = await prisma.violation.count({
        where: { userId, contestId: validated.contestId },
      });

      // Special handling for FULLSCREEN_EXIT per round
      let fullscreenExitCount = 0;
      let isAutoSubmitted = false;
      let isLocked = false;
      let timerInfo: { deadline?: string; countdownSeconds?: number } = {};

      if (validated.type === 'FULLSCREEN_EXIT' && validated.roundId) {
        fullscreenExitCount = await prisma.violation.count({
          where: {
            userId,
            roundId: validated.roundId,
            type: 'FULLSCREEN_EXIT',
          },
        });

        // 3rd fullscreen exit -> Automatically submit and permanently lock round immediately
        if (fullscreenExitCount >= 3 && req.user?.role !== 'ADMIN') {
          FullscreenTimerService.clearCountdown(userId, validated.roundId);
          await ContestService.finalizeParticipantRound(
            userId,
            validated.roundId,
            validated.contestId,
            'AUTOMATIC_FULLSCREEN_VIOLATION',
            req.user!.email
          );
          isAutoSubmitted = true;
          isLocked = true;
        } else if (req.user?.role !== 'ADMIN') {
          // Exits 1 and 2 -> Start authoritative 10-second return timer
          timerInfo = FullscreenTimerService.startCountdown(
            userId,
            validated.roundId,
            validated.contestId,
            req.user!.email,
            fullscreenExitCount
          );
        }
      }

      // Fetch configurable settings
      const settings = await prisma.contestSetting.findMany({
        where: {
          key: {
            in: ['MAX_VIOLATIONS_BEFORE_WARNING', 'MAX_VIOLATIONS_BEFORE_DISQUALIFICATION_REVIEW'],
          },
        },
      });

      const maxWarning = parseInt(
        settings.find((s) => s.key === 'MAX_VIOLATIONS_BEFORE_WARNING')?.value || '1',
        10
      );
      const maxReview = parseInt(
        settings.find((s) => s.key === 'MAX_VIOLATIONS_BEFORE_DISQUALIFICATION_REVIEW')?.value || '5',
        10
      );

      const policy = {
        warning: count >= maxWarning,
        reviewRequired: count >= maxReview,
        maxWarning,
        maxReview,
      };

      // Broadcast to admin monitoring via Socket.IO
      try {
        io.to('admin:monitoring').emit('violation:created', {
          violationId: violation.id,
          userId,
          contestId: validated.contestId,
          roundId: validated.roundId,
          questionId: validated.questionId,
          type: validated.type,
          severity,
          totalViolations: count,
          fullscreenExitCount: validated.type === 'FULLSCREEN_EXIT' ? fullscreenExitCount : undefined,
          isAutoSubmitted,
          isLocked,
          timestamp: new Date().toISOString(),
          metadata: validated.metadata,
        });

        if (isAutoSubmitted) {
          io.to(`user:${userId}`).emit('round:auto_submitted', {
            roundId: validated.roundId,
            reason: 'AUTOMATIC_FULLSCREEN_VIOLATION',
          });
        }
      } catch (socketErr) {
        // Non-blocking socket error
      }

      logger.security('Anti-cheating violation logged', 'ViolationController', {
        violationId: violation.id,
        userId,
        type: validated.type,
        severity,
        totalViolations: count,
        fullscreenExitCount: validated.type === 'FULLSCREEN_EXIT' ? fullscreenExitCount : undefined,
        isAutoSubmitted,
        policy,
      });

      res.status(201).json({
        success: true,
        message: isAutoSubmitted
          ? 'Your round has been automatically submitted and locked.'
          : validated.type === 'FULLSCREEN_EXIT'
          ? `Fullscreen violation ${fullscreenExitCount} recorded. Return to fullscreen within 10 seconds.`
          : 'Violation recorded',
        data: {
          violationId: violation.id,
          type: validated.type,
          totalViolations: count,
          fullscreenExitCount: validated.type === 'FULLSCREEN_EXIT' ? fullscreenExitCount : undefined,
          warningNumber: validated.type === 'FULLSCREEN_EXIT' ? Math.min(fullscreenExitCount, 3) : undefined,
          maxWarnings: 2,
          isAutoSubmitted,
          isLocked,
          countdownSeconds:
            validated.type === 'FULLSCREEN_EXIT'
              ? isAutoSubmitted
                ? 0
                : timerInfo?.countdownSeconds ?? 10
              : undefined,
          deadline:
            validated.type === 'FULLSCREEN_EXIT'
              ? isAutoSubmitted
                ? null
                : timerInfo?.deadline
              : undefined,
          severity,
          policy,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async resolveFullscreen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { roundId } = req.body;
      if (!roundId) {
        res.status(400).json({ success: false, message: 'roundId is required' });
        return;
      }

      const result = await FullscreenTimerService.resolveFullscreen(userId, roundId);

      const fullscreenExitCount = await prisma.violation.count({
        where: {
          userId,
          roundId,
          type: 'FULLSCREEN_EXIT',
        },
      });

      res.status(result.resumed ? 200 : 403).json({
        success: result.resumed,
        message: result.message,
        data: {
          resumed: result.resumed,
          isAutoSubmitted: result.isAutoSubmitted,
          isLocked: result.isLocked,
          fullscreenExitCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async timeoutFullscreen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { roundId, contestId } = req.body;
      if (!roundId) {
        res.status(400).json({ success: false, message: 'roundId is required' });
        return;
      }

      const result = await FullscreenTimerService.handleTimeout(
        userId,
        roundId,
        contestId,
        req.user?.email || 'system@codebreak.dev'
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          isAutoSubmitted: true,
          isLocked: true,
          reason: 'AUTOMATIC_FULLSCREEN_VIOLATION',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
