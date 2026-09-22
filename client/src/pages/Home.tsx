import React from 'react';
import { Link } from 'react-router-dom';
import { GradientButton } from '../components/ui/GradientButton.js';
import { GlassCard } from '../components/ui/GlassCard.js';
import { Terminal, Users, Trophy, Award, ArrowRight, Shield, Zap, Code, Sparkles, CheckCircle } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Radial purple glow background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-purple-700/25 via-indigo-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold tracking-wider uppercase mb-8 shadow-[0_0_20px_rgba(139,92,246,0.2)] animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Collegiate Programming Championship 2026</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-6">
            <span className="block text-white drop-shadow-[0_0_40px_rgba(139,92,246,0.3)]">
              CODEBREAK
            </span>
            <span className="text-3xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-500 bg-clip-text text-transparent mt-2 block tracking-normal">
              BREAK THE CODE WITHIN YOU
            </span>
          </h1>

          {/* Tagline description */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 font-normal leading-relaxed mb-10">
            A high-intensity one-day collegiate programming competition where students compete individually or in two-member synchronized teams across three escalating rounds of algorithmic warfare.
          </p>

          <p className="text-xs sm:text-sm text-purple-400 font-mono tracking-widest uppercase mb-10 font-bold">
            Compete. Collaborate. Code. Conquer.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <GradientButton size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                REGISTER NOW
              </GradientButton>
            </Link>
            <Link to="/about">
              <GradientButton size="lg" variant="secondary">
                LEARN MORE
              </GradientButton>
            </Link>
          </div>

          {/* Cyber stats banner */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-[#0d0f22]/70 border border-purple-500/15">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">3</div>
              <div className="text-xs text-purple-300 uppercase tracking-wider font-semibold mt-1">Escalating Rounds</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0d0f22]/70 border border-purple-500/15">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">2</div>
              <div className="text-xs text-purple-300 uppercase tracking-wider font-semibold mt-1">Max Team Size</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0d0f22]/70 border border-purple-500/15">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">Live</div>
              <div className="text-xs text-purple-300 uppercase tracking-wider font-semibold mt-1">Problem Locking</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0d0f22]/70 border border-purple-500/15">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">100%</div>
              <div className="text-xs text-purple-300 uppercase tracking-wider font-semibold mt-1">Server Authoritative</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Information Cards */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Competition Structure & Pillars
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Designed specifically for intense one-day competitive programming
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: 3 Rounds */}
            <GlassCard glow className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">3 PROGRESSIVE ROUNDS</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Advance through structured competitive tiers: Rapid MCQs & output predictions, scrambled algorithmic debugging, and the grand competitive finale.
              </p>
              <div className="pt-2 flex flex-col gap-2 text-xs font-mono text-purple-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>R1: MCQs & Quick Code</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>R2: Jumbled Code & Bugs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>R3: Grand Algorithmic Arena</span>
                </div>
              </div>
            </GlassCard>

            {/* Card 2: Individual & Team Mode */}
            <GlassCard glow className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">DUAL PARTICIPATION MODES</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Compete as a lone prodigy or form a dynamic duo. Teams feature exactly two members with real-time multiplayer problem locking.
              </p>
              <div className="pt-2 flex flex-col gap-2 text-xs font-mono text-indigo-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Solo participant track</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>2-Student Team synchronization</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Server-enforced problem locking</span>
                </div>
              </div>
            </GlassCard>

            {/* Card 3: Recognition & Prizes */}
            <GlassCard glow className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">REWARDS & RECOGNITION</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Stand out among peers and secure collegiate prestige, configurable cash prizes, trophies, and verifiable certificates.
              </p>
              <div className="pt-2 flex flex-col gap-2 text-xs font-mono text-purple-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Official verified certificates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Grand Winner & Runner-up awards</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Public Hall of Fame leaderboard</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Real-time Multiplayer Highlight */}
      <section className="py-16 bg-[#060712] border-y border-purple-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-mono mb-4">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Next-Gen Architecture</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-6">
                Server-Controlled Problem Locking & Authoritative Timers
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Unlike typical contest sites where team members step on each others toes, CODEBREAK enforces atomic server-side problem locks. When Member A opens Problem 1, Member B instantly sees Problem 1 locked in real-time.
              </p>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">Anti-Cheating Guard</strong>
                    <span>Continuous audit logging of window blurs, tab switches, and fullscreen exits.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 mt-0.5">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block">Isolated Sandbox Execution</strong>
                    <span>Participant code runs in restricted execution workers with memory caps and strict timeouts.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mock contest preview card */}
            <div className="bg-[#0e1026] border border-purple-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(139,92,246,0.2)]">
              <div className="flex items-center justify-between pb-4 border-b border-purple-500/20 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-purple-300 ml-2">CODEBREAK Arena</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  LIVE SOCKET ACTIVE
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-[#141738] p-3 rounded-xl border border-purple-500/20 text-purple-200">
                  <span className="text-slate-400">01</span> Member A: <span className="text-emerald-400">Active</span> on Problem 3 (Subarray Harmony)
                </div>
                <div className="bg-[#181a42] p-3 rounded-xl border border-indigo-500/30 text-indigo-300 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">02</span> Member B: Problem 3 is <span className="text-rose-400 font-bold">LOCKED</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                    Heartbeat 45s
                  </span>
                </div>
                <div className="bg-[#141738] p-3 rounded-xl border border-purple-500/20 text-purple-200">
                  <span className="text-slate-400">03</span> Server Countdown: <span className="text-amber-400 font-bold">00:44:12</span> (Authoritative)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-20 text-center relative">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-6">
            Ready to Prove Your Coding Mastery?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Registration is now open. Choose Individual or 2-member Team mode and secure your place in the arena.
          </p>
          <Link to="/register">
            <GradientButton size="lg" className="px-10 py-4 text-lg">
              REGISTER FOR CODEBREAK 2026
            </GradientButton>
          </Link>
        </div>
      </section>
    </div>
  );
};
