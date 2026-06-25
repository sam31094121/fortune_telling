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
          免費預覽
        </p>
        <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
          你的初步人格輪廓
        </h2>
        <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{result.preview_summary}</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:items-start">
        <section className="flex min-w-0 flex-col items-center text-center">
          <div className="score-orb mt-2">
            <div>
              <p className="text-6xl font-semibold text-[color:var(--text-main)]">{result.preview_score}</p>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">初步輪廓分數</p>
            </div>
          </div>

          <div className="mt-6 grid w-full max-w-sm gap-4">
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">性格底色</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{result.skeleton_summary}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">行為模式</p>
              <p className="mt-3 text-sm leading-8 text-[color:var(--text-main)]">{result.behavior_summary}</p>
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">免費預覽</p>
            <h3 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">先看懂核心輪廓</h3>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
              這一層先整理性格底色與行為模式。補上姓名後，會再產出更完整的個人報告。
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
                  description="初步分數"
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
