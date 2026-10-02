import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

export class QualificationService {
  /**
   * Run qualification engine for Round 1 & Round 2 combined
   */
  static async calculateQualification(contestId: string, cutoffCount: number, actorEmail: string) {
    // Aggregate scores across completed rounds
    const rounds = await prisma.contestRound.findMany({
      where: {
        contestId,
        roundNumber: { in: [1, 2] },
      },
      select: { id: true },
    });

    const roundIds = rounds.map((r) => r.id);

    // Fetch individual scores
    const individualScores = await prisma.score.findMany({
      where: {
        contestId,
        roundId: { in: roundIds },
      },
      include: {
        user: { include: { profile: true } },
      },
      orderBy: [
        { points: 'desc' },
        { solvedCount: 'desc' },
        { penaltySeconds: 'asc' },
      ],
    });

    const updatedIndividuals: string[] = [];

    await prisma.$transaction(async (tx) => {
      // Process individuals
      for (let i = 0; i < individualScores.length; i++) {
        const s = individualScores[i];
        const isQualified = i < cutoffCount;
        await tx.score.update({
          where: { id: s.id },
          data: { isQualified, rank: i + 1 },
        });
        if (isQualified) updatedIndividuals.push(s.userId);
      }

      // Update contest qualification cutoff setting
      await tx.contest.update({
        where: { id: contestId },
        data: { qualificationCutoff: cutoffCount },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: 'ADMIN',
          actorEmail,
          action: 'CALCULATE_QUALIFICATION',
          entity: 'Contest',
          entityId: contestId,
          metadata: JSON.stringify({
            cutoffCount,
            qualifiedIndividuals: updatedIndividuals.length,
          }),
        },
      });
    });

    logger.contest('Qualification calculation published', 'QualificationService', {
      contestId,
      cutoffCount,
      qualifiedIndividualsCount: updatedIndividuals.length,
    });

    return {
      success: true,
      cutoffCount,
      qualifiedIndividualsCount: updatedIndividuals.length,
    };
  }

  /**
   * Evaluates whether a participant is permitted to enter a specific round.
   * Round 1 & Round 2 are open to all registered candidates.
   * Round 3 (Grand Finale) is strictly restricted to Top qualifiers from Rounds 1 & 2!
   */
  static async canUserAccessRound(
    roundNumber: number,
    contestId: string,
    userId: string,
    userRole?: string
  ): Promise<{ allowed: boolean; reason?: string; cutoff?: number }> {
    // Admins always have director access
    if (userRole === 'ADMIN') {
      return { allowed: true };
    }

    // Round 1 and Round 2 are open to all participants
    if (roundNumber !== 3) {
      return { allowed: true };
    }

    // For Round 3 (Grand Finale), enforce qualification cutoff!
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { qualificationCutoff: true },
    });

    const cutoff = contest?.qualificationCutoff || 20;

    // Check if qualification has been published in this contest
    const totalQualifiedInContest = await prisma.score.count({
      where: { contestId, isQualified: true },
    });

    if (totalQualifiedInContest === 0) {
      // Qualification has not been computed yet by the admin
      return {
        allowed: false,
        reason: `Round 3 is locked pending qualification calculation. The director has not yet published the Top ${cutoff} qualifiers from Rounds 1 & 2.`,
        cutoff,
      };
    }

    // Check if this specific user is marked as qualified
    const qualifiedScore = await prisma.score.findFirst({
      where: {
        contestId,
        userId,
        isQualified: true,
      },
    });

    if (!qualifiedScore) {
      return {
        allowed: false,
        reason: `Access Denied: Round 3 (Grand Finale) is strictly restricted to the Top ${cutoff} qualifiers. Your score in Rounds 1 & 2 did not meet the advancement threshold.`,
        cutoff,
      };
    }

    return { allowed: true, cutoff };
  }
}
