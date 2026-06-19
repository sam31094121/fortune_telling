import { DIMENSION_META } from '@/lib/personality';
import type { AnalysisResult } from '@/lib/types';
import MusicProfile from './MusicProfile';
import ProgressBar from './ProgressBar';

interface ResultDisplayProps {
  result: AnalysisResult;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
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
          不是算命，而是以生日、血型、姓名建立你的專屬人格模型。
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

          <div className="mt-6 max-w-sm rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left">
            <h3 className="font-serif text-xl text-[color:var(--text-main)]">最終融合</h3>
            <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{result.final_summary}</p>
          </div>

          <div className="mt-5 grid w-full max-w-sm gap-4">
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">天｜人格骨架</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{result.skeleton_summary}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">地｜行為模式</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{result.behavior_summary}</p>
            </div>
            <div className="rounded-[22px] border border-[color:rgba(244,201,93,0.2)] bg-[color:rgba(109,74,255,0.09)] px-5 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">人｜個體差異</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{result.individuality_summary}</p>
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
              專屬人格模型
            </p>
            <h3 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">12 維度最終人格圖譜</h3>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
              固定採天 35%、地 35%、人 30% 融合；生日建立骨架，血型補充行為，姓名負責個人化校正。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {DIMENSION_META.map((dimension) => (
              <div key={dimension.key} className="fortune-card min-w-0 p-5">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-serif text-xl text-[color:var(--text-main)]">{dimension.label}</h4>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      天 {result.base_scores[dimension.key]} / 地 {signed(result.blood_adjustments[dimension.key])} / 人 {signed(result.name_adjustments[dimension.key])}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-semibold text-[color:var(--text-main)]">
                      {result.final_scores[dimension.key]}
                    </span>
                    <span className="ml-1 text-sm text-[color:var(--text-sub)]">分</span>
                  </div>
                </div>

                <ProgressBar
                  label={dimension.shortLabel}
                  score={result.final_scores[dimension.key]}
                  description="最終融合值"
                  tone={dimension.tone}
                />
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="fortune-card p-5">
              <h4 className="font-serif text-xl text-[color:var(--text-main)]">財富動機</h4>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
                {result.wealth_motivation_summary}
              </p>
            </div>
            <div className="fortune-card p-5">
              <h4 className="font-serif text-xl text-[color:var(--text-main)]">感情模式</h4>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
                {result.love_pattern_summary}
              </p>
            </div>
            <div className="fortune-card p-5">
              <h4 className="font-serif text-xl text-[color:var(--text-main)]">潛意識盲點</h4>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
                {result.blind_spot_summary}
              </p>
            </div>
            <div className="fortune-card p-5">
              <h4 className="font-serif text-xl text-[color:var(--text-main)]">人生優勢</h4>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
                {result.life_advantage_summary}
              </p>
            </div>
          </div>

          {/* 第四段：專屬人格音樂 */}
          <div className="mt-8">
            <MusicProfile profile={result.music_profile} tier="full" />
          </div>
        </section>
      </div>

      {/* 第五段：AI 智慧觀點 */}
      <div className="mt-10 rounded-[28px] border border-[color:rgba(244,201,93,0.28)] bg-[color:rgba(109,74,255,0.06)] px-7 py-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-xl">✦</span>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--text-muted)]">
              第五段 · 智慧引擎
            </p>
            <h3 className="mt-1 font-serif text-2xl text-[color:var(--text-main)]">AI 智慧觀點</h3>
          </div>
          <span className="ml-auto text-xl">✦</span>
        </div>
        <div className="space-y-4">
          {result.wisdom_perspective.split('\n\n').map((paragraph, index) => (
            <p
              key={index}
              className="text-sm leading-8 text-[color:var(--text-sub)] sm:text-base sm:leading-9"
            >
              {paragraph}
            </p>
          ))}
        </div>
        <p className="mt-6 text-right text-xs tracking-[0.3em] text-[color:var(--text-muted)]">
          天地萬物一切皆有靈
        </p>
      </div>
    </div>
  );
}
