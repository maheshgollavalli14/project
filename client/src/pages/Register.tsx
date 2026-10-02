import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { GradientButton } from '../components/ui/GradientButton.js';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    college: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [confirmationData, setConfirmationData] = useState<{
    id: string;
    name: string;
    college: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        fullName: formData.fullName,
        college: formData.college,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      const res = await api.post('/api/auth/register', payload);
      if (res.success && res.data) {
        setUser(res.data.user, res.data.token, res.data.sessionId);
        setConfirmationData({
          id: res.data.user.profile?.participantId || 'CB-IND-1001',
          name: res.data.user.profile?.fullName || formData.fullName,
          college: res.data.user.profile?.college || formData.college,
        });
        setIsSuccess(true);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Testing Notice Banner */}
      <div className="mb-8 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.15)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Testing & Evaluation Window Active:</strong> Free instant registration enabled for all participants.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
          Free Entry
        </span>
      </div>

      <GlassCard className="p-8 border border-purple-500/25">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Participant Registration</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your details to register for CODEBREAK 2026
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Alex Chen"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">College / University</label>
                <input
                  type="text"
                  required
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  placeholder="e.g. MIT / IIT / NIT"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="alex@college.edu"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Create Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <Link to="/login" className="text-xs text-purple-400 hover:text-purple-300">
                Already registered? Sign In
              </Link>
              <GradientButton type="submit" isLoading={isLoading} rightIcon={<Check className="w-4 h-4" />}>
                {isLoading ? 'Registering...' : 'Complete Registration'}
              </GradientButton>
            </div>
          </form>
        ) : (
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

            {/* Generated Participant ID Badge */}
            <div className="bg-[#12142d] border border-purple-500/30 rounded-2xl p-6 max-w-md mx-auto text-left space-y-3 shadow-xl">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Participant ID
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
                  <span className="font-semibold text-white">INDIVIDUAL PARTICIPANT</span>
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
