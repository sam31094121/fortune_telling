import type { AnalysisResult } from '@/lib/types';
import ProgressBar from './ProgressBar';

interface ResultDisplayProps {
  result: AnalysisResult;
}

export default function ResultDisplay({ result }: ResultDisplayProps) {
  const resonance = Math.max(0, Math.min(100, Math.round(result.resonance_score)));

  return (
    <div className="fortune-card overflow-hidden p-6 sm:p-8">
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-muted)]">═══════════════</p>
        <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
          天地人融合完成
        </h2>
        <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
          我們無法預測你的未來，但我們可以讓你看見那個連自己都沒發現的自己。
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:items-start">
        <section className="flex min-w-0 flex-col items-center text-center">
          <div className="score-orb mt-2">
            <div>
              <p className="text-6xl font-semibold text-[color:var(--text-main)]">{resonance}</p>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">人格共鳴度</p>
            </div>
          </div>
          <div className="mt-6 max-w-sm rounded-[22px] border border-white/10 bg-white/5 px-5 py-4">
            <h3 className="font-serif text-xl text-[color:var(--text-main)]">人格主軸</h3>
            <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{result.summary}</p>
          </div>
          <div className="mt-5 max-w-sm rounded-[22px] border border-[color:rgba(244,201,93,0.2)] bg-[color:rgba(109,74,255,0.09)] px-5 py-4 text-left">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">姓名能量模型</p>
            <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{result.name_energy}</p>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
              專屬天地人報告
            </p>
            <h3 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">完整人格解碼</h3>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
              這份報告綜合先天命格、後天氣場與姓名能量，重點不是判定好壞，而是幫你看見自己最真實的驅動來源。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ProgressBar
              label="人格輪廓"
              score={result.personality.score}
              description={result.personality.description}
              tone="sky"
            />
            <ProgressBar
              label="財富磁場"
              score={result.wealth.score}
              description={result.wealth.description}
              tone="earth"
            />
            <ProgressBar
              label="感情模式"
              score={result.love.score}
              description={result.love.description}
              tone="love"
            />
            <ProgressBar
              label="領導特質"
              score={result.leadership.score}
              description={result.leadership.description}
              tone="human"
            />
            <ProgressBar
              label="人生優勢"
              score={result.advantage.score}
              description={result.advantage.description}
              tone="sky"
            />
            <ProgressBar
              label="潛意識盲點"
              score={result.blind_spot.score}
              description={result.blind_spot.description}
              tone="love"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
