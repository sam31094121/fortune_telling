'use client';

import MusicPlayer, { GENRE_TRACKS } from './MusicPlayer';

interface PersonalityMatrix {
  emotion: number;
  logic: number;
  social: number;
  leadership: number;
  security: number;
  creativity: number;
  risk: number;
  attachment: number;
}

interface MusicParameters {
  bpm: number;
  key: string;
  genre: string;
  mood: string[];
  vocal_style: string;
  instrument: string[];
  lyric_theme: string[];
}

interface MusicReport {
  music_narrative: string;
  song_title_suggestion: string;
  lyric_opening: string;
  music_message: string;
  wisdom_note: string;
}

interface PersonalityMusicReportProps {
  personalityMatrix: PersonalityMatrix;
  musicParameters: MusicParameters;
  musicReport: MusicReport;
  meta: { zodiac: string; era: string };
  name: string;
  onReset: () => void;
}

// 人格矩陣維度顯示配置
const MATRIX_META: { key: keyof PersonalityMatrix; label: string; color: string }[] = [
  { key: 'emotion', label: '情感深度', color: 'var(--fortune-love)' },
  { key: 'creativity', label: '創意能量', color: 'var(--sky-violet)' },
  { key: 'social', label: '社交共鳴', color: 'var(--human-cyan)' },
  { key: 'leadership', label: '領導磁場', color: 'var(--earth-gold)' },
  { key: 'logic', label: '邏輯結構', color: 'var(--fortune-good)' },
  { key: 'security', label: '安全感', color: '#6ee7a8' },
  { key: 'risk', label: '冒險傾向', color: 'var(--fortune-warning)' },
  { key: 'attachment', label: '依戀強度', color: 'var(--human-pink)' },
];

// 生成的音樂風格 → MusicPlayer 使用的 genreKey 對照
const GENRE_TO_PLAYER_KEY: Record<string, string> = {
  cinematic_pop: 'ballad',
  acoustic_pop: 'folk_indie',
  indie_folk: 'folk_indie',
  alternative_rock: 'rock',
  electronic_pop: 'electronic',
  experimental_electronic: 'electronic',
  avant_garde: 'new_age',
  ambient_electronic: 'new_age',
  psychedelic_rock: 'rock',
  classical_ambient: 'classical',
};

const GENRE_NAMES: Record<string, string> = {
  cinematic_pop: '電影感流行',
  acoustic_pop: '原聲流行',
  indie_folk: '獨立民謠',
  alternative_rock: '另類搖滾',
  electronic_pop: '電子流行',
  experimental_electronic: '實驗電子',
  avant_garde: '前衛音樂',
  ambient_electronic: '氛圍電子',
  psychedelic_rock: '迷幻搖滾',
  classical_ambient: '古典環境音',
};

const GENRE_EMOJI: Record<string, string> = {
  cinematic_pop: '🎬',
  acoustic_pop: '🎸',
  indie_folk: '🌿',
  alternative_rock: '⚡',
  electronic_pop: '🎛️',
  experimental_electronic: '🔮',
  avant_garde: '🌀',
  ambient_electronic: '🌌',
  psychedelic_rock: '🎆',
  classical_ambient: '🎻',
};

