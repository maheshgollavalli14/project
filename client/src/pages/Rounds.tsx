import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { ContestRound } from '../types/index.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Clock, Terminal } from 'lucide-react';

export const Rounds: React.FC = () => {
  const [rounds, setRounds] = useState<ContestRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRounds() {
      try {
        const res = await api.get('/api/contests/current');
        if (res.success && res.data?.contest?.rounds) {
          setRounds(res.data.contest.rounds);
        }
      } catch (e) {
        console.error('Failed to load rounds:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadRounds();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-mono mb-4">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span>Contest Stages & Progression</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
          The 3 Championship Rounds
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Each round is crafted to evaluate distinct facets of software engineering: conceptual agility, code comprehension, debugging under pressure, and advanced algorithmic design.
        </p>
      </div>

      {/* 3 Rounds List */}
      <div className="space-y-8">
        {/* Round 1 */}
        <GlassCard className="border-purple-500/30 p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-500/15">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-mono font-bold text-xl">
                01
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-purple-400">
                  Sprint Phase
                </span>
                <h3 className="text-2xl font-bold text-white">
                  Round 1: Rapid Code & Logic Sprint
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={rounds[0]?.status || 'ACTIVE'} />
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#141635] rounded-xl text-xs font-mono text-purple-200 border border-purple-500/20">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{rounds[0]?.durationMinutes || 45} Minutes</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-purple-300 font-bold uppercase tracking-wider block">Question Types</span>
              <p>Technical MCQs, Output Prediction on scope/mutability, and initial rapid coding puzzles.</p>
            </div>
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-purple-300 font-bold uppercase tracking-wider block">Evaluation & Points</span>
              <p>50 Max Points. Immediate verification for MCQs, isolated runner tests for coding challenges.</p>
            </div>
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-purple-300 font-bold uppercase tracking-wider block">Qualification Factor</span>
              <p>Top performers earn seeding priority and score carry-over into Round 2 qualification.</p>
            </div>
          </div>
        </GlassCard>

        {/* Round 2 */}
        <GlassCard className="border-purple-500/30 p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-500/15">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-mono font-bold text-xl">
                02
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-400">
                  Engineering Phase
                </span>
                <h3 className="text-2xl font-bold text-white">
                  Round 2: Jumbled Code & Debugging Arena
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={rounds[1]?.status || 'UPCOMING'} />
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#141635] rounded-xl text-xs font-mono text-purple-200 border border-purple-500/20">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{rounds[1]?.durationMinutes || 60} Minutes</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-indigo-300 font-bold uppercase tracking-wider block">Question Types</span>
              <p>Repair buggy algorithms (off-by-one, recursion overflows) and unscramble scrambled blocks of code.</p>
            </div>
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-indigo-300 font-bold uppercase tracking-wider block">Evaluation & Points</span>
              <p>65 Max Points. Scored against edge test cases with hidden stress parameters.</p>
            </div>
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-indigo-300 font-bold uppercase tracking-wider block">The Cutoff Threshold</span>
              <p>Combined score from R1 + R2 determines Top 20 / 30 participants who qualify for Round 3.</p>
            </div>
          </div>
        </GlassCard>

        {/* Round 3 */}
        <GlassCard className="border-purple-500/30 p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-500/15">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-mono font-bold text-xl">
                03
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-purple-400">
                  Grand Finale
                </span>
                <h3 className="text-2xl font-bold text-white">
                  Round 3: Grand Competitive Finale
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={rounds[2]?.status || 'UPCOMING'} />
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#141635] rounded-xl text-xs font-mono text-purple-200 border border-purple-500/20">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{rounds[2]?.durationMinutes || 90} Minutes</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-purple-300 font-bold uppercase tracking-wider block">Question Types</span>
              <p>Full competitive programming problems (DP, Graph algorithms, Advanced Data Structures).</p>
            </div>
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-purple-300 font-bold uppercase tracking-wider block">Evaluation & Points</span>
              <p>125 Max Points. Hidden suites test strict runtime, memory footprint, and algorithmic complexity.</p>
            </div>
            <div className="bg-[#12142f] p-4 rounded-xl border border-purple-500/15 space-y-2">
              <span className="text-purple-300 font-bold uppercase tracking-wider block">The Champion’s Podium</span>
              <p>Authoritative tie-breaking on points, solves, and elapsed penalty seconds crowns the winner.</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
