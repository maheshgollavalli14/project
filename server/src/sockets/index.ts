import { Server, Socket } from 'socket.io';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { ProblemLockService } from '../services/problemLock.service.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export function registerSocketHandlers(io: Server) {
  // Authentication middleware for socket connections
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie
      ?.split('; ')
      .find((row) => row.startsWith('cb_access_token='))
      ?.split('=')[1];

    if (!token) {
      // Allow unauthenticated socket for public leaderboard / countdown if needed,
      // but protected rooms require token
      return next();
    }

    const payload = verifyToken(token);
    if (payload) {
      socket.user = payload;
    }
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    const teamId = socket.user?.teamId;

    logger.info('Socket client connected', 'SocketIO', { socketId: socket.id, userId, teamId });

    // 1. Join Team Room if participant belongs to a team
    if (teamId) {
      const roomName = `team:${teamId}`;
      socket.join(roomName);

      // Broadcast to teammate that member is online
      io.to(roomName).emit('team:member-online', {
        userId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });

      // Send active locks to the newly connected member
      socket.on('team:get-locks', async ({ roundId }: { roundId: string }) => {
        try {
          const activeLocks = await ProblemLockService.getTeamLocks(roundId, teamId);
          socket.emit('team:active-locks', { locks: activeLocks });
        } catch (err: any) {
          logger.error('Error fetching team locks', 'SocketIO', { error: err.message });
        }
      });
    }

    // 2. Contest room for global updates & timer broadcasts
    socket.on('contest:join', ({ contestId }: { contestId: string }) => {
      socket.join(`contest:${contestId}`);
    });

    // 3. Problem Lock Request via Socket
    socket.on(
      'problem:lock',
      async ({
        contestId,
        roundId,
        questionId,
      }: {
        contestId: string;
        roundId: string;
        questionId: string;
      }) => {
        if (!teamId || !userId) return;

        try {
          const result = await ProblemLockService.acquireLock(
            contestId,
            roundId,
            questionId,
            teamId,
            userId
          );

          // Broadcast lock to teammate
          io.to(`team:${teamId}`).emit('problem:lock-updated', {
            questionId,
            lockedBy: {
              userId,
              fullName: socket.user?.email || 'Teammate',
            },
            status: 'ACTIVE',
            expiresAt: result.lock.expiresAt,
          });

          socket.emit('problem:lock-acquired', {
            lockId: result.lock.id,
            questionId,
            expiresAt: result.lock.expiresAt,
          });
        } catch (err: any) {
          socket.emit('problem:lock-rejected', {
            questionId,
            message: err.message,
            lockedBy: err.lockedBy,
          });
        }
      }
    );

    // 4. Heartbeat to keep problem lock alive
    socket.on('problem:heartbeat', async ({ lockId }: { lockId: string }) => {
      if (!userId) return;
      try {
        const updated = await ProblemLockService.heartbeat(lockId, userId);
        socket.emit('problem:heartbeat-ack', {
          lockId,
          expiresAt: updated.expiresAt,
        });
      } catch (err: any) {
        socket.emit('problem:heartbeat-failed', { message: err.message });
      }
    });

    // 5. Explicit unlock when navigating away
    socket.on(
      'problem:unlock',
      async ({ questionId }: { questionId: string }) => {
        if (!teamId || !userId) return;
        try {
          await ProblemLockService.releaseLock(questionId, teamId, userId);
          io.to(`team:${teamId}`).emit('problem:lock-updated', {
            questionId,
            lockedBy: null,
            status: 'RELEASED',
          });
        } catch (err: any) {
          logger.error('Error releasing lock', 'SocketIO', { error: err.message });
        }
      }
    );

    // 6. Handle Disconnect
    socket.on('disconnect', () => {
      logger.info('Socket client disconnected', 'SocketIO', { socketId: socket.id, userId, teamId });
      if (teamId) {
        const roomName = `team:${teamId}`;
        io.to(roomName).emit('team:member-offline', {
          userId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });
}
