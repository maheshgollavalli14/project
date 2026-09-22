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
import { Bug, Puzzle, Play, Send, CheckCircle2, XCircle, Lock, ArrowLeft, ArrowRight, Clock, ShieldAlert, CheckSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FinalSubmitModal } from '../../components/FinalSubmitModal.js';

export const Round2: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setActiveRound, setRemainingSeconds, setProblemLock, activeLocks } = useContestStore();

  const [round, setRound] = useState<ContestRound | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalModalOpen, setIsFinalModalOpen] = useState(false);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [currentLockId, setCurrentLockId] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<{
    code: string;
    message: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  // Load Round 2 data & initialize socket
  useEffect(() => {
    const socket = getSocket();

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
                  // Try locking first question for team
                  requestLock(qList[0].id, roundDetails.data.round.contestId, roundDetails.data.round.id);
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

    // Socket events for real-time team locks
    socket.on('problem:lock-updated', ({ questionId, lockedBy, status }) => {
      if (status === 'ACTIVE' && lockedBy) {
        setProblemLock(questionId, {
          userId: lockedBy.userId,
          fullName: lockedBy.fullName,
          isLockedByMe: lockedBy.userId === user?.id,
          expiresAt: new Date(Date.now() + 45000).toISOString(),
        });
      } else {
        setProblemLock(questionId, null);
      }
    });

    return () => {
      socket.off('problem:lock-updated');
    };
  }, []);

  const currentQ = questions[currentIndex];

  const requestLock = async (questionId: string, contestId: string, roundId: string) => {
    setLockError(null);
    try {
      const res = await api.post('/api/team/problem-lock', {
        contestId,
        roundId,
        questionId,
      });

      if (res.data?.lock) {
        setCurrentLockId(res.data.lock.id);
      }
    } catch (err: any) {
      if (err.statusCode === 409) {
        setLockError(err.message || 'Problem is locked by teammate');
      }
    }
  };

  const handleSelectQuestion = (idx: number) => {
    // Release previous lock if team mode
    if (currentQ && round) {
      api.delete('/api/team/problem-lock', { data: { questionId: currentQ.id } }).catch(() => {});
    }

    setCurrentIndex(idx);
    const q = questions[idx];
    setCode(q.savedState?.code || q.initialCode || '');
    setRunResults(null);

    if (round) {
      requestLock(q.id, round.contestId, round.id);
    }
  };

  const handleRun = async (userCode: string, lang: string) => {
    if (!currentQ) return;
    setIsRunning(true);
    setRunResults(null);

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

    try {
      const res = await api.post(`/api/questions/${currentQ.id}/submit`, {
        code: userCode,
        language: lang,
      });
      setRunResults(res.data);
      if (res.data?.status === 'ACCEPTED') {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      setRunResults({ error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!round) return;
    setIsFinalSubmitting(true);
    try {
      if (currentQ) {
        await api.post(`/api/questions/${currentQ.id}/save`, { code }).catch(() => {});
        await api.delete('/api/team/problem-lock', { data: { questionId: currentQ.id } }).catch(() => {});
      }
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
      isAnswered = Boolean(code && code.trim().length > 0);
    } else {
      isAnswered = Boolean(
        (q.savedState?.code && q.savedState.code.trim().length > 0) ||
        (q.submissions && q.submissions.length > 0)
      );
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
              Round 2 • Debugging & Code Reconstruction
            </span>
            <h2 className="text-2xl font-black text-white">
              {isNotStarted
                ? 'Round 2 Has Not Started Yet'
                : isCompleted
                ? 'Round 2 Has Concluded'
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

              {currentQ.expectedOutput && (
                <div className="bg-[#12142f] p-3.5 rounded-xl border border-indigo-500/20 text-xs text-indigo-300 font-mono">
                  <span className="font-bold block text-slate-400 uppercase text-[10px] mb-1">
                    Expected Behavior / Target Output:
                  </span>
                  {currentQ.expectedOutput}
                </div>
              )}

              {/* Sample Test Results Drawer */}
              {runResults && (
                <div className="space-y-3 pt-4 border-t border-purple-500/15">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                      Execution Output:
                    </span>
                    <StatusBadge status={runResults.status || runResults.overallStatus || 'EXECUTED'} size="sm" />
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
                        <span className="font-bold">Test Case #{i + 1}</span>
                        <span>{t.runtimeMs}ms</span>
                      </div>
                      {t.input && <div>Input: {t.input}</div>}
                      {t.expectedOutput && <div>Expected: {t.expectedOutput}</div>}
                      {t.actualOutput && <div>Actual: {t.actualOutput}</div>}
                    </div>
                  ))}

                  {runResults.error && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
                      {runResults.error}
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          )}

          <QuestionNavigator
            questions={questions}
            currentQuestionIndex={currentIndex}
            onSelectQuestion={handleSelectQuestion}
          />
        </div>

        {/* Right Column: Monaco Code Editor */}
        <div className="lg:col-span-2 h-[650px]">
          <CodeEditor
            initialCode={code}
            onRun={handleRun}
            onSubmit={handleSubmit}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            lockWarning={lockError}
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
