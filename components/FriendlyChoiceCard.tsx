'use client';

import type { ReactNode } from 'react';

export type FriendlyChoiceTone = 'amber' | 'cyan' | 'pink' | 'violet' | 'emerald';

type FriendlyChoiceCardProps = {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
  tone?: FriendlyChoiceTone;
  disabled?: boolean;
  compact?: boolean;
  trailing?: ReactNode;
};

const TONES: Record<FriendlyChoiceTone, { active: string; idle: string }> = {
  amber: {
    active: 'border-amber-300 bg-amber-400/18 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.22)]',
    idle: 'border-white/10 bg-white/[0.04] text-[color:var(--text-main)] hover:border-amber-300/45 hover:bg-amber-400/10',
  },
  cyan: {
    active: 'border-cyan-300 bg-cyan-400/18 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.22)]',
    idle: 'border-white/10 bg-white/[0.04] text-[color:var(--text-main)] hover:border-cyan-300/45 hover:bg-cyan-400/10',
  },
  pink: {
    active: 'border-pink-300 bg-pink-400/18 text-pink-100 shadow-[0_0_24px_rgba(244,114,182,0.22)]',
    idle: 'border-white/10 bg-white/[0.04] text-[color:var(--text-main)] hover:border-pink-300/45 hover:bg-pink-400/10',
  },
  violet: {
    active: 'border-violet-300 bg-violet-400/18 text-violet-100 shadow-[0_0_24px_rgba(167,139,250,0.22)]',
    idle: 'border-white/10 bg-white/[0.04] text-[color:var(--text-main)] hover:border-violet-300/45 hover:bg-violet-400/10',
  },
  emerald: {
    active: 'border-emerald-300 bg-emerald-400/18 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.22)]',
    idle: 'border-white/10 bg-white/[0.04] text-[color:var(--text-main)] hover:border-emerald-300/45 hover:bg-emerald-400/10',
  },
};

export default function FriendlyChoiceCard({
  active,
  title,
  description,
  onClick,
  tone = 'cyan',
  disabled = false,
  compact = false,
  trailing,
}: FriendlyChoiceCardProps) {
  const colors = TONES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'min-h-[78px] px-4 py-3' : 'min-h-[104px] px-4 py-4'} ${active ? colors.active : colors.idle}`}
    >
      <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      <span className="relative z-10 flex items-start justify-between gap-3">
        <span>
          <span className="block text-base font-black">{title}</span>
          {description && <span className="mt-1.5 block text-xs leading-5 text-[color:var(--text-sub)]">{description}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {trailing}
          <span className={`choice-signal ${active ? 'choice-signal--done' : 'choice-signal--idle'}`}>
            {active ? '已選' : '點選'}
          </span>
        </span>
      </span>
    </button>
  );
}