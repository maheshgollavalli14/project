import React from 'react';
import { GlassCard } from './ui/GlassCard.js';
import { GradientButton } from './ui/GradientButton.js';
import { CheckCircle2, AlertTriangle, XCircle, LogOut, ArrowLeft, Loader2 } from 'lucide-react';

interface FinalSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  roundTitle: string;
  roundNumber: number;
  totalQuestions: number;
  submittedIndices: number[]; // 1-indexed numbers
  unsubmittedIndices: number[]; // 1-indexed numbers
  isSubmitting?: boolean;
}

export const FinalSubmitModal: React.FC<FinalSubmitModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  roundTitle,
  roundNumber,
  totalQuestions,
  submittedIndices,
  unsubmittedIndices,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const answeredCount = submittedIndices.length;
  const unansweredCount = unsubmittedIndices.length;
  const completionPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="max-w-xl w-full bg-[#0d0f22] border border-purple-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(139,92,246,0.2)]">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400">
              Round {roundNumber} Exam Finalization
            </span>
            <h2 className="text-xl font-black text-white leading-tight mt-0.5">
              Review & Final Round Submission
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Please inspect your answered status before sealing your responses for{' '}
              <span className="text-purple-300 font-semibold">{roundTitle}</span>.
            </p>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#141635] border border-purple-500/20 text-center">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Problems</span>
            <span className="text-lg font-black text-white font-mono">{totalQuestions}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase block">Answered / Saved</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{answeredCount}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-rose-400 uppercase block">Unanswered</span>
            <span className="text-lg font-black text-rose-400 font-mono">{unansweredCount}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Completion Rate:</span>
            <span className={`font-bold ${completionPercent === 100 ? 'text-emerald-400' : 'text-purple-300'}`}>
              {completionPercent}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1b1e42] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completionPercent === 100
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-500'
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Question Badges Breakdown */}
        <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
          {/* Answered Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Submitted / Answered Questions ({answeredCount}):</span>
            </div>
            {submittedIndices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {submittedIndices.map((num) => (
                  <span
                    key={num}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                  >
                    ✓ #{num}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic block pl-5">No questions answered yet.</span>
            )}
          </div>

          {/* Unanswered Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
              <XCircle className="w-4 h-4" />
              <span>Not Submitted / Unanswered Questions ({unansweredCount}):</span>
            </div>
            {unsubmittedIndices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {unsubmittedIndices.map((num) => (
                  <span
                    key={num}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-rose-950/50 border border-rose-500/35 text-rose-300"
                  >
                    ✕ #{num}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-emerald-400 italic block pl-5">
                All questions have been answered!
              </span>
            )}
          </div>
        </div>

        {/* Warning Callout */}
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/25 text-xs text-amber-200/90 leading-relaxed">
          <strong>Important:</strong> Clicking <strong>&quot;OK to Submit and Quit&quot;</strong> will finalize your answers for Round {roundNumber}, release active problem locks, and return you to the dashboard. You will not be able to change these answers after submission.
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/20">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-[#141635] border border-purple-500/20 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Keep Working
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting &amp; Quitting...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                OK to Submit and Quit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
