import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { api } from '../services/api.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { GradientButton } from '../components/ui/GradientButton.js';
import { Terminal, Lock, Mail, ArrowRight, Shield, User, Users } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        if (res.data.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 text-purple-400 mb-2">
            <Terminal className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Sign In to CODEBREAK
          </h2>
          <p className="text-xs text-slate-400">
            Enter your credentials to enter the contest arena
          </p>
        </div>

        {/* Login Card */}
        <GlassCard className="p-8">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
            </div>

            <GradientButton
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Arena
            </GradientButton>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-purple-500/15">
            <span className="block text-[11px] uppercase tracking-wider font-mono text-purple-400/80 mb-3 text-center">
              Quick-Fill Test Credentials
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@codebreak.dev', 'Admin@CodeBreak2026')}
                className="p-2 rounded-lg bg-[#141738] hover:bg-purple-900/30 border border-purple-500/20 text-[10px] text-left text-slate-300 transition-colors"
              >
                <span className="text-purple-300 font-bold block flex items-center gap-1">
                  <Shield className="w-3 h-3 text-purple-400" /> Admin
                </span>
                <span>admin@codebreak.dev</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('alex.chen@mit.edu', 'Password@123')}
                className="p-2 rounded-lg bg-[#141738] hover:bg-purple-900/30 border border-purple-500/20 text-[10px] text-left text-slate-300 transition-colors"
              >
                <span className="text-purple-300 font-bold block flex items-center gap-1">
                  <User className="w-3 h-3 text-purple-400" /> Solo Participant
                </span>
                <span>alex.chen@mit.edu</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('rohan.gupta@nitt.edu', 'Password@123')}
                className="p-2 rounded-lg bg-[#141738] hover:bg-indigo-900/30 border border-indigo-500/20 text-[10px] text-left text-slate-300 transition-colors"
              >
                <span className="text-indigo-300 font-bold block flex items-center gap-1">
                  <Users className="w-3 h-3 text-indigo-400" /> Team 1 Member A
                </span>
                <span>rohan.gupta@nitt.edu</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('ananya.deshmukh@nitt.edu', 'Password@123')}
                className="p-2 rounded-lg bg-[#141738] hover:bg-indigo-900/30 border border-indigo-500/20 text-[10px] text-left text-slate-300 transition-colors"
              >
                <span className="text-indigo-300 font-bold block flex items-center gap-1">
                  <Users className="w-3 h-3 text-indigo-400" /> Team 1 Member B
                </span>
                <span>ananya.deshmukh@nitt.edu</span>
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Footer link */}
        <p className="text-center text-xs text-slate-400">
          Not registered yet?{' '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold underline">
            Enroll for CODEBREAK 2026
          </Link>
        </p>
      </div>
    </div>
  );
};
