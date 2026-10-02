import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  CheckCircle,
  Eye,
  RefreshCw,
  Clock,
  User,
  Users,
  Check,
  X,
  FileWarning,
  Maximize2,
  Copy,
  Scissors,
  MousePointer,
  Keyboard,
  Compass,
  AlertOctagon,
} from 'lucide-react';

interface ViolationItem {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: string | null;
  reviewed: boolean;
  adminNote: string | null;
  createdAt: string;
  user: {
    email: string;
    profile: {
      fullName: string;
      participantId: string;
      college: string;
    } | null;
  };
}

export const AdminViolations: React.FC = () => {
  const [violations, setViolations] = useState<ViolationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterReviewed, setFilterReviewed] = useState('');
  const [search, setSearch] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<ViolationItem | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchViolations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/violations');
      if (res.success && res.data?.violations) {
        setViolations(res.data.violations);
      }
    } catch (err) {
      console.error('Failed to load violations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleReviewSubmit = async (reviewed: boolean) => {
    if (!selectedViolation) return;
    setIsUpdating(true);
    try {
      const res = await api.patch(`/api/admin/violations/${selectedViolation.id}`, {
        reviewed,
        adminNote: adminNoteInput,
      });

      if (res.success) {
        setViolations((prev) =>
          prev.map((v) =>
            v.id === selectedViolation.id
              ? { ...v, reviewed, adminNote: adminNoteInput }
              : v
          )
        );
        setSelectedViolation(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update violation review');
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = violations.filter((v) => {
    if (filterType && v.type !== filterType) return false;
    if (filterSeverity && v.severity !== filterSeverity) return false;
    if (filterReviewed === 'true' && !v.reviewed) return false;
    if (filterReviewed === 'false' && v.reviewed) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchEmail = v.user?.email?.toLowerCase().includes(q);
      const matchName = v.user?.profile?.fullName?.toLowerCase().includes(q);
      const matchId = v.user?.profile?.participantId?.toLowerCase().includes(q);
      return matchEmail || matchName || matchId;
    }

    return true;
  });

  const pendingCount = violations.filter((v) => !v.reviewed).length;
  const criticalCount = violations.filter((v) => v.severity === 'CRITICAL' || v.severity === 'HIGH').length;

  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-rose-400" />
            Integrity & Anti-Cheat Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit log of security events: tab switching, fullscreen departures, devtools detection, and unauthorized pastes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 font-bold">
            Pending Actions: {pendingCount}
          </span>
          <GradientButton
            variant="ghost"
            size="sm"
            onClick={fetchViolations}
            disabled={isLoading}
            className="border border-purple-500/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </GradientButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-l-4 border-l-purple-500">
          <div className="text-xs text-slate-400 font-medium">Total Incidents</div>
          <div className="text-2xl font-black text-white mt-1">{violations.length}</div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs text-slate-400 font-medium">Unreviewed Incidents</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs text-slate-400 font-medium">High / Critical</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{criticalCount}</div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs text-slate-400 font-medium">Reviewed & Cleared</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {violations.length - pendingCount}
          </div>
        </GlassCard>
      </div>

      {/* Filter Row */}
      <GlassCard className="p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participant, email..."
            className="w-full bg-slate-900/60 border border-purple-500/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-900/60 border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Violation Types</option>
          <option value="FULLSCREEN_EXIT">FULLSCREEN_EXIT</option>
          <option value="TAB_SWITCH">TAB_SWITCH</option>
          <option value="WINDOW_BLUR">WINDOW_BLUR</option>
          <option value="COPY">COPY</option>
          <option value="PASTE">PASTE</option>
          <option value="CUT">CUT</option>
          <option value="CONTEXT_MENU">CONTEXT_MENU</option>
          <option value="SUSPICIOUS_KEYBOARD_SHORTCUT">SUSPICIOUS_KEYBOARD_SHORTCUT</option>
          <option value="NAVIGATION_ATTEMPT">NAVIGATION_ATTEMPT</option>
          <option value="MULTIPLE_LOGIN">MULTIPLE_LOGIN</option>
          <option value="INVALID_SUBMISSION_ATTEMPT">INVALID_SUBMISSION_ATTEMPT</option>
          <option value="OTHER_SUSPICIOUS_ACTIVITY">OTHER_SUSPICIOUS_ACTIVITY</option>
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-slate-900/60 border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Severities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        <select
          value={filterReviewed}
          onChange={(e) => setFilterReviewed(e.target.value)}
          className="bg-slate-900/60 border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Review Statuses</option>
          <option value="false">Unreviewed Only</option>
          <option value="true">Reviewed Only</option>
        </select>
      </GlassCard>

      {/* Violations Table */}
      <GlassCard className="overflow-hidden p-0 border border-purple-500/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-purple-500/20 bg-purple-950/20 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Logged At</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Violation Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Incident Details</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                    Auditing security events...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No violation events found matching active criteria. Contest integrity high!
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const dateStr = new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  let parsedMeta: any = null;
                  try {
                    if (item.metadata) parsedMeta = JSON.parse(item.metadata);
                  } catch (e) {}

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-950/20 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <div>
                            <div className="font-semibold text-white">
                              {item.user?.profile?.fullName || 'Individual'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-purple-300 font-bold text-[11px]">
                          {item.type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {renderSeverityBadge(item.severity)}
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                        {parsedMeta?.message || parsedMeta?.key || item.metadata || 'Security signal logged'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.reviewed ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Check className="w-3 h-3" /> Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedViolation(item);
                            setAdminNoteInput(item.adminNote || '');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-500/30 transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Review & Note Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101228] border border-purple-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-purple-500/20">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400">
                  Incident Inspection
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {selectedViolation.type}
                </h3>
              </div>
              <button
                onClick={() => setSelectedViolation(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#141738] p-3.5 rounded-xl border border-purple-500/20 space-y-1.5 font-mono">
                <div>
                  <span className="text-slate-400">Participant:</span>{' '}
                  <strong className="text-white">
                    {selectedViolation.user?.profile?.fullName || selectedViolation.user?.email}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Severity:</span>{' '}
                  {renderSeverityBadge(selectedViolation.severity)}
                </div>
                <div>
                  <span className="text-slate-400">Timestamp:</span>{' '}
                  <span className="text-slate-300">
                    {new Date(selectedViolation.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedViolation.metadata && (
                <div>
                  <span className="text-slate-400 block font-bold mb-1">Captured Metadata:</span>
                  <pre className="bg-[#090b1c] p-3 rounded-xl border border-purple-500/20 text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                    {selectedViolation.metadata}
                  </pre>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-bold block mb-1">Admin Audit Note:</label>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Add administrative notes regarding this incident or action taken..."
                  className="w-full bg-[#12142d] border border-purple-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
              <button
                type="button"
                onClick={() => setSelectedViolation(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <GradientButton
                  size="sm"
                  variant="secondary"
                  onClick={() => handleReviewSubmit(false)}
                  isLoading={isUpdating}
                >
                  Save Note Only
                </GradientButton>
                <GradientButton
                  size="sm"
                  onClick={() => handleReviewSubmit(true)}
                  isLoading={isUpdating}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Mark Cleared / Reviewed
                </GradientButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
