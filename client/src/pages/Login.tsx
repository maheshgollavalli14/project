import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { api } from '../services/api.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { GradientButton } from '../components/ui/GradientButton.js';
import { Terminal, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setErrorCode(null);
    setIsLoading(true);

    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.success && res.data?.user) {
        setUser(res.data.user, res.data.token, res.data.sessionId);
        if (res.data.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
      setErrorCode(err.code || null);
    } finally {
      setIsLoading(false);
    }
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
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
              {errorCode === 'ACCOUNT_ALREADY_ACTIVE' ? (
                <div className="space-y-1">
                  <div className="font-bold text-rose-200 text-sm">Account Already Active</div>
                  <div className="text-slate-300">This account is already logged in on another device or browser.</div>
                </div>
              ) : (
                <div>{error}</div>
              )}
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
