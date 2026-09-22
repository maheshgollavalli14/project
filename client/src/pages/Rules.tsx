import React from 'react';
import { GlassCard } from '../components/ui/GlassCard.js';
import { Shield, BookOpen, AlertCircle, Clock, Users, Lock, Award, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GradientButton } from '../components/ui/GradientButton.js';

export const Rules: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-mono mb-4">
          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
          <span>Official Contest Regulations</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
          CODEBREAK Rulebook
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Please review the official contest guidelines, integrity protocols, and tie-breaking policies before participating.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Eligibility & Teams */}
        <GlassCard className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-purple-400 font-bold text-lg border-b border-purple-500/15 pb-3">
            <Users className="w-5 h-5" />
            <span>1. Eligibility & Team Composition</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside leading-relaxed">
            <li>Participants must be active undergraduate or postgraduate college students with valid student ID.</li>
            <li><strong>Individual Mode:</strong> A single participant competes independently.</li>
            <li><strong>Team Mode:</strong> Must contain <strong>EXACTLY TWO (2)</strong> registered members. A team with fewer or more than two members will not be permitted to enter the arena.</li>
            <li>Each participant can only be registered under one account and belong to at most one team.</li>
          </ul>
        </GlassCard>

        {/* Section 2: Problem Locking */}
        <GlassCard className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-indigo-400 font-bold text-lg border-b border-purple-500/15 pb-3">
            <Lock className="w-5 h-5" />
            <span>2. Real-Time Problem Locking Policy</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside leading-relaxed">
            <li>For teams, only <strong>ONE team member</strong> may actively edit or submit code for a given problem at any single point in time.</li>
            <li>When Member A opens a problem, the server acquires a lock. The problem instantly appears in <strong>LOCKED (Read-Only)</strong> mode for Member B.</li>
            <li>Lock heartbeat pings are transmitted every 15 seconds. If a member closes their browser tab or navigates away, the lock expires automatically after 45 seconds, returning the problem to AVAILABLE status.</li>
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
            <li>When the official round time expires, the round status changes to `COMPLETED`. All active problem locks are immediately released, and any further submission attempts are strictly rejected.</li>
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
