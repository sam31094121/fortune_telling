import { DIMENSION_META } from '@/lib/personality';
import type { PreviewAnalysisResult } from '@/lib/types';
import MusicProfile from './MusicProfile';
import ProgressBar from './ProgressBar';

interface PreviewDisplayProps {
  result: PreviewAnalysisResult;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export default function PreviewDisplay({ result }: PreviewDisplayProps) {
  return (
    <div className="fortune-card overflow-hidden p-6 sm:p-8">
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
          天地預分析
        </p>
        <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
          人格輪廓已建立
        </h2>
        <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{result.preview_summary}</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:items-start">
        <section className="flex min-w-0 flex-col items-center text-center">
          <div className="score-orb mt-2">
            <div>
              <p className="text-6xl font-semibold text-[color:var(--text-main)]">{result.preview_score}</p>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">天地預分析值</p>
            </div>
          </div>

          <div className="mt-6 grid w-full max-w-sm gap-4">
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">天｜人格骨架</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{result.skeleton_summary}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">地｜行為模式</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{result.behavior_summary}</p>
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">免費預覽</p>
            <h3 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">天 + 地 大數據預分析</h3>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
              這一層只先建立人格骨架與行為模式。姓名加入後，系統才會展開個體差異校正與三合一最終融合。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {DIMENSION_META.map((dimension) => (
              <div key={dimension.key} className="fortune-card min-w-0 p-5">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-serif text-xl text-[color:var(--text-main)]">{dimension.label}</h4>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      天 {result.base_scores[dimension.key]} / 地 {signed(result.blood_adjustments[dimension.key])}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-semibold text-[color:var(--text-main)]">
                      {result.preview_scores[dimension.key]}
                    </span>
                    <span className="ml-1 text-sm text-[color:var(--text-sub)]">分</span>
                  </div>
                </div>
                <ProgressBar
                  label={dimension.shortLabel}
                  score={result.preview_scores[dimension.key]}
                  description="天地預分析值"
                  tone={dimension.tone}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Music profile — computed from birthday + blood type dimension scores */}
      <div className="mt-10">
        <MusicProfile profile={result.music_profile} tier="preview" />
      </div>
    </div>
  );
}
