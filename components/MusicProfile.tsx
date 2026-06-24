import type { MusicProfile as MusicProfileType } from '@/lib/types';
import { getGenreTrack } from '@/lib/genre-tracks';
import MusicPlayer from './MusicPlayer';

interface MusicProfileProps {
  profile: MusicProfileType;
  /** 'preview' = free tier (birthday + blood), 'full' = VIP (all three) */
  tier: 'preview' | 'full';
}

const SOUND_LABELS: Record<string, string> = {
  快節奏: '⚡ 快節奏',
  適中: '〜 適中節奏',
  慢節奏: '🌙 慢節奏',
  高張力: '🔥 高張力',
  平衡: '⚖️ 平衡',
  輕柔: '🍃 輕柔',
  情感濃郁: '💜 情感濃郁',
  情感適中: '🩵 情感適中',
  清爽理性: '🧠 清爽理性',
  結構複雜: '🔬 結構複雜',
  層次分明: '📐 層次分明',
  簡潔直覺: '✦ 簡潔直覺',
};

export default function MusicProfile({ profile, tier }: MusicProfileProps) {
  if (!profile) return null;
  const { topGenres, allGenres, soundProfile, listeningSummary } = profile;

  return (
    <div className="fortune-card overflow-hidden p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6 border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
          {tier === 'preview' ? '大數據音樂偏好｜免費預覽' : '大數據音樂偏好｜完整版'}
        </p>
        <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
          你的音樂人格圖譜
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
          {listeningSummary}
        </p>
      </div>

      {/* Auto-play player for top genre */}
      <div className="mb-6">
        <MusicPlayer
          label={`${topGenres[0].emoji} ${topGenres[0].name}`}
          flag={topGenres[0].emoji}
          track={getGenreTrack(topGenres[0].key)}
          affinityScore={topGenres[0].score}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        {/* Left: Top 3 genres */}
        <section>
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
            前三高親和力音樂類型
          </p>
          <div className="flex flex-col gap-4">
            {topGenres.map((genre, index) => (
              <div
                key={genre.key}
                className="rounded-[22px] border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{genre.emoji}</span>
                      <div>
                        <span className="text-xs text-[color:var(--text-muted)]">#{index + 1}</span>
                        <h4 className="font-serif text-xl text-[color:var(--text-main)]">
                          {genre.name}
                        </h4>
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
                      {genre.soundDesc}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span
                      className="text-3xl font-semibold"
                      style={{
                        color:
                          index === 0
                            ? 'var(--fortune-good)'
                            : index === 1
                              ? 'var(--earth-gold)'
                              : 'var(--human-cyan)',
                      }}
                    >
                      {genre.score}
                    </span>
                    <span className="ml-1 text-sm text-[color:var(--text-sub)]">分</span>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${genre.score}%`,
                      background:
                        index === 0
                          ? 'linear-gradient(90deg, var(--fortune-good), #7bffb2)'
                          : index === 1
                            ? 'linear-gradient(90deg, var(--earth-gold), #ffe88a)'
                            : 'linear-gradient(90deg, var(--human-cyan), #8bf5ff)',
                    }}
                  />
                </div>

                {/* Recommended artists */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {genre.artists.map((artist) => (
                    <span
                      key={artist}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[color:var(--text-sub)]"
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Sound profile + full ranking */}
        <section className="flex flex-col gap-6">
          {/* Sound profile characteristics */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
              聲音偏好特質
            </p>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(soundProfile).map((value) => (
                <div
                  key={value}
                  className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium text-[color:var(--text-main)]"
                >
                  {SOUND_LABELS[value] ?? value}
                </div>
              ))}
            </div>
          </div>

          {/* Full genre ranking */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
              全類型親和力排行
            </p>
            <div className="space-y-2">
              {allGenres.map((genre, index) => (
                <div key={genre.key} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs text-[color:var(--text-muted)]">
                    {index + 1}
                  </span>
                  <span className="text-base">{genre.emoji}</span>
                  <span className="min-w-[70px] text-sm text-[color:var(--text-sub)]">
                    {genre.name}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-white/40 transition-all duration-500"
                      style={{ width: `${genre.score}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-[color:var(--text-muted)]">
                    {genre.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
