import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import {
  Award,
  Zap,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Trophy,
} from 'lucide-react';

export const AdminQualification: React.FC = () => {
  const [contest, setContest] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [cutoffCount, setCutoffCount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculationResult, setLastCalculationResult] = useState<any>(null);

  const fetchContestAndLeaderboard = async () => {
    setIsLoading(true);
    try {
      const contestRes = await api.get('/api/contests/current');
      if (contestRes.success && contestRes.data?.contest) {
        setContest(contestRes.data.contest);
        if (contestRes.data.contest.qualificationCutoff) {
          setCutoffCount(contestRes.data.contest.qualificationCutoff);
        }
      }

      const lbRes = await api.get('/api/leaderboard');
      if (lbRes.success && lbRes.data?.entries) {
        setLeaderboard(lbRes.data.entries);
      } else if (lbRes.success && lbRes.data?.leaderboard) {
        setLeaderboard(lbRes.data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to load qualification data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContestAndLeaderboard();
  }, []);

  const handleRunQualification = async () => {
    if (!contest) {
      alert('No active contest found.');
      return;
    }

    if (!window.confirm(`Are you sure you want to promote the Top ${cutoffCount} individual participants to Round 3?`)) {
      return;
    }

    setIsCalculating(true);
    try {
      const res = await api.post('/api/admin/qualification/calculate', {
        contestId: contest.id,
        cutoffCount: Number(cutoffCount),
      });

      if (res.success) {
        setLastCalculationResult(res.data);
        await fetchContestAndLeaderboard();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to calculate qualification');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Award className="w-7 h-7 text-amber-400" />
            Qualification Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated qualification calculation for Round 3 (Grand Finale workstation) based on Round 1 & Round 2 cumulative metrics.
          </p>
        </div>

        <GradientButton
          variant="ghost"
          size="sm"
          onClick={fetchContestAndLeaderboard}
          disabled={isLoading}
          className="border border-purple-500/30"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Standings
        </GradientButton>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="md:col-span-2 border border-purple-500/30 p-6">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Promotion Engine Configuration
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            The qualification engine evaluates cumulative points, total solved problems, and penalty seconds across Round 1 (MCQ & Speed coding) and Round 2 (Code Reconstruction & Debugging). Top performers will be granted access to the Round 3 Workstation.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-purple-500/20">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Round 3 Cutoff Threshold (Top N)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={cutoffCount}
                  onChange={(e) => setCutoffCount(parseInt(e.target.value) || 1)}
                  className="w-28 px-3 py-2 bg-[#0a0c1b] border border-purple-500/30 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-purple-400"
                />
                <span className="text-xs text-slate-400">individual qualifiers</span>
              </div>
            </div>

            <div className="sm:ml-auto w-full sm:w-auto">
              <GradientButton
                size="md"
                onClick={handleRunQualification}
                disabled={isCalculating || !contest}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
                {isCalculating ? 'Computing Standings...' : 'Run Qualification Engine'}
              </GradientButton>
            </div>
          </div>

          {lastCalculationResult && (
            <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                Cutoff updated to Top <strong>{lastCalculationResult.cutoffCount}</strong>! Promoted{' '}
                <strong>{lastCalculationResult.qualifiedIndividualsCount}</strong> individual participant(s).
              </div>
            </div>
          )}
        </GlassCard>

        {/* Current Status Box */}
        <GlassCard className="border border-purple-500/20 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Contest Advancement Status
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-purple-500/15">
                <span className="text-slate-400">Contest Name:</span>
                <span className="font-semibold text-white">{contest?.title || 'Loading...'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-purple-500/15">
                <span className="text-slate-400">Current Cutoff Setting:</span>
                <span className="font-mono text-purple-300 font-bold">Top {contest?.qualificationCutoff || cutoffCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-purple-500/15">
                <span className="text-slate-400">Total Ranked Candidates:</span>
                <span className="font-mono text-white">{leaderboard.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              Once qualified, participants will automatically receive an active "Launch Round 3" button on their Contest Dashboard.
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Standings Table */}
      <GlassCard className="overflow-hidden p-0 border border-purple-500/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-purple-500/20 bg-purple-950/20 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Affiliation / College</th>
                <th className="py-3 px-4">Solved</th>
                <th className="py-3 px-4">Penalty</th>
                <th className="py-3 px-4">Points</th>
                <th className="py-3 px-4 text-right">Advancement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                    Loading current standings...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No participants or submissions found yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, idx) => {
                  const rank = entry.rank || idx + 1;
                  const isCutoff = rank <= (contest?.qualificationCutoff || cutoffCount);
                  const isQualified = entry.isQualified ?? isCutoff;

                  return (
                    <tr
                      key={entry.id || idx}
                      className={`hover:bg-purple-950/20 transition-colors ${
                        isQualified ? 'bg-purple-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            rank === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : rank === 2
                              ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                              : rank === 3
                              ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                              : 'text-slate-400'
                          }`}
                        >
                          #{rank}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {entry.name || entry.user?.profile?.fullName || entry.user?.email || 'Participant'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {entry.code || entry.user?.profile?.participantId || entry.user?.email}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {entry.college || entry.user?.profile?.college || 'University'}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-purple-300">
                        {entry.solvedCount || 0}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {Math.floor((entry.penaltySeconds || 0) / 60)}m {(entry.penaltySeconds || 0) % 60}s
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-white text-sm">
                          {entry.points || 0}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <StatusBadge
                          status={isQualified ? 'success' : 'neutral'}
                          label={isQualified ? 'QUALIFIED FOR R3' : 'BELOW CUTOFF'}
                          size="sm"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
