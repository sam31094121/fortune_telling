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
    <article className="fortune-card min-w-0 p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-serif text-xl text-[color:var(--text-main)]">{label}</h3>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">能量指數</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-semibold text-[color:var(--text-main)]">{safeScore}</span>
          <span className="ml-1 text-sm text-[color:var(--text-sub)]">分</span>
        </div>
      </div>

      <div className="energy-bar">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneStyles[tone]} animate-energy-fill`}
          style={{ width: `${safeScore}%` }}
        />
      </div>

      <p className="mt-4 break-words text-sm leading-8 text-[color:var(--text-sub)]">{description}</p>
    </article>
  );
}