export default function PersonalityMusicReport({
  personalityMatrix,
  musicParameters,
  musicReport,
  meta,
  name,
  onReset,
}: PersonalityMusicReportProps) {
  const playerGenreKey = GENRE_TO_PLAYER_KEY[musicParameters.genre] || 'ballad';
  const genreName = GENRE_NAMES[musicParameters.genre] || musicParameters.genre;
  const genreEmoji = GENRE_EMOJI[musicParameters.genre] || '🎵';

  // 計算最主導的人格維度
  const dominantDimension = MATRIX_META.reduce((prev, curr) =>
    personalityMatrix[curr.key] > personalityMatrix[prev.key] ? curr : prev,
  );

  return (
    <div className="space-y-6">
      {/* 頂部：歌名 + 人格音樂靈魂 */}
      <div className="fortune-card overflow-hidden p-6 sm:p-8">
        <div className="mb-6 border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.35em] text-violet-300">
            天地人 AI 人格音樂 · {meta.zodiac} · {meta.era}
          </p>
          <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)] sm:text-4xl">
            「{musicReport.song_title_suggestion}」
          </h2>
          <p className="mt-2 text-sm italic text-[color:var(--earth-gold)]">
            {musicReport.lyric_opening}
          </p>
        </div>

        <p className="text-sm leading-8 text-[color:var(--text-sub)]">
          {musicReport.music_narrative}
        </p>
      </div>

      {/* 音樂播放器 */}
      <MusicPlayer
        genreKey={playerGenreKey}
        genreName={genreName}
        genreEmoji={genreEmoji}
        affinityScore={Math.round(
          (personalityMatrix.creativity + personalityMatrix.emotion) / 2,
        )}
      />

      {/* 人格音樂矩陣 */}
      <div className="fortune-card p-6 sm:p-8">
        <p className="mb-5 text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
          人格音樂矩陣
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {MATRIX_META.map(({ key, label, color }) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--text-sub)]">{label}</span>
                <span className="font-semibold" style={{ color }}>
                  {personalityMatrix[key]}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${personalityMatrix[key]}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-[color:var(--text-muted)]">主導人格維度</p>
          <p className="mt-1 text-base font-semibold text-[color:var(--text-main)]">
            {dominantDimension.label}
            <span className="ml-2 text-sm font-normal text-[color:var(--text-sub)]">
              {personalityMatrix[dominantDimension.key]} 分
            </span>
          </p>
        </div>
      </div>

      {/* 音樂參數 */}
      <div className="fortune-card p-6 sm:p-8">
        <p className="mb-5 text-xs uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
          專屬音樂參數
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-[color:var(--text-muted)]">BPM · 速度</p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--text-main)]">
              {musicParameters.bpm}
              <span className="ml-1 text-sm font-normal text-[color:var(--text-muted)]">bpm</span>
            </p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-[color:var(--text-muted)]">音調</p>
            <p className="mt-1 text-lg font-semibold text-[color:var(--text-main)]">
              {musicParameters.key}
            </p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-[color:var(--text-muted)]">風格</p>
            <p className="mt-1 text-base font-semibold text-[color:var(--text-main)]">
              {genreEmoji} {genreName}
            </p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-[color:var(--text-muted)]">唱腔</p>
            <p className="mt-1 text-sm text-[color:var(--text-main)]">
              {musicParameters.vocal_style}
            </p>
          </div>
        </div>

        {/* 氛圍 tags */}
        <div className="mt-4">
          <p className="mb-2 text-xs text-[color:var(--text-muted)]">氛圍</p>
          <div className="flex flex-wrap gap-2">
            {musicParameters.mood.map(m => (
              <span
                key={m}
                className="rounded-full border border-violet-400/30 bg-violet-950/30 px-3 py-1 text-xs text-violet-200"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* 樂器 */}
        <div className="mt-4">
          <p className="mb-2 text-xs text-[color:var(--text-muted)]">樂器編成</p>
          <div className="flex flex-wrap gap-2">
            {musicParameters.instrument.map(inst => (
              <span
                key={inst}
                className="rounded-full border border-amber-400/25 bg-amber-950/20 px-3 py-1 text-xs text-amber-200"
              >
                {inst}
              </span>
            ))}
          </div>
        </div>

        {/* 歌詞主題 */}
        <div className="mt-4">
          <p className="mb-2 text-xs text-[color:var(--text-muted)]">歌詞主題</p>
          <div className="flex flex-wrap gap-2">
            {musicParameters.lyric_theme.map(theme => (
              <span
                key={theme}
                className="rounded-full border border-pink-400/25 bg-pink-950/20 px-3 py-1 text-xs text-pink-200"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 音樂想對你說的話 */}
      <div className="sky-card fortune-card p-6 sm:p-8">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-violet-300">
          這首歌想對你說
        </p>
        <p className="text-sm leading-8 text-[color:var(--text-main)]">
          {musicReport.music_message}
        </p>
      </div>

      {/* 善念結語 */}
      <div className="vip-gold-card rounded-[24px] p-6 sm:p-8">
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-amber-300">善念與命運</p>
        <p className="text-sm leading-8 text-[color:var(--text-main)]">{musicReport.wisdom_note}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.print()}
            className="vip-gold-btn flex-1 py-4 text-sm"
          >
            匯出人格音樂報告
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
          >
            重新生成
          </button>
        </div>
      </div>
    </div>
  );
}
