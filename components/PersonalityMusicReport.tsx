'use client';

import MusicPlayer from './MusicPlayer';

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

interface OceanProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

interface Meta {
  zodiac: string;
  era: string;
  eraDisplayName?: string;
  wuxing?: string;
  wuxingColor?: string;
  chineseZodiac?: string;
  heavenlyStem?: string;
  archetype?: string;
  archetypeSymbol?: string;
  archetypeEn?: string;
  archetypeDescription?: string;
  archetypeMusicPersona?: string;
  archetypeShadow?: string;
  archetypeCoreWound?: string;
  archetypeCoreGift?: string;
  archetypeLifeLesson?: string;
  archetypeShadowIntegration?: string;
  archetypeSecondary?: string;
  archetypeSecondarySymbol?: string;
  ocean?: OceanProfile;
}

interface MandarinTrack {
  title: string;
  artist: string;
  videoId: string;
}

interface PersonalityMusicReportProps {
  personalityMatrix: PersonalityMatrix;
  musicParameters: MusicParameters;
  musicReport: MusicReport;
  meta: Meta;
  mandarinTracks?: MandarinTrack[];
  name: string;
  onReset: () => void;
}

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
  cinematic_pop: '電影流行',
  acoustic_pop: '木質流行',
  indie_folk: '獨立民謠',
  alternative_rock: '另類搖滾',
  electronic_pop: '電子流行',
  experimental_electronic: '實驗電子',
  avant_garde: '前衛氛圍',
  ambient_electronic: '環境電子',
  psychedelic_rock: '迷幻搖滾',
  classical_ambient: '古典氛圍',
};

const GENRE_EMOJI: Record<string, string> = {
  cinematic_pop: '🎬',
  acoustic_pop: '🪵',
  indie_folk: '🌾',
  alternative_rock: '🎸',
  electronic_pop: '✨',
  experimental_electronic: '🧪',
  avant_garde: '🔮',
  ambient_electronic: '🌌',
  psychedelic_rock: '🌠',
  classical_ambient: '🎻',
};

const MATRIX_CONFIG: Array<{ key: keyof PersonalityMatrix; label: string; low: string; mid: string; high: string }> = [
  { key: 'emotion', label: '情緒感受', low: '穩定收束', mid: '溫柔流動', high: '感受強烈' },
  { key: 'logic', label: '理性思考', low: '直覺帶路', mid: '平衡判斷', high: '結構清晰' },
  { key: 'social', label: '社交互動', low: '慢熱內斂', mid: '自然往來', high: '外放連結' },
  { key: 'leadership', label: '主導傾向', low: '柔性帶動', mid: '穩定承擔', high: '明確領航' },
  { key: 'security', label: '安全需求', low: '偏向自由', mid: '需要節奏', high: '重視安定' },
  { key: 'creativity', label: '創造能量', low: '含蓄表達', mid: '靈感穩定', high: '靈光旺盛' },
  { key: 'risk', label: '冒險傾向', low: '謹慎推進', mid: '衡量後行動', high: '勇於突破' },
  { key: 'attachment', label: '情感依附', low: '保留邊界', mid: '溫和投入', high: '深度連結' },
];

const OCEAN_CONFIG: Array<{ key: keyof OceanProfile; label: string }> = [
  { key: 'openness', label: '開放性' },
  { key: 'conscientiousness', label: '自律性' },
  { key: 'extraversion', label: '外向度' },
  { key: 'agreeableness', label: '親和度' },
  { key: 'neuroticism', label: '敏感度' },
];

function getScoreWord(score: number, low: string, mid: string, high: string) {
  if (score >= 75) return high;
  if (score >= 50) return mid;
  return low;
}

