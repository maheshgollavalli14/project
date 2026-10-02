import React from 'react';
import { GlassCard } from '../components/ui/GlassCard.js';
import { GradientButton } from '../components/ui/GradientButton.js';
import { Shield, Clock, Award, User, Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Rules: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
          Official Rules & Regulations
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          Please review the official contest guidelines, integrity protocols, and tie-breaking policies before participating.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Eligibility & Individual Participation */}
        <GlassCard className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-purple-400 font-bold text-lg border-b border-purple-500/15 pb-3">
            <User className="w-5 h-5" />
            <span>1. Eligibility & Individual Participation</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside leading-relaxed">
            <li>Participants must be active undergraduate or postgraduate college students with valid student ID.</li>
            <li><strong>Individual Participation:</strong> All contestants compete independently on an individual track.</li>
            <li>Each participant can only be registered under one verified account. Multiple logins are strictly monitored and logged.</li>
          </ul>
        </GlassCard>

        {/* Section 2: Environment & Fullscreen Policy */}
        <GlassCard className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-indigo-400 font-bold text-lg border-b border-purple-500/15 pb-3">
            <Maximize2 className="w-5 h-5" />
            <span>2. Arena Environment & Fullscreen Policy</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside leading-relaxed">
            <li>The contest arena operates in secured browser fullscreen mode.</li>
            <li>Exiting fullscreen, switching tabs, or losing window focus is detected in real time and recorded in the server-side integrity log.</li>
            <li>Clipboard operations (copy, paste, cut) inside the code editor are restricted to ensure authentic problem solving.</li>
          </ul>
        </GlassCard>

        {/* Section 3: Authoritative Timers & Submissions */}
        <GlassCard className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-purple-400 font-bold text-lg border-b border-purple-500/15 pb-3">
            <Clock className="w-5 h-5" />
            <span>3. Server Timers & Submission Cutoffs</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside leading-relaxed">
            <li>All round countdown timers are calculated authoritatively on the backend server (`endTime - currentServerTime`). Local computer clock adjustments will not affect round timing.</li>
            <li>When the official round time expires, the round status changes to `COMPLETED`, and any further submission attempts are strictly rejected.</li>
            <li>The system periodically autosaves latest draft code to prevent data loss.</li>
          </ul>
        </GlassCard>

        {/* Section 4: Anti-Cheating & Integrity */}
        <GlassCard className="p-8 space-y-4 border-rose-500/30">
          <div className="flex items-center gap-3 text-rose-400 font-bold text-lg border-b border-rose-500/15 pb-3">
            <Shield className="w-5 h-5" />
            <span>4. Anti-Cheating Policy & Browser Deterrents</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside leading-relaxed">
            <li>The contest interface monitors browser state: fullscreen exit, tab switching, and window blurring events are recorded in the server-side violation audit log.</li>
            <li><strong>First Violation:</strong> On-screen warning modal requiring acknowledgement.</li>
            <li><strong>Repeated Violations:</strong> Flagged for live administrator review. Severe or persistent violations may lead to score cancellation or immediate disqualification.</li>
            <li>All code submissions are processed through automated similarity checkers to identify plagiarism.</li>
          </ul>
        </GlassCard>

        {/* Section 5: Tie-Breaking */}
        <GlassCard className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-purple-400 font-bold text-lg border-b border-purple-500/15 pb-3">
            <Award className="w-5 h-5" />
            <span>5. Scoring & Tie-Breaking Hierarchy</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Leaderboard rankings are determined strictly by the following hierarchy:
          </p>
          <ol className="space-y-1.5 text-xs sm:text-sm text-slate-300 list-decimal list-inside font-mono">
            <li><strong>Total Points:</strong> Sum of points accumulated across solved and partially-solved questions.</li>
            <li><strong>Total Solved Problems:</strong> Number of problems that achieved an `ACCEPTED` verdict on all test cases.</li>
            <li><strong>Penalty Seconds:</strong> Total elapsed seconds from round start to problem acceptance. Lower penalty seconds win the tie.</li>
          </ol>
        </GlassCard>
      </div>

      <div className="mt-12 text-center">
        <Link to="/register">
          <GradientButton size="lg">Accept Rules & Register</GradientButton>
        </Link>
      </div>
    </div>
  );
};
