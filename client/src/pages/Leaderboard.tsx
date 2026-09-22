import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { LeaderboardEntry } from '../types/index.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Trophy, Users, User, Clock, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/api/leaderboard?type=${activeTab}`);
      if (res.success && res.data) {
        setEntries(res.data.entries || []);
        setIsFrozen(res.data.isFrozen || false);
      }
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-mono mb-4">
          <Trophy className="w-3.5 h-3.5 text-purple-400" />
          <span>Hall of Fame & Live Standings</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
          Leaderboard
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          Real-time score rankings calculated authoritatively on points, solved counts, and submission penalty times.
        </p>

        {isFrozen && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-mono">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <span>Leaderboard is currently frozen during final contest phase.</span>
          </div>
        )}
      </div>

      {/* Tabs & Refresh */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-[#0d0f22] p-1.5 rounded-2xl border border-purple-500/20">
          <button
            onClick={() => setActiveTab('INDIVIDUAL')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'INDIVIDUAL'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Individuals</span>
          </button>

          <button
            onClick={() => setActiveTab('TEAM')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'TEAM'
                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teams (2-Member)</span>
          </button>
        </div>

        <button
          onClick={fetchLeaderboard}
          className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-white px-3 py-1.5 rounded-xl bg-[#12142d] border border-purple-500/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Standings</span>
        </button>
      </div>

      {/* Leaderboard Table Card */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090b1c] border-b border-purple-500/15 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Rank</th>
                <th className="py-3.5 px-6">{activeTab === 'TEAM' ? 'Team Name' : 'Participant'}</th>
                <th className="py-3.5 px-6">College</th>
                <th className="py-3.5 px-6 text-center">Solved</th>
                <th className="py-3.5 px-6 text-right">Points</th>
                <th className="py-3.5 px-6 text-right">Penalty</th>
                <th className="py-3.5 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {isLoading && entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading standings...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No submissions recorded yet for this track.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isTop3 = entry.rank <= 3;
                  const rankBadgeColor =
                    entry.rank === 1
                      ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                      : entry.rank === 2
                      ? 'text-slate-300 bg-slate-300/10 border-slate-300/30'
                      : entry.rank === 3
                      ? 'text-amber-600 bg-amber-600/10 border-amber-600/30'
                      : 'text-slate-400';

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-purple-950/20 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-4 px-6 font-mono font-bold">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs border ${rankBadgeColor}`}
                        >
                          {entry.rank}
                        </div>
                      </td>

                      {/* Name & Code */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-white group-hover:text-purple-300 transition-colors">
                          {entry.name}
                        </div>
                        <div className="text-[10px] font-mono text-purple-400/80">
                          {entry.code}
                        </div>
                      </td>

                      {/* College */}
                      <td className="py-4 px-6 text-slate-300">
                        {entry.college}
                      </td>

                      {/* Solved */}
                      <td className="py-4 px-6 text-center font-mono font-semibold text-emerald-400">
                        {entry.solvedCount}
                      </td>

                      {/* Points */}
                      <td className="py-4 px-6 text-right font-mono font-bold text-white text-sm">
                        {entry.points}
                      </td>

                      {/* Penalty */}
                      <td className="py-4 px-6 text-right font-mono text-slate-400">
                        {entry.penaltySeconds}s
                      </td>

                      {/* Qualification Status */}
                      <td className="py-4 px-6 text-center">
                        {entry.isQualified ? (
                          <StatusBadge status="QUALIFIED" size="sm" />
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            Pending
                          </span>
                        )}
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
