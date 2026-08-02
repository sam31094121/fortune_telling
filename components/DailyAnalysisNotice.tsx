'use client';

import { DAILY_ANALYSIS_NOTICE, formatDailyAnalysisRemaining, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';

type DailyAnalysisNoticeProps = {
  record?: DailyAnalysisRecord | null;
  className?: string;
  moduleName?: string;
  onViewResult?: () => void;
};

export default function DailyAnalysisNotice({ record, className = '', moduleName = '這張卡片', onViewResult }: DailyAnalysisNoticeProps) {
  const remainingText = formatDailyAnalysisRemaining(record?.expiresAt);
  const statusClass = record ? 'daily-analysis-notice--used' : 'daily-analysis-notice--ready';
  const canJump = Boolean(record && onViewResult);

  return (
    <section className={`daily-analysis-notice ${statusClass} ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">FREE DAILY ANALYSIS</p>
          <h4 className="mt-2 font-serif text-2xl font-black leading-tight text-cyan-50 sm:text-3xl">
            {record ? `AI 判定：${moduleName}今日正式分析已完成` : `AI 判定：${moduleName}今日可開始正式分析`}
          </h4>
        </div>
        {canJump ? (
          <button
            type="button"
            onClick={onViewResult}
            className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black tracking-[0.12em] text-cyan-100 transition hover:border-cyan-100/60 hover:bg-cyan-300/20"
          >
            直接跳到今日分析 ↓
          </button>
        ) : (
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.12em] ${
              record
                ? 'border-cyan-200/30 bg-cyan-300/10 text-cyan-100'
                : 'border-amber-200/35 bg-amber-300/12 text-amber-100'
            }`}
          >
            {record ? '查看今日分析' : '每日一次'}
          </span>
        )}
      </div>

      <p className="mt-3 text-base font-black leading-8 text-[color:var(--text-sub)]">{DAILY_ANALYSIS_NOTICE}</p>

      {record && (
        <div className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-black/18 p-4 text-sm font-bold leading-7 text-cyan-50/82">
          <p>AI 判定：這不是錯誤。{moduleName}今天的完整免費正式分析已完成。系統已鎖定今日結果，請直接查看今日分析。</p>
          <p>
            你現在可以無限次查看今日分析。新的{moduleName}正式分析開放時間為{' '}
            <span className="font-black text-amber-100">{remainingText}</span>。
          </p>
          <p className="rounded-2xl border border-rose-200/30 bg-rose-500/12 px-3 py-2 text-rose-100">
            若你已重新輸入資料，系統仍會保留今日正式結果，並直接帶你查看今日已完成分析。
          </p>
          {canJump && (
            <button
              type="button"
              onClick={onViewResult}
              className="justify-self-start rounded-full border border-cyan-200/40 bg-cyan-300/12 px-4 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-100/70 hover:bg-cyan-300/22"
            >
              直接跳到今日分析結果 ↓
            </button>
          )}
        </div>
      )}
    </section>
  );
}
