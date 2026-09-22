import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore.js';
import { api } from '../services/api.js';
import { Contest, ContestRound, Score } from '../types/index.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { GradientButton } from '../components/ui/GradientButton.js';
import {
  Terminal,
  Trophy,
  Clock,
  Award,
  Users,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [contest, setContest] = useState<Contest | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [userQualification, setUserQualification] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [contestRes, userRes] = await Promise.all([
          api.get('/api/contests/current'),
          api.get('/api/auth/me'),
        ]);

        if (contestRes.success && contestRes.data?.contest) {
          setContest(contestRes.data.contest);
          if (contestRes.data.userQualification) {
            setUserQualification(contestRes.data.userQualification);
          }
        }
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const activeRound = contest?.rounds?.find((r) => r.status === 'ACTIVE');
  const isTeam = user?.role === 'TEAM_MEMBER' || user?.profile?.participation === 'TEAM';
  const isAdmin = user?.role === 'ADMIN';

  // Can the current user enter Round 3?
  const canEnterRound3 = isAdmin || userQualification?.canAccessRound3;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Welcome Hero Card */}
      <GlassCard glow className="p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-900/40 text-purple-300 border border-purple-500/30">
                {isTeam ? 'Team Track' : 'Individual Track'}
              </span>
              <span className="text-xs font-mono text-purple-400">
                {user?.profile?.participantId || user?.teamMember?.teamId || 'CB-PARTICIPANT'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Welcome, {user?.profile?.fullName || user?.email.split('@')[0]}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {user?.profile?.college} {isTeam && user?.teamMember?.team?.name && `• Team ${user.teamMember.team.name}`}
            </p>
          </div>

          {/* Hero Quick Action Button: Strictly enables ONLY the active round */}
          {activeRound ? (
            activeRound.isFinalized ? (
              <Link to={`/contest/round-${activeRound.roundNumber}`}>
                <div className="px-6 py-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2 text-emerald-300 font-mono font-bold text-sm shadow-lg shadow-emerald-950/50 hover:bg-emerald-900/60 transition-colors">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Round {activeRound.roundNumber} Finalized &amp; Submitted</span>
                </div>
              </Link>
            ) : activeRound.roundNumber === 3 ? (
              canEnterRound3 ? (
                <Link to="/contest/round-3">
                  <GradientButton size="lg" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                    Enter Round 3 (Grand Finale)
                  </GradientButton>
                </Link>
              ) : (
                <div className="px-5 py-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center">
                  <span className="block text-xs font-mono font-bold text-rose-300">Round 3 Live • Eliminated</span>
                  <span className="text-[11px] text-slate-300">Cutoff restricted to Top {userQualification?.cutoff || 20}</span>
                </div>
              )
            ) : (
              <Link to={`/contest/round-${activeRound.roundNumber}`}>
                <GradientButton size="lg" leftIcon={<Play className="w-4 h-4 fill-white" />}>
                  Enter Round {activeRound.roundNumber} Arena
                </GradientButton>
              </Link>
            )
          ) : (
            <div className="px-5 py-3 rounded-2xl bg-[#141635] border border-purple-500/20 text-center">
              <span className="block text-xs font-mono text-slate-400">Contest State</span>
              <span className="text-sm font-bold text-purple-300">Awaiting Next Round</span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <GlassCard className="p-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Current Round</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white font-mono">
              {activeRound ? `Round ${activeRound.roundNumber}` : 'Interval'}
            </span>
            <StatusBadge status={activeRound?.status || 'UPCOMING'} size="sm" />
          </div>
          <p className="text-[11px] text-slate-400">{activeRound?.title || 'Next round scheduled soon'}</p>
        </GlassCard>

        {/* Metric 2 */}
        <GlassCard className="p-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Points</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white font-mono">
              {scores.reduce((acc, s) => acc + s.points, 0)}
            </span>
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-[11px] text-slate-400">Across completed & active rounds</p>
        </GlassCard>

        {/* Metric 3 */}
        <GlassCard className="p-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Solved Problems</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white font-mono">
              {scores.reduce((acc, s) => acc + s.solvedCount, 0)}
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-400">Accepted test suite submissions</p>
        </GlassCard>

        {/* Metric 4: Qualification Status */}
        <GlassCard className="p-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Qualification Status</span>
          <div className="flex items-center justify-between">
            {userQualification?.isQualified ? (
              <StatusBadge status="QUALIFIED" size="sm" />
            ) : userQualification && !userQualification.canAccessRound3 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-500/40">
                BELOW CUTOFF
              </span>
            ) : (
              <StatusBadge status="PENDING" size="sm" />
            )}
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-[11px] text-slate-400">
            {userQualification?.isQualified
              ? `Qualified for Round 3 (Top ${userQualification.cutoff})`
              : userQualification && !userQualification.canAccessRound3
              ? `Below Top ${userQualification.cutoff} Advancement Cutoff`
              : 'Evaluated across Rounds 1 & 2'}
          </p>
        </GlassCard>
      </div>

      {/* Championship Timeline: Authoritative Single Active Round Gating */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          <span>Championship Timetable & Arena Access</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contest?.rounds?.map((r) => {
            const isRoundActive = r.status === 'ACTIVE';
            const isRoundCompleted = r.status === 'COMPLETED';
            const isRoundUpcoming = r.status === 'UPCOMING';
            const isR3 = r.roundNumber === 3;

            return (
              <GlassCard
                key={r.id}
                className={`p-6 space-y-4 flex flex-col justify-between transition-all ${
                  isRoundActive
                    ? 'border-purple-500/60 bg-[#141738]/90 shadow-[0_0_30px_rgba(139,92,246,0.3)]'
                    : isRoundCompleted
                    ? 'border-slate-800/60 opacity-80'
                    : 'border-purple-500/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                      Round {r.roundNumber}
                    </span>
                    <StatusBadge status={r.status} size="sm" />
                  </div>

                  <h3 className="text-lg font-bold text-white">{r.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.description}</p>
                </div>

                <div className="pt-3 border-t border-purple-500/15 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Duration: {r.durationMinutes}m</span>
                    {r.startTime && (
                      <span>
                        {new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {r.endTime && ` - ${new Date(r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    )}
                  </div>

                  {/* Single Round Action Gate */}
                  {isR3 ? (
                    // Round 3 (Grand Finale) checks qualification
                    isRoundActive ? (
                      r.isFinalized ? (
                        <Link to="/contest/round-3" className="block w-full">
                          <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300 flex items-center justify-center gap-1.5 hover:bg-emerald-900/40 transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Submitted &amp; Finalized</span>
                          </div>
                        </Link>
                      ) : canEnterRound3 ? (
                        <Link to="/contest/round-3" className="block w-full">
                          <GradientButton
                            size="sm"
                            variant="primary"
                            className="w-full justify-center"
                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          >
                            Enter Grand Finale
                          </GradientButton>
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs font-semibold text-rose-300 cursor-not-allowed text-center"
                        >
                          Eliminated • Below Top {userQualification?.cutoff || 20} Cutoff
                        </button>
                      )
                    ) : isRoundCompleted ? (
                      <button
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-[#101228] border border-slate-700/40 text-xs text-slate-500 cursor-not-allowed text-center"
                      >
                        Round Concluded
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-[#101228] border border-purple-500/20 text-xs text-slate-400 cursor-not-allowed text-center"
                      >
                        Opens at {r.startTime ? new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled Window'}
                      </button>
                    )
                  ) : (
                    // Round 1 & Round 2
                    isRoundActive ? (
                      r.isFinalized ? (
                        <Link to={`/contest/round-${r.roundNumber}`} className="block w-full">
                          <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300 flex items-center justify-center gap-1.5 hover:bg-emerald-900/40 transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Submitted &amp; Finalized</span>
                          </div>
                        </Link>
                      ) : (
                        <Link to={`/contest/round-${r.roundNumber}`} className="block w-full">
                          <GradientButton
                            size="sm"
                            variant="primary"
                            className="w-full justify-center"
                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          >
                            Enter Arena
                          </GradientButton>
                        </Link>
                      )
                    ) : isRoundCompleted ? (
                      <button
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-[#101228] border border-slate-700/40 text-xs text-slate-500 cursor-not-allowed text-center"
                      >
                        Round Concluded
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-[#101228] border border-purple-500/20 text-xs text-slate-400 cursor-not-allowed text-center"
                      >
                        Opens at {r.startTime ? new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled Window'}
                      </button>
                    )
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};
