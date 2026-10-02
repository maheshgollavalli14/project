import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { ContestService } from './contest.service.js';
import { io } from '../app.js';

interface ActiveCountdown {
  userId: string;
  roundId: string;
  contestId: string;
  userEmail: string;
  deadline: number; // epoch ms
  exitCount: number;
  timer: NodeJS.Timeout;
}

export class FullscreenTimerService {
  private static activeTimers = new Map<string, ActiveCountdown>();

  private static getKey(userId: string, roundId: string): string {
    return `${userId}:${roundId}`;
  }

  /**
   * Start 10-second countdown for a participant who exited fullscreen.
   */
  static startCountdown(
    userId: string,
    roundId: string,
    contestId: string,
    userEmail: string,
    exitCount: number
  ): { deadline: string; countdownSeconds: number } {
    const key = this.getKey(userId, roundId);

    // If an existing countdown is already running, return its deadline
    const existing = this.activeTimers.get(key);
    if (existing) {
      const remainingSeconds = Math.max(0, Math.ceil((existing.deadline - Date.now()) / 1000));
      return {
        deadline: new Date(existing.deadline).toISOString(),
        countdownSeconds: remainingSeconds,
      };
    }

    const durationMs = 10_000;
    const deadline = Date.now() + durationMs;

    // Schedule server auto-finalization with 500ms grace window for network latency
    const timer = setTimeout(async () => {
      try {
        const current = FullscreenTimerService.activeTimers.get(key);
        if (!current) return;
        FullscreenTimerService.activeTimers.delete(key);

        logger.security(
          `Fullscreen 10-second return deadline expired for user ${userId} in round ${roundId}. Auto-submitting round.`,
          'FullscreenTimerService'
        );

        await ContestService.finalizeParticipantRound(
          userId,
          roundId,
          contestId,
          'AUTOMATIC_FULLSCREEN_VIOLATION',
          userEmail
        );

        try {
          io.to(`user:${userId}`).emit('round:auto_submitted', {
            roundId,
            reason: 'AUTOMATIC_FULLSCREEN_VIOLATION',
            timeout: true,
          });
          io.to('admin:monitoring').emit('violation:timeout', {
            userId,
            roundId,
            contestId,
            timestamp: new Date().toISOString(),
          });
        } catch (socketErr) {
          // Non-blocking socket error
        }
      } catch (err) {
        logger.error('Error auto-finalizing on fullscreen timeout', 'FullscreenTimerService', {
          userId,
          roundId,
          error: String(err),
        });
      }
    }, durationMs + 500);

    // Ensure timer doesn't block process exit in test environments
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    FullscreenTimerService.activeTimers.set(key, {
      userId,
      roundId,
      contestId,
      userEmail,
      deadline,
      exitCount,
      timer,
    });

    return {
      deadline: new Date(deadline).toISOString(),
      countdownSeconds: 10,
    };
  }

  /**
   * Cancel countdown if participant returns to fullscreen within 10 seconds.
   */
  static async resolveFullscreen(
    userId: string,
    roundId: string
  ): Promise<{ resumed: boolean; isAutoSubmitted: boolean; isLocked: boolean; message: string }> {
    const key = this.getKey(userId, roundId);
    const entry = this.activeTimers.get(key);

    // 1. Check if round is already submitted/locked in database
    const progress = await prisma.participantRoundProgress.findUnique({
      where: {
        userId_roundId: { userId, roundId },
      },
    });

    if (progress?.status === 'SUBMITTED' || progress?.status === 'LOCKED') {
      if (entry) {
        clearTimeout(entry.timer);
        FullscreenTimerService.activeTimers.delete(key);
      }
      return {
        resumed: false,
        isAutoSubmitted: true,
        isLocked: true,
        message: 'Your round has been automatically submitted and locked.',
      };
    }

    // 2. If there is an active countdown
    if (entry) {
      const now = Date.now();
      // Allow 1000ms grace window for network transmission
      if (now <= entry.deadline + 1000) {
        clearTimeout(entry.timer);
        FullscreenTimerService.activeTimers.delete(key);
        logger.info(
          `User ${userId} returned to fullscreen in round ${roundId} within deadline. Exam resumed.`,
          'FullscreenTimerService'
        );
        return {
          resumed: true,
          isAutoSubmitted: false,
          isLocked: false,
          message: 'Fullscreen restored within allowed time. Contest resumed.',
        };
      } else {
        // Expired!
        clearTimeout(entry.timer);
        FullscreenTimerService.activeTimers.delete(key);
        await ContestService.finalizeParticipantRound(
          userId,
          roundId,
          entry.contestId,
          'AUTOMATIC_FULLSCREEN_VIOLATION',
          entry.userEmail
        );
        return {
          resumed: false,
          isAutoSubmitted: true,
          isLocked: true,
          message: 'Fullscreen return deadline expired. Round has been automatically submitted and locked.',
        };
      }
    }

    // 3. No active timer found (e.g. was already in fullscreen or cleared)
    return {
      resumed: true,
      isAutoSubmitted: false,
      isLocked: false,
      message: 'Fullscreen active. Contest resumed.',
    };
  }

  /**
   * Explicit client timeout trigger when 10-second countdown reaches 0.
   */
  static async handleTimeout(
    userId: string,
    roundId: string,
    contestId: string,
    userEmail: string
  ): Promise<{ isAutoSubmitted: boolean; isLocked: boolean; message: string }> {
    const key = this.getKey(userId, roundId);
    const entry = this.activeTimers.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      this.activeTimers.delete(key);
    }

    await ContestService.finalizeParticipantRound(
      userId,
      roundId,
      contestId,
      'AUTOMATIC_FULLSCREEN_VIOLATION',
      userEmail
    );

    return {
      isAutoSubmitted: true,
      isLocked: true,
      message: 'Fullscreen return deadline expired. Round has been automatically submitted and locked.',
    };
  }

  /**
   * Cancel and clear any timer for this user/round (e.g. on manual submit or 3rd violation)
   */
  static clearCountdown(userId: string, roundId: string): void {
    const key = this.getKey(userId, roundId);
    const entry = this.activeTimers.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      FullscreenTimerService.activeTimers.delete(key);
    }
  }

  /**
   * Get active countdown info if one is running
   */
  static getActiveCountdown(
    userId: string,
    roundId: string
  ): { active: boolean; deadline?: string; remainingSeconds?: number } {
    const key = this.getKey(userId, roundId);
    const entry = this.activeTimers.get(key);
    if (!entry) return { active: false };

    const remainingMs = entry.deadline - Date.now();
    if (remainingMs <= 0) {
      return { active: false };
    }

    return {
      active: true,
      deadline: new Date(entry.deadline).toISOString(),
      remainingSeconds: Math.ceil(remainingMs / 1000),
    };
  }
}