function renderTags(items: string[], tone: 'violet' | 'amber' | 'pink' | 'cyan') {
  const toneStyle = {
    violet: { border: 'rgba(167,139,250,0.28)', bg: 'rgba(76,29,149,0.18)', color: '#ddd6fe' },
    amber: { border: 'rgba(251,191,36,0.28)', bg: 'rgba(120,53,15,0.18)', color: '#fde68a' },
    pink: { border: 'rgba(244,114,182,0.28)', bg: 'rgba(131,24,67,0.18)', color: '#fbcfe8' },
    cyan: { border: 'rgba(34,211,238,0.28)', bg: 'rgba(8,51,68,0.18)', color: '#cffafe' },
  }[tone];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: toneStyle.border, background: toneStyle.bg, color: toneStyle.color }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function PersonalityMusicReport({
  personalityMatrix,
  musicParameters,
  musicReport,
  meta,
  mandarinTracks,
  name,
  onReset,
}: PersonalityMusicReportProps) {
  const playerGenreKey = GENRE_TO_PLAYER_KEY[musicParameters.genre] || 'ballad';
  const genreName = GENRE_NAMES[musicParameters.genre] || musicParameters.genre;
  const genreEmoji = GENRE_EMOJI[musicParameters.genre] || '🎼';

  const metaChips = [
    meta.zodiac && { label: meta.zodiac, color: 'rgba(167,139,250,0.22)', text: '#ddd6fe' },
    meta.chineseZodiac && { label: meta.chineseZodiac, color: 'rgba(251,191,36,0.18)', text: '#fde68a' },
    meta.wuxing && { label: `五行 ${meta.wuxing}`, color: `${meta.wuxingColor ?? '#C9A24A'}22`, text: meta.wuxingColor ?? '#fcd34d' },
    meta.heavenlyStem && { label: `天干 ${meta.heavenlyStem}`, color: 'rgba(255,255,255,0.08)', text: '#d4d4d8' },
  ].filter(Boolean) as Array<{ label: string; color: string; text: string }>;

  return (
    <div className="space-y-6">
      <div className="fortune-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-6 py-4 sm:px-8">
          {metaChips.map((chip) => (
            <span
              key={chip.label}
              className="rounded-full border px-3 py-1 text-xs font-semibold tracking-widest"
              style={{ background: chip.color, color: chip.text, borderColor: 'rgba(255,255,255,0.12)' }}
            >
              {chip.label}
            </span>
          ))}
        </div>

        <div className="px-6 py-8 sm:px-8">
          <p className="text-xs uppercase tracking-[0.4em] text-violet-300/70">人格主題曲完成</p>
          <h2 className="mt-3 font-serif leading-tight text-[color:var(--text-main)]" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)' }}>
            《{musicReport.song_title_suggestion}》
          </h2>
          <p className="mt-3 font-serif text-base italic leading-8 sm:text-lg" style={{ color: meta.wuxingColor ?? 'var(--earth-gold)' }}>
            {musicReport.lyric_opening}
          </p>
          <p className="mt-5 text-sm leading-9 text-[color:var(--text-sub)]">{musicReport.music_narrative}</p>
        </div>
      </div>

      <MusicPlayer
        mandarinTracks={mandarinTracks}
        eraDisplayName={meta.eraDisplayName ?? meta.era}
        genreKey={playerGenreKey}
        genreName={genreName}
        genreEmoji={genreEmoji}
        affinityScore={Math.round((personalityMatrix.creativity + personalityMatrix.emotion) / 2)}
      />

      <div className="fortune-card px-6 py-7 sm:px-8">
        <p className="mb-6 text-xs uppercase tracking-[0.4em] text-[color:var(--text-muted)]">人格能量矩陣</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {MATRIX_CONFIG.map(({ key, label, low, mid, high }) => {
            const score = personalityMatrix[key];
            const word = getScoreWord(score, low, mid, high);
            const barColor =
              score >= 75
                ? 'linear-gradient(90deg, var(--sky-violet), #c084fc)'
                : score >= 50
                  ? 'linear-gradient(90deg, var(--human-cyan), #67e8f9)'
                  : 'linear-gradient(90deg, var(--earth-gold), #fcd34d)';

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs tracking-widest text-[color:var(--text-muted)]">{label}</span>
                  <span className="text-xs font-semibold text-[color:var(--text-sub)]">{word} · {score}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {meta.ocean && (
        <div className="fortune-card px-6 py-7 sm:px-8">
          <p className="mb-6 text-xs uppercase tracking-[0.4em] text-cyan-300/70">OCEAN 心理輪廓</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {OCEAN_CONFIG.map(({ key, label }) => {
              const score = meta.ocean![key];
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs tracking-widest text-[color:var(--text-muted)]">{label}</span>
                    <span className="text-xs font-semibold text-cyan-200">{score}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${score}%`, background: 'linear-gradient(90deg, #22d3ee, #67e8f9)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="fortune-card px-6 py-7 sm:px-8">
        <p className="mb-6 text-xs uppercase tracking-[0.4em] text-[color:var(--text-muted)]">音樂生成參數</p>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs tracking-widest text-[color:var(--text-muted)]">節奏</p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--text-main)]">{musicParameters.bpm}</p>
            <p className="text-xs text-[color:var(--text-muted)]">BPM</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs tracking-widest text-[color:var(--text-muted)]">音調</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--text-main)]">{musicParameters.key}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs tracking-widest text-[color:var(--text-muted)]">風格</p>
            <p className="mt-2 text-base font-semibold text-[color:var(--text-main)]">{genreEmoji} {genreName}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs tracking-widest text-[color:var(--text-muted)]">氛圍</p>
            {renderTags(musicParameters.mood, 'violet')}
          </div>
          <div>
            <p className="mb-2 text-xs tracking-widest text-[color:var(--text-muted)]">樂器</p>
            {renderTags(musicParameters.instrument, 'amber')}
          </div>
          <div>
            <p className="mb-2 text-xs tracking-widest text-[color:var(--text-muted)]">歌詞主題</p>
            {renderTags(musicParameters.lyric_theme, 'pink')}
          </div>
          <div>
            <p className="mb-2 text-xs tracking-widest text-[color:var(--text-muted)]">唱腔設定</p>
            {renderTags([musicParameters.vocal_style], 'cyan')}
          </div>
        </div>
      </div>

      <div className="sky-card fortune-card px-6 py-7 sm:px-8">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-violet-300/70">這首歌想對你說</p>
        <p className="text-sm leading-9 text-[color:var(--text-main)]">{musicReport.music_message}</p>
      </div>

      <div className="vip-gold-card rounded-[24px] px-6 py-8 sm:px-8">
        <div className="mb-7 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70">善意提醒</p>
          <p className="mx-auto mt-5 max-w-2xl font-serif text-sm leading-9 text-[color:var(--text-main)]">
            {musicReport.wisdom_note}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-xs leading-7 text-[color:var(--text-sub)]">
            {name} 的最終三合一結果已完成。系統會保留天地骨架，再以名字做最後校正；方向可以被看見，但真正讓命運變順的，仍然是以善為本、持續行善。
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => window.print()} className="vip-gold-btn flex-1 py-4 text-sm">
            匯出這份報告
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
          >
            重新分析
          </button>
        </div>
      </div>
    </div>
  );
}
