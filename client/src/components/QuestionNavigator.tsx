import React from 'react';
import { Question } from '../types/index.js';
import { cn } from '../utils/cn.js';
import { CheckCircle2, Bookmark, Lock, Code, HelpCircle } from 'lucide-react';

interface QuestionNavigatorProps {
  questions: Question[];
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
  className?: string;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentQuestionIndex,
  onSelectQuestion,
  className,
}) => {
  return (
    <div className={cn('bg-[#0c0e22]/90 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-xl', className)}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-500/15">
        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
          Question Palette
        </h4>
        <span className="text-[11px] font-mono text-slate-400">
          {questions.length} Items
        </span>
      </div>

      {/* Grid of Question Numbers */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentQuestionIndex;
          const isLocked = q.currentLock && !q.currentLock.isLockedByMe;
          const isMarked = q.savedState?.markedForReview;
          const hasSavedCode = Boolean(q.savedState?.code || q.savedState?.selectedOptionId);

          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(idx)}
              className={cn(
                'relative flex flex-col items-center justify-center p-2 rounded-xl text-xs font-mono font-bold transition-all duration-200 border',
                isCurrent
                  ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.6)] scale-105 z-10'
                  : isLocked
                  ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/30'
                  : isMarked
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                  : hasSavedCode
                  ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
                  : 'bg-[#131530] text-slate-300 border-purple-500/15 hover:border-purple-500/40 hover:bg-[#181b3e]'
              )}
            >
              <span>{idx + 1}</span>

              {/* Status Icons Indicator */}
              <div className="flex items-center gap-0.5 mt-1">
                {isLocked && <Lock className="w-2.5 h-2.5 text-indigo-400" />}
                {isMarked && <Bookmark className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                {hasSavedCode && !isCurrent && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-purple-500/10 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Attempted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Marked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Locked</span>
        </div>
      </div>
    </div>
  );
};
