import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';
import {
  Shield,
  LayoutDashboard,
  Users,
  UserCheck,
  FileQuestion,
  FileCode,
  Award,
  Settings,
  AlertTriangle,
  LogOut,
  ArrowLeft,
  Terminal,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Participants', path: '/admin/participants', icon: UserCheck },
    { name: 'Teams', path: '/admin/teams', icon: Users },
    { name: 'Questions', path: '/admin/questions', icon: FileQuestion },
    { name: 'Submissions', path: '/admin/submissions', icon: FileCode },
    { name: 'Qualification Hub', path: '/admin/qualification', icon: Award },
    { name: 'Violations Log', path: '/admin/violations', icon: AlertTriangle },
    { name: 'Contest Settings', path: '/admin/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-[#060712] text-slate-100">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-[#090b1c] border-r border-purple-500/15 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-purple-500/15">
          <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider text-white">
              CODEBREAK ADMIN
            </span>
            <span className="block text-[9px] uppercase tracking-widest text-purple-400 font-mono">
              Director Portal
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  active
                    ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] border border-purple-400/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-purple-950/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer controls */}
        <div className="p-4 border-t border-purple-500/15 space-y-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-purple-300 hover:bg-purple-950/30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Contest</span>
          </Link>

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};
