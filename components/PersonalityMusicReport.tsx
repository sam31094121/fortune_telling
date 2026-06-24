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

interface ProductionPlan {
  producer_summary: string;
  fusion_strategy: string;
  final_song_brief: string;
  arrangement_plan: string[];
  vocal_cast: string[];
  lead_vocal_choice: string;
  language_distribution: string;
  hook_design: string;
  popular_music_dna?: string[];
  global_trend_blend?: string[];
  trend_arrangement_recipe?: string;
  rhythm_strategy?: string;
  trend_safety_note?: string;
  hit_formula?: string;
  hook_repeat_strategy?: string;
  emotional_arc?: string;
  generation_prompt: string;
  next_step_note: string;
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
  productionPlan?: ProductionPlan;
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

function getFirstLyricLine(draft: SongDraft) {
  return draft.lyrics.find((line) => line.trim() && !/^\s*[\[【].+[\]】]\s*$/.test(line))?.trim() ?? draft.concept;
}

function getBilingualResonanceData(
  songDrafts: SongDrafts,
  personalityMatrix: PersonalityMatrix,
  musicParameters: MusicParameters,
) {
  const englishScore = Math.round(clampNumber(
    personalityMatrix.creativity * 0.38 +
      personalityMatrix.emotion * 0.28 +
      personalityMatrix.social * 0.18 +
      personalityMatrix.risk * 0.16,
    0,
    100,
  ));
  const mandarinScore = Math.round(clampNumber(
    personalityMatrix.attachment * 0.32 +
      personalityMatrix.emotion * 0.28 +
      personalityMatrix.security * 0.24 +
      personalityMatrix.logic * 0.16,
    0,
    100,
  ));
  const combinedScore = Math.round(clampNumber(
    englishScore * 0.46 +
      mandarinScore * 0.46 +
      Math.min(12, Math.abs(englishScore - mandarinScore) * 0.18 + 6),
    0,
    100,
  ));
  const safeBpm = Math.round(clampNumber(Number.isFinite(musicParameters.bpm) ? musicParameters.bpm : 96, 82, 132));
  const moodText = musicParameters.mood.slice(0, 3).join('、') || '清楚、溫暖、有記憶點';
  const englishHook = getFirstLyricLine(songDrafts.english);
  const mandarinHook = getFirstLyricLine(songDrafts.mandarin);
  const safeBpmText = `${safeBpm} BPM / ${musicParameters.key}`;
  const instrumentText = musicParameters.instrument.slice(0, 5).join('、') || '鋼琴、合成器、鼓、弦樂、低頻';

  return {
    englishScore,
    mandarinScore,
    combinedScore,
    commandText: `英文主題曲 AI 音樂共鳴度 ${englishScore}% + 國語主題曲 AI 音樂共鳴度 ${mandarinScore}% → 雙語剪接共鳴 ${combinedScore}%`,
    editTimeline: [
      {
        time: '0–8 秒',
        layer: 'English Theme',
        role: '開場 Hook / 畫面感',
        instruction: `用《${songDrafts.english.title}》的第一句「${englishHook}」做短句記憶點，音色保持空靈、明亮、簡潔。`,
      },
      {
        time: '8–28 秒',
        layer: '國語主題曲',
        role: '主線敘事 / 情緒推進',
        instruction: `切入《${songDrafts.mandarin.title}》的核心句「${mandarinHook}」，讓國語旋律承接故事與情感。`,
      },
      {
        time: '28–42 秒',
        layer: 'English + 國語',
        role: '雙語副歌 / 精準交疊',
        instruction: '英文只留 Hook，國語保留主句；兩邊不要整段互唱，像影片剪接一樣一刀一刀切乾淨。',
      },
      {
        time: '42–60 秒',
        layer: '國語收束',
        role: '記憶點落地',
        instruction: `回到國語主題，使用 ${safeBpm} BPM / ${musicParameters.key} / ${moodText} 的流行編曲感收尾。`,
      },
    ],
    clipRules: [
      '這一步只用英文與國語，台語先暫停不放入，避免資訊太多。',
      '英文像影片開場字幕與主題 Hook，負責第一秒抓住耳朵。',
      '國語像主角旁白與情緒主線，負責讓人聽懂、聽進去。',
      '副歌只做短句交疊，不做整段混唱，讓歌曲保持簡潔。',
      '每一次切換只保留一個主要旋律，避免兩首歌互相搶畫面。',
    ],
    projectPlan: [
      {
        title: '1. 雙語素材鎖定',
        detail: `只採用英文《${songDrafts.english.title}》與國語《${songDrafts.mandarin.title}》。英文取 Hook 與空氣感，國語取主歌情緒與主題句。`,
      },
      {
        title: '2. 歌手聲音方向',
        detail: `AI 歌手不模仿任何真人；聲線設定為「${musicParameters.vocal_style}」，英文段落較空靈，國語段落更貼近、清楚、有故事感。`,
      },
      {
        title: '3. 音樂生成方向',
        detail: `使用 ${safeBpmText}，曲風以 ${musicParameters.genre} 為主，情緒關鍵字為 ${moodText}，樂器核心是 ${instrumentText}。`,
      },
      {
        title: '4. 自動剪接成品',
        detail: '輸出一條 60 秒左右的雙語主題曲草案：英文開場、國語推進、雙語副歌、國語落地，像短影片自動剪輯一樣乾淨接軌。',
      },
    ],
    aiGenerationScript: [
      `Project: bilingual original theme song generated from birthday, blood type, and name.`,
      `Source A English Theme: "${songDrafts.english.title}" — use only the hook feeling and atmospheric identity.`,
      `Source B Mandarin Theme: "《${songDrafts.mandarin.title}》" — use the emotional storyline and main lyrical message.`,
      `Singer: original AI vocalist, ${musicParameters.vocal_style}, intimate, clear diction, warm emotional delivery, not imitating any real artist.`,
      `Music: ${musicParameters.genre}, ${safeBpmText}, mood ${moodText}, instruments ${instrumentText}.`,
      `Arrangement: cinematic intro, clean verse, bilingual hook chorus, simple outro; avoid over-layering and keep one main melody at a time.`,
    ],
    autoEditScript: [
      {
        shot: '開場鏡頭',
        audio: `英文 Hook：「${englishHook}」`,
        edit: '畫面慢慢推近，空氣感 Pad + 簡單鋼琴，字幕只放英文短句。',
      },
      {
        shot: '主角敘事',
        audio: `國語主句：「${mandarinHook}」`,
        edit: '節奏進來，剪接速度稍微加快，畫面從抽象轉成故事感。',
      },
      {
        shot: '雙語交會',
        audio: '英文短 Hook 回答國語主句',
        edit: '用兩次乾淨切點，不做複雜混唱；像影片剪接的 A-roll / B-roll 交替。',
      },
      {
        shot: '情緒收束',
        audio: `回到國語《${songDrafts.mandarin.title}》核心情緒`,
        edit: '鼓組降低，保留主旋律與最後一句記憶點，讓成品聽起來完整。',
      },
    ],
  };
}

function BilingualResonanceEditor({
  songDrafts,
  personalityMatrix,
  musicParameters,
}: {
  songDrafts: SongDrafts;
  personalityMatrix: PersonalityMatrix;
  musicParameters: MusicParameters;
}) {
  const resonance = getBilingualResonanceData(songDrafts, personalityMatrix, musicParameters);

  return (
    <div className="fortune-card overflow-hidden px-6 py-8 sm:px-8">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-fuchsia-300/70">
          AI 音樂共鳴度 · 雙語剪接版
        </p>
        <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
          英文主題曲 + 國語主題曲
        </h3>
        <p className="mx-auto mt-3 max-w-3xl text-xs leading-7 text-[color:var(--text-sub)]">
          這一步只用英文與國語，像剪一支簡潔影片：英文做開場 Hook 與畫面感，國語做主線故事與情緒落地，先把 AI 音樂共鳴度整理清楚。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[22px] border border-violet-300/20 bg-violet-950/15 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-200/70">English Theme</p>
          <h4 className="mt-3 font-serif text-xl text-[color:var(--text-main)]">《{songDrafts.english.title}》</h4>
          <p className="mt-3 text-4xl font-semibold text-violet-100">{resonance.englishScore}%</p>
          <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">AI 音樂共鳴度：負責空氣感、開場記憶點、第一秒吸引力。</p>
        </div>

        <div className="rounded-[22px] border border-amber-300/20 bg-amber-950/10 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-200/70">Mandarin Theme</p>
          <h4 className="mt-3 font-serif text-xl text-[color:var(--text-main)]">《{songDrafts.mandarin.title}》</h4>
          <p className="mt-3 text-4xl font-semibold text-amber-100">{resonance.mandarinScore}%</p>
          <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">AI 音樂共鳴度：負責故事線、情緒主軸、讓使用者聽懂與共感。</p>
        </div>

        <div className="rounded-[22px] border border-fuchsia-300/20 bg-fuchsia-950/15 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-200/70">Bilingual Cut</p>
          <h4 className="mt-3 font-serif text-xl text-[color:var(--text-main)]">雙語剪接共鳴</h4>
          <p className="mt-3 text-4xl font-semibold text-fuchsia-100">{resonance.combinedScore}%</p>
          <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">把兩首歌剪成一條簡潔主題曲企劃，不加入台語、不做過度混雜。</p>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-5">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">雙語剪接命令</p>
        <p className="font-mono text-xs leading-7 text-fuchsia-50/85">{resonance.commandText}</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">像剪影片一樣的音樂段落</p>
          <div className="space-y-3">
            {resonance.editTimeline.map((item) => (
              <div key={item.time} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-950/20 px-3 py-1 text-fuchsia-100">{item.time}</span>
                  <span className="text-[color:var(--text-main)]">{item.layer}</span>
                  <span className="text-[color:var(--text-muted)]">/ {item.role}</span>
                </div>
                <p className="mt-2 text-xs leading-7 text-[color:var(--text-sub)]">{item.instruction}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">穩定規則</p>
          <ul className="space-y-2 text-xs leading-7 text-[color:var(--text-sub)]">
            {resonance.clipRules.map((rule) => (
              <li key={rule} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-emerald-300/15 bg-emerald-950/10 p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">計劃案執行生成</p>
          <h4 className="mt-2 font-serif text-xl text-[color:var(--text-main)]">
            英文＋國語融入貫通製作腳本
          </h4>
          <p className="mt-2 text-xs leading-7 text-[color:var(--text-muted)]">
            這份是接軌後面 AI 歌手聲音、音樂生成服務、影片式自動剪接的製作藍圖；目前先穩定產出腳本，不直接送出正式生成。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {resonance.projectPlan.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-emerald-100">{item.title}</p>
              <p className="mt-2 text-xs leading-7 text-[color:var(--text-sub)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[22px] border border-violet-300/15 bg-violet-950/15 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-violet-200/70">AI 音樂 / 歌手生成腳本</p>
          <div className="space-y-2">
            {resonance.aiGenerationScript.map((line) => (
              <p key={line} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs leading-6 text-violet-50/85">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-sky-300/15 bg-sky-950/10 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-sky-200/70">自動剪接腳本</p>
          <div className="space-y-3">
            {resonance.autoEditScript.map((item) => (
              <div key={item.shot} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs font-semibold tracking-[0.16em] text-sky-100">{item.shot}</p>
                <p className="mt-2 text-xs leading-6 text-[color:var(--text-main)]">聲音：{item.audio}</p>
                <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">剪接：{item.edit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const NOTE_FREQUENCIES: Record<string, number> = {
  C: 261.63,
  'C#': 277.18,
  Db: 277.18,
  D: 293.66,
  'D#': 311.13,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  'F#': 369.99,
  Gb: 369.99,
  G: 392,
  'G#': 415.3,
  Ab: 415.3,
  A: 440,
  'A#': 466.16,
  Bb: 466.16,
  B: 493.88,
};

type SynthTone = 'sine' | 'soft' | 'bass' | 'bell' | 'pluck' | 'vocal';

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRootFrequency(key: string) {
  const match = key.match(/[A-G](?:#|b)?/);
  return match ? NOTE_FREQUENCIES[match[0]] ?? NOTE_FREQUENCIES.D : NOTE_FREQUENCIES.D;
}

function addTone(
  buffer: Float32Array,
  sampleRate: number,
  startSeconds: number,
  durationSeconds: number,
  frequency: number,
  gain: number,
  tone: SynthTone = 'soft',
) {
  const start = Math.floor(startSeconds * sampleRate);
  const length = Math.floor(durationSeconds * sampleRate);

  for (let i = 0; i < length && start + i < buffer.length; i += 1) {
    const t = i / sampleRate;
    const progress = i / Math.max(1, length);
    const attack = tone === 'pluck' || tone === 'bell'
        ? Math.min(1, progress / 0.018)
        : Math.min(1, progress / 0.08);
    const release = tone === 'pluck' || tone === 'bell'
        ? Math.exp(-progress * 5)
        : Math.min(1, (1 - progress) / 0.18);
    const envelope = Math.max(0, Math.min(attack, release));
    const vibrato = tone === 'vocal'
        ? 1 + Math.sin(2 * Math.PI * 5.3 * t) * 0.006
        : 1;
    const freq = frequency * vibrato;
    const base = Math.sin(2 * Math.PI * freq * t);
    const color =
      tone === 'bass'
        ? base * 0.9 + Math.sin(2 * Math.PI * frequency * 0.5 * t) * 0.35
        : tone === 'bell'
          ? base * 0.45 + Math.sin(2 * Math.PI * freq * 2.01 * t) * 0.32 + Math.sin(2 * Math.PI * freq * 3.99 * t) * 0.16
        : tone === 'pluck'
          ? base * 0.62 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.18
        : tone === 'vocal'
          ? base * 0.54 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.18 + Math.sin(2 * Math.PI * freq * 3 * t) * 0.08
        : tone === 'sine'
          ? base
          : base * 0.72 + Math.sin(2 * Math.PI * frequency * 2 * t) * 0.2 + Math.sin(2 * Math.PI * frequency * 3 * t) * 0.08;

    buffer[start + i] += color * gain * envelope;
  }
}

function addEchoTone(
  buffer: Float32Array,
  sampleRate: number,
  startSeconds: number,
  durationSeconds: number,
  frequency: number,
  gain: number,
  tone: SynthTone = 'soft',
) {
  addTone(buffer, sampleRate, startSeconds, durationSeconds, frequency, gain, tone);
  addTone(buffer, sampleRate, startSeconds + 0.18, durationSeconds * 0.8, frequency, gain * 0.28, tone);
  addTone(buffer, sampleRate, startSeconds + 0.36, durationSeconds * 0.65, frequency, gain * 0.12, tone);
}

function addNoiseHit(buffer: Float32Array, sampleRate: number, startSeconds: number, durationSeconds: number, gain: number) {
  const start = Math.floor(startSeconds * sampleRate);
  const length = Math.floor(durationSeconds * sampleRate);

  for (let i = 0; i < length && start + i < buffer.length; i += 1) {
    const progress = i / Math.max(1, length);
    const envelope = Math.max(0, 1 - progress);
    const noise = Math.sin((i * 129.17) % 31) * Math.sin((i * 47.31) % 17);
    buffer[start + i] += noise * gain * envelope;
  }
}

function encodeWav(buffer: Float32Array, sampleRate: number) {
  const bytesPerSample = 2;
  const dataSize = buffer.length * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, value: string) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i += 1) {
    const sample = clampNumber(buffer[i], -1, 1);
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function lyricSeed(lines: string[]) {
  return lines.join('').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function frequencyFromInterval(root: number, interval: number, octave = 0) {
  return root * 2 ** ((interval + octave * 12) / 12);
}

function addChord(
  buffer: Float32Array,
  sampleRate: number,
  startSeconds: number,
  durationSeconds: number,
  root: number,
  scale: number[],
  degree: number,
  gain: number,
  color: 'soft' | 'pluck' | 'bell',
) {
  const chordDegrees = [degree, degree + 2, degree + 4];
  chordDegrees.forEach((item, index) => {
    const interval = scale[item % scale.length];
    const freq = frequencyFromInterval(root, interval, index === 0 ? -1 : 0);
    addEchoTone(buffer, sampleRate, startSeconds, durationSeconds, freq, gain / (index + 1), color);
  });
}

function addKick(buffer: Float32Array, sampleRate: number, startSeconds: number, gain: number) {
  const start = Math.floor(startSeconds * sampleRate);
  const length = Math.floor(0.16 * sampleRate);

  for (let i = 0; i < length && start + i < buffer.length; i += 1) {
    const t = i / sampleRate;
    const progress = i / Math.max(1, length);
    const freq = 92 - 48 * progress;
    const envelope = Math.exp(-progress * 7);
    buffer[start + i] += Math.sin(2 * Math.PI * freq * t) * gain * envelope;
  }
}

function addHihat(buffer: Float32Array, sampleRate: number, startSeconds: number, gain: number) {
  addNoiseHit(buffer, sampleRate, startSeconds, 0.045, gain);
}

function buildMotif(seed: number, length: number, scale: number[], contour: 'rise' | 'fall' | 'wave') {
  return Array.from({ length }, (_, index) => {
    const raw = (seed + index * 5 + Math.floor(seed / (index + 3))) % scale.length;
    const shaped =
      contour === 'rise'
        ? Math.min(scale.length - 1, Math.floor(index * scale.length / length) + (raw % 3))
        : contour === 'fall'
          ? Math.max(0, scale.length - 1 - Math.floor(index * scale.length / length) - (raw % 2))
          : raw;

    return scale[shaped % scale.length];
  });
}

function applySmallVariation(motif: number[], seed: number, direction: 'lift' | 'ground' | 'plain') {
  const shift = seed % 3;
  return motif.map((interval, index) => {
    if (direction === 'lift' && index % 4 === 3) return interval + shift;
    if (direction === 'ground' && index % 4 === 0) return interval - shift;
    return interval;
  });
}

function addMelodyLine(
  buffer: Float32Array,
  sampleRate: number,
  root: number,
  beat: number,
  startBeat: number,
  motif: number[],
  gain: number,
  tone: 'bell' | 'pluck' | 'vocal' | 'soft',
  octave = 0,
) {
  motif.forEach((interval, index) => {
    const duration = index % 4 === 3 ? beat * 1.35 : beat * 0.78;
    const freq = frequencyFromInterval(root, interval, octave);
    addEchoTone(buffer, sampleRate, (startBeat + index) * beat, duration, freq, gain, tone);
  });
}

function addPatternedMelody(
  buffer: Float32Array,
  sampleRate: number,
  root: number,
  beat: number,
  startBeat: number,
  motif: number[],
  rhythm: number[],
  durations: number[],
  gain: number,
  tone: 'bell' | 'pluck' | 'vocal' | 'soft',
  octave = 0,
) {
  rhythm.forEach((offset, index) => {
    const interval = motif[index % motif.length];
    const duration = durations[index % durations.length] * beat;
    const freq = frequencyFromInterval(root, interval, octave);
    addEchoTone(buffer, sampleRate, (startBeat + offset) * beat, duration, freq, gain, tone);
  });
}

function addChordProgression(
  buffer: Float32Array,
  sampleRate: number,
  root: number,
  scale: number[],
  beat: number,
  startBar: number,
  bars: number,
  progression: number[],
  gain: number,
  color: 'soft' | 'pluck' | 'bell',
) {
  for (let bar = 0; bar < bars; bar += 1) {
    const degree = progression[bar % progression.length];
    addChord(buffer, sampleRate, (startBar + bar) * 4 * beat, beat * 3.82, root, scale, degree, gain, color);
  }
}

function addBassProgression(
  buffer: Float32Array,
  sampleRate: number,
  root: number,
  scale: number[],
  beat: number,
  startBar: number,
  bars: number,
  progression: number[],
  gain: number,
  active = true,
) {
  if (!active) return;

  for (let bar = 0; bar < bars; bar += 1) {
    const degree = progression[bar % progression.length];
    const base = (startBar + bar) * 4 * beat;
    const bass = frequencyFromInterval(root, scale[degree], -2);
    addTone(buffer, sampleRate, base, beat * 1.7, bass, gain, 'bass');
    addTone(buffer, sampleRate, base + beat * 2, beat * 1.35, bass, gain * 0.78, 'bass');
    if (bar % 2 === 1) {
      addTone(buffer, sampleRate, base + beat * 3.25, beat * 0.55, bass * 1.5, gain * 0.35, 'bass');
    }
  }
}

function addDrumGroove(buffer: Float32Array, sampleRate: number, beat: number, startBeat: number, beats: number, intensity: number) {
  for (let i = 0; i < beats; i += 1) {
    const at = (startBeat + i) * beat;
    if (i % 4 === 0 || (intensity > 0.8 && i % 4 === 2)) addKick(buffer, sampleRate, at, 0.22 * intensity);
    if (i % 4 === 2) addNoiseHit(buffer, sampleRate, at, 0.09, 0.08 * intensity);
    if (i % 2 === 1) addHihat(buffer, sampleRate, at, 0.04 * intensity);
  }
}

function addSectionDrums(
  buffer: Float32Array,
  sampleRate: number,
  beat: number,
  startBeat: number,
  beats: number,
  mode: 'verse' | 'bridge' | 'chorus' | 'outro',
) {
  const intensity = mode === 'chorus' ? 1 : mode === 'bridge' ? 0.46 : mode === 'outro' ? 0.3 : 0.62;

  for (let i = 0; i < beats; i += 1) {
    const at = (startBeat + i) * beat;

    if (mode !== 'bridge' && i % 4 === 0) addKick(buffer, sampleRate, at, 0.2 * intensity);
    if (mode === 'chorus' && i % 4 === 2) addKick(buffer, sampleRate, at, 0.16 * intensity);
    if (mode === 'chorus' && (i % 8 === 5 || i % 8 === 7)) addKick(buffer, sampleRate, at + beat * 0.5, 0.1 * intensity);
    if (i % 4 === 2) addNoiseHit(buffer, sampleRate, at, 0.09, 0.085 * intensity);
    if (mode !== 'outro' && i % 2 === 1) addHihat(buffer, sampleRate, at, 0.045 * intensity);
    if (mode === 'chorus') addHihat(buffer, sampleRate, at + beat * 0.5, 0.03 * intensity);
  }
}

function addGlobalTrendPulse(buffer: Float32Array, sampleRate: number, beat: number, startBeat: number, beats: number, intensity: number) {
  for (let i = 0; i < beats; i += 1) {
    const base = (startBeat + i) * beat;

    if (i % 4 === 0) addKick(buffer, sampleRate, base, 0.12 * intensity);
    if (i % 4 === 1 || i % 4 === 3) addHihat(buffer, sampleRate, base + beat * 0.5, 0.035 * intensity);
    if (i % 8 === 3 || i % 8 === 6) addNoiseHit(buffer, sampleRate, base + beat * 0.35, 0.07, 0.045 * intensity);
    if (i % 8 === 5) addKick(buffer, sampleRate, base + beat * 0.55, 0.09 * intensity);
  }
}

function createPlayableSongDemo(
  musicParameters: MusicParameters,
  fusionSong: FusionSong,
  songDrafts?: SongDrafts,
) {
  const sampleRate = 22_050;
  const bpm = clampNumber(Number.isFinite(musicParameters.bpm) ? musicParameters.bpm : 96, 80, 138);
  const beat = 60 / bpm;
  const totalBeats = 80;
  const duration = totalBeats * beat;
  const buffer = new Float32Array(Math.ceil(duration * sampleRate));
  const root = getRootFrequency(musicParameters.key);
  const isMinor = /minor|小調/i.test(musicParameters.key);
  const scale = isMinor ? [0, 2, 3, 5, 7, 8, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12];
  const progression = isMinor ? [0, 6, 3, 5] : [0, 5, 3, 4];
  const englishSeed = lyricSeed(songDrafts?.english.lyrics ?? fusionSong.fusion_lyrics.slice(0, 5));
  const mandarinSeed = lyricSeed(songDrafts?.mandarin.lyrics ?? fusionSong.fusion_lyrics.slice(5, 10));
  const taiwaneseSeed = lyricSeed(songDrafts?.taiwanese.lyrics ?? fusionSong.fusion_lyrics.slice(10));
  const sharedHookSeed = englishSeed + mandarinSeed + taiwaneseSeed;
  const sharedHook = applySmallVariation(
    isMinor ? [0, 3, 5, 7, 7, 5, 3, 2] : [0, 4, 5, 7, 7, 5, 4, 2],
    sharedHookSeed,
    'plain',
  );
  const englishHook = applySmallVariation([7, 10, 12, 10, 7, 5, 3, 2], englishSeed, 'lift');
  const mandarinVerse = applySmallVariation(
    isMinor ? [0, 2, 3, 5, 3, 2, 0, 2, 3, 5, 7, 5, 3, 2, 0, -2] : [0, 2, 4, 5, 4, 2, 0, 2, 4, 5, 7, 5, 4, 2, 0, -1],
    mandarinSeed,
    'plain',
  );
  const taiwaneseBridge = applySmallVariation(
    isMinor ? [3, 2, 0, -2, -5, -2, 0, 2] : [4, 2, 0, -1, -5, -1, 0, 2],
    taiwaneseSeed,
    'ground',
  );
  const chorusMotif = [
    ...sharedHook,
    ...englishHook.slice(0, 4),
    ...taiwaneseBridge.slice(0, 4),
  ];
  const liftedChorusMotif = chorusMotif.map((interval, index) => (
    index % 4 === 3 ? interval + 2 : interval + 1
  ));
  const straightEight = [0, 1, 2, 3, 4, 5, 6, 7];
  const verseRhythm = [0, 1, 2.5, 3.5, 4, 5, 6.5, 7.25, 8, 9, 10.5, 11.5, 12, 13, 14.5, 15.25];
  const chorusRhythm = [0, 0.75, 1.5, 2.5, 4, 4.75, 5.5, 6.5, 8, 8.75, 9.5, 10.5, 12, 12.75, 13.5, 14.5];
  const shortDurations = [0.62, 0.62, 0.9, 1.1];
  const verseDurations = [0.78, 0.72, 0.95, 0.62, 0.78, 0.72, 1.1, 0.55];

  // 0-8 beats：英文 Hook 先清楚出現，讓整首歌有共同主題，不再亂開場
  addChordProgression(buffer, sampleRate, root, scale, beat, 0, 2, progression, 0.045, 'bell');
  addPatternedMelody(buffer, sampleRate, root, beat, 0, englishHook, straightEight, [0.7, 0.7, 0.9, 1.15], 0.13, 'bell', 1);
  addPatternedMelody(buffer, sampleRate, root, beat, 4, sharedHook, straightEight.slice(0, 4), [0.85, 0.85, 0.95, 1.2], 0.1, 'soft', 0);

  // 8-24 beats：國語主歌，沿用同一組和弦，旋律下降到中音區負責敘事
  addChordProgression(buffer, sampleRate, root, scale, beat, 2, 4, progression, 0.068, 'pluck');
  addBassProgression(buffer, sampleRate, root, scale, beat, 2, 4, progression, 0.075);
  addPatternedMelody(buffer, sampleRate, root, beat, 8, mandarinVerse, verseRhythm, verseDurations, 0.17, 'pluck', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 16, sharedHook, straightEight, shortDurations, 0.08, 'bell', 1);
  addSectionDrums(buffer, sampleRate, beat, 8, 16, 'verse');

  // 24-32 beats：台語橋段，鼓減少、Bass 留住心跳，旋律往低處落地
  addChordProgression(buffer, sampleRate, root, scale, beat, 6, 2, progression.slice(1), 0.078, 'soft');
  addBassProgression(buffer, sampleRate, root, scale, beat, 6, 2, progression.slice(1), 0.105);
  addPatternedMelody(buffer, sampleRate, root, beat, 24, taiwaneseBridge, straightEight, [0.85, 0.85, 1.1, 1.2], 0.16, 'soft', -1);
  addSectionDrums(buffer, sampleRate, beat, 24, 8, 'bridge');

  // 32-64 beats：三合一副歌，先唱共同 Hook，再重複一次；英文高音、台語低音只做回應，不互相打架
  addChordProgression(buffer, sampleRate, root, scale, beat, 8, 8, progression, 0.095, 'soft');
  addBassProgression(buffer, sampleRate, root, scale, beat, 8, 8, progression, 0.135);
  addPatternedMelody(buffer, sampleRate, root, beat, 32, chorusMotif, chorusRhythm, shortDurations, 0.18, 'pluck', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 36, englishHook, straightEight, [0.55, 0.55, 0.7, 0.95], 0.055, 'bell', 1);
  addPatternedMelody(buffer, sampleRate, root, beat, 44, taiwaneseBridge, straightEight, [0.7, 0.7, 0.9, 1.15], 0.075, 'soft', -1);
  addPatternedMelody(buffer, sampleRate, root, beat, 48, liftedChorusMotif, chorusRhythm, shortDurations, 0.19, 'pluck', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 52, englishHook, straightEight, [0.55, 0.55, 0.7, 0.95], 0.065, 'bell', 1);
  addPatternedMelody(buffer, sampleRate, root, beat, 56, sharedHook, straightEight, [0.65, 0.65, 0.82, 1.05], 0.11, 'soft', 1);
  addSectionDrums(buffer, sampleRate, beat, 32, 32, 'chorus');
  addGlobalTrendPulse(buffer, sampleRate, beat, 32, 32, 0.48);

  // 64-80 beats：尾奏，回到共同 Hook 的前半段，最後用台語低音落點收束
  addChordProgression(buffer, sampleRate, root, scale, beat, 16, 4, progression, 0.065, 'bell');
  addBassProgression(buffer, sampleRate, root, scale, beat, 16, 2, progression, 0.07);
  addPatternedMelody(buffer, sampleRate, root, beat, 64, sharedHook, straightEight, [0.75, 0.75, 0.92, 1.2], 0.11, 'soft', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 72, taiwaneseBridge.slice(0, 4), [0, 2, 4, 6], [1.2, 1.2, 1.2, 1.65], 0.09, 'soft', -1);
  addSectionDrums(buffer, sampleRate, beat, 64, 12, 'outro');

  let peak = 0.001;
  for (let i = 0; i < buffer.length; i += 1) peak = Math.max(peak, Math.abs(buffer[i]));
  const normalizer = 0.84 / peak;
  for (let i = 0; i < buffer.length; i += 1) buffer[i] *= normalizer;

  return encodeWav(buffer, sampleRate);
}

const DEFAULT_POPULAR_MUSIC_DNA = [
  '8 秒內建立可記住的旋律或音色 Hook。',
  '主歌保留空間，副歌明顯拉高旋律、鼓組與和聲。',
  '核心 Hook 重複 2 到 3 次，每次用語言或和聲做小變化。',
  '歌詞短句優先，讓人容易跟唱與記住。',
  '橋段降低密度，把台語情緒落地後再回副歌。',
  '結尾保留一句核心句子，形成專屬記憶點。',
];

const DEFAULT_GLOBAL_TREND_BLEND = [
  'Global Pop：清楚主旋律、短句 Hook、明確副歌。',
  'K-Pop / Cross-genre：段落反差、短暫停頓、和聲堆疊。',
  'Latin / Reggaeton / Trap Latino：加入擺動感與切分節奏。',
  'Electronic / Synth Pop：使用合成器、空氣墊、低頻脈衝。',
  'R&B / Emotional Pop：主歌保留人聲呼吸，副歌加寬和聲。',
  'Short-form friendly：保留 12-18 秒可記憶副歌片段。',
];

function createRealAiServicePackage(
  musicParameters: MusicParameters,
  fusionSong: FusionSong,
  productionPlan: ProductionPlan,
  songDrafts?: SongDrafts,
) {
  const popularMusicDna = productionPlan.popular_music_dna?.length
    ? productionPlan.popular_music_dna
    : DEFAULT_POPULAR_MUSIC_DNA;
  const globalTrendBlend = productionPlan.global_trend_blend?.length
    ? productionPlan.global_trend_blend
    : DEFAULT_GLOBAL_TREND_BLEND;
  const trendArrangementRecipe = productionPlan.trend_arrangement_recipe ??
    '以 Global Pop 的清楚旋律當骨架，加入 K-Pop 式段落反差、Latin/Reggaeton 的律動推進、Electronic 的現代音色，再把國語敘事、English Hook、台語情感落點自然融合。';
  const rhythmStrategy = productionPlan.rhythm_strategy ??
    '主歌用半拍空間與輕鼓保持親密，副歌加入切分低頻、四拍推進與明亮 hi-hat；橋段降低鼓組，只保留心跳感，最後副歌再全開。';
  const trendSafetyNote = productionPlan.trend_safety_note ??
    '只使用全球流行音樂的通用結構與聽感邏輯，不模仿特定歌手、特定歌曲、特定旋律或受版權保護的編曲細節。';
  const hitFormula = productionPlan.hit_formula ??
    '空靈前奏 → 國語主歌 → 三語副歌 → 台語橋段 → 最終副歌與一句記憶收尾。';
  const hookRepeatStrategy = productionPlan.hook_repeat_strategy ??
    '核心 Hook 重複三次：國語建立主題，English 增加記憶點，台語完成情緒落地。';
  const emotionalArc = productionPlan.emotional_arc ??
    '從神秘期待開始，進入故事敘事，副歌爆發融合三語，最後降低密度並收束。';
  const cleanLyrics = fusionSong.fusion_lyrics
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  const draftSummary = songDrafts
    ? [
      `English draft: "${songDrafts.english.title}" — ${songDrafts.english.concept}`,
      `Mandarin draft: "《${songDrafts.mandarin.title}》" — ${songDrafts.mandarin.concept}`,
      `Taiwanese draft: "《${songDrafts.taiwanese.title}》" — ${songDrafts.taiwanese.concept}`,
    ].join('\n')
    : 'Use the trilingual fusion lyrics and production plan as source material.';

  return {
    status: 'ready_for_provider_connection',
    target: 'full_song_with_arrangement_and_vocal',
    title: fusionSong.fusion_title,
    render_settings: {
      bpm: musicParameters.bpm,
      key: musicParameters.key,
      genre: musicParameters.genre,
      target_duration: '90-150 seconds for first render; extend later after the hook is approved',
      output: 'stereo wav or high-quality mp3',
      vocal_language_mix: productionPlan.language_distribution,
    },
    popular_music_dna: popularMusicDna,
    global_trend_blend: globalTrendBlend,
    trend_arrangement_recipe: trendArrangementRecipe,
    rhythm_strategy: rhythmStrategy,
    trend_safety_note: trendSafetyNote,
    hit_formula: hitFormula,
    hook_repeat_strategy: hookRepeatStrategy,
    emotional_arc: emotionalArc,
    song_structure: [
      'Intro: English atmosphere / airy motif',
      'Verse: Mandarin main storytelling vocal',
      'Pre-Chorus: Mandarin with short English response',
      'Chorus: trilingual hook, emotional lift',
      'Bridge: Taiwanese grounding line with warmer vocal texture',
      'Final Chorus: blend English, Mandarin, Taiwanese naturally',
      'Outro: keep one Mandarin or Taiwanese emotional phrase',
    ],
    arrangement_prompt:
      `Arrange a complete original song titled "${fusionSong.fusion_title}". ` +
      `Style: ${musicParameters.genre}, ${musicParameters.bpm} BPM, ${musicParameters.key}. ` +
      `Mood: ${musicParameters.mood.join(', ')}. Instruments: ${musicParameters.instrument.join(', ')}. ` +
      `The arrangement must clearly fuse three identities: English = airy/dreamlike space, Mandarin = main emotional storytelling, Taiwanese = grounded human warmth. ` +
      `Global trend blend: ${globalTrendBlend.join(' ')} ` +
      `Trend arrangement recipe: ${trendArrangementRecipe} Rhythm strategy: ${rhythmStrategy} ` +
      `Apply popular music DNA: ${popularMusicDna.join(' ')} ` +
      `Use this hit formula: ${hitFormula} Emotional arc: ${emotionalArc} ` +
      `Build dynamically from intimate intro to a memorable trilingual chorus. ${trendSafetyNote}`,
    vocal_prompt:
      `${productionPlan.lead_vocal_choice} ` +
      `Lead vocal should sound emotional, intimate, natural, and singable. ` +
      `Mandarin carries the main story, English adds a memorable hook, Taiwanese lands the emotional truth. ` +
      `Hook repeat strategy: ${hookRepeatStrategy} ` +
      `Avoid robotic delivery; use subtle breath, phrasing, and human-like dynamic changes.`,
    lyrics: cleanLyrics,
    source_logic: draftSummary,
    producer_notes: {
      fusion_strategy: productionPlan.fusion_strategy,
      hook_design: productionPlan.hook_design,
      popular_music_dna: popularMusicDna,
      global_trend_blend: globalTrendBlend,
      trend_arrangement_recipe: trendArrangementRecipe,
      rhythm_strategy: rhythmStrategy,
      trend_safety_note: trendSafetyNote,
      hit_formula: hitFormula,
      hook_repeat_strategy: hookRepeatStrategy,
      emotional_arc: emotionalArc,
      vocal_cast: productionPlan.vocal_cast,
      arrangement_plan: productionPlan.arrangement_plan,
    },
    negative_prompt:
      'Do not copy copyrighted melodies or lyrics. Do not sound like a specific real singer. Avoid random notes, flat robotic vocals, messy language switching, and over-compressed harsh audio.',
  };
}

interface ElevenLabsShellSummary {
  status: string;
  dryRun: boolean;
  externalRequestSent: boolean;
  promptCharacters: number;
  sectionCount: number;
  targetDurationSeconds: number;
  nextAction: string;
}

function IntegratedSongMaker({
  fusionSong,
  productionPlan,
  musicParameters,
  songDrafts,
  started,
  onStart,
}: {
  fusionSong?: FusionSong;
  productionPlan?: ProductionPlan;
  musicParameters: MusicParameters;
  songDrafts?: SongDrafts;
  started: boolean;
  onStart: () => void;
}) {
  const [audioUrl, setAudioUrl] = useState('');
  const [audioReady, setAudioReady] = useState(false);
  const [servicePackageText, setServicePackageText] = useState('');
  const [copiedServicePackage, setCopiedServicePackage] = useState(false);
  const [elevenLabsShellText, setElevenLabsShellText] = useState('');
  const [elevenLabsShellSummary, setElevenLabsShellSummary] = useState<ElevenLabsShellSummary | null>(null);
  const [elevenLabsShellLoading, setElevenLabsShellLoading] = useState(false);

  if (!fusionSong || !productionPlan) return null;

  const popularMusicDna = productionPlan.popular_music_dna?.length
    ? productionPlan.popular_music_dna
    : DEFAULT_POPULAR_MUSIC_DNA;
  const globalTrendBlend = productionPlan.global_trend_blend?.length
    ? productionPlan.global_trend_blend
    : DEFAULT_GLOBAL_TREND_BLEND;
  const trendArrangementRecipe = productionPlan.trend_arrangement_recipe ??
    '以 Global Pop 的清楚旋律當骨架，加入 K-Pop 式段落反差、Latin/Reggaeton 的律動推進、Electronic 的現代音色，再把國語敘事、English Hook、台語情感落點自然融合。';
  const rhythmStrategy = productionPlan.rhythm_strategy ??
    '主歌用半拍空間與輕鼓保持親密，副歌加入切分低頻、四拍推進與明亮 hi-hat；橋段降低鼓組，只保留心跳感，最後副歌再全開。';
  const hitFormula = productionPlan.hit_formula ??
    '空靈前奏 → 國語主歌 → 三語副歌 → 台語橋段 → 最終副歌與一句記憶收尾。';
  const hookRepeatStrategy = productionPlan.hook_repeat_strategy ??
    '核心 Hook 重複三次：國語建立主題，English 增加記憶點，台語完成情緒落地。';
  const emotionalArc = productionPlan.emotional_arc ??
    '從神秘期待開始，進入故事敘事，副歌爆發融合三語，最後降低密度並收束。';

  const readySteps = [
    '三首原創歌已讀取',
    '三語融合歌詞已整理',
    'AI 製作/編曲/主唱分配已完成',
    '下一階段音樂生成人聲指令已準備',
  ];

  function handleGeneratePlayableDemo() {
    if (!fusionSong) return;

    setAudioReady(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    const blob = createPlayableSongDemo(musicParameters, fusionSong, songDrafts);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setAudioReady(true);
  }

  function handleCreateServicePackage() {
    if (!fusionSong || !productionPlan) return;

    const payload = createRealAiServicePackage(musicParameters, fusionSong, productionPlan, songDrafts);
    setServicePackageText(JSON.stringify(payload, null, 2));
    setCopiedServicePackage(false);
  }

  async function handleCheckElevenLabsShell() {
    if (!fusionSong || !productionPlan) return;

    setElevenLabsShellLoading(true);
    setElevenLabsShellText('');
    setElevenLabsShellSummary(null);

    try {
      const servicePackage = createRealAiServicePackage(musicParameters, fusionSong, productionPlan, songDrafts);
      const response = await fetch('/api/music-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun: true,
          servicePackage,
        }),
      });
      const data = await response.json() as {
        status?: string;
        dry_run?: boolean;
        external_request_sent?: boolean;
        next_action?: string;
        prepared_request_preview?: {
          prompt_characters?: number;
        };
        local_composition_plan_preview?: {
          target_duration_ms?: number;
          sections?: unknown[];
        };
      };

      setElevenLabsShellSummary({
        status: data.status ?? 'unknown',
        dryRun: data.dry_run ?? true,
        externalRequestSent: data.external_request_sent ?? false,
        promptCharacters: data.prepared_request_preview?.prompt_characters ?? 0,
        sectionCount: data.local_composition_plan_preview?.sections?.length ?? 0,
        targetDurationSeconds: Math.round((data.local_composition_plan_preview?.target_duration_ms ?? 0) / 1000),
        nextAction: data.next_action ?? '等待下一步設定。',
      });
      setElevenLabsShellText(JSON.stringify(data, null, 2));
    } catch {
      setElevenLabsShellSummary(null);
      setElevenLabsShellText(JSON.stringify({
        error: 'ElevenLabs 串接外殼檢查失敗，請稍後再試。',
      }, null, 2));
    } finally {
      setElevenLabsShellLoading(false);
    }
  }

  async function handleCopyServicePackage() {
    if (!servicePackageText) return;

    try {
      await navigator.clipboard.writeText(servicePackageText);
      setCopiedServicePackage(true);
    } catch {
      setCopiedServicePackage(false);
    }
  }

  return (
    <div className="fortune-card overflow-hidden border-amber-300/20 px-6 py-8 sm:px-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70">
          One Button Song Maker
        </p>
        <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
          三合一會唱主題曲功能
        </h3>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
          這個按鈕會把英文、國語、台語三首原創歌，連同 AI 製作總監的編曲與主唱分配，整合成一份「可送去音樂/人聲生成」的完整歌曲製作包。
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {readySteps.map((step, index) => (
          <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-300/15 text-sm font-bold text-amber-200">
              {index + 1}
            </p>
            <p className="mt-3 text-xs leading-6 text-[color:var(--text-sub)]">{step}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="vip-gold-btn mt-6 w-full py-4 text-sm sm:text-base"
      >
        {started ? '三合一會唱主題曲製作包已啟動' : '啟動三合一會唱主題曲功能'}
      </button>

      {started && (
        <div className="mt-6 space-y-4">
          <div className="rounded-[22px] border border-amber-300/20 bg-black/20 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-300/70">最終歌曲核心</p>
            <h4 className="font-serif text-2xl text-[color:var(--text-main)]">《{fusionSong.fusion_title}》</h4>
            <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{fusionSong.fusion_concept}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">會唱歌詞包</p>
              <div className="space-y-1.5 font-serif text-sm leading-8 text-[color:var(--text-main)]">
                {fusionSong.fusion_lyrics.map((line, index) => {
                  const isSection = /^\s*[\[【].+[\]】]\s*$/.test(line);
                  return isSection ? (
                    <p key={`${line}-${index}`} className="pt-2 text-xs font-semibold tracking-[0.28em] text-amber-300/70">
                      {line.replace(/[\[\]【】]/g, '')}
                    </p>
                  ) : (
                    <p key={`${line}-${index}`}>{line}</p>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[22px] border border-cyan-300/15 bg-cyan-950/10 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-300/70">AI 主唱安排</p>
                <p className="text-sm leading-8 text-[color:var(--text-main)]">{productionPlan.lead_vocal_choice}</p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">整合製作方向</p>
                <p className="text-sm leading-8 text-[color:var(--text-main)]">{productionPlan.fusion_strategy}</p>
                <p className="mt-3 text-xs leading-7 text-[color:var(--text-muted)]">{productionPlan.language_distribution}</p>
              </div>

              <div className="rounded-[22px] border border-pink-300/15 bg-pink-950/10 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-pink-200/70">大眾喜愛音樂 DNA</p>
                <div className="space-y-2 text-xs leading-6 text-[color:var(--text-sub)]">
                  {popularMusicDna.slice(0, 4).map((item) => (
                    <p key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">{item}</p>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-7 text-pink-100/75">{hookRepeatStrategy}</p>
              </div>

              <div className="rounded-[22px] border border-fuchsia-300/15 bg-fuchsia-950/10 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-fuchsia-200/70">全球趨勢三合一編曲</p>
                <div className="space-y-2 text-xs leading-6 text-[color:var(--text-sub)]">
                  {globalTrendBlend.slice(0, 4).map((item) => (
                    <p key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">{item}</p>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-7 text-fuchsia-100/75">{trendArrangementRecipe}</p>
              </div>

              <div className="rounded-[22px] border border-amber-300/20 bg-black/20 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-300/70">三合一邏輯音樂 Demo</p>
                <p className="text-xs leading-7 text-[color:var(--text-muted)]">
                  這版禁止聲樂與主唱導唱，只做「純音樂流行編曲 Demo」：用同一個核心 Hook 貫穿全曲，先把英文、國語、台語三合一的編曲骨架整理清楚。
                </p>
                <div className="mt-3 grid gap-2 text-xs leading-6 text-[color:var(--text-sub)] sm:grid-cols-2">
                  <p className="rounded-xl border border-violet-300/15 bg-violet-950/15 px-3 py-2">0–8 拍：英文高音 Hook 建立流行歌記憶點</p>
                  <p className="rounded-xl border border-amber-300/15 bg-amber-950/10 px-3 py-2">8–24 拍：國語主歌用器樂主旋律說故事</p>
                  <p className="rounded-xl border border-cyan-300/15 bg-cyan-950/10 px-3 py-2">24–32 拍：台語橋段用低音器樂落地</p>
                  <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">32–64 拍：副歌 Hook 重複兩次，只保留編曲骨架</p>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePlayableDemo}
                  className="vip-gold-btn mt-4 w-full px-4 py-3 text-xs"
                >
                  {audioReady ? '重新生成三合一 WAV 預覽' : '產生三合一 WAV 預覽音檔'}
                </button>
                {audioUrl && (
                  <div className="mt-4 space-y-3">
                    <audio controls src={audioUrl} className="w-full">
                      <track kind="captions" />
                    </audio>
                    <p className="text-xs leading-6 text-amber-100/75">
                      已生成一段依照 {Math.min(musicParameters.bpm, 138)} BPM / {musicParameters.key} 製作的純音樂編曲草稿；目前禁止聲樂，正式唱歌留到音樂/人聲生成服務處理。
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[22px] border border-violet-300/15 bg-violet-950/15 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-violet-200/70">可送音樂生成服務的指令</p>
                <p className="font-mono text-xs leading-7 text-violet-50/85">{productionPlan.generation_prompt}</p>
              </div>

              <div className="rounded-[22px] border border-emerald-300/15 bg-emerald-950/10 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-emerald-200/70">真正 AI 編曲 / 人聲服務</p>
                <p className="text-xs leading-7 text-[color:var(--text-muted)]">
                  這裡先產生「服務請求包」：包含編曲 prompt、人聲 prompt、歌詞、BPM、Key、語言比例與禁止模仿規則。等你決定服務商與 API key，再把這包資料送出去產正式音檔。
                </p>
                <div className="mt-3 rounded-xl border border-emerald-300/10 bg-black/20 px-3 py-2 text-xs leading-6 text-emerald-100/80">
                  狀態：等待外部音樂/人聲生成服務串接，不會在未設定 API 前亂送出。
                </div>
                <div className="mt-3 space-y-2 rounded-xl border border-emerald-300/10 bg-black/20 px-3 py-3 text-xs leading-6 text-emerald-50/75">
                  <p>Hit Formula：{hitFormula}</p>
                  <p>情緒曲線：{emotionalArc}</p>
                  <p>全球律動：{rhythmStrategy}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateServicePackage}
                  className="mt-4 w-full rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-xs font-semibold tracking-[0.15em] text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/15"
                >
                  產生真正 AI 編曲/人聲服務請求包
                </button>
                <button
                  type="button"
                  onClick={handleCheckElevenLabsShell}
                  disabled={elevenLabsShellLoading}
                  className="mt-3 w-full rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-xs font-semibold tracking-[0.15em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-wait disabled:opacity-60"
                >
                  {elevenLabsShellLoading ? '檢查 ElevenLabs 外殼中…' : '檢查 ElevenLabs Music API 串接外殼'}
                </button>
                <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">
                  這一步只檢查後端外殼與 API key 狀態，不會把資料送到 ElevenLabs，也不會產正式音檔。
                </p>
              </div>
            </div>
          </div>

          {elevenLabsShellText && (
            <div className="rounded-[22px] border border-cyan-300/15 bg-cyan-950/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">ElevenLabs Shell Check</p>
              <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
                外殼檢查結果：目前仍是 dry-run，不會呼叫外部音樂生成服務。
              </p>
              {elevenLabsShellSummary && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">Status</p>
                    <p className="mt-2 text-xs leading-6 text-cyan-50/90">{elevenLabsShellSummary.status}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">Safety</p>
                    <p className="mt-2 text-xs leading-6 text-cyan-50/90">
                      {elevenLabsShellSummary.dryRun && !elevenLabsShellSummary.externalRequestSent ? 'Dry-run，未送外部' : '需確認狀態'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">Plan</p>
                    <p className="mt-2 text-xs leading-6 text-cyan-50/90">
                      {elevenLabsShellSummary.sectionCount} 段 · 約 {elevenLabsShellSummary.targetDurationSeconds} 秒
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">Prompt</p>
                    <p className="mt-2 text-xs leading-6 text-cyan-50/90">{elevenLabsShellSummary.promptCharacters} 字元</p>
                  </div>
                  <p className="rounded-2xl border border-cyan-300/10 bg-black/20 p-3 text-xs leading-7 text-cyan-50/75 sm:col-span-2 lg:col-span-4">
                    {elevenLabsShellSummary.nextAction}
                  </p>
                </div>
              )}
              <pre className="mt-3 max-h-[300px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 p-4 font-mono text-[11px] leading-6 text-cyan-50/80">
                {elevenLabsShellText}
              </pre>
            </div>
          )}

          {servicePackageText && (
            <div className="rounded-[22px] border border-emerald-300/15 bg-black/25 p-5">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/70">Service Payload</p>
                  <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
                    這份資料就是下一步要送進真正 AI 編曲/人聲服務的核心。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyServicePackage}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
                >
                  {copiedServicePackage ? '已複製' : '複製請求包'}
                </button>
              </div>
              <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 p-4 font-mono text-[11px] leading-6 text-emerald-50/80">
                {servicePackageText}
              </pre>
            </div>
          )}

          <p className="text-center text-xs leading-6 text-[color:var(--text-muted)]">
            目前是穩定版入口：先整合成完整歌曲製作包與服務請求包。下一步再填入真正的音樂/人聲生成 API，讓它輸出正式可播放音檔。
          </p>
        </div>
      )}
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
  productionPlan,
  fusionSong,
  name,
  onReset,
}: PersonalityMusicReportProps) {
  // 同一時間只允許一首歌在播，避免多個播放器同時出聲互相衝突
  const [openPlayer, setOpenPlayer] = useState<'english' | 'mandarin' | 'taiwanese' | null>(null);
  const [songMakerStarted, setSongMakerStarted] = useState(false);

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

      {songDrafts && (
        <BilingualResonanceEditor
          songDrafts={songDrafts}
          personalityMatrix={personalityMatrix}
          musicParameters={musicParameters}
        />
      )}

      {productionPlan && (
        <div className="vip-gold-card rounded-[24px] px-6 py-8 sm:px-8">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70">
              AI 製作總監 · 自動優化分配
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
              把三首歌製作成一首會唱的主題曲
            </h3>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
              {productionPlan.producer_summary}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[20px] border border-amber-300/15 bg-black/20 p-5">
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-300/70">融合策略</p>
              <p className="text-sm leading-8 text-[color:var(--text-main)]">{productionPlan.fusion_strategy}</p>
              <p className="mt-4 text-xs leading-7 text-[color:var(--text-muted)]">{productionPlan.final_song_brief}</p>
            </div>

            <div className="rounded-[20px] border border-cyan-300/15 bg-black/20 p-5">
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-300/70">主唱分配</p>
              <div className="space-y-2 text-sm leading-7 text-[color:var(--text-main)]">
                {productionPlan.vocal_cast.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <p className="mt-4 text-xs leading-7 text-cyan-100/80">{productionPlan.lead_vocal_choice}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">編曲製作流程</p>
              <ol className="space-y-2 text-sm leading-7 text-[color:var(--text-main)]">
                {productionPlan.arrangement_plan.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-amber-300/80">{index + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">語言比例</p>
                <p className="text-sm leading-7 text-[color:var(--text-main)]">{productionPlan.language_distribution}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Hook 設計</p>
                <p className="text-sm leading-7 text-[color:var(--text-main)]">{productionPlan.hook_design}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[20px] border border-pink-300/15 bg-pink-950/10 p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-pink-200/70">大眾喜愛音樂 DNA</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(productionPlan.popular_music_dna?.length ? productionPlan.popular_music_dna : DEFAULT_POPULAR_MUSIC_DNA).map((item) => (
                  <p key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-[color:var(--text-sub)]">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">Hit Formula</p>
                <p className="text-sm leading-7 text-[color:var(--text-main)]">
                  {productionPlan.hit_formula ?? '空靈前奏 → 國語主歌 → 三語副歌 → 台語橋段 → 最終副歌與一句記憶收尾。'}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">情緒曲線 / Hook 重複</p>
                <p className="text-sm leading-7 text-[color:var(--text-main)]">
                  {productionPlan.emotional_arc ?? '從神秘期待開始，進入故事敘事，副歌爆發融合三語，最後降低密度並收束。'}
                </p>
                <p className="mt-3 text-xs leading-7 text-[color:var(--text-muted)]">
                  {productionPlan.hook_repeat_strategy ?? '核心 Hook 重複三次：國語建立主題，English 增加記憶點，台語完成情緒落地。'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-fuchsia-300/15 bg-fuchsia-950/10 p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-fuchsia-200/70">全球趨勢三合一編曲</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {(productionPlan.global_trend_blend?.length ? productionPlan.global_trend_blend : DEFAULT_GLOBAL_TREND_BLEND).map((item) => (
                <p key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-[color:var(--text-sub)]">
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-7 text-fuchsia-50/80">
                {productionPlan.trend_arrangement_recipe ?? '以 Global Pop 的清楚旋律當骨架，加入 K-Pop 式段落反差、Latin/Reggaeton 的律動推進、Electronic 的現代音色，再把國語敘事、English Hook、台語情感落點自然融合。'}
              </p>
              <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-7 text-fuchsia-50/80">
                {productionPlan.rhythm_strategy ?? '主歌用半拍空間與輕鼓保持親密，副歌加入切分低頻、四拍推進與明亮 hi-hat；橋段降低鼓組，只保留心跳感，最後副歌再全開。'}
              </p>
            </div>
            <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">
              {productionPlan.trend_safety_note ?? '只使用全球流行音樂的通用結構與聽感邏輯，不模仿特定歌手、特定歌曲、特定旋律或受版權保護的編曲細節。'}
            </p>
          </div>

          <div className="mt-4 rounded-[20px] border border-violet-300/15 bg-violet-950/15 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-violet-200/70">下一階段音樂生成指令</p>
            <p className="font-mono text-xs leading-7 text-violet-50/85">{productionPlan.generation_prompt}</p>
          </div>

          <p className="mt-4 text-center text-xs leading-6 text-[color:var(--text-muted)]">
            {productionPlan.next_step_note}
          </p>
        </div>
      )}

      <IntegratedSongMaker
        fusionSong={fusionSong}
        productionPlan={productionPlan}
        musicParameters={musicParameters}
        songDrafts={songDrafts}
        started={songMakerStarted}
        onStart={() => setSongMakerStarted(true)}
      />

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
