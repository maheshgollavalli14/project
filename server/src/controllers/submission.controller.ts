import { Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { TimerService } from '../services/timer.service.js';
import { IsolatedRunner } from '../services/execution/isolatedRunner.js';
import { ScoringService } from '../services/scoring.service.js';
import { QualificationService } from '../services/qualification.service.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const runCodeSchema = z.object({
  language: z.string().min(1),
  code: z.string().min(1),
});

const submitSchema = z.object({
  language: z.string().optional(),
  code: z.string().optional(),
  selectedOptionId: z.string().optional(),
});

export class SubmissionController {
  /**
   * Run code against sample test cases (Test run, not official submission)
   */
  static async runCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.id as string;
      const validated = runCodeSchema.parse(req.body);

      const question: any = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          round: true,
          testCases: {
            where: { isPublic: true },
          },
        },
      });

      if (!question) {
        res.status(404).json({ success: false, message: 'Question not found', code: 'NOT_FOUND' });
        return;
      }

      // Assert round is currently active
      if (req.user?.role !== 'ADMIN') {
        await TimerService.assertRoundActive(question.roundId);

        // Strict Round 3 Qualification Check
        if (question.round.roundNumber === 3) {
          const access = await QualificationService.canUserAccessRound(
            3,
            question.round.contestId,
            req.user!.userId,
            req.user?.teamId,
            req.user?.role
          );

          if (!access.allowed) {
            res.status(403).json({
              success: false,
              code: 'NOT_QUALIFIED',
              message: access.reason || 'Access Denied: You did not qualify for Round 3 (Grand Finale).',
            });
            return;
          }
        }
      }

      const results = await IsolatedRunner.executeCode(
        validated.language,
        validated.code,
        question.testCases,
        question.timeLimitMs
      );

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Official submission (scored against all hidden test cases)
   */
  static async submitSolution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.id as string;
      const userId = req.user!.userId;
      const teamId = req.user?.teamId || null;
      const validated = submitSchema.parse(req.body);

      const question: any = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
          round: true,
          options: true,
          testCases: true,
        },
      });

      if (!question) {
        res.status(404).json({ success: false, message: 'Question not found', code: 'NOT_FOUND' });
        return;
      }

      // 1. Assert round is active and submissions are open
      if (req.user?.role !== 'ADMIN') {
        await TimerService.assertRoundActive(question.roundId);

        // 2. Strict Round 3 Qualification Check
        if (question.round.roundNumber === 3) {
          const access = await QualificationService.canUserAccessRound(
            3,
            question.round.contestId,
            userId,
            teamId,
            req.user?.role
          );

          if (!access.allowed) {
            res.status(403).json({
              success: false,
              code: 'NOT_QUALIFIED',
              message: access.reason || 'Access Denied: You did not qualify for Round 3 (Grand Finale).',
            });
            return;
          }
        }
      }

      let status: any = 'PENDING';
      let earnedScore = 0;
      let passedCount = 0;
      let totalCount = 0;
      let runtimeMs = 0;
      let memoryKb = 0;
      let errorOutput: string | null = null;
      let safeResults: any[] = [];

      // 2. Handle MCQ / Output Prediction
      if (question.type === 'MCQ' || question.type === 'OUTPUT_PREDICTION') {
        totalCount = 1;
        if (question.options && question.options.length > 0 && validated.selectedOptionId) {
          const selectedOption = question.options.find((o: any) => o.id === validated.selectedOptionId);
          if (selectedOption?.isCorrect) {
            status = 'ACCEPTED';
            earnedScore = question.points;
            passedCount = 1;
          } else {
            status = 'WRONG_ANSWER';
            earnedScore = 0;
            passedCount = 0;
          }
        } else if (question.expectedOutput) {
          // Direct written output comparison for Output Prediction write-in
          const userOutput = (validated.code || '').trim().replace(/\r\n/g, '\n');
          const expected = question.expectedOutput.trim().replace(/\r\n/g, '\n');
          if (userOutput === expected) {
            status = 'ACCEPTED';
            earnedScore = question.points;
            passedCount = 1;
          } else {
            status = 'WRONG_ANSWER';
            earnedScore = 0;
            passedCount = 0;
          }
        } else {
          status = 'WRONG_ANSWER';
          earnedScore = 0;
          passedCount = 0;
        }
      } else {
        // 3. Handle Coding / Debugging with IsolatedRunner
        if (!validated.code) {
          res.status(400).json({ success: false, message: 'Code is required', code: 'CODE_REQUIRED' });
          return;
        }

        const execution = await IsolatedRunner.executeCode(
          validated.language || 'python',
          validated.code,
          question.testCases,
          question.timeLimitMs
        );

        status = execution.overallStatus;
        passedCount = execution.passedTests;
        totalCount = execution.totalTests;
        runtimeMs = execution.runtimeMs;
        memoryKb = execution.memoryKb;
        errorOutput = execution.compilerError || null;

        // Calculate score proportionally based on passed test cases
        if (totalCount > 0) {
          earnedScore = Math.round((passedCount / totalCount) * question.points);
        }

        // Mask hidden test cases from response to prevent cheating
        safeResults = execution.testResults.map((t) => ({
          testCaseId: t.testCaseId,
          isPublic: t.isPublic,
          passed: t.passed,
          status: t.status,
          runtimeMs: t.runtimeMs,
          // Only show input/expected output if public
          input: t.isPublic ? t.input : undefined,
          expectedOutput: t.isPublic ? t.expectedOutput : undefined,
          actualOutput: t.isPublic ? t.actualOutput : undefined,
        }));
      }

      // 4. Save submission record
      const submission = await prisma.submission.create({
        data: {
          questionId,
          userId,
          teamId,
          roundId: question.roundId,
          language: validated.language || 'text',
          code: validated.code || validated.selectedOptionId || '',
          status,
          score: earnedScore,
          runtimeMs,
          memoryKb,
          passedTests: passedCount,
          totalTests: totalCount,
          errorOutput,
        },
      });

      // 5. Update authoritative leaderboard score
      await ScoringService.updateRoundScore(
        question.round.contestId,
        question.roundId,
        userId,
        teamId
      );

      logger.contest('Submission evaluated', 'SubmissionController', {
        submissionId: submission.id,
        questionId,
        userId,
        teamId,
        status,
        earnedScore,
      });

      res.status(201).json({
        success: true,
        message: status === 'ACCEPTED' ? 'Solution Accepted!' : 'Submission Processed',
        data: {
          submissionId: submission.id,
          status,
          score: earnedScore,
          maxScore: question.points,
          passedTests: passedCount,
          totalTests: totalCount,
          runtimeMs,
          memoryKb,
          testResults: safeResults,
          errorOutput,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get user / team submission history
   */
  static async getSubmissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const teamId = req.user?.teamId;

      const submissions = await prisma.submission.findMany({
        where: teamId ? { teamId } : { userId },
        include: {
          question: {
            select: {
              title: true,
              points: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.status(200).json({
        success: true,
        data: { submissions },
      });
    } catch (err) {
      next(err);
    }
  }
}
