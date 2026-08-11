'use client';

import { useEffect, useState } from 'react';
import {
  getAnalysisIdentityTarget,
  IDENTITY_TARGET_LABEL,
  IDENTITY_TARGET_UPDATED_EVENT,
  setAnalysisIdentityTarget,
  type AnalysisIdentityTarget,
} from '@/lib/identity-split-client';

type Props = {
  className?: string;
  compact?: boolean;
};

const OPTIONS: Array<{
  target: AnalysisIdentityTarget;
  description: string;
  badge: string;
}> = [
  {
    target: 'self',
    description: '\u6703\u5beb\u5165 AI \u500b\u4eba\u6210\u9577\u4e2d\u5fc3\uff0c\u66f4\u65b0\u6bcf\u9031\u966a\u4f34\u8207\u88dc\u5f37\u65b9\u5411\u3002',
    badge: '\u66f4\u65b0\u6210\u9577\u6a94\u6848',
  },
  {
    target: 'guest',
    description: '\u53ea\u505a\u672c\u6b21\u55ae\u6b21\u5206\u6790\uff0c\u4e0d\u5beb\u5165\u4f60\u7684\u500b\u4eba\u6210\u9577\u8cc7\u6599\u3002',
    badge: '\u55ae\u6b21\u5206\u6790',
  },
];

export default function IdentitySplitSelector({ className = '', compact = false }: Props) {
  const [selected, setSelected] = useState<AnalysisIdentityTarget | null>(null);

  useEffect(() => {
    setSelected(getAnalysisIdentityTarget());

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: AnalysisIdentityTarget }>).detail;
      if (detail?.target === 'self' || detail?.target === 'guest') {
        setSelected(detail.target);
      }
    };

    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, handleUpdate);
  }, []);

  const selectedOption = OPTIONS.find((option) => option.target === selected);

  if (compact) {
    return (
      <section className={`rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-2 ${className}`}>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((option) => {
            const active = selected === option.target;
            const label = option.target === 'self' ? '自己' : IDENTITY_TARGET_LABEL[option.target];
            return (
              <button
                key={option.target}
                type="button"
                aria-pressed={active}
                aria-label={label}
                onClick={() => {
                  setAnalysisIdentityTarget(option.target);
                  setSelected(option.target);
                }}
                className={`min-h-12 rounded-xl border px-3 text-center text-base font-black transition active:scale-[0.99] ${
                  active
                    ? 'border-amber-200/70 bg-amber-300/18 text-amber-50'
                    : 'border-white/10 bg-black/16 text-white/62 hover:border-cyan-200/35 hover:text-cyan-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-3 shadow-[0_10px_30px_rgba(34,211,238,0.07)] sm:p-4 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">IDENTITY</p>
          <h2 className="mt-1 font-serif text-lg font-black leading-tight text-cyan-50 sm:text-xl">
            {'\u8acb\u554f\u672c\u6b21\u5206\u6790\u5c0d\u8c61'}
          </h2>
        </div>
        <p className="text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
          {'\u9078\u6211\u81ea\u5df1\u6703\u5beb\u5165\u6210\u9577\u4e2d\u5fc3\uff1b\u89aa\u53cb\u53ea\u505a\u672c\u6b21\u5206\u6790\u3002'}
        </p>
      </div>

      {selectedOption && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/25 bg-amber-300/10 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-amber-50">{IDENTITY_TARGET_LABEL[selectedOption.target]} · 已選擇</p>
            <p className="mt-0.5 text-xs font-semibold leading-5 text-amber-100/75">{selectedOption.description}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextTarget = selectedOption.target === 'self' ? 'guest' : 'self';
              setAnalysisIdentityTarget(nextTarget);
              setSelected(nextTarget);
            }}
            className="shrink-0 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-black text-cyan-100"
          >
            切換對象
          </button>
        </div>
      )}

      {!selectedOption && (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = selected === option.target;
          return (
            <button
              key={option.target}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setAnalysisIdentityTarget(option.target);
                setSelected(option.target);
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${
                active
                  ? 'border-amber-300/70 bg-amber-300/14 shadow-[0_0_28px_rgba(251,191,36,0.16)]'
                  : 'border-white/10 bg-white/[0.04] hover:border-cyan-200/35 hover:bg-white/[0.07]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-black text-[color:var(--text-main)]">{IDENTITY_TARGET_LABEL[option.target]}</p>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                  active
                    ? 'border-amber-200/45 bg-amber-200/15 text-amber-100'
                    : 'border-white/10 bg-black/15 text-[color:var(--text-muted)]'
                }`}>
                  {active ? '\u5df2\u9078\u64c7' : option.badge}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{option.description}</p>
            </button>
          );
        })}
      </div>
      )}
    </section>
  );
}
