interface ProgressBarProps {
  label: string;
  score: number;
  description: string;
  tone?: 'sky' | 'earth' | 'human' | 'love';
}

const toneStyles = {
  sky: 'from-[color:var(--sky-violet)] to-[color:var(--human-cyan)]',
  earth: 'from-[color:var(--earth-bronze)] to-[color:var(--fortune-good)]',
  human: 'from-[color:var(--human-pink)] to-[color:var(--human-cyan)]',
  love: 'from-[color:var(--human-pink)] to-[color:var(--fortune-love)]',
} as const;

export default function ProgressBar({
  label,
  score,
  description,
  tone = 'sky',
}: ProgressBarProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <span className="text-sm text-[color:var(--text-muted)]">{label}</span>
        <span className="text-xs text-[color:var(--text-muted)]">{description}</span>
      </div>
      <div className="energy-bar">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneStyles[tone]} animate-energy-fill`}
          style={{ width: `${safeScore}%` }}
        />
      </div>
    </div>
  );
}
