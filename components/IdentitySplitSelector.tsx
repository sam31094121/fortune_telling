'use client';

import { useEffect, useState } from 'react';
import {
  getAnalysisIdentityTarget,
  IDENTITY_TARGET_UPDATED_EVENT,
  setAnalysisIdentityTarget,
  type AnalysisIdentityTarget,
} from '@/lib/identity-split-client';

type Props = {
  className?: string;
  compact?: boolean;
  onSelected?: (target: AnalysisIdentityTarget) => void;
};

const OPTIONS: Array<{
  target: AnalysisIdentityTarget;
  label: string;
  description: string;
  accent: string;
}> = [
  {
    target: 'self',
    label: '\u6211\u81ea\u5df1',
    description: '\u5beb\u5165\u6210\u9577\u4e2d\u5fc3',
    accent: '\u9577\u671f\u8ffd\u8e64',
  },
  {
    target: 'guest',
    label: '\u89aa\u670b\u597d\u53cb',
    description: '\u53ea\u505a\u672c\u6b21\u5206\u6790',
    accent: '\u4e0d\u5b58\u6210\u9577\u6a94',
  },
];

export default function IdentitySplitSelector({ className = '', compact = false, onSelected }: Props) {
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

  const chooseTarget = (target: AnalysisIdentityTarget) => {
    setAnalysisIdentityTarget(target);
    setSelected(target);
    onSelected?.(target);
  };

  if (compact) {
    return (
      <section
        aria-label="選擇本次分析對象"
        className={`identity-split-selector identity-split-selector--compact rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-2 ${className}`}
      >
        <div className="identity-split-selector__compact-grid grid grid-cols-2 gap-2">
          {OPTIONS.map((option) => {
            const active = selected === option.target;
            return (
              <button
                key={option.target}
                type="button"
                aria-pressed={active}
                aria-label={option.label}
                onClick={() => {
                  chooseTarget(option.target);
                }}
                className={`identity-split-selector__button min-h-12 rounded-xl border px-3 text-center text-base font-black transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200/80 ${
                  active
                    ? 'border-amber-200/70 bg-amber-300/18 text-amber-50'
                    : 'border-white/10 bg-black/16 text-white/62 hover:border-cyan-200/35 hover:text-cyan-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-2xl border-2 bg-black/18 p-3 shadow-[0_12px_32px_rgba(2,6,23,0.18)] backdrop-blur-sm sm:p-4 ${selected === null ? 'animate-[pulse_1.6s_ease-in-out_infinite] border-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.32)] ring-2 ring-amber-200/45 ring-offset-2 ring-offset-[#080a10]' : 'border-cyan-200/25'} ${className}`}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/75">0 · ANALYSIS TARGET</p>
          <h2 className="mt-1 text-base font-black leading-tight text-cyan-50 sm:text-lg">
            {'先選擇：自己使用，還是親朋好友使用'}
          </h2>
        </div>
        <p className="text-xs font-semibold leading-5 text-amber-100/78">
          {selected === null ? '請點選一個對象後再開始判定' : `已選擇「${selected === 'self' ? '我自己' : '親朋好友'}」・接著填姓名`}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = selected === option.target;
          return (
            <button
              key={option.target}
              type="button"
              aria-pressed={active}
              onClick={() => {
                chooseTarget(option.target);
              }}
              className={`group rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${
                active
                  ? 'animate-[pulse_1.6s_ease-in-out_infinite] border-2 border-amber-100 bg-amber-300/22 shadow-[0_0_28px_rgba(251,191,36,0.38)] ring-2 ring-amber-200/45 ring-offset-2 ring-offset-[#080a10]'
                  : 'border-white/10 bg-white/[0.035] hover:border-cyan-200/35 hover:bg-cyan-200/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-lg font-black ${active ? 'text-amber-50' : 'text-[color:var(--text-main)]'}`}>{option.label}</p>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                  active
                    ? 'border-amber-200/45 bg-amber-200/15 text-amber-100'
                    : 'border-white/10 bg-black/10 text-[color:var(--text-muted)] group-hover:text-cyan-100'
                }`}>
                  {active ? '\u5df2\u9078' : option.accent}
                </span>
              </div>
              <p className={`mt-2 text-xs font-semibold leading-5 ${active ? 'text-amber-100/78' : 'text-[color:var(--text-sub)]'}`}>{option.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
