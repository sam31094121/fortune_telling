'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

type AnalysisReadingStep = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  tone?: 'emerald' | 'cyan' | 'amber' | 'violet';
};

type AnalysisReadingFlowProps = {
  moduleLabel: string;
  headline: string;
  summary: string;
  steps: AnalysisReadingStep[];
  actions?: ReactNode;
};

const TONE_CLASS: Record<NonNullable<AnalysisReadingStep['tone']>, string> = {
  emerald: 'border-emerald-300/25 bg-emerald-500/8 shadow-[0_0_30px_rgba(16,185,129,0.12)]',
  cyan: 'border-cyan-300/25 bg-cyan-500/8 shadow-[0_0_30px_rgba(34,211,238,0.12)]',
  amber: 'border-amber-300/25 bg-amber-500/8 shadow-[0_0_30px_rgba(251,191,36,0.12)]',
  violet: 'border-violet-300/25 bg-violet-500/8 shadow-[0_0_30px_rgba(167,139,250,0.12)]',
};

export default function AnalysisReadingFlow({
  moduleLabel,
  headline,
  summary,
  steps,
  actions,
}: AnalysisReadingFlowProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const safeSteps = useMemo(() => steps.filter((step) => step.title || step.children), [steps]);

  useEffect(() => {
    setVisibleCount(0);
    const timers = safeSteps.map((_, index) => (
      window.setTimeout(() => setVisibleCount((current) => Math.max(current, index + 1)), 360 + index * 420)
    ));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [safeSteps]);

  return (
    <section className="space-y-4" aria-live="polite">
      <div className="fortune-card overflow-hidden border-emerald-300/30 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),rgba(34,211,238,0.08)_42%,rgba(15,23,42,0.86)_100%)] p-5 shadow-[0_0_36px_rgba(16,185,129,0.14)] sm:p-7">
        <div className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
          {moduleLabel}
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
          {'\u5206\u6790\u5b8c\u6210'}
        </p>
        <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-amber-100 sm:text-4xl">
          {headline}
        </h2>
        <p className="mt-4 text-sm font-bold leading-7 text-[color:var(--text-sub)] sm:text-base">
          {summary}
        </p>
      </div>

      {safeSteps.map((step, index) => {
        const isVisible = index < visibleCount;
        const tone = step.tone ?? 'cyan';
        return (
          <article
            key={step.id}
            className={`fortune-card overflow-hidden p-5 transition-all duration-500 sm:p-7 ${TONE_CLASS[tone]} ${
              isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
            }`}
            aria-hidden={!isVisible}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
              {step.eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-black leading-tight text-[color:var(--text-main)]">
              {step.title}
            </h3>
            {step.description && (
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
                {step.description}
              </p>
            )}
            {step.children && <div className="mt-4">{step.children}</div>}
          </article>
        );
      })}

      {actions && (
        <div
          className={`transition-all duration-500 ${
            visibleCount >= safeSteps.length ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
          }`}
        >
          {actions}
        </div>
      )}
    </section>
  );
}
