import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useContestStore } from '../../stores/contestStore.js';
import { Question, ContestRound } from '../../types/index.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { Timer } from '../../components/ui/Timer.js';
import { QuestionNavigator } from '../../components/QuestionNavigator.js';
import { CodeEditor } from '../../components/CodeEditor.js';
import { AntiCheatGuard } from '../../components/AntiCheatGuard.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import { Bug, Puzzle, Play, Send, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Clock, ShieldAlert, CheckSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FinalSubmitModal } from '../../components/FinalSubmitModal.js';

export const Round2: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setActiveRound, setRemainingSeconds } = useContestStore();

  const [round, setRound] = useState<ContestRound | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<string>('python');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalModalOpen, setIsFinalModalOpen] = useState(false);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [accessError, setAccessError] = useState<{
    code: string;
    message: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Load Round 2 data
  useEffect(() => {
    async function loadRound() {
      try {
        const contestRes = await api.get('/api/contests/current');
        if (contestRes.success && contestRes.data?.contest?.rounds) {
          const r2 = contestRes.data.contest.rounds.find((r: any) => r.roundNumber === 2);
          if (r2) {
            try {
              const roundDetails = await api.get(`/api/rounds/${r2.id}`);
              if (roundDetails.success && roundDetails.data?.round) {
                setRound(roundDetails.data.round);
                setActiveRound(roundDetails.data.round);
                setRemainingSeconds(roundDetails.data.round.remainingSeconds || 0);
                const qList = roundDetails.data.round.questions || [];
                setQuestions(qList);

                if (qList.length > 0) {
                  setCode(qList[0].savedState?.code || qList[0].initialCode || '');
                  setLanguage(qList[0].savedState?.language || 'python');
                }
              }
            } catch (err: any) {
              setAccessError({
                code: err.code || (err.statusCode === 403 ? 'FORBIDDEN' : 'ERROR'),
                message: err.message || 'Access to Round 2 is currently restricted.',
                startTime: err.startTime || r2.startTime,
                endTime: err.endTime || r2.endTime,
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to load Round 2:', e);
      }
    }

    loadRound();
  }, []);

  const currentQ = questions[currentIndex];

  // Debounced autosave effect for code changes
  useEffect(() => {
    if (!currentQ) return;
    const timer = setTimeout(() => {
      api.post(`/api/questions/${currentQ.id}/save`, { code, language }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [code, language, currentQ?.id]);

  const handleSelectQuestion = (idx: number) => {
    if (idx === currentIndex) return;

    // 1. Save current question code before switching
    if (currentQ) {
      const updated = [...questions];
      updated[currentIndex].savedState = {
        ...updated[currentIndex].savedState,
        questionId: currentQ.id,
        code,
        language,
      };
      setQuestions(updated);

      api.post(`/api/questions/${currentQ.id}/save`, { code, language }).catch(() => {});
    }

    // 2. Switch to target question with isolated code
    setCurrentIndex(idx);
    const q = questions[idx];
    setCode(q.savedState?.code || q.initialCode || '');
    setLanguage(q.savedState?.language || 'python');
    setRunResults(null);
    setSubmissionFeedback(null);
  };

  const handleRun = async (userCode: string, lang: string) => {
    if (!currentQ) return;
    setIsRunning(true);
    setRunResults(null);
    setSubmissionFeedback(null);

    try {
      const res = await api.post(`/api/questions/${currentQ.id}/run`, {
        code: userCode,
        language: lang,
      });
      setRunResults(res.data);
    } catch (err: any) {
      setRunResults({ error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async (userCode: string, lang: string) => {
    if (!currentQ) return;
    setIsSubmitting(true);
    setRunResults(null);
    setSubmissionFeedback(null);

    try {
      const res = await api.post(`/api/questions/${currentQ.id}/submit`, {
        code: userCode,
        language: lang,
      });
      if (res.success) {
        setSubmissionFeedback({ submitted: true });
        setSubmittedQuestions((prev) => new Set(prev).add(currentQ.id));
      }
    } catch (err: any) {
      setSubmissionFeedback({ error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQuestionAttempted = (q: Question, idx: number): boolean => {
    // 1. If officially submitted, it is attempted
    if (
      submittedQuestions.has(q.id) ||
      (q.submissions && q.submissions.length > 0) ||
      (idx === currentIndex && submissionFeedback?.submitted)
    ) {
      return true;
    }

    // 2. Check the code for this question
    const currentCode = idx === currentIndex ? code : q.savedState?.code;
    if (!currentCode) {
      return false;
    }

    const normalize = (str?: string | null) => (str || '').replace(/\r\n/g, '\n').trim();
    const normalizedCurrent = normalize(currentCode);

    if (normalizedCurrent.length === 0) {
      return false;
    }

    const initial = normalize(q.initialCode);

    // 3. If there is initial starter code, it is only attempted if modified
    if (initial.length > 0) {
      return normalizedCurrent !== initial;
    }

    // 4. If there was no initial starter code, any non-empty code is an attempt
    return normalizedCurrent.length > 0;
  };

  const [submissionComplete, setSubmissionComplete] = useState(false);

  const handleFinalSubmit = async () => {
    if (!round) return;
    setIsFinalSubmitting(true);
    try {
      if (currentQ) {
        await api.post(`/api/questions/${currentQ.id}/save`, { code, language }).catch(() => {});
      }
      const res = await api.post(`/api/rounds/${round.id}/finalize`);
      if (res.success) {
        setSubmissionComplete(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2200);
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
    const isAnswered = isQuestionAttempted(q, idx);

    if (isAnswered) {
      submittedIndices.push(idx + 1);
    } else {
      unsubmittedIndices.push(idx + 1);
    }
  });

  if (submissionComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <GlassCard glow className="max-w-xl w-full p-8 text-center space-y-6 border border-emerald-500/40">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-emerald-950/60 border border-emerald-500/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              Submission Confirmed
            </span>
            <h2 className="text-2xl font-black text-white">
              Round 2 Submitted Successfully
            </h2>
            <p className="text-sm font-medium text-slate-200">
              This round is now locked and cannot be reopened.
            </p>
            <p className="text-xs text-slate-400 pt-2">
              Redirecting you to the dashboard...
            </p>
          </div>
          <div className="pt-4 border-t border-purple-500/15 flex items-center justify-center">
            <Link to="/dashboard">
              <GradientButton size="md" variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Go to Dashboard
              </GradientButton>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (accessError) {
    const isLocked = accessError.code === 'ROUND_LOCKED' || accessError.code === 'ROUND_SUBMITTED';
    const isNotStarted = accessError.code === 'ROUND_NOT_STARTED';
    const isCompleted = accessError.code === 'ROUND_COMPLETED';

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <GlassCard glow className="max-w-xl w-full p-8 text-center space-y-6 border border-purple-500/30">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-purple-950/60 border border-purple-500/30">
            {isLocked ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : isNotStarted ? (
              <Clock className="w-8 h-8 text-purple-400" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-8 h-8 text-slate-400" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-rose-400" />
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              Round 2 • Debugging & Code Reconstruction
            </span>
            <h2 className="text-2xl font-black text-white">
              {isLocked
                ? 'Round 2 Submitted & Locked'
                : isNotStarted
                ? 'Round 2 Has Not Started Yet'
                : isCompleted
                ? 'Round 2 Has Concluded'
                : 'Arena Unavailable'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              {isLocked
                ? 'This round has already been submitted and is locked. You cannot reopen or view questions from this round.'
                : accessError.message}
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
      {round && (
        <AntiCheatGuard
          contestId={round.contestId}
          roundId={round.id}
          questionId={currentQ?.id}
          initialExitCount={(round as any).fullscreenExitCount || 0}
          onBeforeFullscreenExit={async () => {
            if (currentQ) {
              await api.post(`/api/questions/${currentQ.id}/save`, { code, language }).catch(() => {});
            }
          }}
          onAutoSubmit={() => {
            setSubmissionComplete(true);
            setTimeout(() => navigate('/dashboard'), 2500);
          }}
        />
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a0c20] p-4 rounded-2xl border border-purple-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-mono font-bold">
            R2
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              Round 2: Jumbled Code & Debugging Arena
            </h2>
            <span className="text-xs font-mono text-indigo-400">
              Question {currentIndex + 1} of {questions.length} • {currentQ?.points || 0} Points
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Timer />
          {round?.isFinalized ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answers Sealed &amp; Finalized</span>
            </div>
          ) : (
            <button
              onClick={() => setIsFinalModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 border border-rose-500/30 shadow-md shadow-rose-950/50 transition-all"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Final Submit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Problem details, expectations, test outcomes */}
        <div className="lg:col-span-2 space-y-6">
          {currentQ && (
            <GlassCard className="p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-purple-500/15">
                <div className="flex items-center gap-2">
                  {currentQ.type === 'DEBUGGING' ? (
                    <Bug className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Puzzle className="w-5 h-5 text-indigo-400" />
                  )}
                  <h3 className="text-lg font-bold text-white">{currentQ.title}</h3>
                </div>
                <StatusBadge status={currentQ.difficulty} size="sm" />
              </div>

              <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {currentQ.description}
              </div>

              {/* Sample Test Results Drawer for Run Code */}
              {runResults && (
                <div className="space-y-3 pt-4 border-t border-purple-500/15">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                      Sample Test Output:
                    </span>
                  </div>

                  {runResults.testResults?.map((t: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                        t.passed
                          ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/25 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Sample Case #{i + 1}</span>
                        <span>{t.runtimeMs}ms</span>
                      </div>
                      {t.input && <div>Input: {t.input}</div>}
                      {t.actualOutput && <div>Output: {t.actualOutput}</div>}
                    </div>
                  ))}

                  {runResults.error && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
                      {runResults.error}
                    </div>
                  )}
                </div>
              )}

              {/* Official Submission Result Box */}
              {submissionFeedback && (
                <div className="pt-4 border-t border-purple-500/15">
                  <div className="p-3.5 rounded-2xl border text-xs bg-[#101228] border-purple-500/30 text-purple-200">
                    {submissionFeedback.submitted && (
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Answer submitted successfully</span>
                      </div>
                    )}
                    {submissionFeedback.error && (
                      <p className="text-rose-300 font-mono text-[11px] bg-rose-950/40 p-2 rounded">
                        {submissionFeedback.error}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          <QuestionNavigator
            questions={questions}
            currentQuestionIndex={currentIndex}
            onSelectQuestion={handleSelectQuestion}
            isAttempted={isQuestionAttempted}
          />
        </div>

        {/* Right Column: Monaco Code Editor */}
        <div className="lg:col-span-2 h-[650px]">
          <CodeEditor
            key={currentQ?.id}
            initialCode={code}
            language={language}
            onLanguageChange={(newLang) => setLanguage(newLang)}
            onRun={handleRun}
            onSubmit={handleSubmit}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            onChange={(val) => setCode(val)}
          />
        </div>
      </div>

      {/* Final Round Submission Confirmation Modal */}
      <FinalSubmitModal
        isOpen={isFinalModalOpen}
        onClose={() => setIsFinalModalOpen(false)}
        onConfirm={handleFinalSubmit}
        roundTitle={round?.title || 'Round 2: Jumbled Code & Debugging Arena'}
        roundNumber={2}
        totalQuestions={questions.length}
        submittedIndices={submittedIndices}
        unsubmittedIndices={unsubmittedIndices}
        isSubmitting={isFinalSubmitting}
      />
    </div>
  );
};
