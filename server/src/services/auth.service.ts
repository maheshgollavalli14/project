import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { Role, ParticipationType, TeamMemberRole, PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { registerIndividualSchema, registerTeamSchema, loginSchema } from '../validators/auth.validator.js';

function generateRandomNumber(length = 4): string {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)).toString();
}

export class AuthService {
  static async registerIndividual(input: z.infer<typeof registerIndividualSchema>) {
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

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
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
              participation: ParticipationType.INDIVIDUAL,
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
            userId: user.id,
            amount: activeContest?.registrationFee || 150.0,
            transactionId: input.paymentTransactionId,
            status: PaymentStatus.COMPLETED,
            provider: 'MOCK_GATEWAY',
          },
        });
      }

      return user;
    });

    const token = signToken({
      userId: result.id,
      email: result.email,
      role: result.role,
      teamId: null,
    });

    return {
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
        profile: result.profile,
      },
      token,
    };
  }

  static async registerTeam(input: z.infer<typeof registerTeamSchema>) {
    if (input.members.length !== 2) {
      const error: any = new Error('A team must contain exactly two members.');
      error.statusCode = 400;
      error.code = 'INVALID_TEAM_SIZE';
      throw error;
    }

    const emails = input.members.map((m) => m.email.toLowerCase());
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
    });

    if (existingUsers.length > 0) {
      const takenEmails = existingUsers.map((u) => u.email).join(', ');
      const error: any = new Error(`The following email(s) are already registered: ${takenEmails}`);
      error.statusCode = 400;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    const teamNum = generateRandomNumber(4);
    const teamId = `CB-TEAM-${teamNum}`;
    const inviteCode = `CB-${generateRandomNumber(4)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Team
      const team = await tx.team.create({
        data: {
          name: input.teamName,
          teamId,
          college: input.college,
          inviteCode,
        },
      });

      // 2. Hash passwords & create members
      const member1Hash = await bcrypt.hash(input.members[0].password, 10);
      const member2Hash = await bcrypt.hash(input.members[1].password, 10);

      const user1 = await tx.user.create({
        data: {
          email: input.members[0].email.toLowerCase(),
          passwordHash: member1Hash,
          role: Role.TEAM_MEMBER,
          profile: {
            create: {
              fullName: input.members[0].fullName,
              college: input.members[0].college,
              phone: input.members[0].phone,
              participantId: `CB-TM-${teamNum}A`,
              participation: ParticipationType.TEAM,
            },
          },
          teamMember: {
            create: {
              teamId: team.id,
              roleInTeam: TeamMemberRole.LEADER,
            },
          },
        },
        include: { profile: true, teamMember: true },
      });

      const user2 = await tx.user.create({
        data: {
          email: input.members[1].email.toLowerCase(),
          passwordHash: member2Hash,
          role: Role.TEAM_MEMBER,
          profile: {
            create: {
              fullName: input.members[1].fullName,
              college: input.members[1].college,
              phone: input.members[1].phone,
              participantId: `CB-TM-${teamNum}B`,
              participation: ParticipationType.TEAM,
            },
          },
          teamMember: {
            create: {
              teamId: team.id,
              roleInTeam: TeamMemberRole.MEMBER,
            },
          },
        },
        include: { profile: true, teamMember: true },
      });

      const activeContest = await tx.contest.findFirst({
        where: { status: { in: ['UPCOMING', 'ACTIVE'] } },
      });

      if (input.paymentTransactionId) {
        await tx.payment.create({
          data: {
            teamId: team.id,
            userId: user1.id,
            amount: activeContest?.registrationFee || 200.0,
            transactionId: input.paymentTransactionId,
            status: PaymentStatus.COMPLETED,
            provider: 'MOCK_GATEWAY',
          },
        });
      }

      return { team, user1, user2 };
    });

    // Sign token for Member 1 who completed the registration
    const token = signToken({
      userId: result.user1.id,
      email: result.user1.email,
      role: result.user1.role,
      teamId: result.team.id,
    });

    return {
      team: {
        id: result.team.id,
        name: result.team.name,
        teamId: result.team.teamId,
        college: result.team.college,
      },
      user: {
        id: result.user1.id,
        email: result.user1.email,
        role: result.user1.role,
        profile: result.user1.profile,
        teamId: result.team.id,
      },
      token,
    };
  }

  static async login(input: z.infer<typeof loginSchema>) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        profile: true,
        teamMember: {
          include: {
            team: true,
          },
        },
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

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamMember?.teamId || null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        team: user.teamMember?.team || null,
        teamMember: user.teamMember || null,
      },
      token,
    };
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        teamMember: {
          include: {
            team: {
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
            },
          },
        },
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
      team: user.teamMember?.team || null,
      teamMember: user.teamMember || null,
    };
  }
}
