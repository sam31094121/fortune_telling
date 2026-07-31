'use client';

import { DAILY_ANALYSIS_NOTICE, formatDailyAnalysisRemaining, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';

type DailyAnalysisNoticeProps = {
  record?: DailyAnalysisRecord | null;
  className?: string;
};

export default function DailyAnalysisNotice({ record, className = '' }: DailyAnalysisNoticeProps) {
  return (
    <section className={`daily-analysis-notice ${className}`.trim()}>
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">FREE DAILY ANALYSIS</p>
      <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{DAILY_ANALYSIS_NOTICE}</p>
      {record && (
        <p className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-black leading-6 text-cyan-100">
          今日正式分析已完成。你可以無限次查看今日分析，{formatDailyAnalysisRemaining(record.expiresAt)}可以再次開始。
        </p>
      )}
    </section>
  );
}