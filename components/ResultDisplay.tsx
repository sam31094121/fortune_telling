// 分析結果區塊：大圓總分 + 四項進度條 + 總結建議

import type { AnalysisResult } from '@/lib/types';
import ProgressBar from './ProgressBar';

interface ResultDisplayProps {
  result: AnalysisResult;
}

/** 依整體分數回傳圓圈的文字顏色 */
function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

export default function ResultDisplay({ result }: ResultDisplayProps) {
  const overall = Math.max(0, Math.min(100, Math.round(result.overall_score)));

  return (
    <div className="space-y-8">
      {/* 整體分數 */}
      <div className="flex flex-col items-center">
        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-8 border-brand-light bg-white shadow-sm">
          <span className={`text-5xl font-bold ${getScoreColor(overall)}`}>{overall}</span>
          <span className="mt-1 text-sm text-gray-500">整體配對</span>
        </div>
      </div>

      {/* 四項細分 */}
      <div className="space-y-5">
        <ProgressBar label="個性相容" score={result.personality.score} description={result.personality.description} />
        <ProgressBar label="愛情緣分" score={result.love.score} description={result.love.description} />
        <ProgressBar label="溝通互動" score={result.communication.score} description={result.communication.description} />
        <ProgressBar label="未來發展" score={result.future.score} description={result.future.description} />
      </div>

      {/* 總結建議 */}
      <div className="rounded-lg bg-brand-light p-5">
        <h3 className="mb-2 font-semibold text-brand-dark">命理老師總結</h3>
        <p className="leading-relaxed text-gray-700">{result.summary}</p>
      </div>
    </div>
  );
}
