import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useContestStore } from '../../stores/contestStore.js';
import { Question, ContestRound } from '../../types/index.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { Timer } from '../../components/ui/Timer.js';
import { CodeEditor } from '../../components/CodeEditor.js';
import { AntiCheatGuard } from '../../components/AntiCheatGuard.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import { Terminal, Maximize2, CheckCircle2, Lock, Play, Send, ShieldAlert, Clock, ArrowLeft, CheckSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FinalSubmitModal } from '../../components/FinalSubmitModal.js';

export const Round3: React.FC = () => {
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
  const [consoleOutput, setConsoleOutput] = useState<any>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<{
    code: string;
    message: string;
    cutoff?: number;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  useEffect(() => {
    const socket = getSocket();

    async function loadRound3() {
      try {
        const contestRes = await api.get('/api/contests/current');
        if (contestRes.success && contestRes.data?.contest?.rounds) {
          const r3 = contestRes.data.contest.rounds.find((r: any) => r.roundNumber === 3);
          if (r3) {
            try {
              const roundDetails = await api.get(`/api/rounds/${r3.id}`);
              if (roundDetails.success && roundDetails.data?.round) {
                setRound(roundDetails.data.round);
                setActiveRound(roundDetails.data.round);
                setRemainingSeconds(roundDetails.data.round.remainingSeconds || 0);
                const qList = roundDetails.data.round.questions || [];
                setQuestions(qList);

                if (qList.length > 0) {
                  setCode(qList[0].savedState?.code || qList[0].initialCode || '');
                  requestLock(qList[0].id, roundDetails.data.round.contestId, roundDetails.data.round.id);
                }
              }
            } catch (err: any) {
              setAccessError({
                code: err.code || (err.statusCode === 403 ? 'FORBIDDEN' : 'ERROR'),
                message: err.message || 'Access to Round 3 is currently restricted.',
                cutoff: err.cutoff,
                startTime: err.startTime || r3.startTime,
                endTime: err.endTime || r3.endTime,
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to load Round 3:', e);
      }
    }

    loadRound3();

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
      await api.post('/api/team/problem-lock', { contestId, roundId, questionId });
    } catch (err: any) {
      if (err.statusCode === 409) {
        setLockError(err.message || 'Locked by teammate');
      }
    }
  };

  const handleSelectQuestion = (idx: number) => {
    if (currentQ && round) {
      api.delete('/api/team/problem-lock', { data: { questionId: currentQ.id } }).catch(() => {});
    }

    setCurrentIndex(idx);
    const q = questions[idx];
    setCode(q.savedState?.code || q.initialCode || '');
    setConsoleOutput(null);

    if (round) {
      requestLock(q.id, round.contestId, round.id);
    }
  };

  const handleRun = async (userCode: string, lang: string) => {
    if (!currentQ) return;
    setIsRunning(true);
    setConsoleOutput(null);

    try {
      const res = await api.post(`/api/questions/${currentQ.id}/run`, {
        code: userCode,
        language: lang,
      });
      setConsoleOutput(res.data);
    } catch (err: any) {
      setConsoleOutput({ error: err.message });
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
      setConsoleOutput(res.data);
      if (res.data?.status === 'ACCEPTED') {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
      }
    } catch (err: any) {
      setConsoleOutput({ error: err.message });
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
    const isNotQualified = accessError.code === 'NOT_QUALIFIED';
    const isNotStarted = accessError.code === 'ROUND_NOT_STARTED';
    const isCompleted = accessError.code === 'ROUND_COMPLETED';

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <GlassCard glow className="max-w-xl w-full p-8 text-center space-y-6 border border-purple-500/30">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-purple-950/60 border border-purple-500/30">
            {isNotQualified ? (
              <ShieldAlert className="w-8 h-8 text-rose-400" />
            ) : isNotStarted ? (
              <Clock className="w-8 h-8 text-purple-400" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              Round 3 • Grand Finale Workstation
            </span>
            <h2 className="text-2xl font-black text-white">
              {isNotQualified
                ? 'Access Restricted: Below Advancement Cutoff'
                : isNotStarted
                ? 'Round 3 Has Not Started Yet'
                : isCompleted
                ? 'Round 3 Has Concluded'
                : 'Arena Unavailable'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              {accessError.message}
            </p>
          </div>

          {isNotQualified && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs text-rose-200 text-left space-y-1">
              <span className="font-bold block text-rose-300">Qualification Cutoff Rule:</span>
              <p>
                Only the Top {accessError.cutoff || 20} ranked contestants from Rounds 1 & 2 are permitted to compete in the Grand Finale. Submissions and question viewing for non-qualified candidates are locked.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-purple-500/15 flex items-center justify-center gap-3">
            <Link to="/dashboard">
              <GradientButton size="md" variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Return to Dashboard
              </GradientButton>
            </Link>
            <Link to="/leaderboard">
              <GradientButton size="md" variant="primary">
                View Championship Standings
              </GradientButton>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-[#060712] overflow-hidden">
      {round && <AntiCheatGuard contestId={round.contestId} roundId={round.id} />}

      {/* Top Navigation Strip */}
      <div className="h-14 bg-[#0a0c20] border-b border-purple-500/20 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-white text-sm">
            Round 3: Grand Competitive Finale
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Timer />
          {round?.isFinalized ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answers Sealed &amp; Finalized</span>
            </div>
          ) : (
            <button
              onClick={() => setIsFinalModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 border border-rose-500/30 shadow-md shadow-rose-950/50 transition-all"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Final Submit</span>
            </button>
          )}
          <button
            onClick={() => {
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#141638] border border-purple-500/20"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Pane Desktop Layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* LEFT PANE: Problem List (Cols 1-2) */}
        <div className="col-span-12 md:col-span-3 lg:col-span-2 bg-[#090b1c] border-r border-purple-500/15 overflow-y-auto p-3 space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400/80 px-2 block">
            Challenge Roster
          </span>
          {questions.map((q, idx) => {
            const isSelected = idx === currentIndex;
            const isLocked = activeLocks[q.id] && !activeLocks[q.id].isLockedByMe;

            return (
              <div
                key={q.id}
                onClick={() => handleSelectQuestion(idx)}
                className={`cursor-pointer p-3 rounded-xl border transition-all text-xs ${
                  isSelected
                    ? 'bg-purple-600/20 border-purple-400 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                    : 'bg-[#111328] border-purple-500/10 text-slate-400 hover:border-purple-500/30 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold">P{idx + 1}</span>
                  <StatusBadge status={q.difficulty} size="sm" />
                </div>
                <div className="font-semibold text-white truncate">{q.title}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                  <span>{q.points} Pts</span>
                  {isLocked && <span className="text-rose-400 flex items-center gap-0.5"><Lock className="w-3 h-3" /> Locked</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER PANE: Problem Statement & Specs (Cols 3-6) */}
        <div className="col-span-12 md:col-span-4 lg:col-span-4 bg-[#0c0e22] border-r border-purple-500/15 overflow-y-auto p-6 space-y-6">
          {currentQ && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-purple-400 font-bold">
                    Problem {currentIndex + 1}
                  </span>
                  <StatusBadge status={currentQ.difficulty} size="sm" />
                </div>
                <h2 className="text-2xl font-black text-white">{currentQ.title}</h2>
              </div>

              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {currentQ.description}
              </div>

              {currentQ.constraints && (
                <div className="bg-[#12142d] p-4 rounded-xl border border-purple-500/15 space-y-1">
                  <span className="text-xs font-mono font-bold text-purple-300 uppercase block">Constraints:</span>
                  <p className="text-xs font-mono text-slate-300">{currentQ.constraints}</p>
                </div>
              )}

              {/* Sample Test Cases */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-purple-300 uppercase block">
                  Sample Examples:
                </span>
                {currentQ.testCases?.filter((t) => t.isPublic).map((tc, idx) => (
                  <div key={idx} className="bg-[#101228] p-3 rounded-xl border border-purple-500/15 text-xs font-mono space-y-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Input:</span>
                      <pre className="text-slate-300 bg-[#080916] p-2 rounded">{tc.input}</pre>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Expected Output:</span>
                      <pre className="text-emerald-400 bg-[#080916] p-2 rounded">{tc.expectedOutput}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Code Editor & Console Drawer (Cols 7-12) */}
        <div className="col-span-12 md:col-span-5 lg:col-span-6 flex flex-col h-full bg-[#080a18]">
          <div className="flex-1 relative">
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

          {/* Console Output Drawer */}
          {consoleOutput && (
            <div className="h-44 bg-[#0a0c20] border-t border-purple-500/20 p-4 overflow-y-auto text-xs font-mono space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/15">
                <span className="font-bold text-purple-300 uppercase text-[10px]">Console Output:</span>
                <StatusBadge status={consoleOutput.status || consoleOutput.overallStatus || 'RESULT'} size="sm" />
              </div>

              {consoleOutput.testResults?.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-slate-300">
                  <span>Test #{i + 1}: {t.passed ? 'PASSED' : 'FAILED'}</span>
                  <span>{t.runtimeMs}ms</span>
                </div>
              ))}

              {consoleOutput.score !== undefined && (
                <div className="text-white font-bold">
                  Score Earned: {consoleOutput.score} / {currentQ?.points}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Final Round Submission Confirmation Modal */}
      <FinalSubmitModal
        isOpen={isFinalModalOpen}
        onClose={() => setIsFinalModalOpen(false)}
        onConfirm={handleFinalSubmit}
        roundTitle={round?.title || 'Round 3: Grand Competitive Finale'}
        roundNumber={3}
        totalQuestions={questions.length}
        submittedIndices={submittedIndices}
        unsubmittedIndices={unsubmittedIndices}
        isSubmitting={isFinalSubmitting}
      />
    </div>
  );
};
