import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { ScoringService } from '../services/scoring.service.js';

export class LeaderboardController {
  static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { contestId, roundId, type } = req.query;

      // Find active contest if not specified
      let cId = contestId as string;
      if (!cId) {
        const activeContest = await prisma.contest.findFirst({
          where: { status: { in: ['ACTIVE', 'COMPLETED', 'UPCOMING'] } },
        });
        cId = activeContest?.id || '';
      }

      if (!cId) {
        res.status(404).json({ success: false, message: 'No contest found', code: 'NOT_FOUND' });
        return;
      }

      const isTeam = type === 'TEAM';
      const leaderboard = await ScoringService.getLeaderboard(
        cId,
        roundId as string | undefined,
        isTeam
      );

      // Check if leaderboard is currently frozen
      const frozenSetting = await prisma.contestSetting.findUnique({
        where: { key: 'LEADERBOARD_FROZEN' },
      });
      const isFrozen = frozenSetting?.value === 'true';

      res.status(200).json({
        success: true,
        data: {
          contestId: cId,
          isFrozen,
          type: isTeam ? 'TEAM' : 'INDIVIDUAL',
          entries: leaderboard,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
