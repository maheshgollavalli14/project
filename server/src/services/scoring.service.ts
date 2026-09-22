import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

export class ScoringService {
  /**
   * Recalculates and updates the score record for a user or team in a given round
   */
  static async updateRoundScore(
    contestId: string,
    roundId: string,
    userId?: string | null,
    teamId?: string | null
  ) {
    if (!userId && !teamId) return null;

    // Get all accepted/best submissions for this user/team in this round
    const submissions = await prisma.submission.findMany({
      where: {
        roundId,
        ...(teamId ? { teamId } : { userId: userId! }),
      },
      include: {
        question: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by question to find best score per question
    const bestPerQuestion = new Map<string, { score: number; solved: boolean; firstSolvedTime?: Date }>();

    for (const sub of submissions) {
      const existing = bestPerQuestion.get(sub.questionId);
      const isSolved = sub.status === 'ACCEPTED';

      if (!existing) {
        bestPerQuestion.set(sub.questionId, {
          score: sub.score,
          solved: isSolved,
          firstSolvedTime: isSolved ? sub.createdAt : undefined,
        });
      } else {
        if (sub.score > existing.score) {
          existing.score = sub.score;
        }
        if (isSolved && !existing.solved) {
          existing.solved = true;
          existing.firstSolvedTime = sub.createdAt;
        }
      }
    }

    let totalPoints = 0;
    let solvedCount = 0;
    let penaltySeconds = 0;

    // Fetch round start time for penalty calculation
    const round = await prisma.contestRound.findUnique({
      where: { id: roundId },
    });
    const roundStartTime = round?.startTime ? new Date(round.startTime).getTime() : Date.now();

    for (const [, stats] of bestPerQuestion) {
      totalPoints += stats.score;
      if (stats.solved) {
        solvedCount += 1;
        if (stats.firstSolvedTime) {
          const seconds = Math.max(0, Math.floor((stats.firstSolvedTime.getTime() - roundStartTime) / 1000));
          penaltySeconds += seconds;
        }
      }
    }

    // Upsert Score record
    const score = await prisma.score.upsert({
      where: teamId
        ? { contestId_roundId_teamId: { contestId, roundId, teamId } }
        : { contestId_roundId_userId: { contestId, roundId, userId: userId! } },
      update: {
        points: totalPoints,
        solvedCount,
        penaltySeconds,
      },
      create: {
        contestId,
        roundId,
        userId: userId || null,
        teamId: teamId || null,
        points: totalPoints,
        solvedCount,
        penaltySeconds,
      },
    });

    logger.contest('Score updated', 'ScoringService', {
      roundId,
      userId,
      teamId,
      totalPoints,
      solvedCount,
      penaltySeconds,
    });

    return score;
  }

  /**
   * Get leaderboard rankings based on configurable tie-breaking
   */
  static async getLeaderboard(contestId: string, roundId?: string, isTeamTab = false) {
    const scores = await prisma.score.findMany({
      where: {
        contestId,
        ...(roundId ? { roundId } : {}),
        ...(isTeamTab ? { teamId: { not: null } } : { teamId: null, userId: { not: null } }),
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        team: {
          include: {
            members: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
      // Tie-breaking order: 1. Total points (DESC), 2. Solved count (DESC), 3. Penalty seconds (ASC)
      orderBy: [
        { points: 'desc' },
        { solvedCount: 'desc' },
        { penaltySeconds: 'asc' },
      ],
    });

    return scores.map((s, index) => ({
      rank: index + 1,
      id: isTeamTab ? s.teamId! : s.userId!,
      name: isTeamTab ? s.team?.name || 'Unnamed Team' : s.user?.profile?.fullName || 'Anonymous',
      code: isTeamTab ? s.team?.teamId || 'TEAM' : s.user?.profile?.participantId || 'IND',
      college: isTeamTab ? s.team?.college || 'College' : s.user?.profile?.college || 'College',
      type: isTeamTab ? 'TEAM' : 'INDIVIDUAL',
      solvedCount: s.solvedCount,
      points: s.points,
      penaltySeconds: s.penaltySeconds,
      isQualified: s.isQualified,
    }));
  }
}
