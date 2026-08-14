'use client';

import type { DailyAnalysisRecord } from '@/lib/daily-analysis-limit';

type DailyAnalysisNoticeProps = {
  record?: DailyAnalysisRecord | null;
  className?: string;
  moduleName?: string;
  onViewResult?: () => void;
};

export default function DailyAnalysisNotice(_props: DailyAnalysisNoticeProps) {
  return null;
}
