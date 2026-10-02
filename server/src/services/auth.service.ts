import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { Role, PaymentStatus, ViolationType, Severity } from '@prisma/client';
import { z } from 'zod';
import { registerIndividualSchema, loginSchema } from '../validators/auth.validator.js';

function generateRandomNumber(length = 4): string {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)).toString();
}

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export class AuthService {
  static async registerIndividual(input: z.infer<typeof registerIndividualSchema>, meta?: ClientMeta) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      const error: any = new Error('An account with this email already exists.');
      error.statusCode = 400;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const participantId = `CB-IND-${generateRandomNumber(4)}`;

    const { user, session } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: Role.PARTICIPANT,
          profile: {
            create: {
              fullName: input.fullName,
              college: input.college,
              phone: input.phone,
              participantId,
            },
          },
        },
        include: { profile: true },
      });

      // Find active contest to get registration fee
      const activeContest = await tx.contest.findFirst({
        where: { status: { in: ['UPCOMING', 'ACTIVE'] } },
      });

      if (input.paymentTransactionId) {
        await tx.payment.create({
          data: {
            userId: newUser.id,
            amount: activeContest?.registrationFee || 150.0,
            transactionId: input.paymentTransactionId,
            status: PaymentStatus.COMPLETED,
            provider: 'MOCK_GATEWAY',
          },
        });
      }

      // Create initial active session for newly registered participant
      const userSession = await tx.userSession.create({
        data: {
          userId: newUser.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ipAddress: meta?.ip || null,
          userAgent: meta?.userAgent || null,
        },
      });

      return { user: newUser, session: userSession };
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      token,
      sessionId: session.id,
    };
  }

  static async login(input: z.infer<typeof loginSchema>, meta?: ClientMeta) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        profile: true,
      },
    });

    if (!user || !user.isActive) {
      const error: any = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Check for concurrent active session
    // Auto-deactivate any sessions that have reached expiresAt
    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: { lte: new Date() },
      },
      data: { isActive: false, revokedAt: new Date() },
    });

    // Find any ongoing active session
    const activeSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeSession) {
      // Find active contest or recent contest to link security violation
      const contest = await prisma.contest.findFirst({
        where: { status: 'ACTIVE' },
      }) || await prisma.contest.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      // 1. Log anti-cheat security event in Violation table with CRITICAL severity
      await prisma.violation.create({
        data: {
          userId: user.id,
          contestId: contest?.id || null,
          type: ViolationType.MULTIPLE_LOGIN,
          severity: Severity.CRITICAL,
          metadata: JSON.stringify({
            attemptedAt: new Date().toISOString(),
            ipAddress: meta?.ip || null,
            userAgent: meta?.userAgent || null,
            reason: 'Concurrent login attempt detected while active session exists',
            existingSessionId: activeSession.id,
          }),
        },
      });

      // 2. Log in AuditLog
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorEmail: user.email,
          action: 'CONCURRENT_LOGIN_BLOCKED',
          entity: 'UserSession',
          entityId: activeSession.id,
          metadata: JSON.stringify({
            attemptedAt: new Date().toISOString(),
            ipAddress: meta?.ip || null,
            userAgent: meta?.userAgent || null,
            reason: 'Concurrent login attempt detected while active session exists',
            severity: 'CRITICAL',
            violationType: 'MULTIPLE_LOGIN',
          }),
        },
      });

      // 3. Reject second login with 409 Conflict
      const error: any = new Error('This account is already logged in on another device or browser.');
      error.statusCode = 409;
      error.code = 'ACCOUNT_ALREADY_ACTIVE';
      error.title = 'Account Already Active';
      throw error;
    }

    // Create a new UserSession
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: meta?.ip || null,
        userAgent: meta?.userAgent || null,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      token,
      sessionId: session.id,
    };
  }

  static async invalidateSession(sessionId: string) {
    return prisma.userSession.updateMany({
      where: {
        id: sessionId,
        OR: [{ isActive: true }, { revokedAt: null }],
      },
      data: { isActive: false, revokedAt: new Date() },
    });
  }

  static async invalidateUserActiveSessions(userId: string) {
    return prisma.userSession.updateMany({
      where: {
        userId,
        OR: [{ isActive: true }, { revokedAt: null }],
      },
      data: { isActive: false, revokedAt: new Date() },
    });
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      const error: any = new Error('User not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    };
  }
}

