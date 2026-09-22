import React from 'react';
import { cn } from '../../utils/cn.js';

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
  size = 'md',
}) => {
  const normalized = status.toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'ACTIVE':
      case 'ACCEPTED':
      case 'QUALIFIED':
      case 'SUCCESS':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
      case 'UPCOMING':
      case 'PENDING':
      case 'WARNING':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
      case 'COMPLETED':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]';
      case 'NOT_QUALIFIED':
      case 'WRONG_ANSWER':
      case 'FAILED':
      case 'TIME_LIMIT_EXCEEDED':
      case 'COMPILATION_ERROR':
      case 'RUNTIME_ERROR':
      case 'ERROR':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
      case 'LOCKED':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]';
      case 'NEUTRAL':
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
    }
  };

  const displayText = label || status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full uppercase tracking-wider',
        size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        getStyle(),
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {displayText}
    </span>
  );
};
