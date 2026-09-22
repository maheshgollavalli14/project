import { prisma } from '../config/db.js';
import { LockStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

const DEFAULT_HEARTBEAT_TIMEOUT_SECONDS = 45;

export class ProblemLockService {
  /**
   * Acquire or refresh a lock on a problem for a team member
   */
  static async acquireLock(
    contestId: string,
    roundId: string,
    questionId: string,
    teamId: string,
    userId: string
  ) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_HEARTBEAT_TIMEOUT_SECONDS * 1000);

    return await prisma.$transaction(async (tx) => {
      // Check for any active lock on this question for this team
      const existingLock = await tx.problemLock.findFirst({
        where: {
          roundId,
          questionId,
          teamId,
          status: LockStatus.ACTIVE,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (existingLock) {
        // If expired, release it
        if (existingLock.expiresAt < now) {
          await tx.problemLock.update({
            where: { id: existingLock.id },
            data: { status: LockStatus.EXPIRED },
          });
        } else if (existingLock.userId !== userId) {
          // Locked by teammate and still active!
          const error: any = new Error(
            `Problem is currently locked by your teammate ${
              existingLock.user.profile?.fullName || 'Teammate'
            }.`
          );
          error.statusCode = 409;
          error.code = 'PROBLEM_LOCKED';
          error.lockedBy = {
            userId: existingLock.userId,
            name: existingLock.user.profile?.fullName || 'Teammate',
            lockedAt: existingLock.lockedAt,
            expiresAt: existingLock.expiresAt,
          };
          throw error;
        } else {
          // Locked by this user -> refresh heartbeat and expiration
          const updated = await tx.problemLock.update({
            where: { id: existingLock.id },
            data: {
              lastHeartbeat: now,
              expiresAt,
            },
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          });
          return { lock: updated, renewed: true };
        }
      }

      // Create new lock
      const newLock = await tx.problemLock.create({
        data: {
          contestId,
          roundId,
          questionId,
          teamId,
          userId,
          lockedAt: now,
          lastHeartbeat: now,
          expiresAt,
          status: LockStatus.ACTIVE,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      logger.contest('Problem locked', 'ProblemLockService', {
        questionId,
        teamId,
        userId,
        expiresAt,
      });

      return { lock: newLock, renewed: false };
    });
  }

  /**
   * Heartbeat to keep lock alive
   */
  static async heartbeat(lockId: string, userId: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_HEARTBEAT_TIMEOUT_SECONDS * 1000);

    const lock = await prisma.problemLock.findUnique({
      where: { id: lockId },
    });

    if (!lock || lock.userId !== userId || lock.status !== LockStatus.ACTIVE) {
      const error: any = new Error('Lock not found or expired.');
      error.statusCode = 404;
      error.code = 'LOCK_INVALID';
      throw error;
    }

    const updated = await prisma.problemLock.update({
      where: { id: lockId },
      data: {
        lastHeartbeat: now,
        expiresAt,
      },
    });

    return updated;
  }

  /**
   * Release lock explicitly (e.g. participant navigated away, submitted, or unlocked)
   */
  static async releaseLock(questionId: string, teamId: string, userId: string) {
    const lock = await prisma.problemLock.findFirst({
      where: {
        questionId,
        teamId,
        userId,
        status: LockStatus.ACTIVE,
      },
    });

    if (lock) {
      await prisma.problemLock.update({
        where: { id: lock.id },
        data: { status: LockStatus.RELEASED },
      });

      logger.contest('Problem lock released', 'ProblemLockService', {
        questionId,
        teamId,
        userId,
      });
      return lock;
    }
    return null;
  }

  /**
   * Get active locks for a round and team
   */
  static async getTeamLocks(roundId: string, teamId: string) {
    const now = new Date();

    // Mark expired locks
    await prisma.problemLock.updateMany({
      where: {
        roundId,
        teamId,
        status: LockStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      data: { status: LockStatus.EXPIRED },
    });

    return await prisma.problemLock.findMany({
      where: {
        roundId,
        teamId,
        status: LockStatus.ACTIVE,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  /**
   * Periodic sweep to expire stale locks across all teams
   */
  static async sweepExpiredLocks() {
    const now = new Date();
    const result = await prisma.problemLock.updateMany({
      where: {
        status: LockStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      data: { status: LockStatus.EXPIRED },
    });

    return result.count;
  }
}
