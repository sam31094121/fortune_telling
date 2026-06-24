'use client';

import { useState } from 'react';
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
  english_song_reason?: string;
  mandarin_song_reason?: string;
  taiwanese_song_reason?: string;
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

interface SongTrack {
  title: string;
  artist: string;
  videoId: string;
}

interface FusionSong {
  fusion_title: string;
  fusion_concept: string;
  fusion_lyrics: string[];
  fusion_style: string;
}

interface SongDraft {
  language_label: string;
  title: string;
  concept: string;
  lyrics: string[];
  style: string;
  vocal_direction: string;
}

interface SongDrafts {
  english: SongDraft;
  mandarin: SongDraft;
  taiwanese: SongDraft;
}

interface PersonalityMusicReportProps {
  personalityMatrix: PersonalityMatrix;
  musicParameters: MusicParameters;
  musicReport: MusicReport;
  meta: Meta;
  englishTrack: SongTrack;
  mandarinTrack: SongTrack | null;
  taiwaneseTrack: SongTrack | null;
  songDrafts?: SongDrafts;
  fusionSong?: FusionSong;
  name: string;
  onReset: () => void;
}

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

function SongDraftCard({
  draft,
  accent,
}: {
  draft: SongDraft;
  accent: 'violet' | 'amber' | 'cyan';
}) {
  const accentStyle = {
    violet: {
      border: 'rgba(167,139,250,0.22)',
      bg: 'rgba(76,29,149,0.16)',
      text: '#ddd6fe',
    },
    amber: {
      border: 'rgba(251,191,36,0.22)',
      bg: 'rgba(120,53,15,0.16)',
      text: '#fde68a',
    },
    cyan: {
      border: 'rgba(34,211,238,0.22)',
      bg: 'rgba(8,51,68,0.16)',
      text: '#cffafe',
    },
  }[accent];

  return (
    <div className="rounded-[24px] border bg-white/[0.035] p-5" style={{ borderColor: accentStyle.border }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.25em]"
          style={{ borderColor: accentStyle.border, background: accentStyle.bg, color: accentStyle.text }}
        >
          {draft.language_label}
        </span>
        <span className="text-xs text-[color:var(--text-muted)]">原創雛形</span>
      </div>

      <h4 className="font-serif text-xl text-[color:var(--text-main)]">《{draft.title}》</h4>
      <p className="mt-3 text-xs leading-7 text-[color:var(--text-sub)]">{draft.concept}</p>

      <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
        <div className="space-y-1.5 font-serif text-sm leading-7 text-[color:var(--text-main)]">
          {draft.lyrics.map((line, index) => {
            const isSection = /^\s*[\[【].+[\]】]\s*$/.test(line);
            return isSection ? (
              <p key={`${line}-${index}`} className="pt-2 text-xs font-semibold tracking-[0.25em]" style={{ color: accentStyle.text }}>
                {line.replace(/[\[\]【】]/g, '')}
              </p>
            ) : (
              <p key={`${line}-${index}`}>{line}</p>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs leading-6 text-[color:var(--text-muted)]">
        <p>
          <span style={{ color: accentStyle.text }}>曲風：</span>
          {draft.style}
        </p>
        <p>
          <span style={{ color: accentStyle.text }}>主唱方向：</span>
          {draft.vocal_direction}
        </p>
      </div>
    </div>
  );
}

export default function PersonalityMusicReport({
  personalityMatrix,
  musicParameters,
  musicReport,
  meta,
  englishTrack,
  mandarinTrack,
  taiwaneseTrack,
  songDrafts,
  fusionSong,
  name,
  onReset,
}: PersonalityMusicReportProps) {
  // 同一時間只允許一首歌在播，避免多個播放器同時出聲互相衝突
  const [openPlayer, setOpenPlayer] = useState<'english' | 'mandarin' | 'taiwanese' | null>(null);

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

      {songDrafts && (
        <div className="fortune-card px-6 py-8 sm:px-8">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/70">
              AI 原創歌資料 · 第一階段
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
              由生日、血型、姓名生成三首歌
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-7 text-[color:var(--text-sub)]">
              這裡先不產生音檔，只建立英文、國語、台語三首原創歌的歌名、歌詞、曲風與主唱方向；下一階段再把三首融合成可播放的人聲歌曲。
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SongDraftCard draft={songDrafts.english} accent="violet" />
            <SongDraftCard draft={songDrafts.mandarin} accent="amber" />
            <SongDraftCard draft={songDrafts.taiwanese} accent="cyan" />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-center text-xs uppercase tracking-[0.4em] text-violet-300/70">
          AI 大數據 · 參考播放測試（英文 · 國語 · 台語）
        </p>
        <p className="text-center text-xs text-[color:var(--text-muted)]">
          這裡是目前可播放的參考聲音層；一次只播一首，開啟另一首會自動停止目前這首
        </p>
        <MusicPlayer
          label="英文主題曲"
          flag="🌍"
          track={englishTrack}
          reason={musicReport.english_song_reason}
          affinityScore={Math.round((personalityMatrix.creativity + personalityMatrix.emotion) / 2)}
          isOpen={openPlayer === 'english'}
          onToggleOpen={(open) => setOpenPlayer(open ? 'english' : null)}
        />
        {mandarinTrack && (
          <MusicPlayer
            label={`國語主題曲 · ${meta.eraDisplayName ?? meta.era}`}
            flag="🀄"
            track={mandarinTrack}
            reason={musicReport.mandarin_song_reason}
            affinityScore={Math.round((personalityMatrix.attachment + personalityMatrix.emotion) / 2)}
            isOpen={openPlayer === 'mandarin'}
            onToggleOpen={(open) => setOpenPlayer(open ? 'mandarin' : null)}
          />
        )}
        {taiwaneseTrack && (
          <MusicPlayer
            label={`台語主題曲 · ${meta.eraDisplayName ?? meta.era}`}
            flag="🌾"
            track={taiwaneseTrack}
            reason={musicReport.taiwanese_song_reason}
            affinityScore={Math.round((personalityMatrix.attachment + personalityMatrix.security) / 2)}
            isOpen={openPlayer === 'taiwanese'}
            onToggleOpen={(open) => setOpenPlayer(open ? 'taiwanese' : null)}
          />
        )}
      </div>

      {fusionSong && (
        <div className="vip-gold-card rounded-[24px] px-6 py-8 sm:px-8">
          <div className="mb-5 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70">
              ✦ AI 三語融合原創主題曲 ✦
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
              《{fusionSong.fusion_title}》
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-7 text-[color:var(--text-sub)]">
              {fusionSong.fusion_concept}
            </p>
          </div>

          <div className="rounded-[18px] border border-amber-300/15 bg-black/20 px-5 py-5">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-300/60">融合歌詞</p>
            <div className="space-y-1.5 font-serif text-sm leading-8 text-[color:var(--text-main)]">
              {fusionSong.fusion_lyrics.map((line, i) => {
                const isSection = /^\s*[\[【].+[\]】]\s*$/.test(line);
                return isSection ? (
                  <p key={i} className="pt-2 text-xs font-semibold tracking-[0.3em] text-amber-300/70">
                    {line.replace(/[\[\]【】]/g, '')}
                  </p>
                ) : (
                  <p key={i}>{line}</p>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/5 px-5 py-4">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">融合曲風設定</p>
            <p className="text-sm leading-7 text-[color:var(--text-sub)]">{fusionSong.fusion_style}</p>
          </div>

          <p className="mt-4 text-center text-xs leading-6 text-[color:var(--text-muted)]">
            目前為 AI 文字創作版（歌詞＋曲風）。下一階段可接音樂生成服務，把它變成真正能播放的原創歌曲。
          </p>
        </div>
      )}

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
