'use client';

import { DAILY_ANALYSIS_NOTICE, formatDailyAnalysisRemaining, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';

type DailyAnalysisNoticeProps = {
  record?: DailyAnalysisRecord | null;
  className?: string;
  moduleName?: string;
  onViewResult?: () => void;
};

export default function DailyAnalysisNotice({
  record,
  className = '',
  moduleName = '這張卡片',
  onViewResult,
}: DailyAnalysisNoticeProps) {
  const remainingText = formatDailyAnalysisRemaining(record?.expiresAt);
  const statusClass = record ? 'daily-analysis-notice--used' : 'daily-analysis-notice--ready';
  const canJump = Boolean(record && onViewResult);

  return (
    <section className={`daily-analysis-notice ${statusClass} ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">DAILY PASS</p>
          <h4 className="mt-1 font-serif text-lg font-black leading-tight text-cyan-50 sm:text-xl">
            {record ? `${moduleName} 今日已完成` : `${moduleName} 今日可開始`}
          </h4>
        </div>
        {canJump ? (
          <button
            type="button"
            onClick={onViewResult}
            className="rounded-full border border-cyan-200/35 bg-cyan-300/12 px-3 py-1.5 text-[11px] font-black text-cyan-100 transition hover:border-cyan-100/70 hover:bg-cyan-300/20"
          >
            查看今日結果
          </button>
        ) : (
          <span
            className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${
              record
                ? 'border-cyan-200/30 bg-cyan-300/10 text-cyan-100'
                : 'border-amber-200/35 bg-amber-300/12 text-amber-100'
            }`}
          >
            {record ? '已完成' : '每日一次'}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm font-bold leading-6 text-[color:var(--text-sub)]">{DAILY_ANALYSIS_NOTICE}</p>

      {record && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/18 p-3 text-xs font-bold leading-6 text-cyan-50/82">
          <p>
            已保留今日 {moduleName} 結果，剩餘約 <span className="font-black text-amber-100">{remainingText}</span> 可查看。
          </p>
        </div>
      )}
    </section>
  );
}
