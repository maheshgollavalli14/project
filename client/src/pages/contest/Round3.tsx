import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useContestStore } from '../../stores/contestStore.js';
import { Question, ContestRound } from '../../types/index.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { Timer } from '../../components/ui/Timer.js';
import { CodeEditor } from '../../components/CodeEditor.js';
import { AntiCheatGuard } from '../../components/AntiCheatGuard.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import { Terminal, Maximize2, CheckCircle2, Play, Send, ShieldAlert, Clock, ArrowLeft, CheckSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FinalSubmitModal } from '../../components/FinalSubmitModal.js';

export const Round3: React.FC = () => {
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
  const [consoleOutput, setConsoleOutput] = useState<any>(null);
  const [accessError, setAccessError] = useState<{
    code: string;
    message: string;
    cutoff?: number;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  useEffect(() => {
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
                  setLanguage(qList[0].savedState?.language || 'python');
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

    // 1. Save current question code before switching to prevent code mixing
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
    setConsoleOutput(null);
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
      setConsoleOutput({ ...res.data, isRun: true });
    } catch (err: any) {
      setConsoleOutput({ error: err.message, isRun: true });
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
      if (res.success) {
        setConsoleOutput({ isRun: false, submitted: true });
      }
    } catch (err: any) {
      setConsoleOutput({ error: err.message, isRun: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [submissionComplete, setSubmissionComplete] = useState(false);

  const handleFinalSubmit = async () => {
    if (!round) return;
    setIsFinalSubmitting(true);
    try {
      if (currentQ) {
        await api.post(`/api/questions/${currentQ.id}/save`, { code }).catch(() => {});
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
              Round 3 Submitted Successfully
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
    const isNotQualified = accessError.code === 'NOT_QUALIFIED';
    const isNotStarted = accessError.code === 'ROUND_NOT_STARTED';
    const isCompleted = accessError.code === 'ROUND_COMPLETED';

    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <GlassCard glow className="max-w-xl w-full p-8 text-center space-y-6 border border-purple-500/30">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-purple-950/60 border border-purple-500/30">
            {isLocked ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : isNotQualified ? (
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
              {isLocked
                ? 'Round 3 Submitted & Locked'
                : isNotQualified
                ? 'Access Restricted: Below Advancement Cutoff'
                : isNotStarted
                ? 'Round 3 Has Not Started Yet'
                : isCompleted
                ? 'Round 3 Has Concluded'
                : 'Arena Unavailable'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              {isLocked
                ? 'This round has already been submitted and is locked. You cannot reopen or view questions from this round.'
                : accessError.message}
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

          {/* Console Output Drawer */}
          {consoleOutput && (
            <div className="h-44 bg-[#0a0c20] border-t border-purple-500/20 p-4 overflow-y-auto text-xs font-mono space-y-2">
              {consoleOutput.isRun ? (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-purple-500/15">
                    <span className="font-bold text-white uppercase text-[10px]">
                      Run Output (Sample Tests)
                    </span>
                    {consoleOutput.totalTests !== undefined && consoleOutput.totalTests > 0 && (
                      <span className="font-mono text-purple-300 font-bold">
                        Sample Tests: {consoleOutput.passedTests ?? 0}/{consoleOutput.totalTests} passed
                      </span>
                    )}
                  </div>

                  {/* Sample test results */}
                  {consoleOutput.testResults?.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-slate-300">
                      <span>Sample Test #{i + 1}: {t.passed ? 'PASSED' : 'FAILED'}</span>
                      <span>{t.runtimeMs}ms</span>
                    </div>
                  ))}

                  {consoleOutput.errorOutput && (
                    <div className="text-rose-400 font-mono text-[11px] bg-rose-950/40 p-2 rounded">
                      {consoleOutput.errorOutput}
                    </div>
                  )}
                  {consoleOutput.error && (
                    <div className="text-rose-400 font-mono text-[11px] bg-rose-950/40 p-2 rounded">
                      {consoleOutput.error}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {consoleOutput.submitted && (
                    <div className="flex items-center gap-2 text-emerald-400 font-medium py-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Answer submitted successfully</span>
                    </div>
                  )}
                  {consoleOutput.error && (
                    <div className="text-rose-400 font-mono text-[11px] bg-rose-950/40 p-2 rounded">
                      {consoleOutput.error}
                    </div>
                  )}
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
