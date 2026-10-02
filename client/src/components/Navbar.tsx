import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import { GradientButton } from './ui/GradientButton.js';
import { Terminal, Shield, LogOut, LayoutDashboard, Menu, X, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Rounds', path: '/rounds' },
    { name: 'Rules', path: '/rules' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#070814]/85 backdrop-blur-md border-b border-purple-500/15 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 p-0.5 shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.7)] transition-all">
              <div className="w-full h-full bg-[#070814] rounded-[10px] flex items-center justify-center">
                <Terminal className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text text-transparent">
                CODEBREAK
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-purple-400/80 font-mono -mt-1 font-semibold">
                Break The Code Within You
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-[#0c0e22]/70 px-4 py-1.5 rounded-full border border-purple-500/15">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  isActive(link.path)
                    ? 'text-white bg-purple-600/30 border border-purple-500/40 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                    : 'text-slate-300 hover:text-white hover:bg-purple-950/20'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* User Status / Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {user.role === 'ADMIN' ? (
                  <Link to="/admin">
                    <GradientButton size="sm" variant="secondary" leftIcon={<Shield className="w-3.5 h-3.5 text-purple-400" />}>
                      Admin Panel
                    </GradientButton>
                  </Link>
                ) : (
                  <Link to="/dashboard">
                    <GradientButton size="sm" leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}>
                      Dashboard
                    </GradientButton>
                  </Link>
                )}

                <div className="flex items-center gap-2 pl-2 border-l border-purple-500/20">
                  <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-bold">
                    {user.profile?.fullName ? user.profile.fullName[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="text-left hidden lg:block">
                    <span className="block text-xs font-semibold text-slate-200 leading-tight">
                      {user.profile?.fullName?.split(' ')[0] || user.email.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono">
                      {user.profile?.participantId || user.role}
                    </span>
                  </div>
                  <button
                    onClick={async () => { await logout(); }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <GradientButton size="sm" variant="ghost">
                    Sign In
                  </GradientButton>
                </Link>
                <Link to="/register">
                  <GradientButton size="sm">Register Now</GradientButton>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white bg-purple-950/20 border border-purple-500/20"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0c1e] border-b border-purple-500/20 px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-medium ${
                isActive(link.path)
                  ? 'bg-purple-600/30 text-white font-bold border border-purple-500/30'
                  : 'text-slate-300 hover:bg-purple-950/30 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-purple-500/20 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GradientButton className="w-full">Dashboard</GradientButton>
                </Link>
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="w-full py-2 text-center text-sm font-semibold text-rose-400 hover:bg-rose-950/20 rounded-xl cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <GradientButton variant="secondary" className="w-full">
                    Sign In
                  </GradientButton>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <GradientButton className="w-full">Register Now</GradientButton>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
