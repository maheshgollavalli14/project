import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import {
  Users,
  User,
  Crown,
  Lock,
  Search,
  Mail,
  Phone,
  Building,
  Key,
  Calendar,
  AlertTriangle,
  FileCode,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Eye,
} from 'lucide-react';

interface TeamMember {
  id: string;
  roleInTeam: 'LEADER' | 'MEMBER';
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
    profile?: {
      id: string;
      fullName: string;
      college: string;
      phone: string;
      participantId: string;
      participation: string;
    };
    _count?: {
      submissions: number;
      violations: number;
    };
  };
}

interface TeamData {
  id: string;
  name: string;
  teamId: string;
  college: string;
  inviteCode?: string;
  status: string;
  createdAt: string;
  members: TeamMember[];
  locks: Array<{
    id: string;
    question?: {
      title: string;
    };
  }>;
  _count?: {
    submissions: number;
    violations: number;
    scores: number;
  };
}

interface IndividualData {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  profile?: {
    id: string;
    fullName: string;
    college: string;
    phone: string;
    participantId: string;
    participation: string;
  };
  locks: Array<{
    id: string;
    question?: {
      title: string;
    };
  }>;
  _count?: {
    submissions: number;
    violations: number;
    scores: number;
  };
}

export const AdminTeams: React.FC = () => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [individuals, setIndividuals] = useState<IndividualData[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'TEAMS' | 'INDIVIDUALS'>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected item for deep detail modal
  const [selectedItem, setSelectedItem] = useState<{
    type: 'TEAM' | 'INDIVIDUAL';
    data: TeamData | IndividualData;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const res = await api.get('/api/admin/teams');
        if (res.success && res.data) {
          setTeams(res.data.teams || []);
          setIndividuals(res.data.individuals || []);
        }
      } catch (e) {
        console.error('Failed to load teams & individual participants:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const q = search.toLowerCase().trim();

  // Filtered teams
  const filteredTeams = teams.filter((t) => {
    if (!q) return true;
    const matchTeam =
      t.name?.toLowerCase().includes(q) ||
      t.teamId?.toLowerCase().includes(q) ||
      t.college?.toLowerCase().includes(q) ||
      t.inviteCode?.toLowerCase().includes(q);

    const matchMember = t.members?.some((m) => {
      const prof = m.user?.profile;
      return (
        m.user?.email?.toLowerCase().includes(q) ||
        prof?.fullName?.toLowerCase().includes(q) ||
        prof?.participantId?.toLowerCase().includes(q) ||
        prof?.phone?.includes(q)
      );
    });

    return matchTeam || matchMember;
  });

  // Filtered individuals
  const filteredIndividuals = individuals.filter((ind) => {
    if (!q) return true;
    const prof = ind.profile;
    return (
      ind.email?.toLowerCase().includes(q) ||
      prof?.fullName?.toLowerCase().includes(q) ||
      prof?.participantId?.toLowerCase().includes(q) ||
      prof?.college?.toLowerCase().includes(q) ||
      prof?.phone?.includes(q)
    );
  });

  const totalTeamParticipants = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
  const totalContestants = totalTeamParticipants + individuals.length;
  const totalLocks =
    teams.reduce((acc, t) => acc + (t.locks?.length || 0), 0) +
    individuals.reduce((acc, ind) => acc + (ind.locks?.length || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-purple-400" />
            Teams & Individual Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Inspect 2-member teams, individual solo participants, credentials, and live problem locks.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by team, individual, ID, email..."
            className="w-full bg-[#12142d] border border-purple-500/20 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-colors"
          />
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Teams</div>
            <div className="text-2xl font-black text-purple-300 mt-0.5">{teams.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">({totalTeamParticipants} members)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Individual Solo</div>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">{individuals.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Solo Contestants</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <User className="w-5 h-5" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Enrolled</div>
            <div className="text-2xl font-black text-cyan-300 mt-0.5">{totalContestants}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Contestants Active</div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Active Locks</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{totalLocks}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Round 3 Locked</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
        </GlassCard>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-purple-500/15 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ALL'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span>All Enrolled</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30">
            {teams.length + individuals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('TEAMS')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'TEAMS'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>2-Member Teams</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30">
            {teams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('INDIVIDUALS')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === 'INDIVIDUALS'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Individual / Solo</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30">
            {individuals.length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <GlassCard className="p-12 text-center text-slate-400">
          Loading teams & individual contestants...
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Teams (when activeTab is ALL or TEAMS) */}
          {(activeTab === 'ALL' || activeTab === 'TEAMS') && (
            <div className="space-y-4">
              {activeTab === 'ALL' && (
                <div className="flex items-center justify-between pt-2">
                  <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    2-Member Teams ({filteredTeams.length})
                  </h2>
                </div>
              )}

              {filteredTeams.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  {search ? 'No teams matched your search.' : 'No teams enrolled yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredTeams.map((t) => (
                    <GlassCard
                      key={t.id}
                      className="p-6 space-y-5 border border-purple-500/20 bg-slate-900/60 shadow-xl relative overflow-hidden"
                    >
                      {/* Top Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-500/15">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/30">
                              {t.teamId}
                            </span>
                            {t.inviteCode && (
                              <span className="text-[11px] font-mono flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                <Key className="w-3 h-3 text-amber-400" />
                                Code: {t.inviteCode}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                              {t.status}
                            </span>
                          </div>
                          <h3 className="text-xl font-black text-white mt-1.5 flex items-center gap-2">
                            {t.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-slate-500" />
                              {t.college}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              Registered {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-start md:self-auto">
                          <button
                            onClick={() => setSelectedItem({ type: 'TEAM', data: t })}
                            className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 transition-all flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect Team
                          </button>
                        </div>
                      </div>

                      {/* Individual Members Grid */}
                      <div className="space-y-3">
                        <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400" />
                          Individual Team Members
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {t.members?.map((m) => {
                            const isLeader = m.roleInTeam === 'LEADER';
                            const prof = m.user?.profile;
                            const subCount = m.user?._count?.submissions || 0;
                            const vioCount = m.user?._count?.violations || 0;

                            return (
                              <div
                                key={m.id}
                                className={`p-4 rounded-xl border transition-all ${
                                  isLeader
                                    ? 'bg-amber-950/15 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                                    : 'bg-indigo-950/20 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5">
                                  <div className="flex items-center gap-1.5">
                                    {isLeader ? (
                                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                        <Crown className="w-3 h-3 text-amber-400" />
                                        TEAM LEADER
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                        <User className="w-3 h-3 text-sky-400" />
                                        MEMBER
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                                    {prof?.participantId || 'NO ID'}
                                  </span>
                                </div>

                                <div className="mt-3 space-y-1">
                                  <div className="text-sm font-bold text-white">
                                    {prof?.fullName || 'Anonymous Contestant'}
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                    <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span className="truncate">{prof?.college || t.college}</span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5 text-xs">
                                  <div className="flex items-center gap-2 text-slate-300">
                                    <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    <span className="truncate font-mono text-[11px]">{m.user?.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-300">
                                    <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    <span className="font-mono text-[11px]">
                                      {prof?.phone || 'No phone provided'}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                                    Submissions: <strong className="text-white">{subCount}</strong>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                    Violations: <strong className={vioCount > 0 ? 'text-rose-400' : 'text-white'}>{vioCount}</strong>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Problem Locks */}
                      <div className="pt-2 border-t border-purple-500/10">
                        {t.locks?.length > 0 ? (
                          <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/30 text-xs text-indigo-300 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Lock className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Active Exclusive Lock (Round 3):</span>
                            </div>
                            <div className="font-mono text-white pl-5">{t.locks[0].question?.title}</div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" />
                            No active problem locks held currently.
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Individual / Solo Participants (when activeTab is ALL or INDIVIDUALS) */}
          {(activeTab === 'ALL' || activeTab === 'INDIVIDUALS') && (
            <div className="space-y-4 pt-4">
              {activeTab === 'ALL' && (
                <div className="flex items-center justify-between pt-4 border-t border-purple-500/15">
                  <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Individual / Solo Participants ({filteredIndividuals.length})
                  </h2>
                </div>
              )}

              {filteredIndividuals.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  {search ? 'No individual contestants matched your search.' : 'No individual contestants enrolled yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredIndividuals.map((ind) => {
                    const prof = ind.profile;
                    const subCount = ind._count?.submissions || 0;
                    const vioCount = ind._count?.violations || 0;

                    return (
                      <GlassCard
                        key={ind.id}
                        className="p-6 space-y-5 border border-emerald-500/25 bg-slate-900/60 shadow-xl relative overflow-hidden"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-emerald-500/15">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                                {prof?.participantId || 'NO ID'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                                <User className="w-3 h-3" />
                                SOLO CONTESTANT
                              </span>
                            </div>
                            <h3 className="text-lg font-black text-white mt-2">
                              {prof?.fullName || 'Anonymous Contestant'}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <Building className="w-3.5 h-3.5 text-slate-500" />
                              <span>{prof?.college || 'College not specified'}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedItem({ type: 'INDIVIDUAL', data: ind })}
                            className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 transition-all flex items-center gap-1.5 shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                        </div>

                        {/* Contact details */}
                        <div className="p-3.5 rounded-xl bg-[#12142d] border border-purple-500/15 space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate font-mono text-[11px]">{ind.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-mono text-[11px]">{prof?.phone || 'No phone'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Registered {new Date(ind.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Submissions & Violations */}
                        <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                            Submissions: <strong className="text-white">{subCount}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            Violations:{' '}
                            <strong className={vioCount > 0 ? 'text-rose-400' : 'text-white'}>
                              {vioCount}
                            </strong>
                          </span>
                        </div>

                        {/* Active Problem Lock */}
                        <div className="pt-2 border-t border-emerald-500/15">
                          {ind.locks?.length > 0 ? (
                            <div className="p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-500/30 text-xs text-indigo-300">
                              <span className="font-bold flex items-center gap-1.5">
                                <Lock className="w-3 h-3" />
                                Locked:
                              </span>
                              <div className="font-mono text-white mt-0.5">{ind.locks[0].question?.title}</div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" />
                              No active problem locks held.
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inspect Dossier Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0e1124] border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-purple-500/20">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400">
                  {selectedItem.type === 'TEAM' ? 'Team Dossier' : 'Solo Contestant Dossier'}
                </span>
                <h2 className="text-xl font-black text-white mt-1">
                  {selectedItem.type === 'TEAM'
                    ? (selectedItem.data as TeamData).name
                    : (selectedItem.data as IndividualData).profile?.fullName || 'Anonymous Contestant'}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedItem.type === 'TEAM'
                    ? (selectedItem.data as TeamData).college
                    : (selectedItem.data as IndividualData).profile?.college}
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {selectedItem.type === 'TEAM' ? (
              <div className="space-y-5 text-xs">
                {/* Team meta */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#131630] p-4 rounded-xl border border-purple-500/20 font-mono">
                  <div>
                    <div className="text-[10px] text-slate-400">TEAM ID</div>
                    <div className="font-bold text-purple-300">{(selectedItem.data as TeamData).teamId}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">INVITE CODE</div>
                    <div className="font-bold text-amber-300">
                      {(selectedItem.data as TeamData).inviteCode || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">STATUS</div>
                    <div className="font-bold text-emerald-300">{(selectedItem.data as TeamData).status}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">MEMBERS</div>
                    <div className="font-bold text-cyan-300">
                      {(selectedItem.data as TeamData).members?.length || 0} / 2
                    </div>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="space-y-3">
                  <div className="font-mono font-bold uppercase tracking-wider text-slate-300">
                    Enrolled Roster:
                  </div>
                  <div className="space-y-3">
                    {(selectedItem.data as TeamData).members?.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl bg-[#12142d] border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {m.roleInTeam === 'LEADER' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Crown className="w-3 h-3" /> TEAM LEADER
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                                <User className="w-3 h-3" /> MEMBER
                              </span>
                            )}
                            <span className="font-mono text-purple-300 font-bold">
                              {m.user?.profile?.participantId}
                            </span>
                          </div>
                          <div className="text-white font-bold text-sm mt-1">
                            {m.user?.profile?.fullName || 'Anonymous'}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                            {m.user?.email} • {m.user?.profile?.phone}
                          </div>
                        </div>

                        <div className="font-mono text-right sm:border-l sm:border-purple-500/15 sm:pl-4 text-[11px] text-slate-400">
                          <div>Submissions: <strong className="text-white">{m.user?._count?.submissions || 0}</strong></div>
                          <div>Violations: <strong className="text-rose-400">{m.user?._count?.violations || 0}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Individual meta */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#131630] p-4 rounded-xl border border-emerald-500/20 font-mono">
                  <div>
                    <div className="text-[10px] text-slate-400">PARTICIPANT ID</div>
                    <div className="font-bold text-emerald-300">
                      {(selectedItem.data as IndividualData).profile?.participantId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">TRACK</div>
                    <div className="font-bold text-purple-300">INDIVIDUAL (SOLO)</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">REGISTERED</div>
                    <div className="font-bold text-slate-300">
                      {new Date((selectedItem.data as IndividualData).createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Contact info card */}
                <div className="p-4 rounded-xl bg-[#12142d] border border-purple-500/20 space-y-2">
                  <div className="font-mono font-bold uppercase tracking-wider text-slate-300 pb-1 border-b border-white/5">
                    Contact & Enrollment:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <div className="text-[10px] text-slate-400">Email Address</div>
                      <div className="font-mono text-white text-xs">
                        {(selectedItem.data as IndividualData).email}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Phone Number</div>
                      <div className="font-mono text-white text-xs">
                        {(selectedItem.data as IndividualData).profile?.phone || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">College / Institution</div>
                      <div className="text-white text-xs">
                        {(selectedItem.data as IndividualData).profile?.college || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Violations Logged</div>
                      <div className="font-mono text-rose-400 font-bold text-xs">
                        {(selectedItem.data as IndividualData)._count?.violations || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end pt-4 border-t border-purple-500/20">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
