import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true }) => {
  const iconSizes = {
    sm: 'w-7 h-7 rounded-xl',
    md: 'w-9 h-9 rounded-2xl',
    lg: 'w-12 h-12 rounded-3xl',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const svgSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  return (
    <div className="flex items-center gap-2.5 group cursor-default select-none">
      {/* Dynamic Animated Logo Badge */}
      <div
        className={`${iconSizes[size]} bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-400/25 border border-yellow-200/50 relative overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-yellow-400/40`}
      >
        {/* Subtle ambient light sweep */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-black/10 pointer-events-none" />

        {/* Custom Geometric K Emblem */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${svgSizes[size]} text-black drop-shadow-xs transition-transform duration-300 group-hover:rotate-3`}
        >
          {/* Vertical stem */}
          <rect x="4.5" y="4" width="3.5" height="16" rx="1.75" fill="currentColor" />
          {/* Top energetic diagonal with spark apex */}
          <path
            d="M8 12.5L16.5 4.5"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Bottom kick diagonal */}
          <path
            d="M9.5 11L18 20"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Radiance energy dot */}
          <circle cx="19.5" cy="4.5" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center gap-1 leading-none">
          <span
            className={`${textSizes[size]} font-black tracking-tight text-white transition-colors duration-200 group-hover:text-yellow-400`}
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
          >
            kalo
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block shadow-sm shadow-yellow-400 animate-pulse" />
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-black tracking-wider uppercase text-zinc-400 block mt-0.5">
            Calorie Vision
          </span>
        )}
      </div>
    </div>
  );
};
