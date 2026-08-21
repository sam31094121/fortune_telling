'use client';

import type { TarotQuestionCategoryId, TarotReadingScope, TarotSpreadType } from '@/features/tarot/types';
import { TAROT_CATEGORY_LABELS, TAROT_SPREAD_LABELS } from '@/features/tarot/types';

type TarotDrawEntryProps = {
  categoryId?: TarotQuestionCategoryId;
  question: string;
  scope: TarotReadingScope;
  spreadType: TarotSpreadType;
  isGenerating: boolean;
  onScopeChange: (scope: TarotReadingScope) => void;
  onSpreadTypeChange: (spreadType: TarotSpreadType) => void;
  onBack: () => void;
  onStartDraw: () => void;
};

const SPREAD_OPTIONS: Array<{ type: TarotSpreadType; title: string; description: string; count: string }> = [
  { type: 'single', title: TAROT_SPREAD_LABELS.single, description: '快速鎖定核心訊號，適合明確問題與當下方向。', count: '抽 1 張' },
  { type: 'three_card', title: TAROT_SPREAD_LABELS.three_card, description: '依現況、阻礙、行動三個位置交叉判定，適合需要更完整整理的問題。', count: '抽 3 張' },
];

export default function TarotDrawEntry({ categoryId, question, scope, spreadType, isGenerating, onScopeChange, onSpreadTypeChange, onBack, onStartDraw }: TarotDrawEntryProps) {
  if (!categoryId || !question) {
    return null;
  }

  return (
    <section className="fortune-card border-emerald-300/25 bg-emerald-300/[0.055] p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">READY</p>
      <h2 className="mt-3 font-serif text-3xl font-black text-emerald-50">問題已固定</h2>
      <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
        接下來確認資料分流與牌陣。洗牌只建立牌序，真正抽牌由你親手點選牌背完成。
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/22 p-4">
        <p className="text-xs font-black text-emerald-100">問題分類</p>
        <p className="mt-1 text-sm font-bold text-[color:var(--text-main)]">{TAROT_CATEGORY_LABELS[categoryId]}</p>
        <p className="mt-4 text-xs font-black text-emerald-100">本次問題</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-base font-semibold leading-8 text-[color:var(--text-main)]">{question}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-black text-emerald-100">牌陣選擇</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SPREAD_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => onSpreadTypeChange(option.type)}
              disabled={isGenerating}
              className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${spreadType === option.type ? 'border-sky-200/55 bg-sky-300/15' : 'border-white/10 bg-black/16 hover:border-white/20'}`}
            >
              <span className="block text-sm font-black text-sky-50">{option.title}</span>
              <span className="mt-1 block text-xs font-black text-amber-100">{option.count}</span>
              <span className="mt-2 block text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-black text-emerald-100">資料分流</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onScopeChange('self')}
            disabled={isGenerating}
            className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${scope === 'self' ? 'border-emerald-200/55 bg-emerald-300/15' : 'border-white/10 bg-black/16 hover:border-white/20'}`}
          >
            <span className="block text-sm font-black text-emerald-50">分析自己</span>
            <span className="mt-2 block text-xs font-semibold leading-6 text-[color:var(--text-sub)]">可交給 Integration Layer，後續供個人成長中心更新使用。</span>
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('other')}
            disabled={isGenerating}
            className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${scope === 'other' ? 'border-amber-200/55 bg-amber-300/15' : 'border-white/10 bg-black/16 hover:border-white/20'}`}
          >
            <span className="block text-sm font-black text-amber-50">分析親友</span>
            <span className="mt-2 block text-xs font-semibold leading-6 text-[color:var(--text-sub)]">只做單次塔羅解讀，不更新會員核心資料。</span>
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-[color:var(--text-sub)] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-55"
        >
          重新選問題
        </button>
        <button
          type="button"
          onClick={onStartDraw}
          disabled={isGenerating}
          className="flex-1 rounded-full border border-emerald-200/50 bg-emerald-300 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.2)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? '洗牌中' : `開始洗牌｜${TAROT_SPREAD_LABELS[spreadType]}`}
        </button>
      </div>
    </section>
  );
}