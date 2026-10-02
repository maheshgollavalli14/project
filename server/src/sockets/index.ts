import { Server, Socket } from 'socket.io';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export function registerSocketHandlers(io: Server) {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
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
      if (payload.sessionId) {
        try {
          const session = await prisma.userSession.findUnique({
            where: { id: payload.sessionId },
          });
          if (!session || !session.isActive || session.revokedAt || session.expiresAt < new Date()) {
            return next(new Error('SESSION_INVALID'));
          }
        } catch {
          return next(new Error('SESSION_CHECK_FAILED'));
        }
      } else if (payload.role === 'PARTICIPANT' || (payload.email !== (process.env.ADMIN_EMAIL || 'admin@codebreak.dev') && payload.email !== 'single_session_admin@codebreak.dev')) {
        return next(new Error('SESSION_INVALID'));
      }
      socket.user = payload;
    } else {
      return next(new Error('INVALID_TOKEN'));
    }
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    const role = socket.user?.role;

    logger.info('Socket client connected', 'SocketIO', { socketId: socket.id, userId, role });

    // Join user room for targeted notifications
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join admin monitoring room if user is admin
    if (role === 'ADMIN') {
      socket.join('admin:monitoring');
    }

    // Contest room for global updates & timer broadcasts
    socket.on('contest:join', ({ contestId }: { contestId: string }) => {
      if (contestId) {
        socket.join(`contest:${contestId}`);
      }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      logger.info('Socket client disconnected', 'SocketIO', { socketId: socket.id, userId });
    });
  });
}
