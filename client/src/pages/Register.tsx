import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { GradientButton } from '../components/ui/GradientButton.js';
import {
  CheckCircle2,
  User,
  Users,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [step, setStep] = useState(1);
  const [participationType, setParticipationType] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Basic info (For individual or for Member 1 in team mode)
  const [basicInfo, setBasicInfo] = useState({
    fullName: '',
    college: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Step 3: Team info (strictly 2 members)
  const [teamInfo, setTeamInfo] = useState({
    teamName: '',
    college: '',
    member2Name: '',
    member2College: '',
    member2Email: '',
    member2Phone: '',
    member2Password: '',
  });

  // Confirmation state
  const [confirmationData, setConfirmationData] = useState<{
    id: string;
    name: string;
    college: string;
    type: string;
  } | null>(null);

  // Step 1 Submit
  const handleBasicInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (basicInfo.password !== basicInfo.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (basicInfo.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setStep(2); // Proceed to Participation choice
  };

  // Step 2 Proceed
  const handleSelectIndividual = async () => {
    setParticipationType('INDIVIDUAL');
    await handleRegisterIndividual();
  };

  const handleSelectTeam = () => {
    setParticipationType('TEAM');
    // Pre-populate college from Member 1
    setTeamInfo((prev) => ({
      ...prev,
      college: prev.college || basicInfo.college,
      member2College: prev.member2College || basicInfo.college,
    }));
    setStep(3); // Proceed to Team details
  };

  // Complete Individual Registration (FREE)
  const handleRegisterIndividual = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const payload = {
        fullName: basicInfo.fullName,
        college: basicInfo.college,
        email: basicInfo.email,
        phone: basicInfo.phone,
        password: basicInfo.password,
        confirmPassword: basicInfo.confirmPassword,
      };

      const res = await api.post('/api/auth/register/individual', payload);
      if (res.success && res.data) {
        setUser(res.data.user);
        setConfirmationData({
          id: res.data.user.profile?.participantId || 'CB-IND-1001',
          name: res.data.user.profile?.fullName || basicInfo.fullName,
          college: res.data.user.profile?.college || basicInfo.college,
          type: 'INDIVIDUAL TRACK',
        });
        setStep(4);
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Registration failed. Please check your information.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete Team Registration (FREE)
  const handleTeamDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (basicInfo.email.toLowerCase() === teamInfo.member2Email.toLowerCase()) {
      setError('Member 1 and Member 2 must have distinct email addresses.');
      return;
    }

    if (teamInfo.member2Password.length < 6) {
      setError('Member 2 password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        teamName: teamInfo.teamName,
        college: teamInfo.college,
        members: [
          {
            fullName: basicInfo.fullName,
            college: basicInfo.college,
            email: basicInfo.email,
            phone: basicInfo.phone,
            password: basicInfo.password,
          },
          {
            fullName: teamInfo.member2Name,
            college: teamInfo.member2College,
            email: teamInfo.member2Email,
            phone: teamInfo.member2Phone,
            password: teamInfo.member2Password,
          },
        ],
      };

      const res = await api.post('/api/auth/register/team', payload);
      if (res.success && res.data) {
        setUser(res.data.user);
        setConfirmationData({
          id: res.data.team?.teamId || 'CB-TEAM-2001',
          name: res.data.team?.name || teamInfo.teamName,
          college: res.data.team?.college || teamInfo.college,
          type: 'TEAM (2 MEMBERS)',
        });
        setStep(4);
        try {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Team registration failed. Please check your information.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = [
    'Basic Info',
    'Track Mode',
    'Team Details',
    'Confirmation',
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Testing Notice Banner */}
      <div className="mb-8 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.15)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Testing & Evaluation Window Active:</strong> Free instant registration enabled for all participants and teams.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
          Free Entry
        </span>
      </div>

      {/* Wizard Step Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-purple-950/60 -z-10 -translate-y-1/2" />
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 -z-10 -translate-y-1/2 transition-all duration-300"
            style={{ width: `${((Math.min(step, 4) - 1) / (stepTitles.length - 1)) * 100}%` }}
          />

          {stepTitles.map((title, i) => {
            const stepNum = i + 1;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;

            return (
              <div key={title} className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.6)]'
                      : isCurrent
                      ? 'bg-[#10122d] border-2 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                      : 'bg-[#0b0d1e] border border-purple-500/20 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                </div>
                <span
                  className={`text-[10px] font-mono mt-2 uppercase tracking-wider hidden sm:block ${
                    isCurrent ? 'text-purple-300 font-bold' : 'text-slate-500'
                  }`}
                >
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Content */}
      <GlassCard className="p-8 border border-purple-500/25">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Step 1 — Participant Information</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your credentials as primary participant or team leader
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={basicInfo.fullName}
                  onChange={(e) => setBasicInfo({ ...basicInfo, fullName: e.target.value })}
                  placeholder="e.g. Alex Chen"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">College / University</label>
                <input
                  type="text"
                  required
                  value={basicInfo.college}
                  onChange={(e) => setBasicInfo({ ...basicInfo, college: e.target.value })}
                  placeholder="e.g. MIT / IIT / NIT"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={basicInfo.email}
                  onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                  placeholder="alex@college.edu"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={basicInfo.phone}
                  onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Create Password</label>
                <input
                  type="password"
                  required
                  value={basicInfo.password}
                  onChange={(e) => setBasicInfo({ ...basicInfo, password: e.target.value })}
                  placeholder="Min 6 characters (e.g. password123)"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={basicInfo.confirmPassword}
                  onChange={(e) => setBasicInfo({ ...basicInfo, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Link to="/login" className="text-xs text-purple-400 hover:text-purple-300">
                Already registered? Sign In
              </Link>
              <GradientButton type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continue to Participation
              </GradientButton>
            </div>
          </form>
        )}

        {/* STEP 2: Participation Choice */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Step 2 — Select Participation Track</h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose your championship mode. Both tracks are 100% free for this tournament.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Option 1: Individual */}
              <div className="p-6 rounded-2xl bg-[#12142d] border border-purple-500/25 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(139,92,246,0.25)] transition-all flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">INDIVIDUAL</h3>
                  <span className="text-[11px] font-mono text-purple-300 font-semibold block">
                    Solo Competitor
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Compete individually against all solo programmers across 3 progressive rounds.
                </p>
                <div className="pt-2 w-full">
                  <GradientButton
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5"
                    disabled={isLoading}
                    onClick={handleSelectIndividual}
                  >
                    <Check className="w-4 h-4" />
                    {isLoading ? 'Enrolling...' : 'Register as Individual (Free)'}
                  </GradientButton>
                </div>
              </div>

              {/* Option 2: Team */}
              <div className="p-6 rounded-2xl bg-[#12142d] border border-indigo-500/25 hover:border-indigo-400 hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] transition-all flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">2-PERSON TEAM</h3>
                  <span className="text-[11px] font-mono text-indigo-300 font-semibold block">
                    Collaborative Duo
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Two members collaborate with real-time server-side problem locking & team sync.
                </p>
                <div className="pt-2 w-full">
                  <GradientButton
                    size="sm"
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-1.5"
                    onClick={handleSelectTeam}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Enter Teammate Info (Free)
                  </GradientButton>
                </div>
              </div>
            </div>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Basic Info
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Team Details */}
        {step === 3 && (
          <form onSubmit={handleTeamDetailsSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Step 3 — Team Details</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your team name and Member 2 credentials (both members receive independent logins)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-purple-500/15">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamInfo.teamName}
                  onChange={(e) => setTeamInfo({ ...teamInfo, teamName: e.target.value })}
                  placeholder="e.g. ByteForce"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Team College / Institution</label>
                <input
                  type="text"
                  required
                  value={teamInfo.college}
                  onChange={(e) => setTeamInfo({ ...teamInfo, college: e.target.value })}
                  placeholder="e.g. NIT Trichy"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* Member 1 Summary */}
            <div className="p-3 bg-[#0d0f22] rounded-xl border border-purple-500/15 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="text-purple-400 font-bold block">Member 1 (Leader):</span>
                <span>{basicInfo.fullName} ({basicInfo.email})</span>
              </div>
              <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                Enrolled
              </span>
            </div>

            {/* Member 2 Inputs */}
            <div className="pt-2">
              <span className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
                Member 2 Credentials
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Member 2 Full Name</label>
                  <input
                    type="text"
                    required
                    value={teamInfo.member2Name}
                    onChange={(e) => setTeamInfo({ ...teamInfo, member2Name: e.target.value })}
                    placeholder="e.g. Ananya Deshmukh"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Member 2 College</label>
                  <input
                    type="text"
                    required
                    value={teamInfo.member2College}
                    onChange={(e) => setTeamInfo({ ...teamInfo, member2College: e.target.value })}
                    placeholder="e.g. NIT Trichy"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Member 2 Email</label>
                  <input
                    type="email"
                    required
                    value={teamInfo.member2Email}
                    onChange={(e) => setTeamInfo({ ...teamInfo, member2Email: e.target.value })}
                    placeholder="ananya@college.edu"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Member 2 Phone</label>
                  <input
                    type="tel"
                    required
                    value={teamInfo.member2Phone}
                    onChange={(e) => setTeamInfo({ ...teamInfo, member2Phone: e.target.value })}
                    placeholder="+91 9887766552"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Member 2 Password</label>
                  <input
                    type="password"
                    required
                    value={teamInfo.member2Password}
                    onChange={(e) => setTeamInfo({ ...teamInfo, member2Password: e.target.value })}
                    placeholder="Min 6 characters (e.g. password123)"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <GradientButton type="submit" isLoading={isLoading} rightIcon={<Check className="w-4 h-4" />}>
                {isLoading ? 'Registering Team...' : 'Complete Free Team Registration'}
              </GradientButton>
            </div>
          </form>
        )}

        {/* STEP 4: Confirmation */}
        {step === 4 && (
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-white">Registration Successful!</h2>
              <p className="text-xs text-emerald-400 font-mono mt-1">
                ✓ Free Entry Confirmed — You are officially enrolled in CODEBREAK 2026
              </p>
            </div>

            {/* Generated ID Badge */}
            <div className="bg-[#12142d] border border-purple-500/30 rounded-2xl p-6 max-w-md mx-auto text-left space-y-3 shadow-xl">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  {participationType === 'INDIVIDUAL' ? 'Participant ID' : 'Official Team ID'}
                </span>
                <p className="text-2xl font-black font-mono text-purple-300">
                  {confirmationData?.id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-500/15">
                <div>
                  <span className="text-slate-400 block text-[10px]">Name</span>
                  <span className="font-semibold text-white">{confirmationData?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">College</span>
                  <span className="font-semibold text-white">{confirmationData?.college}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Track</span>
                  <span className="font-semibold text-white">{confirmationData?.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold">Active & Verified</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <GradientButton
                size="lg"
                onClick={() => navigate('/dashboard')}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Go To Contest Dashboard
              </GradientButton>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
