import React from 'react';
import { cn } from '../../utils/cn.js';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glow?: boolean;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glow = false,
  hoverEffect = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative rounded-2xl bg-[#0d0f22]/80 backdrop-blur-xl border border-purple-500/15 p-6 transition-all duration-300',
        hoverEffect && 'hover:border-purple-500/35 hover:bg-[#12142d]/90 hover:shadow-[0_0_30px_rgba(139,92,246,0.18)]',
        glow && 'border-purple-500/30 shadow-[0_0_30px_rgba(139,92,246,0.22)]',
        className
      )}
      {...props}
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
