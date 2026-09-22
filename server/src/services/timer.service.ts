import { prisma } from '../config/db.js';
import { RoundStatus, LockStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { Server } from 'socket.io';

export class TimerService {
  private static ioInstance: Server | null = null;
  private static intervalId: NodeJS.Timeout | null = null;

  static initialize(io: Server) {
    this.ioInstance = io;
    if (this.intervalId) clearInterval(this.intervalId);

    // Run authoritative synchronization tick every 5 seconds
    this.intervalId = setInterval(async () => {
      try {
        await this.syncRoundStatuses();
      } catch (err: any) {
        logger.error('Error during timer tick', 'TimerService', { error: err.message });
      }
    }, 5000);
  }

  /**
   * Calculates exact remaining seconds from server clock
   */
  static getRemainingSeconds(endTime: Date | null): number {
    if (!endTime) return 0;
    const now = Date.now();
    const end = new Date(endTime).getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  }

  /**
   * Authoritative server time evaluator:
   * Synchronizes all round statuses strictly according to their scheduled startTime & endTime
   */
  static async syncRoundStatuses() {
    const now = new Date();
    const curTime = now.getTime();

    const rounds = await prisma.contestRound.findMany({
      include: { contest: true },
      orderBy: { roundNumber: 'asc' },
    });

    for (const round of rounds) {
      if (!round.startTime || !round.endTime) continue;

      const startTime = new Date(round.startTime).getTime();
      const endTime = new Date(round.endTime).getTime();

      let targetStatus: RoundStatus = round.status;

      if (curTime < startTime) {
        targetStatus = RoundStatus.UPCOMING;
      } else if (curTime >= startTime && curTime <= endTime) {
        targetStatus = RoundStatus.ACTIVE;
      } else if (curTime > endTime) {
        targetStatus = RoundStatus.COMPLETED;
      }

      // If status needs transition
      if (targetStatus !== round.status) {
        logger.contest(
          `Round ${round.roundNumber} status transitioning from ${round.status} to ${targetStatus}`,
          'TimerService',
          {
            roundId: round.id,
            startTime: round.startTime,
            endTime: round.endTime,
            currentTime: now,
          }
        );

        await prisma.$transaction(async (tx) => {
          await tx.contestRound.update({
            where: { id: round.id },
            data: { status: targetStatus },
          });

          // If round is finalized/completed, release all problem locks
          if (targetStatus === RoundStatus.COMPLETED) {
            await tx.problemLock.updateMany({
              where: {
                roundId: round.id,
                status: LockStatus.ACTIVE,
              },
              data: { status: LockStatus.RELEASED },
            });

            await tx.auditLog.create({
              data: {
                actorId: 'SYSTEM_TIMER',
                actorEmail: 'system@codebreak.dev',
                action: 'ROUND_TIME_EXPIRED',
                entity: 'ContestRound',
                entityId: round.id,
                metadata: JSON.stringify({
                  roundNumber: round.roundNumber,
                  endTime: round.endTime,
                }),
              },
            });
          }
        });

        // Broadcast status update via Socket.IO
        if (this.ioInstance) {
          if (targetStatus === RoundStatus.ACTIVE) {
            this.ioInstance.emit('contest:round-started', {
              roundId: round.id,
              roundNumber: round.roundNumber,
              status: RoundStatus.ACTIVE,
              remainingSeconds: Math.max(0, Math.floor((endTime - curTime) / 1000)),
              message: `Round ${round.roundNumber} has officially commenced! Arena is now open.`,
            });
          } else if (targetStatus === RoundStatus.COMPLETED) {
            this.ioInstance.emit('contest:round-ended', {
              roundId: round.id,
              roundNumber: round.roundNumber,
              status: RoundStatus.COMPLETED,
              message: `Round ${round.roundNumber} has concluded. Submissions are now locked.`,
            });
          }
        }
      }

      // Broadcast remaining seconds for active round
      if (targetStatus === RoundStatus.ACTIVE && this.ioInstance) {
        this.ioInstance.emit('contest:time-update', {
          roundId: round.id,
          roundNumber: round.roundNumber,
          remainingSeconds: Math.max(0, Math.floor((endTime - curTime) / 1000)),
          status: RoundStatus.ACTIVE,
        });
      }
    }
  }

  /**
   * Checks if submissions and arena entry are currently allowed for a given round
   */
  static async assertRoundActive(roundId: string) {
    // Run sync first to ensure fresh state
    await this.syncRoundStatuses();

    const round = await prisma.contestRound.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      const error: any = new Error('Round not found.');
      error.statusCode = 404;
      error.code = 'ROUND_NOT_FOUND';
      throw error;
    }

    const now = new Date();
    if (round.status !== RoundStatus.ACTIVE || (round.endTime && round.endTime < now)) {
      const error: any = new Error('Submissions are closed. This round is not currently open.');
      error.statusCode = 403;
      error.code = 'ROUND_CLOSED';
      throw error;
    }

    return round;
  }
}
