import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useContestStore } from '../../stores/contestStore.js';
import { Question, ContestRound } from '../../types/index.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { Timer } from '../../components/ui/Timer.js';
import { QuestionNavigator } from '../../components/QuestionNavigator.js';
import { CodeEditor } from '../../components/CodeEditor.js';
import { AntiCheatGuard } from '../../components/AntiCheatGuard.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { Bookmark, Save, Send, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Clock, ShieldAlert, CheckSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FinalSubmitModal } from '../../components/FinalSubmitModal.js';

export const Round1: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setActiveRound, setRemainingSeconds } = useContestStore();

  const [round, setRound] = useState<ContestRound | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string>('');
  const [isMarked, setIsMarked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalModalOpen, setIsFinalModalOpen] = useState(false);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null);
  const [accessError, setAccessError] = useState<{
    code: string;
    message: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Load Round 1 questions
  useEffect(() => {
    async function loadRound() {
      try {
        const contestRes = await api.get('/api/contests/current');
        if (contestRes.success && contestRes.data?.contest?.rounds) {
          const r1 = contestRes.data.contest.rounds.find((r: any) => r.roundNumber === 1);
          if (r1) {
            try {
              const roundDetails = await api.get(`/api/rounds/${r1.id}`);
              if (roundDetails.success && roundDetails.data?.round) {
                setRound(roundDetails.data.round);
                setActiveRound(roundDetails.data.round);
                setRemainingSeconds(roundDetails.data.round.remainingSeconds || 0);
                const qList = roundDetails.data.round.questions || [];
                setQuestions(qList);

                if (qList.length > 0) {
                  const first = qList[0];
                  setSelectedOption(first.savedState?.selectedOptionId || null);
                  setCurrentCode(first.savedState?.code || first.initialCode || '');
                  setIsMarked(Boolean(first.savedState?.markedForReview));
                }
              }
            } catch (err: any) {
              setAccessError({
                code: err.code || (err.statusCode === 403 ? 'FORBIDDEN' : 'ERROR'),
                message: err.message || 'Access to Round 1 is currently restricted.',
                startTime: err.startTime || r1.startTime,
                endTime: err.endTime || r1.endTime,
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to load Round 1:', e);
      }
    }
    loadRound();
  }, []);

  const currentQ = questions[currentIndex];

  const handleSelectQuestion = (idx: number) => {
    setCurrentIndex(idx);
    const q = questions[idx];
    setSelectedOption(q.savedState?.selectedOptionId || null);
    setCurrentCode(q.savedState?.code || q.initialCode || '');
    setIsMarked(Boolean(q.savedState?.markedForReview));
    setSubmissionFeedback(null);
  };

  const handleSaveState = async () => {
    if (!currentQ) return;
    setIsSaving(true);
    try {
      await api.post(`/api/questions/${currentQ.id}/save`, {
        code: currentCode,
        selectedOptionId: selectedOption,
        markedForReview: isMarked,
      });

      // Update local question state
      const updated = [...questions];
      updated[currentIndex].savedState = {
        questionId: currentQ.id,
        code: currentCode,
        selectedOptionId: selectedOption,
        markedForReview: isMarked,
      };
      setQuestions(updated);
    } catch (e) {
      console.error('Autosave error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!currentQ) return;
    setIsSubmitting(true);
    setSubmissionFeedback(null);

    try {
      const payload: any = {};
      if (currentQ.type === 'MCQ' || (currentQ.type === 'OUTPUT_PREDICTION' && currentQ.options && currentQ.options.length > 0)) {
        payload.selectedOptionId = selectedOption;
      } else {
        payload.code = currentCode;
        payload.language = 'python';
      }

      const res = await api.post(`/api/questions/${currentQ.id}/submit`, payload);
      if (res.success && res.data) {
        setSubmissionFeedback(res.data);
        if (res.data.status === 'ACCEPTED') {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }
        await handleSaveState();
      }
    } catch (err: any) {
      setSubmissionFeedback({ error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!round) return;
    setIsFinalSubmitting(true);
    try {
      await handleSaveState();
      const res = await api.post(`/api/rounds/${round.id}/finalize`);
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to finalize round');
    } finally {
      setIsFinalSubmitting(false);
      setIsFinalModalOpen(false);
    }
  };

  const submittedIndices: number[] = [];
  const unsubmittedIndices: number[] = [];

  questions.forEach((q, idx) => {
    let isAnswered = false;
    if (idx === currentIndex) {
      if (q.type === 'MCQ' || (q.type === 'OUTPUT_PREDICTION' && q.options && q.options.length > 0)) {
        isAnswered = Boolean(selectedOption);
      } else {
        isAnswered = Boolean(currentCode && currentCode.trim().length > 0);
      }
    } else {
      if (q.type === 'MCQ' || (q.type === 'OUTPUT_PREDICTION' && q.options && q.options.length > 0)) {
        isAnswered = Boolean(q.savedState?.selectedOptionId);
      } else {
        isAnswered = Boolean(q.savedState?.code && q.savedState.code.trim().length > 0);
      }
    }

    if (isAnswered) {
      submittedIndices.push(idx + 1);
    } else {
      unsubmittedIndices.push(idx + 1);
    }
  });

  if (accessError) {
    const isNotStarted = accessError.code === 'ROUND_NOT_STARTED';
    const isCompleted = accessError.code === 'ROUND_COMPLETED';

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <GlassCard glow className="max-w-xl w-full p-8 text-center space-y-6 border border-purple-500/30">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-purple-950/60 border border-purple-500/30">
            {isNotStarted ? (
              <Clock className="w-8 h-8 text-purple-400" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-8 h-8 text-slate-400" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-rose-400" />
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              Round 1 • Rapid Code & Logic Sprint
            </span>
            <h2 className="text-2xl font-black text-white">
              {isNotStarted
                ? 'Round 1 Has Not Started Yet'
                : isCompleted
                ? 'Round 1 Has Concluded'
                : 'Arena Unavailable'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              {accessError.message}
            </p>
          </div>

          <div className="pt-4 border-t border-purple-500/15 flex items-center justify-center gap-3">
            <Link to="/dashboard">
              <GradientButton size="md" variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Return to Dashboard
              </GradientButton>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {round && <AntiCheatGuard contestId={round.contestId} roundId={round.id} />}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a0c20] p-4 rounded-2xl border border-purple-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-mono font-bold">
            R1
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              Round 1: Rapid Code & Logic Sprint
            </h2>
            <span className="text-xs font-mono text-purple-400">
              Question {currentIndex + 1} of {questions.length} • {currentQ?.points || 0} Points
            </span>
          </div>
        </div>

        {/* Server Authoritative Timer & Action Buttons */}
        <div className="flex items-center gap-3">
          <Timer />
          <button
            onClick={() => {
              setIsMarked(!isMarked);
              handleSaveState();
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isMarked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#141635] text-slate-400 border-purple-500/20 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isMarked ? 'Marked' : 'Mark for Review'}</span>
          </button>

          {round?.isFinalized ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answers Sealed &amp; Finalized</span>
            </div>
          ) : (
            <button
              onClick={() => setIsFinalModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 border border-rose-500/30 shadow-md shadow-rose-950/50 transition-all"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Final Submit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Question Details & Options / Editor */}
        <div className="lg:col-span-3 space-y-6">
          {currentQ && (
            <GlassCard className="p-6 space-y-6">
              {/* Question Statement */}
              <div className="space-y-3 pb-4 border-b border-purple-500/15">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{currentQ.title}</h3>
                  <StatusBadge status={currentQ.difficulty} size="sm" />
                </div>
                <div className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {currentQ.description}
                </div>
                {currentQ.constraints && (
                  <div className="bg-[#12142f] p-3 rounded-xl border border-purple-500/15 text-xs text-purple-300 font-mono">
                    <strong>Constraints:</strong> {currentQ.constraints}
                  </div>
                )}
              </div>

              {/* Multiple Choice Options (for MCQ or Output Prediction with options) */}
              {(currentQ.type === 'MCQ' || (currentQ.type === 'OUTPUT_PREDICTION' && currentQ.options && currentQ.options.length > 0)) && (
                <div className="space-y-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 block">
                    Select Your Answer:
                  </span>
                  <div className="space-y-2.5">
                    {currentQ.options?.map((opt) => {
                      const isSelected = selectedOption === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setSelectedOption(opt.id)}
                          className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center gap-3 text-xs ${
                            isSelected
                              ? 'bg-purple-600/25 border-purple-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                              : 'bg-[#12142d] border-purple-500/15 text-slate-300 hover:border-purple-500/40 hover:bg-[#181b3c]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-purple-400 bg-purple-600' : 'border-slate-500'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="font-mono text-xs">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Written Output Prediction Write-in Box */}
              {currentQ.type === 'OUTPUT_PREDICTION' && (!currentQ.options || currentQ.options.length === 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 block">
                      Write Output of Given Code:
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">Type exact console output</span>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={currentCode}
                      onChange={(e) => setCurrentCode(e.target.value)}
                      placeholder="e.g. [4, 4, 4] or expected output string..."
                      className="w-full bg-[#12142d] border border-purple-500/30 rounded-xl p-3 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-purple-400 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 italic">
                      Tip: Whitespace at ends will be automatically trimmed during grading.
                    </p>
                  </div>
                </div>
              )}

              {/* Code Editor for Coding Question in Round 1 */}
              {currentQ.type === 'CODING' && (
                <div className="h-[450px]">
                  <CodeEditor
                    initialCode={currentCode}
                    onChange={(val) => setCurrentCode(val)}
                    onRun={async (code, lang) => {
                      const res = await api.post(`/api/questions/${currentQ.id}/run`, {
                        code,
                        language: lang,
                      });
                      setSubmissionFeedback(res.data);
                    }}
                    onSubmit={handleSubmitQuestion}
                    isSubmitting={isSubmitting}
                  />
                </div>
              )}

              {/* Submission Feedback Result Box */}
              {submissionFeedback && (
                <div
                  className={`p-4 rounded-2xl border text-xs ${
                    submissionFeedback.status === 'ACCEPTED'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 font-bold">
                    <span>Result: {submissionFeedback.status || 'Processed'}</span>
                    {submissionFeedback.score !== undefined && (
                      <span className="font-mono">
                        Score Awarded: {submissionFeedback.score} / {currentQ.points}
                      </span>
                    )}
                  </div>
                  {submissionFeedback.error && <p>{submissionFeedback.error}</p>}
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="flex items-center justify-between pt-4 border-t border-purple-500/15">
                <GradientButton
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveState}
                  isLoading={isSaving}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save Draft
                </GradientButton>

                <div className="flex items-center gap-3">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => handleSelectQuestion(currentIndex - 1)}
                    className="p-2 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <GradientButton
                    size="sm"
                    onClick={handleSubmitQuestion}
                    isLoading={isSubmitting}
                    rightIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Submit Answer
                  </GradientButton>

                  <button
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => handleSelectQuestion(currentIndex + 1)}
                    className="p-2 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right 1 Col: Question Navigator Grid */}
        <div className="space-y-6">
          <QuestionNavigator
            questions={questions}
            currentQuestionIndex={currentIndex}
            onSelectQuestion={handleSelectQuestion}
          />
        </div>
      </div>

      {/* Final Round Submission Confirmation Modal */}
      <FinalSubmitModal
        isOpen={isFinalModalOpen}
        onClose={() => setIsFinalModalOpen(false)}
        onConfirm={handleFinalSubmit}
        roundTitle={round?.title || 'Round 1: Rapid Code & Logic Sprint'}
        roundNumber={1}
        totalQuestions={questions.length}
        submittedIndices={submittedIndices}
        unsubmittedIndices={unsubmittedIndices}
        isSubmitting={isFinalSubmitting}
      />
    </div>
  );
};
