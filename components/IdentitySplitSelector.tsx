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

export default function IdentitySplitSelector({ className = '' }: Props) {
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

  return (
    <section className={`rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4 shadow-[0_14px_42px_rgba(34,211,238,0.08)] ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">IDENTITY SPLIT</p>
          <h2 className="mt-2 font-serif text-2xl font-black leading-tight text-cyan-50">
            {'\u8acb\u554f\u672c\u6b21\u5206\u6790\u5c0d\u8c61'}
          </h2>
        </div>
        <p className="text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
          {'\u5148\u9078\u64c7\u5c0d\u8c61\uff0c\u8cc7\u6599\u5c31\u4e0d\u6703\u6df7\u5728\u4e00\u8d77\u3002'}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
              className={`rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.99] ${
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
    </section>
  );
}
