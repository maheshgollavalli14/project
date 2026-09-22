import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
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
} from 'lucide-react';

interface ViolationItem {
  id: string;
  violationType: string;
  details: string | null;
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
  team: {
    name: string;
    teamId: string;
  } | null;
}

export const AdminViolations: React.FC = () => {
  const [violations, setViolations] = useState<ViolationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterReviewed, setFilterReviewed] = useState('');
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
    if (filterType && v.violationType !== filterType) return false;
    if (filterReviewed === 'true' && !v.reviewed) return false;
    if (filterReviewed === 'false' && v.reviewed) return false;
    return true;
  });

  const pendingCount = violations.filter((v) => !v.reviewed).length;

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs text-slate-400 font-medium">Total Security Incidents</div>
          <div className="text-2xl font-black text-white mt-1">{violations.length}</div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs text-slate-400 font-medium">Unreviewed Incidents</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</div>
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
        <span className="text-xs font-semibold text-slate-300">Filter Incidents:</span>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-900/60 border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Incident Types</option>
          <option value="TAB_SWITCH">TAB_SWITCH</option>
          <option value="FULLSCREEN_EXIT">FULLSCREEN_EXIT</option>
          <option value="DEVTOOLS_OPEN">DEVTOOLS_OPEN</option>
          <option value="MULTIPLE_DEVICES">MULTIPLE_DEVICES</option>
          <option value="CLIPBOARD_PASTE">CLIPBOARD_PASTE</option>
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
                <th className="py-3 px-4">Participant / Team</th>
                <th className="py-3 px-4">Violation Type</th>
                <th className="py-3 px-4">Incident Details</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                    Auditing security events...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
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

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-950/20 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3 px-4">
                        {item.team ? (
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <div>
                              <div className="font-semibold text-white">{item.team.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.user.profile?.fullName || item.user.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <div>
                              <div className="font-semibold text-white">
                                {item.user.profile?.fullName || 'Individual'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.user.email}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          {item.violationType}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-xs truncate">
                        {item.details || 'Browser trigger registered by anti-cheat guard.'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={item.reviewed ? 'success' : 'warning'}
                          label={item.reviewed ? 'REVIEWED' : 'UNREVIEWED'}
                          size="sm"
                        />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedViolation(item);
                            setAdminNoteInput(item.adminNote || '');
                          }}
                          className="px-3 py-1 bg-purple-950/40 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Review
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

      {/* Review Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <GlassCard className="max-w-lg w-full border border-purple-500/40 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="p-5 border-b border-purple-500/20 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-rose-400" />
                Review Security Incident
              </h3>
              <button
                onClick={() => setSelectedViolation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-purple-500/20 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Offender:</span>
                  <span className="font-semibold text-white">
                    {selectedViolation.team?.name || selectedViolation.user.profile?.fullName || selectedViolation.user.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Incident Type:</span>
                  <span className="font-mono text-rose-400 font-bold">{selectedViolation.violationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-slate-300">{new Date(selectedViolation.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Details:</span>
                  <div className="p-2 rounded bg-black/40 font-mono text-[11px] text-slate-300">
                    {selectedViolation.details || 'No additional browser metrics'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Proctor / Director Administrative Note:
                </label>
                <textarea
                  rows={3}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="e.g., Warning issued / Accidental focus loss confirmed / Disqualification warranted"
                  className="w-full p-3 bg-slate-900/60 border border-purple-500/20 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-purple-500 placeholder-slate-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-purple-500/20 bg-purple-950/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedViolation(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewSubmit(false)}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/50 border border-rose-500/40 text-rose-300 hover:bg-rose-900/40"
              >
                Mark Pending
              </button>
              <GradientButton
                size="sm"
                onClick={() => handleReviewSubmit(true)}
                disabled={isUpdating}
              >
                <Check className="w-4 h-4 mr-1" />
                Mark Reviewed
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
