import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Submission } from '../types/index.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Terminal, Clock, FileCode, Award, CheckCircle } from 'lucide-react';

export const Submissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSubmissions() {
      try {
        const res = await api.get('/api/submissions');
        if (res.success && res.data?.submissions) {
          setSubmissions(res.data.submissions);
        }
      } catch (e) {
        console.error('Failed to load submissions:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSubmissions();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Submission History</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review your test outcomes, runtime, and scoring breakdowns across all contest rounds.
        </p>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090b1c] border-b border-purple-500/15 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Problem</th>
                <th className="py-3.5 px-6">Language</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Runtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Loading submission records...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No submissions recorded yet. Enter a round to submit your first solution.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-purple-950/20 transition-colors">
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-400">
                      {new Date(s.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      {s.question?.title || 'Contest Problem'}
                    </td>
                    <td className="py-4 px-6 font-mono uppercase text-purple-300">
                      {s.language}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-slate-400">
                      {s.runtimeMs ? `${s.runtimeMs}ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
