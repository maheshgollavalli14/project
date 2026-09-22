import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import {
  Users,
  UserCheck,
  Award,
  FileCode,
  AlertTriangle,
  CreditCard,
  Play,
  Square,
  Clock,
  Sparkles,
  RefreshCw,
  Calendar,
  Save,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

const toLocalISOString = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  const localTime = new Date(d.getTime() - tzOffset);
  return localTime.toISOString().slice(0, 16);
};

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roundActionLoading, setRoundActionLoading] = useState(false);
  const [schedules, setSchedules] = useState<{ [roundId: string]: { startTime: string; endTime: string } }>({});
  const [serverTimeDisplay, setServerTimeDisplay] = useState<string>('');

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/admin/dashboard');
      if (res.success && res.data?.metrics) {
        setMetrics(res.data.metrics);

        // Prepopulate editable schedules for each round
        if (res.data.metrics.contest?.rounds) {
          const scheds: any = {};
          res.data.metrics.contest.rounds.forEach((r: any) => {
            scheds[r.id] = {
              startTime: toLocalISOString(r.startTime),
              endTime: toLocalISOString(r.endTime),
            };
          });
          setSchedules(scheds);
        }

        if (res.data.metrics.serverTime) {
          setServerTimeDisplay(new Date(res.data.metrics.serverTime).toLocaleTimeString());
        }
      }
    } catch (e) {
      console.error('Failed to load admin metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => {
      setServerTimeDisplay(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleScheduleChange = (roundId: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedules((prev) => ({
      ...prev,
      [roundId]: {
        ...prev[roundId],
        [field]: value,
      },
    }));
  };

  const handleSaveSchedule = async (roundId: string, roundNumber: number) => {
    const sched = schedules[roundId];
    if (!sched?.startTime || !sched?.endTime) {
      alert('Please specify both Start Time and End Time.');
      return;
    }

    const start = new Date(sched.startTime);
    const end = new Date(sched.endTime);

    if (end.getTime() <= start.getTime()) {
      alert('End Time must be after Start Time.');
      return;
    }

    setRoundActionLoading(true);
    try {
      const res = await api.post('/api/admin/contest/schedule-round', {
        roundId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      if (res.success) {
        await fetchMetrics();
      }
    } catch (e: any) {
      alert(e.message || `Failed to update Round ${roundNumber} schedule`);
    } finally {
      setRoundActionLoading(false);
    }
  };

  // Quick Preset: Sets up realistic sequence (R1 completed, R2 active now, R3 upcoming)
  const handleApplyPresetActiveRound2 = async () => {
    if (!metrics?.contest?.rounds || metrics.contest.rounds.length < 3) return;
    const rounds = metrics.contest.rounds;
    const r1 = rounds.find((r: any) => r.roundNumber === 1);
    const r2 = rounds.find((r: any) => r.roundNumber === 2);
    const r3 = rounds.find((r: any) => r.roundNumber === 3);

    const now = new Date();
    // Round 1: Past (ended 15 mins ago)
    const r1Start = new Date(now.getTime() - 60 * 60 * 1000);
    const r1End = new Date(now.getTime() - 15 * 60 * 1000);

    // Round 2: Active (started 10 mins ago, ends in 50 mins)
    const r2Start = new Date(now.getTime() - 10 * 60 * 1000);
    const r2End = new Date(now.getTime() + 50 * 60 * 1000);

    // Round 3: Upcoming (starts in 60 mins, ends in 135 mins)
    const r3Start = new Date(now.getTime() + 60 * 60 * 1000);
    const r3End = new Date(now.getTime() + 135 * 60 * 1000);

    setRoundActionLoading(true);
    try {
      await api.post('/api/admin/contest/schedule-all-rounds', {
        rounds: [
          { roundId: r1.id, startTime: r1Start.toISOString(), endTime: r1End.toISOString() },
          { roundId: r2.id, startTime: r2Start.toISOString(), endTime: r2End.toISOString() },
          { roundId: r3.id, startTime: r3Start.toISOString(), endTime: r3End.toISOString() },
        ],
      });
      await fetchMetrics();
    } catch (e: any) {
      alert(e.message || 'Failed to apply preset');
    } finally {
      setRoundActionLoading(false);
    }
  };

  // Quick Preset: Sets Round 3 active now (for final testing)
  const handleApplyPresetActiveRound3 = async () => {
    if (!metrics?.contest?.rounds || metrics.contest.rounds.length < 3) return;
    const rounds = metrics.contest.rounds;
    const r1 = rounds.find((r: any) => r.roundNumber === 1);
    const r2 = rounds.find((r: any) => r.roundNumber === 2);
    const r3 = rounds.find((r: any) => r.roundNumber === 3);

    const now = new Date();
    const r1Start = new Date(now.getTime() - 120 * 60 * 1000);
    const r1End = new Date(now.getTime() - 75 * 60 * 1000);
    const r2Start = new Date(now.getTime() - 65 * 60 * 1000);
    const r2End = new Date(now.getTime() - 5 * 60 * 1000);
    const r3Start = new Date(now.getTime() - 2 * 60 * 1000);
    const r3End = new Date(now.getTime() + 70 * 60 * 1000);

    setRoundActionLoading(true);
    try {
      await api.post('/api/admin/contest/schedule-all-rounds', {
        rounds: [
          { roundId: r1.id, startTime: r1Start.toISOString(), endTime: r1End.toISOString() },
          { roundId: r2.id, startTime: r2Start.toISOString(), endTime: r2End.toISOString() },
          { roundId: r3.id, startTime: r3Start.toISOString(), endTime: r3End.toISOString() },
        ],
      });
      await fetchMetrics();
    } catch (e: any) {
      alert(e.message || 'Failed to apply preset');
    } finally {
      setRoundActionLoading(false);
    }
  };

  const handleStartRound = async (roundId: string) => {
    setRoundActionLoading(true);
    try {
      await api.post('/api/admin/contest/start-round', { roundId, durationMinutes: 45 });
      await fetchMetrics();
    } catch (e: any) {
      alert(e.message || 'Failed to start round');
    } finally {
      setRoundActionLoading(false);
    }
  };

  const handleEndRound = async (roundId: string) => {
    if (!window.confirm('Are you sure you want to end this round? All locks will be released and submissions closed.')) return;
    setRoundActionLoading(true);
    try {
      await api.post('/api/admin/contest/end-round', { roundId });
      await fetchMetrics();
    } catch (e: any) {
      alert(e.message || 'Failed to end round');
    } finally {
      setRoundActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Contest Director Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, authoritative round timetable manager, and contest controls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span className="text-xs font-mono text-purple-200">
              Clock: <strong>{serverTimeDisplay || 'Syncing...'}</strong>
            </span>
          </div>
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-[#12142d] border border-purple-500/20 rounded-xl text-xs text-purple-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Participants</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-white font-mono">{metrics?.totalUsers || 0}</span>
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {metrics?.totalIndividuals || 0} solo • {metrics?.totalTeams || 0} {metrics?.totalTeams === 1 ? 'team' : 'teams'} ({metrics?.totalTeamMembers || 0} {metrics?.totalTeamMembers === 1 ? 'member' : 'members'})
          </p>
        </GlassCard>

        <GlassCard className="p-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Submissions Stream</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-white font-mono">{metrics?.totalSubmissions || 0}</span>
            <FileCode className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-[11px] text-emerald-400">
            {metrics?.solvedSubmissionsCount || 0} Accepted Solutions
          </p>
        </GlassCard>

        <GlassCard className="p-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Payments</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-white font-mono">₹{metrics?.revenue || 0}</span>
            <CreditCard className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-400">Collected registration fees</p>
        </GlassCard>

        <GlassCard className="p-6 space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Integrity Violations</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-rose-400 font-mono">{metrics?.totalViolations || 0}</span>
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <p className="text-[11px] text-slate-400">Logged browser focus violations</p>
        </GlassCard>
      </div>

      {/* Round Scheduling & Gating Manager */}
      <GlassCard className="p-8 space-y-6 border border-purple-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span>Round Schedule & Gating Matrix</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure explicit start and end times. The server authoritative timer ensures <strong>only the round matching current server clock</strong> is open for exam entry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApplyPresetActiveRound2}
              disabled={roundActionLoading}
              className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-[11px] font-semibold text-indigo-300 transition-colors"
            >
              Preset: Test Round 2 Active
            </button>
            <button
              onClick={handleApplyPresetActiveRound3}
              disabled={roundActionLoading}
              className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-[11px] font-semibold text-amber-300 transition-colors"
            >
              Preset: Test Round 3 Active
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics?.contest?.rounds?.map((r: any) => {
            const isRoundActive = r.status === 'ACTIVE';
            const isRoundCompleted = r.status === 'COMPLETED';
            const sched = schedules[r.id] || { startTime: '', endTime: '' };

            let durationDisplay = r.durationMinutes;
            if (sched.startTime && sched.endTime) {
              const diffMins = Math.round((new Date(sched.endTime).getTime() - new Date(sched.startTime).getTime()) / 60000);
              if (diffMins > 0) durationDisplay = diffMins;
            }

            return (
              <div
                key={r.id}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                  isRoundActive
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_25px_rgba(139,92,246,0.3)]'
                    : isRoundCompleted
                    ? 'bg-[#0d0f22]/70 border-slate-700/40 opacity-90'
                    : 'bg-[#101228] border-purple-500/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
                      Round {r.roundNumber}
                    </span>
                    <StatusBadge status={r.status} size="sm" />
                  </div>

                  <h4 className="text-base font-bold text-white mb-1">{r.title}</h4>
                  <p className="text-[11px] text-slate-400 mb-4">{r.description}</p>

                  {/* Date/Time Pickers */}
                  <div className="space-y-3 bg-[#0a0c1b]/70 p-3 rounded-xl border border-purple-500/15 mb-4">
                    <div>
                      <label className="text-[10px] font-semibold uppercase font-mono text-slate-400 block mb-1">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={sched.startTime}
                        onChange={(e) => handleScheduleChange(r.id, 'startTime', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#141630] border border-purple-500/30 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold uppercase font-mono text-slate-400 block mb-1">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={sched.endTime}
                        onChange={(e) => handleScheduleChange(r.id, 'endTime', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#141630] border border-purple-500/30 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
                      <span>Duration:</span>
                      <span className="text-purple-300 font-bold">{durationDisplay} mins</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="space-y-2 pt-2 border-t border-purple-500/15">
                  <GradientButton
                    size="sm"
                    variant="primary"
                    onClick={() => handleSaveSchedule(r.id, r.roundNumber)}
                    isLoading={roundActionLoading}
                    className="w-full justify-center"
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save Schedule
                  </GradientButton>

                  <div className="flex items-center gap-2">
                    {isRoundActive ? (
                      <GradientButton
                        size="sm"
                        variant="danger"
                        onClick={() => handleEndRound(r.id)}
                        isLoading={roundActionLoading}
                        className="w-full justify-center text-[11px]"
                        leftIcon={<Square className="w-3 h-3 fill-white" />}
                      >
                        Force End
                      </GradientButton>
                    ) : (
                      <GradientButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStartRound(r.id)}
                        isLoading={roundActionLoading}
                        className="w-full justify-center text-[11px]"
                        leftIcon={<Play className="w-3 h-3 fill-current" />}
                      >
                        Force Start
                      </GradientButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};
