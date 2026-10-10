import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = false }) => {
  const iconSizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' };
  const textSizes = { sm: 'text-xl', md: 'text-[26px]', lg: 'text-4xl' };

  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 select-none">
      <img
        src="/icons/kalo.svg"
        alt=""
        width={40}
        height={40}
        className={`${iconSizes[size]} shrink-0 rounded-lg`}
        aria-hidden="true"
      />
      <span className="flex flex-col items-start">
        <span className={`${textSizes[size]} font-extrabold leading-none text-white`}>
          kalo
        </span>
        {showSubtitle && (
          <span className="mt-1 text-[10px] font-medium text-zinc-400">
            Daily nutrition
          </span>
        )}
      </span>
    </span>
  );
};
