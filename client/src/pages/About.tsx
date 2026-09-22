import React from 'react';
import { GlassCard } from '../components/ui/GlassCard.js';
import { Terminal, Target, Compass, Award, Code2, Users, Cpu, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GradientButton } from '../components/ui/GradientButton.js';

export const About: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-mono mb-4">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span>Contest Architecture & Vision</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
          About CODEBREAK
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          The premier collegiate competitive programming arena designed to test speed, algorithmic precision, code comprehension, and real-time collaboration.
        </p>
      </div>

      {/* Grid of Key Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <GlassCard className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">What is CODEBREAK?</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            CODEBREAK is an intensive, one-day college programming championship built on enterprise-grade software architecture. Rather than standard static tests, CODEBREAK introduces a progression from rapid conceptual comprehension and code modification to full algorithmic battle against hidden edge test suites.
          </p>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Who Can Compete?</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Any undergraduate or postgraduate student enrolled in an accredited collegiate institution is eligible. Participants can choose to enter as an <strong>Individual Soloist</strong> or unite with a peer to form a <strong>2-Person Team</strong>.
          </p>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Real-Time Multiplayer Locking</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            In Team mode, both teammates can be online concurrently. However, CODEBREAK’s atomic server engine guarantees that only one member can work on a given problem at a time. The problem locks instantly for the teammate, promoting strategic task delegation and communication.
          </p>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Server-Side Authority</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Client timers and client scores are never trusted. All countdowns, code execution sandboxes, tie-breaking criteria, and qualification calculations execute with authoritative precision on the backend.
          </p>
        </GlassCard>
      </div>

      {/* CTA Box */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950/50 via-[#0e1026] to-indigo-950/50 border border-purple-500/30 p-8 text-center space-y-4">
        <h3 className="text-2xl font-bold text-white">Prove Your Coding Expertise</h3>
        <p className="text-xs text-slate-300 max-w-xl mx-auto">
          Explore the official rulebook or proceed to the registration wizard to enroll before registration closes.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link to="/rounds">
            <GradientButton variant="secondary" size="sm">Explore Rounds</GradientButton>
          </Link>
          <Link to="/register">
            <GradientButton size="sm">Register Now</GradientButton>
          </Link>
        </div>
      </div>
    </div>
  );
};
