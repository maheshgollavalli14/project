import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import {
  FileCode,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Cpu,
  User,
  Users,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface SubmissionItem {
  id: string;
  status: string;
  score: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  language: string | null;
  code: string | null;
  errorOutput: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile: {
      fullName: string;
      participantId: string;
    } | null;
  };
  question: {
    id: string;
    title: string;
    points: number;
    type: string;
    round: {
      roundNumber: number;
      title: string;
    };
  };
}

export const AdminSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await api.get(`/api/admin/submissions?${params.toString()}`);
      if (res.success && res.data) {
        setSubmissions(res.data.submissions);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <FileCode className="w-7 h-7 text-purple-400" />
            Submissions Stream
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit log of code executions, test outcomes, runtimes, and verdict statuses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 bg-purple-950/40 border border-purple-500/20 px-3 py-1.5 rounded-lg">
            Total Logs: <strong className="text-white">{totalCount}</strong>
          </span>
          <GradientButton
            variant="ghost"
            size="sm"
            onClick={fetchSubmissions}
            disabled={isLoading}
            className="border border-purple-500/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </GradientButton>
        </div>
      </div>

      {/* Filters Bar */}
      <GlassCard className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by participant name, email, or problem title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-purple-500/20 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-900/60 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="WRONG_ANSWER">WRONG ANSWER</option>
              <option value="TIME_LIMIT_EXCEEDED">TIME LIMIT EXCEEDED</option>
              <option value="COMPILATION_ERROR">COMPILATION ERROR</option>
              <option value="RUNTIME_ERROR">RUNTIME ERROR</option>
            </select>

            <GradientButton type="submit" size="sm">
              Search
            </GradientButton>
          </div>
        </form>
      </GlassCard>

      {/* Submissions Table */}
      <GlassCard className="overflow-hidden p-0 border border-purple-500/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-purple-500/20 bg-purple-950/20 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Problem</th>
                <th className="py-3 px-4">Verdict</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Lang</th>
                <th className="py-3 px-4">Runtime / Mem</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10 text-xs">
              {isLoading && submissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                    Fetching submissions log...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No submissions matching criteria found.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const isAccepted = sub.status === 'ACCEPTED';
                  const dateStr = new Date(sub.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-purple-950/20 transition-colors group"
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <div>
                            <div className="font-semibold text-white">
                              {sub.user.profile?.fullName || 'Individual'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {sub.user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200 line-clamp-1 max-w-[200px]">
                          {sub.question.title}
                        </div>
                        <span className="inline-block text-[10px] text-purple-400 font-mono">
                          R{sub.question.round.roundNumber}: {sub.question.round.title}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={
                            isAccepted
                              ? 'success'
                              : sub.status === 'PENDING'
                              ? 'neutral'
                              : 'error'
                          }
                          label={sub.status}
                          size="sm"
                        />
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold ${
                            sub.score > 0 ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          +{sub.score}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {' '}/ {sub.question.points}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-purple-300 uppercase">
                        {sub.language || 'mcq'}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {sub.runtimeMs != null ? `${sub.runtimeMs}ms` : '—'}
                        {sub.memoryKb != null ? ` / ${Math.round(sub.memoryKb / 1024)}MB` : ''}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          className="p-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 transition-colors"
                          title="View submitted code and trace"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-purple-500/20 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Page <strong className="text-white">{page}</strong> of{' '}
              <strong className="text-white">{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-purple-500/20 text-xs text-slate-300 hover:bg-purple-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-purple-500/20 text-xs text-slate-300 hover:bg-purple-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <GlassCard className="max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-purple-500/40 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
            {/* Modal Header */}
            <div className="p-5 border-b border-purple-500/20 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">
                    Submission Trace #{selectedSubmission.id.slice(0, 8)}
                  </h3>
                  <StatusBadge
                    status={
                      selectedSubmission.status === 'ACCEPTED'
                        ? 'success'
                        : 'error'
                    }
                    label={selectedSubmission.status}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Problem: <span className="text-purple-300 font-semibold">{selectedSubmission.question.title}</span> | Points:{' '}
                  <span className="text-emerald-400 font-mono">+{selectedSubmission.score}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 border border-purple-500/20 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Participant</div>
                  <div className="text-xs font-semibold text-white truncate mt-1">
                    {selectedSubmission.user.profile?.fullName || selectedSubmission.user.email}
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-purple-500/20 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Language</div>
                  <div className="text-xs font-mono font-bold text-purple-400 uppercase mt-1">
                    {selectedSubmission.language || 'MCQ Selection'}
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-purple-500/20 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Execution Time</div>
                  <div className="text-xs font-mono font-semibold text-slate-200 mt-1">
                    {selectedSubmission.runtimeMs != null ? `${selectedSubmission.runtimeMs} ms` : 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-purple-500/20 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Peak Memory</div>
                  <div className="text-xs font-mono font-semibold text-slate-200 mt-1">
                    {selectedSubmission.memoryKb != null ? `${Math.round(selectedSubmission.memoryKb / 1024)} MB` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Code Snippet */}
              {selectedSubmission.code && (
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    Submitted Source Code
                  </div>
                  <pre className="p-4 rounded-xl bg-[#080918] border border-purple-500/20 font-mono text-xs text-slate-200 overflow-x-auto max-h-64 select-text">
                    <code>{selectedSubmission.code}</code>
                  </pre>
                </div>
              )}

              {/* Error Output */}
              {selectedSubmission.errorOutput && (
                <div>
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Runner Output / Stacktrace
                  </div>
                  <pre className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 font-mono text-xs text-rose-300 overflow-x-auto max-h-48 select-text whitespace-pre-wrap">
                    <code>{selectedSubmission.errorOutput}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-purple-500/20 bg-purple-950/20 flex justify-end">
              <GradientButton size="sm" onClick={() => setSelectedSubmission(null)}>
                Close Viewer
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
