import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { Search, UserCheck, AlertTriangle, FileCode } from 'lucide-react';

export const AdminParticipants: React.FC = () => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchParticipants = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/api/admin/participants?search=${encodeURIComponent(search)}`);
      if (res.success && res.data?.participants) {
        setParticipants(res.data.participants);
      }
    } catch (e) {
      console.error('Failed to load participants:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Participant Registry</h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, and inspect enrolled participants, team memberships, and violations.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, college..."
            className="w-full bg-[#12142d] border border-purple-500/20 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
          />
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090b1c] border-b border-purple-500/15 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Participant ID</th>
                <th className="py-3.5 px-6">Full Name</th>
                <th className="py-3.5 px-6">College</th>
                <th className="py-3.5 px-6">Email & Phone</th>
                <th className="py-3.5 px-6">Track</th>
                <th className="py-3.5 px-6 text-center">Submissions</th>
                <th className="py-3.5 px-6 text-center">Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading participants...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No participants found matching your criteria.
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id} className="hover:bg-purple-950/20 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-purple-300">
                      {p.profile?.participantId || 'N/A'}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      {p.profile?.fullName || 'Anonymous'}
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {p.profile?.college || 'College'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-300">{p.email}</div>
                      <div className="text-[10px] font-mono text-slate-500">{p.profile?.phone}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-900/30 text-purple-300 border border-purple-500/30">
                        {p.profile?.participation || 'INDIVIDUAL'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-slate-300">
                      {p._count?.submissions || 0}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {(p._count?.violations || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-rose-400 font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          {p._count.violations}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">0</span>
                      )}
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
