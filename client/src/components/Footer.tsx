import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Award, Sparkles, Github, Twitter, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#05060f] border-t border-purple-500/15 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-purple-500/10">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text text-transparent">
                CODEBREAK
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              BREAK THE CODE WITHIN YOU. A prestigious one-day college programming contest platform uniting top student coders.
            </p>
            <p className="text-[11px] text-purple-400/80 font-mono">
              Compete. Collaborate. Code. Conquer.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Quick Navigation
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/" className="hover:text-purple-300 transition-colors">Contest Home</Link></li>
              <li><Link to="/about" className="hover:text-purple-300 transition-colors">About CODEBREAK</Link></li>
              <li><Link to="/rounds" className="hover:text-purple-300 transition-colors">Competition Rounds</Link></li>
              <li><Link to="/rules" className="hover:text-purple-300 transition-colors">Official Rulebook</Link></li>
              <li><Link to="/leaderboard" className="hover:text-purple-300 transition-colors">Live Leaderboard</Link></li>
            </ul>
          </div>

          {/* Contest Rounds */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-purple-400" /> 3 Dynamic Rounds
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><span className="text-purple-300 font-semibold">Round 1:</span> MCQs & Code Logic</li>
              <li><span className="text-purple-300 font-semibold">Round 2:</span> Jumbled Code & Debugging</li>
              <li><span className="text-purple-300 font-semibold">Round 3:</span> Grand Competitive Finale</li>
              <li className="pt-2 text-[11px] text-slate-500">Real-time team multiplayer locks active</li>
            </ul>
          </div>

          {/* Security & Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" /> Integrity & Tech
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Protected by server-side authoritative timers, anti-cheat detection, and isolated container execution.
            </p>
            <div className="flex items-center gap-3 text-slate-400">
              <a href="#" className="p-2 bg-purple-950/30 hover:bg-purple-900/40 rounded-lg hover:text-white transition-all">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-purple-950/30 hover:bg-purple-900/40 rounded-lg hover:text-white transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="mailto:support@codebreak.dev" className="p-2 bg-purple-950/30 hover:bg-purple-900/40 rounded-lg hover:text-white transition-all">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© 2026 CODEBREAK Technical Committee. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Server Time Authoritative</span>
            <span>•</span>
            <span>PostgreSQL 18 Protected</span>
            <span>•</span>
            <Link to="/rules" className="hover:text-purple-400 transition-colors">Contest Integrity Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
