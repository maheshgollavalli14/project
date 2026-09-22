import React, { useEffect } from 'react';
import { useContestStore } from '../../stores/contestStore.js';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn.js';

interface TimerProps {
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({ className }) => {
  const { remainingSeconds, decrementTimer, activeRound } = useContestStore();

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, decrementTimer]);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const isLowTime = remainingSeconds > 0 && remainingSeconds < 300; // < 5 minutes
  const isTimeUp = remainingSeconds === 0 && activeRound?.status === 'ACTIVE';

  const format = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 px-4 py-2 rounded-xl font-mono text-sm font-bold border transition-all duration-300',
        isLowTime
          ? 'bg-rose-950/40 text-rose-300 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
          : 'bg-[#0e1026]/90 text-purple-200 border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]',
        className
      )}
    >
      {isLowTime ? (
        <AlertTriangle className="w-4 h-4 text-rose-400" />
      ) : (
        <Clock className="w-4 h-4 text-purple-400" />
      )}
      <div className="flex items-center gap-1 tracking-wider">
        {hours > 0 && (
          <>
            <span>{format(hours)}</span>
            <span className="text-purple-400/60">:</span>
          </>
        )}
        <span>{format(minutes)}</span>
        <span className="text-purple-400/60">:</span>
        <span>{format(seconds)}</span>
      </div>
      {isTimeUp && <span className="text-xs text-rose-400 font-sans">(Time Up)</span>}
    </div>
  );
};
