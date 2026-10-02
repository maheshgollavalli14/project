import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { QualificationService } from '../services/qualification.service.js';
import { TimerService } from '../services/timer.service.js';
import { RoundStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import { getRound1Templates, getRound2Templates, getRound3Templates } from '../utils/roundTemplates.js';

export class AdminController {
  /**
   * Admin dashboard metrics
   */
  static async getDashboardMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Synchronize all round statuses with server clock
      await TimerService.syncRoundStatuses();

      const [
        totalUsers,
        totalSubmissions,
        totalViolations,
        totalPayments,
        activeContest,
      ] = await Promise.all([
        prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
        prisma.submission.count(),
        prisma.violation.count(),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
        prisma.contest.findFirst({
          where: { status: { in: ['ACTIVE', 'UPCOMING', 'COMPLETED'] } },
          include: {
            rounds: {
              orderBy: { roundNumber: 'asc' },
            },
          },
        }),
      ]);

      const solvedSubmissionsCount = await prisma.submission.count({
        where: { status: 'ACCEPTED' },
      });

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalUsers,
            totalSubmissions,
            solvedSubmissionsCount,
            totalViolations,
            revenue: totalPayments._sum.amount || 0,
            activeRound: activeContest?.rounds.find((r) => r.status === 'ACTIVE') || null,
            contest: activeContest,
            serverTime: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Participants list with search and filter
   */
  static async getParticipants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { search, page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {
        role: { not: 'ADMIN' },
      };

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { profile: { fullName: { contains: search as string, mode: 'insensitive' } } },
          { profile: { college: { contains: search as string, mode: 'insensitive' } } },
          { profile: { participantId: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            profile: true,
            _count: {
              select: { submissions: true, violations: true },
            },
          },
          skip,
          take: parseInt(limit as string),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          participants: users,
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }


  /**
   * Full questions list for admin (including hidden test cases & correct answers)
   */
  static async getQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { roundId } = req.query;

      const questions = await prisma.question.findMany({
        where: roundId ? { roundId: roundId as string } : {},
        include: {
          round: { select: { id: true, roundNumber: true, title: true } },
          options: { orderBy: { orderNumber: 'asc' } },
          testCases: { orderBy: { createdAt: 'asc' } },
          _count: { select: { submissions: true } },
        },
        orderBy: [{ round: { roundNumber: 'asc' } }, { orderNumber: 'asc' }],
      });

      res.status(200).json({
        success: true,
        data: { questions },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create question with options or test cases
   */
  static async createQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        roundId,
        title,
        description,
        type,
        difficulty,
        points,
        timeLimitMs,
        memoryLimitMb,
        initialCode,
        expectedOutput,
        constraints,
        allowedLanguages,
        options,
        testCases,
      } = req.body;

      // Clean options if provided
      const cleanOptions = Array.isArray(options)
        ? options
            .filter((opt: any) => opt && typeof opt.text === 'string' && opt.text.trim().length > 0)
            .map((opt: any, idx: number) => ({
              text: opt.text.trim(),
              isCorrect: Boolean(opt.isCorrect),
              orderNumber: opt.orderNumber || idx + 1,
              explanation: opt.explanation || null,
            }))
        : [];

      // Clean test cases if provided
      const cleanTestCases = Array.isArray(testCases)
        ? testCases
            .filter((tc: any) => tc && typeof tc.input === 'string' && typeof tc.expectedOutput === 'string')
            .map((tc: any) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isPublic: tc.isPublic ?? true,
              weight: Number(tc.weight) || 1,
            }))
        : [];

      const currentCount = await prisma.question.count({ where: { roundId } });

      const question = await prisma.question.create({
        data: {
          roundId,
          orderNumber: currentCount + 1,
          title,
          description,
          type,
          difficulty: difficulty || 'EASY',
          points: Number(points) || 10,
          timeLimitMs: Number(timeLimitMs) || 2000,
          memoryLimitMb: Number(memoryLimitMb) || 128,
          initialCode: initialCode || null,
          expectedOutput: expectedOutput || null,
          constraints: constraints || null,
          allowedLanguages: allowedLanguages || 'python,java,cpp',
          options: cleanOptions.length > 0 ? { create: cleanOptions } : undefined,
          testCases: cleanTestCases.length > 0 ? { create: cleanTestCases } : undefined,
        },
        include: { options: true, testCases: true },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          actorEmail: req.user!.email,
          action: 'CREATE_QUESTION',
          entity: 'Question',
          entityId: question.id,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Question created successfully',
        data: { question },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update question
   */
  static async updateQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = req.body;

      const updated = await prisma.question.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          points: data.points,
          timeLimitMs: data.timeLimitMs,
          memoryLimitMb: data.memoryLimitMb,
          initialCode: data.initialCode,
          expectedOutput: data.expectedOutput,
          constraints: data.constraints,
          isPublished: data.isPublished,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Question updated successfully',
        data: { question: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete question
   */
  static async deleteQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.question.delete({ where: { id } });

      res.status(200).json({
        success: true,
        message: 'Question deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Seed round questions from predefined templates (Round 1: 25 bits + 2 outputs; Round 2: 4 jumbled; Round 3: 3 scenarios)
   */
  static async seedRoundTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { roundNumber, clearExisting } = req.body;
      const num = parseInt(roundNumber as string);
      if (![1, 2, 3].includes(num)) {
        res.status(400).json({ success: false, message: 'Invalid round number. Must be 1, 2, or 3.' });
        return;
      }

      const round = await prisma.contestRound.findFirst({
        where: { roundNumber: num },
      });

      if (!round) {
        res.status(404).json({ success: false, message: `Round ${num} not found in database.` });
        return;
      }

      if (clearExisting) {
        // Delete existing questions for this round
        await prisma.question.deleteMany({
          where: { roundId: round.id },
        });
      }

      let templates: any[] = [];
      if (num === 1) {
        const r1 = getRound1Templates();
        templates = [...r1.mcqBits, ...r1.outputPredictions];
      } else if (num === 2) {
        templates = getRound2Templates();
      } else if (num === 3) {
        templates = getRound3Templates();
      }

      let createdCount = 0;
      for (let i = 0; i < templates.length; i++) {
        const t = templates[i];
        await prisma.question.create({
          data: {
            roundId: round.id,
            orderNumber: i + 1,
            title: t.title,
            description: t.description,
            type: t.type,
            difficulty: t.difficulty || 'MEDIUM',
            points: t.points || 10,
            timeLimitMs: t.timeLimitMs || 2000,
            memoryLimitMb: t.memoryLimitMb || 128,
            initialCode: t.initialCode || null,
            expectedOutput: t.expectedOutput || null,
            constraints: t.constraints || null,
            allowedLanguages: t.allowedLanguages || 'python,java,cpp',
            options: t.options && t.options.length > 0 ? {
              create: t.options.map((opt: any, idx: number) => ({
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect),
                orderNumber: opt.orderNumber || idx + 1,
                explanation: opt.explanation || null,
              })),
            } : undefined,
            testCases: t.testCases && t.testCases.length > 0 ? {
              create: t.testCases.map((tc: any) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isPublic: tc.isPublic ?? true,
                weight: tc.weight ?? 1,
              })),
            } : undefined,
          },
        });
        createdCount++;
      }

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          actorEmail: req.user!.email,
          action: 'SEED_ROUND_TEMPLATE',
          entity: 'Round',
          entityId: round.id,
          metadata: JSON.stringify({ roundNumber: num, questionsCount: createdCount }),
        },
      });

      res.status(200).json({
        success: true,
        message: `Successfully seeded ${createdCount} questions for Round ${num}.`,
        data: { roundId: round.id, roundNumber: num, createdCount },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Contest round start control
   */
  static async startRound(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { roundId, durationMinutes } = req.body;
      const now = new Date();
      const duration = durationMinutes || 45;
      const endTime = new Date(now.getTime() + duration * 60 * 1000);

      const round = await prisma.contestRound.update({
        where: { id: roundId },
        data: {
          status: RoundStatus.ACTIVE,
          startTime: now,
          endTime,
          durationMinutes: duration,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          actorEmail: req.user!.email,
          action: 'START_ROUND',
          entity: 'ContestRound',
          entityId: round.id,
          metadata: JSON.stringify({ durationMinutes: duration, endTime }),
        },
      });

      logger.contest(`Admin started round ${round.roundNumber}`, 'AdminController', {
        roundId: round.id,
        duration,
        endTime,
      });

      res.status(200).json({
        success: true,
        message: `Round ${round.roundNumber} started successfully!`,
        data: { round },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Contest round end control
   */
  static async endRound(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { roundId } = req.body;

      const round = await prisma.$transaction(async (tx) => {
        const r = await tx.contestRound.update({
          where: { id: roundId },
          data: {
            status: RoundStatus.COMPLETED,
            endTime: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: req.user!.userId,
            actorEmail: req.user!.email,
            action: 'MANUAL_END_ROUND',
            entity: 'ContestRound',
            entityId: roundId,
          },
        });

        return r;
      });

      res.status(200).json({
        success: true,
        message: `Round ${round.roundNumber} closed. Submissions are now locked.`,
        data: { round },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Schedule start and end time for a specific round
   */
  static async scheduleRound(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { roundId, startTime, endTime } = req.body;
      if (!roundId || !startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: 'roundId, startTime, and endTime are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid start or end date/time format',
          code: 'INVALID_DATE',
        });
        return;
      }

      if (end.getTime() <= start.getTime()) {
        res.status(400).json({
          success: false,
          message: 'End time must be after start time',
          code: 'INVALID_DURATION',
        });
        return;
      }

      const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));
      const now = Date.now();

      let status: RoundStatus = RoundStatus.UPCOMING;
      if (now >= start.getTime() && now <= end.getTime()) {
        status = RoundStatus.ACTIVE;
      } else if (now > end.getTime()) {
        status = RoundStatus.COMPLETED;
      }

      const round = await prisma.contestRound.update({
        where: { id: roundId },
        data: {
          startTime: start,
          endTime: end,
          durationMinutes,
          status,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          actorEmail: req.user!.email,
          action: 'SCHEDULE_ROUND',
          entity: 'ContestRound',
          entityId: round.id,
          metadata: JSON.stringify({
            roundNumber: round.roundNumber,
            startTime: start,
            endTime: end,
            durationMinutes,
            status,
          }),
        },
      });

      // Synchronize all round statuses authoritatively across server
      await TimerService.syncRoundStatuses();

      const updatedRound = await prisma.contestRound.findUnique({ where: { id: roundId } });

      logger.contest(`Admin scheduled round ${round.roundNumber}`, 'AdminController', {
        roundId,
        start,
        end,
        durationMinutes,
        status: updatedRound?.status,
      });

      res.status(200).json({
        success: true,
        message: `Round ${round.roundNumber} scheduled (${durationMinutes} mins) - Status: ${updatedRound?.status}`,
        data: { round: updatedRound },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Schedule all rounds in sequence
   */
  static async scheduleAllRounds(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { rounds } = req.body;
      if (!Array.isArray(rounds) || rounds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'rounds array is required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      const now = Date.now();
      const updatedRounds = [];

      for (const item of rounds) {
        const { roundId, startTime, endTime } = item;
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
          res.status(400).json({
            success: false,
            message: `Invalid schedule for round ${roundId}: end time must be after start time`,
            code: 'INVALID_SCHEDULE',
          });
          return;
        }

        const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));
        let status: RoundStatus = RoundStatus.UPCOMING;
        if (now >= start.getTime() && now <= end.getTime()) {
          status = RoundStatus.ACTIVE;
        } else if (now > end.getTime()) {
          status = RoundStatus.COMPLETED;
        }

        const r = await prisma.contestRound.update({
          where: { id: roundId },
          data: {
            startTime: start,
            endTime: end,
            durationMinutes,
            status,
          },
        });
        updatedRounds.push(r);
      }

      await TimerService.syncRoundStatuses();

      res.status(200).json({
        success: true,
        message: `All ${updatedRounds.length} rounds scheduled successfully!`,
        data: { rounds: updatedRounds },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Run qualification engine
   */
  static async calculateQualification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { contestId, cutoffCount } = req.body;
      const count = cutoffCount || 20;

      const result = await QualificationService.calculateQualification(
        contestId,
        count,
        req.user!.email
      );

      res.status(200).json({
        success: true,
        message: `Qualification successfully computed for Top ${count}!`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Anti-cheating violation logs
   */
  static async getViolations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { type, severity, reviewed, contestId, roundId, search } = req.query;

      const where: any = {};
      if (type) where.type = type;
      if (severity) where.severity = severity;
      if (reviewed !== undefined && reviewed !== '') {
        where.reviewed = reviewed === 'true';
      }
      if (contestId) where.contestId = contestId;
      if (roundId) where.roundId = roundId;
      if (search) {
        where.OR = [
          { user: { email: { contains: search as string, mode: 'insensitive' } } },
          { user: { profile: { fullName: { contains: search as string, mode: 'insensitive' } } } },
          { user: { profile: { participantId: { contains: search as string, mode: 'insensitive' } } } },
        ];
      }

      const violations = await prisma.violation.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              profile: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      res.status(200).json({
        success: true,
        data: { violations },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Review violation
   */
  static async reviewViolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { adminNote, reviewed } = req.body;

      const violation = await prisma.violation.update({
        where: { id },
        data: {
          reviewed: reviewed ?? true,
          adminNote,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Violation status updated',
        data: { violation },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Contest settings management
   */
  static async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.contestSetting.findMany();
      res.status(200).json({
        success: true,
        data: { settings },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { settings } = req.body; // Array of { key, value }

      for (const item of settings) {
        await prisma.contestSetting.upsert({
          where: { key: item.key },
          update: { value: item.value },
          create: { key: item.key, value: item.value },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin submissions list with filters
   */
  static async getSubmissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, questionId, roundId, search, page = '1', limit = '25' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {};
      if (status) where.status = status as any;
      if (questionId) where.questionId = questionId as string;
      if (roundId) where.question = { roundId: roundId as string };
      if (search) {
        where.OR = [
          { user: { email: { contains: search as string, mode: 'insensitive' } } },
          { user: { profile: { fullName: { contains: search as string, mode: 'insensitive' } } } },
          { question: { title: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      const [submissions, total] = await Promise.all([
        prisma.submission.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { fullName: true, participantId: true } },
              },
            },
            question: {
              select: {
                id: true,
                title: true,
                points: true,
                type: true,
                round: { select: { roundNumber: true, title: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.submission.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          submissions,
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

