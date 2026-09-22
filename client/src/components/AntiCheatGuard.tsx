import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useContestStore } from '../stores/contestStore.js';
import { AlertTriangle, ShieldAlert, Maximize2 } from 'lucide-react';
import { GradientButton } from './ui/GradientButton.js';

interface AntiCheatGuardProps {
  contestId: string;
  roundId?: string;
  enableFullscreen?: boolean;
}

export const AntiCheatGuard: React.FC<AntiCheatGuardProps> = ({
  contestId,
  roundId,
  enableFullscreen = true,
}) => {
  const { violationsCount, incrementViolations } = useContestStore();
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const reportViolation = async (type: string, metadata: any = {}) => {
    try {
      incrementViolations();
      await api.post('/api/violations', {
        contestId,
        roundId,
        type,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });
    } catch (e) {
      console.error('Failed to log violation:', e);
    }
  };

  const triggerWarning = (msg: string, type: string) => {
    setWarningMessage(msg);
    setWarningModalOpen(true);
    reportViolation(type, { message: msg });
  };

  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    // 1. Fullscreen change listener
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active && enableFullscreen) {
        triggerWarning(
          'Fullscreen mode was exited! The contest interface must remain in full-screen mode to prevent disqualified viewing.',
          'FULLSCREEN_EXIT'
        );
      }
    };

    // 2. Tab switch / Visibility change listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerWarning(
          'Tab switch detected! Leaving the contest tab is logged as an integrity violation.',
          'TAB_SWITCH'
        );
      }
    };

    // 3. Window blur listener (e.g. clicking outside or alt-tab)
    const handleWindowBlur = () => {
      triggerWarning(
        'Window focus lost! Please keep your attention focused entirely on the contest workspace.',
        'WINDOW_BLUR'
      );
    };

    // 4. Paste event listener
    const handlePaste = (e: ClipboardEvent) => {
      reportViolation('PASTE', {
        length: e.clipboardData?.getData('text')?.length || 0,
      });
    };

    // 5. Copy event listener
    const handleCopy = () => {
      reportViolation('COPY', { note: 'Participant copied contest text' });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('copy', handleCopy);
    };
  }, [contestId, roundId, enableFullscreen]);

  return (
    <>
      {/* Fullscreen Prompt Banner if not in fullscreen */}
      {enableFullscreen && !isFullscreen && (
        <div className="fixed bottom-4 right-4 z-40 bg-[#12142d]/95 border border-purple-500/40 p-4 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.3)] backdrop-blur-xl flex items-center gap-4 max-w-md">
          <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Full-Screen Mode Required</p>
            <p className="text-[11px] text-slate-400">
              For contest integrity, please stay in full-screen mode.
            </p>
          </div>
          <GradientButton size="sm" onClick={requestFullscreen}>
            Go Fullscreen
          </GradientButton>
        </div>
      )}

      {/* Anti-Cheating Warning Modal */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#101228] border border-rose-500/50 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.35)] text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-bold text-white">Integrity Warning Recorded</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{warningMessage}</p>

            <div className="bg-rose-950/40 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300">
              <span className="font-bold">Total Violations Logged:</span> {violationsCount}
              <p className="text-[10px] text-slate-400 mt-1">
                Contest administrators are notified in real-time. Repeated violations may result in immediate disqualification.
              </p>
            </div>

            <div className="pt-2">
              <GradientButton
                variant="danger"
                className="w-full"
                onClick={() => {
                  setWarningModalOpen(false);
                  if (enableFullscreen) requestFullscreen();
                }}
              >
                I Understand, Return to Contest
              </GradientButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
