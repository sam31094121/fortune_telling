import {
  MICHELIN_EXPERIENCE_MODULE_LABEL,
  MICHELIN_EXPERIENCE_STEPS,
  getMichelinExperienceStatus,
  type MichelinExperienceModule,
  type MichelinExperienceState,
} from '@/lib/michelin-experience-engine';

type MichelinRitualProgressProps = {
  module: MichelinExperienceModule;
  state: MichelinExperienceState;
  className?: string;
  liveMessage?: string;
};

const STATUS_CLASS = {
  PASS: 'border-emerald-300/45 bg-emerald-300/12 text-emerald-100',
  NOW: 'border-amber-300/55 bg-amber-300/14 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.18)]',
  NEXT: 'border-white/10 bg-white/[0.035] text-white/45',
  ERROR: 'border-rose-300/55 bg-rose-300/14 text-rose-100',
} as const;

const STATUS_LABEL = {
  PASS: 'PASS',
  NOW: 'NOW',
  NEXT: 'NEXT',
  ERROR: 'CHECK',
} as const;

export default function MichelinRitualProgress({
  module,
  state,
  className = '',
  liveMessage,
}: MichelinRitualProgressProps) {
  const moduleLabel = MICHELIN_EXPERIENCE_MODULE_LABEL[module];

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-amber-200/18 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.13),transparent_38%),rgba(2,6,23,0.64)] p-4 ${className}`}
      aria-live="polite"
      aria-label={`${moduleLabel} 米其林儀式流程`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">Michelin Experience</p>
          <h4 className="mt-1 font-serif text-lg font-black leading-tight text-cyan-50">
            {moduleLabel} · AI 開始服務
          </h4>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black text-amber-100">
          V1
        </span>
      </div>

      {liveMessage && (
        <p className="mt-3 rounded-2xl border border-cyan-200/15 bg-cyan-300/10 p-3 text-xs font-bold leading-6 text-cyan-100">
          {liveMessage}
        </p>
      )}

      <div className="mt-4 grid gap-2">
        {MICHELIN_EXPERIENCE_STEPS.map((step, index) => {
          const status = getMichelinExperienceStatus(state, index);
          return (
            <div
              key={step.id}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border px-3 py-3 ${STATUS_CLASS[status]}`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border border-current/25 bg-black/18 text-[11px] font-black">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.16em] opacity-70">{step.course}</p>
                <p className="mt-0.5 text-sm font-black leading-5">{step.title}</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 opacity-70">{step.detail}</p>
              </div>
              <span className="rounded-full border border-current/25 bg-black/16 px-2.5 py-1 text-[10px] font-black">
                {STATUS_LABEL[status]}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
