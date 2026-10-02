import { prisma } from '../config/db.js';
import { IsolatedRunner } from './execution/isolatedRunner.js';
import { ScoringService } from './scoring.service.js';
import { logger } from '../utils/logger.js';

export class ContestService {
  /**
   * Finalize and permanently lock a round for a participant.
   * Evaluates any unsubmitted answers/code in SavedCode (drafts) so participant work is preserved.
   */
  static async finalizeParticipantRound(
    userId: string,
    roundId: string,
    contestId?: string | null,
    reason: 'AUTOMATIC_FULLSCREEN_VIOLATION' | 'MANUAL_FINAL_SUBMISSION' = 'MANUAL_FINAL_SUBMISSION',
    actorEmail?: string
  ) {
    // 1. Fetch round & contest
    const round = await prisma.contestRound.findUnique({
      where: { id: roundId },
      include: {
        questions: {
          include: {
            options: true,
            testCases: true,
          },
        },
      },
    });

    if (!round) {
      throw new Error(`Round with ID ${roundId} not found`);
    }

    const targetContestId = contestId || round.contestId;

    // 2. Check if already submitted or locked
    const existingProgress = await prisma.participantRoundProgress.findUnique({
      where: {
        userId_roundId: {
          userId,
          roundId,
        },
      },
    });

    if (existingProgress?.status === 'SUBMITTED' || existingProgress?.status === 'LOCKED') {
      return {
        alreadySubmitted: true,
        status: existingProgress.status,
        lockedAt: existingProgress.lockedAt,
        submittedAt: existingProgress.submittedAt,
      };
    }

    // 3. Best-effort evaluation of unsubmitted drafts in SavedCode
    try {
      const savedCodes = await prisma.savedCode.findMany({
        where: {
          userId,
          question: { roundId },
        },
      });

      // Find which questions already have at least one submission
      const existingSubmissions = await prisma.submission.findMany({
        where: {
          userId,
          roundId,
        },
        select: { questionId: true },
      });
      const submittedQuestionIds = new Set(existingSubmissions.map((s) => s.questionId));

      for (const draft of savedCodes) {
        if (submittedQuestionIds.has(draft.questionId)) {
          continue;
        }

        const question = round.questions.find((q) => q.id === draft.questionId);
        if (!question) continue;

        const hasOption = Boolean(draft.selectedOptionId);
        const hasCode = Boolean(draft.code && draft.code.trim().length > 0);

        if (!hasOption && !hasCode) continue;

        const normalize = (str?: string | null) => (str || '').replace(/\r\n/g, '\n').trim();
        if (question.type === 'DEBUGGING' || question.type === 'CODING') {
          // In Round 2 / coding rounds: do not submit unmodified starter code or blank code
          if (question.initialCode && normalize(draft.code) === normalize(question.initialCode)) {
            continue;
          }
          if (!draft.code || normalize(draft.code).length === 0) {
            continue;
          }
        }

        let status: any = 'PENDING';
        let earnedScore = 0;
        let passedCount = 0;
        let totalCount = 0;
        let runtimeMs = 0;
        let memoryKb = 0;
        let errorOutput: string | null = null;

        if (question.type === 'MCQ' || question.type === 'OUTPUT_PREDICTION') {
          totalCount = 1;
          if (question.options && question.options.length > 0 && draft.selectedOptionId) {
            const selected = question.options.find((o) => o.id === draft.selectedOptionId);
            if (selected?.isCorrect) {
              status = 'ACCEPTED';
              earnedScore = question.points;
              passedCount = 1;
            } else {
              status = 'WRONG_ANSWER';
              earnedScore = 0;
              passedCount = 0;
            }
          } else if (question.expectedOutput) {
            const userOutput = (draft.code || '').trim().replace(/\r\n/g, '\n');
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
          // Coding or debugging question
          if (draft.code) {
            try {
              const execution = await IsolatedRunner.executeCode(
                draft.language || 'python',
                draft.code,
                question.testCases,
                question.timeLimitMs
              );
              status = execution.overallStatus;
              passedCount = execution.passedTests;
              totalCount = execution.totalTests;
              runtimeMs = execution.runtimeMs;
              memoryKb = execution.memoryKb;
              errorOutput = execution.compilerError || null;
              if (totalCount > 0) {
                earnedScore = Math.round((passedCount / totalCount) * question.points);
              }
            } catch (err: any) {
              status = 'RUNTIME_ERROR';
              errorOutput = err.message || 'Execution failed';
            }
          }
        }

        await prisma.submission.create({
          data: {
            questionId: draft.questionId,
            userId,
            roundId,
            language: draft.language || 'text',
            code: draft.code || draft.selectedOptionId || '',
            status,
            score: earnedScore,
            runtimeMs,
            memoryKb,
            passedTests: passedCount,
            totalTests: totalCount,
            errorOutput,
          },
        });
      }

      // Update total round score on leaderboard
      await ScoringService.updateRoundScore(targetContestId, roundId, userId);
    } catch (saveErr) {
      logger.error('Failed to auto-evaluate drafts during finalization', 'ContestService', {
        userId,
        roundId,
        error: String(saveErr),
      });
    }

    // 4. Mark ParticipantRoundProgress as SUBMITTED & locked
    const now = new Date();
    const progress = await prisma.participantRoundProgress.upsert({
      where: {
        userId_roundId: {
          userId,
          roundId,
        },
      },
      update: {
        status: 'SUBMITTED',
        submittedAt: now,
        lockedAt: now,
      },
      create: {
        userId,
        roundId,
        status: 'SUBMITTED',
        startedAt: now,
        submittedAt: now,
        lockedAt: now,
      },
    });

    // 5. Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actorEmail: actorEmail || 'system@codebreak.dev',
        action:
          reason === 'AUTOMATIC_FULLSCREEN_VIOLATION'
            ? 'AUTO_SUBMIT_FULLSCREEN_VIOLATION'
            : 'FINAL_ROUND_SUBMISSION',
        entity: 'ContestRound',
        entityId: roundId,
        metadata: JSON.stringify({ userId, roundId, reason, finalizedAt: now }),
      },
    });

    logger.security(
      `Round ${roundId} permanently finalized for user ${userId} (${reason})`,
      'ContestService'
    );

    return {
      alreadySubmitted: false,
      status: 'SUBMITTED',
      lockedAt: now,
      submittedAt: now,
      progress,
    };
  }
}
