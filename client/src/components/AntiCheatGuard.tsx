import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useContestStore } from '../stores/contestStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { ShieldAlert, Maximize2, AlertTriangle, ArrowLeft, Lock, Clock } from 'lucide-react';
import { GradientButton } from './ui/GradientButton.js';

interface AntiCheatGuardProps {
  contestId: string;
  roundId?: string;
  questionId?: string;
  enableFullscreen?: boolean;
  initialExitCount?: number;
  onBeforeFullscreenExit?: () => Promise<void>;
  onAutoSubmit?: () => void;
}

interface ToastNotification {
  id: string;
  type: string;
  message: string;
}

export const AntiCheatGuard: React.FC<AntiCheatGuardProps> = ({
  contestId,
  roundId,
  questionId,
  enableFullscreen = true,
  initialExitCount = 0,
  onBeforeFullscreenExit,
  onAutoSubmit,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { violationsCount, incrementViolations } = useContestStore();

  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);

  // Authoritative server-synced fullscreen exit count
  const [fullscreenCount, setFullscreenCount] = useState<number>(initialExitCount);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState<boolean>(initialExitCount >= 3);

  // 10-second Return Countdown State
  const [countdownSeconds, setCountdownSeconds] = useState<number>(10);
  const [countdownDeadline, setCountdownDeadline] = useState<number | null>(null);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);
  const countdownIntervalRef = useRef<any>(null);

  // Modals for major events (FULLSCREEN_EXIT, DEVTOOLS)
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningType, setWarningType] = useState('');

  // Toasts are for minor events (BLUR, TAB_SWITCH, COPY, PASTE, CUT, CONTEXT_MENU)
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const lastViolationTime = useRef<Record<string, number>>({});

  const clearReturnCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownDeadline(null);
    setCountdownSeconds(10);
  }, []);

  const startReturnCountdown = useCallback(
    (deadlineMs?: number) => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      const targetDeadline = deadlineMs || Date.now() + 10000;
      setCountdownDeadline(targetDeadline);
      setCountdownSeconds(10);
      setIsTimeout(false);

      countdownIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const remainingMs = targetDeadline - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        setCountdownSeconds(remainingSec);

        if (remainingSec <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setIsTimeout(true);
          setIsAutoSubmitted(true);
          api.post('/api/violations/fullscreen-timeout', { roundId, contestId }).catch(() => {});
          if (onAutoSubmit) {
            onAutoSubmit();
          }
        }
      }, 250);
    },
    [roundId, contestId, onAutoSubmit]
  );

  const handleFullscreenReturn = useCallback(async () => {
    try {
      const res = await api.post('/api/violations/fullscreen-return', { roundId, contestId });
      const data = res?.data?.data || res?.data;
      if (data?.resumed) {
        clearReturnCountdown();
        setWarningModalOpen(false);
      } else if (data?.isAutoSubmitted) {
        clearReturnCountdown();
        setIsAutoSubmitted(true);
        setIsTimeout(true);
        if (onAutoSubmit) onAutoSubmit();
      }
    } catch (err: any) {
      if (err?.code === 'ROUND_LOCKED' || err?.isLocked) {
        clearReturnCountdown();
        setIsAutoSubmitted(true);
        setIsTimeout(true);
        if (onAutoSubmit) onAutoSubmit();
      }
    }
  }, [roundId, contestId, clearReturnCountdown, onAutoSubmit]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Synchronize initialExitCount if it updates from parent load
  useEffect(() => {
    if (initialExitCount != null && initialExitCount > 0) {
      setFullscreenCount(initialExitCount);
      if (initialExitCount >= 3) {
        setIsAutoSubmitted(true);
      }
    }
  }, [initialExitCount]);

  // Admins are exempt from anti-cheat restrictions
  const isAdmin = user?.role === 'ADMIN';

  const showToast = useCallback((msg: string, type: string, duration = 3500) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message: msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const reportViolation = useCallback(
    async (type: string, metadata: any = {}) => {
      if (isAdmin) return null;

      const now = Date.now();
      // Throttle duplicate violations of same type within 2.5 seconds
      if (lastViolationTime.current[type] && now - lastViolationTime.current[type] < 2500) {
        return null;
      }
      lastViolationTime.current[type] = now;

      try {
        incrementViolations();
        const res = await api.post('/api/violations', {
          contestId,
          roundId,
          questionId,
          type,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          },
        });
        return res;
      } catch (e: any) {
        if (e?.code === 'ROUND_LOCKED' || e?.isLocked) {
          setIsAutoSubmitted(true);
          return { data: { isAutoSubmitted: true, isLocked: true, fullscreenExitCount: 3 } };
        }
        return null;
      }
    },
    [isAdmin, contestId, roundId, questionId, incrementViolations]
  );

  const triggerModalWarning = useCallback(
    (msg: string, type: string) => {
      if (isAdmin) return;
      setWarningMessage(msg);
      setWarningType(type);
      setWarningModalOpen(true);
      reportViolation(type, { message: msg });
    },
    [isAdmin, reportViolation]
  );

  /**
   * Request real browser fullscreen on documentElement and strictly verify document.fullscreenElement !== null
   */
  const handleEnterFullscreen = useCallback(() => {
    if (isAutoSubmitted || fullscreenCount >= 3 || isTimeout) return;

    const elem = document.documentElement;
    const requestMethod =
      elem.requestFullscreen ||
      (elem as any).webkitRequestFullscreen ||
      (elem as any).mozRequestFullScreen ||
      (elem as any).msRequestFullscreen;

    if (requestMethod) {
      Promise.resolve(requestMethod.call(elem))
        .then(() => {
          if (document.fullscreenElement !== null) {
            setIsFullscreen(true);
            setFullscreenBlocked(false);
            setHasEnteredFullscreen(true);
            handleFullscreenReturn();
          }
        })
        .catch((err) => {
          console.warn('Fullscreen request failed or was dismissed:', err);
        });
    }
  }, [isAutoSubmitted, fullscreenCount, isTimeout, handleFullscreenReturn]);

  // Initial mount: Check fullscreen and attempt automatic fullscreen
  useEffect(() => {
    if (isAdmin || !enableFullscreen) return;

    if (document.fullscreenElement !== null) {
      setIsFullscreen(true);
      setFullscreenBlocked(false);
      setHasEnteredFullscreen(true);
      return;
    }

    const elem = document.documentElement;
    const requestMethod =
      elem.requestFullscreen ||
      (elem as any).webkitRequestFullscreen ||
      (elem as any).mozRequestFullScreen ||
      (elem as any).msRequestFullscreen;

    if (requestMethod) {
      Promise.resolve(requestMethod.call(elem))
        .then(() => {
          if (document.fullscreenElement !== null) {
            setIsFullscreen(true);
            setFullscreenBlocked(false);
            setHasEnteredFullscreen(true);
          } else {
            setFullscreenBlocked(true);
          }
        })
        .catch(() => {
          setFullscreenBlocked(true);
        });
    } else {
      setFullscreenBlocked(true);
    }
  }, [isAdmin, enableFullscreen]);

  // Event listeners for active contest
  useEffect(() => {
    if (isAdmin) return;

    // 1. Fullscreen change listener
    const handleFullscreenChange = async () => {
      const active = document.fullscreenElement !== null;
      setIsFullscreen(active);

      if (active) {
        setFullscreenBlocked(false);
        setHasEnteredFullscreen(true);
        // Only resolve return if not auto-submitted/locked
        if (!isAutoSubmitted && fullscreenCount < 3 && !isTimeout) {
          handleFullscreenReturn();
        }
      } else {
        // Only trigger fullscreen exit violation if participant was previously in fullscreen
        if (enableFullscreen && hasEnteredFullscreen) {
          if (isAutoSubmitted || fullscreenCount >= 3 || isTimeout) {
            setWarningType('FULLSCREEN_EXIT');
            setWarningModalOpen(true);
            return;
          }

          // Best-effort autosave latest work before reporting violation to server
          if (onBeforeFullscreenExit) {
            try {
              await Promise.race([
                onBeforeFullscreenExit(),
                new Promise((resolve) => setTimeout(resolve, 800)),
              ]);
            } catch (err) {
              console.warn('Draft save before fullscreen exit error:', err);
            }
          }

          const result = await reportViolation('FULLSCREEN_EXIT', {
            message: 'Participant exited fullscreen mode',
          });

          const resData = result?.data?.data || result?.data;
          const countFromServer = resData?.fullscreenExitCount ?? (fullscreenCount + 1);
          setFullscreenCount(countFromServer);
          setWarningType('FULLSCREEN_EXIT');
          setWarningModalOpen(true);

          if (resData?.isAutoSubmitted || countFromServer >= 3) {
            clearReturnCountdown();
            setIsAutoSubmitted(true);
            if (onAutoSubmit) {
              onAutoSubmit();
            }
          } else {
            // Exits 1 & 2: Start 10-second return countdown
            const serverDeadline = resData?.deadline;
            const deadlineMs = serverDeadline ? new Date(serverDeadline).getTime() : undefined;
            startReturnCountdown(deadlineMs);
          }
        }
      }
    };

    // 2. Tab switch / Visibility API listener -> Non-blocking Toast
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('TAB_SWITCH', { message: 'Contest tab hidden' });
        showToast('Warning: Leaving contest tab has been recorded.', 'TAB_SWITCH', 4000);
      }
    };

    // 3. Window blur listener -> Non-blocking Toast
    const handleWindowBlur = () => {
      if (document.hidden) return;
      reportViolation('WINDOW_BLUR', { message: 'Window lost focus' });
      showToast('Warning: Focus loss recorded. Keep focus on the active contest workspace.', 'WINDOW_BLUR', 4000);
    };

    // 4. Clipboard restrictions: Paste
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('PASTE', { message: 'Paste attempted' });
      showToast('Copy/Paste is disabled during the contest.', 'PASTE', 3000);
    };

    // 5. Clipboard restrictions: Copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('COPY', { message: 'Copy attempted' });
      showToast('Copying contest text or code is disabled during the contest.', 'COPY', 3000);
    };

    // 6. Clipboard restrictions: Cut
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('CUT', { message: 'Cut attempted' });
      showToast('Cut operation is disabled during the contest.', 'CUT', 3000);
    };

    // 7. Right-Click Context Menu restriction
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportViolation('CONTEXT_MENU', { message: 'Context menu opened' });
      showToast('Right-click context menu is restricted.', 'CONTEXT_MENU', 2500);
    };

    // 8. Suspicious keyboard shortcuts (DevTools, Inspect, View Source)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'F12') {
        e.preventDefault();
        triggerModalWarning('Developer tools shortcut (F12) is restricted.', 'SUSPICIOUS_KEYBOARD_SHORTCUT');
        return;
      }

      if (cmdKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        triggerModalWarning(
          `Developer tools inspection shortcut (${e.key.toUpperCase()}) is restricted.`,
          'SUSPICIOUS_KEYBOARD_SHORTCUT'
        );
        return;
      }

      if (cmdKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        triggerModalWarning('View source shortcut is restricted.', 'SUSPICIOUS_KEYBOARD_SHORTCUT');
        return;
      }
    };

    // 9. Accidental tab close warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active contest session in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    isAdmin,
    enableFullscreen,
    hasEnteredFullscreen,
    fullscreenCount,
    isAutoSubmitted,
    onBeforeFullscreenExit,
    onAutoSubmit,
    reportViolation,
    showToast,
    triggerModalWarning,
  ]);

  if (isAdmin) {
    return null;
  }

  // Determine fullscreen modal state and copy
  const isFullscreenViolation = warningType === 'FULLSCREEN_EXIT';
  const isFinalViolation = isFullscreenViolation && (isAutoSubmitted || fullscreenCount >= 3 || isTimeout);
  const isWarning2 = isFullscreenViolation && fullscreenCount === 2 && !isFinalViolation;
  const isWarning1 = isFullscreenViolation && fullscreenCount <= 1 && !isFinalViolation;

  return (
    <>
      {/* Floating Toasts for Minor Events (Blur, Tab Switch, Copy, Paste, Cut) */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 bg-[#131633]/95 border border-amber-500/40 text-amber-200 rounded-xl shadow-[0_4px_24px_rgba(245,158,11,0.25)] backdrop-blur-xl animate-fadeIn pointer-events-auto"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold block text-white">{toast.type.replace(/_/g, ' ')}</span>
              <span className="text-slate-300 text-[11px]">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Requirement 1: Fullscreen Required Screen when automatic fullscreen is blocked on initial entry */}
      {enableFullscreen && !isFullscreen && fullscreenBlocked && !warningModalOpen && !isAutoSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080a18]/95 backdrop-blur-xl animate-fadeIn">
          <div className="bg-[#101228] border border-purple-500/40 rounded-3xl p-8 max-w-md w-full shadow-[0_0_60px_rgba(139,92,246,0.35)] text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Maximize2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Fullscreen Required</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Please enter fullscreen mode to continue the contest.
              </p>
            </div>

            <div className="pt-2">
              <GradientButton
                size="lg"
                className="w-full justify-center"
                onClick={handleEnterFullscreen}
                leftIcon={<Maximize2 className="w-4 h-4" />}
              >
                Enter Fullscreen
              </GradientButton>
            </div>
          </div>
        </div>
      )}

      {/* Warning & Locked Modals during active contest */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#101228] border border-rose-500/50 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.35)] text-center space-y-5">
            {/* Header Icon */}
            <div
              className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
                isFinalViolation
                  ? 'bg-rose-950/80 border border-rose-500/60 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
                  : isWarning2
                  ? 'bg-amber-950/60 border border-amber-500/50 text-amber-400'
                  : 'bg-purple-950/60 border border-purple-500/40 text-purple-400'
              }`}
            >
              {isFinalViolation ? (
                <Lock className="w-9 h-9" />
              ) : (
                <ShieldAlert className="w-9 h-9" />
              )}
            </div>

            {/* Title & Badge */}
            <div className="space-y-1.5">
              <span
                className={`text-[10px] font-mono uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full inline-block ${
                  isFinalViolation
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : isWarning2
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}
              >
                {isFinalViolation
                  ? 'ROUND FINALIZED & LOCKED'
                  : isWarning2
                  ? 'WARNING 2 OF 2 (FINAL WARNING)'
                  : isWarning1
                  ? 'WARNING 1 OF 2'
                  : warningType || 'SECURITY_WARNING'}
              </span>

              <h3 className="text-xl font-black text-white">
                {isFinalViolation
                  ? isTimeout
                    ? 'Fullscreen Return Deadline Expired'
                    : 'Maximum Fullscreen Violations Reached'
                  : isWarning2
                  ? 'Fullscreen Warning 2'
                  : isWarning1
                  ? 'Fullscreen Warning 1'
                  : 'Contest Integrity Notice'}
              </h3>
            </div>

            {/* Exact Required Descriptions */}
            <div className="bg-[#141738] p-4 rounded-xl border border-purple-500/20 text-xs text-slate-200 leading-relaxed text-left space-y-2">
              {isFinalViolation ? (
                <>
                  <p className="font-semibold text-rose-300 text-sm text-center">
                    Your round has been automatically submitted and locked.
                  </p>
                  <p className="text-[11px] text-slate-400 text-center">
                    {isTimeout
                      ? 'You did not return to fullscreen within the allowed 10 seconds. This round is now permanently locked and cannot be reopened.'
                      : 'You have exceeded the maximum of 2 allowed fullscreen warnings (Violation #3). This round is now permanently locked and cannot be reopened.'}
                  </p>
                </>
              ) : isWarning2 ? (
                <p className="text-center font-medium">
                  Warning: You exited fullscreen mode again. One more fullscreen exit will automatically submit your round. Return to fullscreen within 10 seconds to continue.
                </p>
              ) : isWarning1 ? (
                <p className="text-center font-medium">
                  Warning: You exited fullscreen mode. Please return to fullscreen within 10 seconds to continue the contest.
                </p>
              ) : (
                <p className="text-center font-medium">{warningMessage}</p>
              )}
            </div>

            {/* 10-Second Return Countdown Widget for Warnings 1 & 2 */}
            {!isFinalViolation && isFullscreenViolation && (
              <div className="bg-[#0b0d1e] p-4 rounded-2xl border border-rose-500/30 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-rose-400">
                  <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                    Return to Fullscreen Countdown
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-4xl font-mono font-black text-rose-400 tabular-nums">
                    {countdownSeconds}
                  </span>
                  <span className="text-xs font-mono font-medium text-rose-300">seconds remaining</span>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-rose-500/20">
                  <div
                    className="bg-gradient-to-r from-rose-500 to-amber-500 h-full transition-all duration-200 ease-linear rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, (countdownSeconds / 10) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Violation Status Bar */}
            <div className="bg-rose-950/40 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 flex items-center justify-between">
              <span>Fullscreen Exits Logged:</span>
              <span className="font-mono font-bold text-sm text-rose-400">
                {Math.min(3, fullscreenCount)} / 3
              </span>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              {isFinalViolation ? (
                <GradientButton
                  variant="danger"
                  className="w-full justify-center"
                  onClick={() => navigate('/dashboard')}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Return to Dashboard
                </GradientButton>
              ) : (
                <GradientButton
                  variant={isWarning2 ? 'danger' : 'primary'}
                  className="w-full justify-center"
                  onClick={handleEnterFullscreen}
                  leftIcon={<Maximize2 className="w-4 h-4" />}
                >
                  Return to Fullscreen
                </GradientButton>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
