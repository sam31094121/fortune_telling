// 單項分數的水平進度條，顏色依分數高低變化

interface ProgressBarProps {
  label: string;
  score: number; // 0-100
  description: string;
}

/** 依分數回傳對應的 Tailwind 背景色：高分綠、中分黃、低分紅 */
function getBarColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

export default function ProgressBar({ label, score, description }: ProgressBarProps) {
  // 防禦：把分數夾在 0-100 之間，避免異常值撐破畫面
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="text-sm font-semibold text-gray-600">{safeScore} 分</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(safeScore)}`}
          style={{ width: `${safeScore}%` }}
        />
      </div>
      <p className="text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}
