import {
  FINE_DINING_EXPERIENCE_VERSION,
  FINE_DINING_MODULE_LABEL,
  getFineDiningVisibleStages,
  type FineDiningExperienceModule,
  type FineDiningExperienceState,
  type FineDiningStageStatus,
} from '@/lib/fine-dining-experience-engine';

type FineDiningServiceProgressProps = {
  module: FineDiningExperienceModule;
  state: FineDiningExperienceState;
  className?: string;
  liveMessage?: string;
};

const STATUS_CLASS: Record<FineDiningStageStatus, string> = {
  PASSED: 'border-emerald-300/45 bg-emerald-300/12 text-emerald-100',
  PROCESSING: 'border-amber-300/55 bg-amber-300/14 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.18)]',
  READY: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
  LOCKED: 'border-white/10 bg-white/[0.025] text-white/38',
  FAILED: 'border-rose-300/55 bg-rose-300/14 text-rose-100',
};

const STATUS_LABEL: Record<FineDiningStageStatus, string> = {
  PASSED: 'PASSED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  LOCKED: 'LOCKED',
  FAILED: 'FAILED',
};

export default function FineDiningServiceProgress({
  module,
  state,
  className = '',
  liveMessage,
}: FineDiningServiceProgressProps) {
  const moduleLabel = FINE_DINING_MODULE_LABEL[module];
  const visibleStages = getFineDiningVisibleStages(state);

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-amber-200/18 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_38%),rgba(2,6,23,0.64)] p-4 ${className}`}
      aria-live="polite"
      aria-label={`${moduleLabel} 易經分層服務進度`}
      data-experience-version={FINE_DINING_EXPERIENCE_VERSION}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">AI Service Flow</p>
          <h4 className="mt-1 font-serif text-lg font-black leading-tight text-cyan-50">
            {moduleLabel} · 分層服務啟動
          </h4>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black text-amber-100">
          V2
        </span>
      </div>

      {liveMessage && (
        <p className="mt-3 rounded-2xl border border-cyan-200/15 bg-cyan-300/10 p-3 text-base font-bold leading-7 text-cyan-100 sm:text-sm">
          {liveMessage}
        </p>
      )}

      <div className="mt-4 grid gap-2">
        {visibleStages.map((stage) => (
          <div
            key={stage.id}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border px-3 py-3 ${STATUS_CLASS[stage.status]}`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full border border-current/25 bg-black/18 text-[11px] font-black">
              {stage.index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.16em] opacity-70">S{String(stage.index + 1).padStart(2, '0')}</p>
              <p className="mt-0.5 text-base font-black leading-6 sm:text-sm">{stage.label}</p>
              <p className="mt-1 text-xs font-semibold leading-5 opacity-70">{stage.detail}</p>
            </div>
            <span className="rounded-full border border-current/25 bg-black/16 px-2.5 py-1 text-[10px] font-black">
              {STATUS_LABEL[stage.status]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}