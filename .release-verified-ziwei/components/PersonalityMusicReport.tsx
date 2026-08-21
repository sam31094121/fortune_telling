'use client';

import { useEffect, useRef, useState } from 'react';
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
  famous_singers_mandarin?: string;
  famous_singers_english?: string;
  famous_singers_taiwanese?: string;
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

interface VoiceProfile {
  workflowStatus: string;
  consentAccepted: boolean;
  recorded: boolean;
  localOnly: boolean;
  selfDialogueConcept: string;
  sample: null | {
    durationSeconds: number;
    qualityScore: number;
    averageVolume: number;
    dynamicRange: number;
    brightness: number;
    tempoPulse: number;
    inferredCharacteristics: string[];
    recordedAt: string;
  };
}

interface LifeSongContext {
  targetMode: 'self' | 'guest' | null;
  goal: string;
  goalNote: string;
  creativeStyle: string;
  growthSummary: string;
  worldView: string;
  theme: string;
  scene: string;
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
  voiceProfile?: VoiceProfile;
  lifeSongContext?: LifeSongContext;
  name: string;
  onReset: () => void;
}

const GENRE_NAMES: Record<string, string> = {
  modern_dance_pop: '\u73fe\u4ee3\u6d41\u884c\u821e\u66f2',
  emotional_pop: '\u60c5\u7dd2\u6d41\u884c',
  club_edm_pop: '\u6d3e\u5c0d\u96fb\u97f3',
  cinematic_pop: '?餃蔣瘚?',
  acoustic_pop: '?刻釭瘚?',
  indie_folk: '?函?瘞?',
  alternative_rock: '?阡??遝',
  electronic_pop: '?餃?瘚?',
  experimental_electronic: '撖阡??餃?',
  avant_garde: '??瘞?',
  ambient_electronic: '?啣??餃?',
  psychedelic_rock: '餈瑕劂?遝',
  classical_ambient: '?文瘞?',
};

const GENRE_EMOJI: Record<string, string> = {
  modern_dance_pop: 'POP',
  emotional_pop: 'EMO',
  club_edm_pop: 'EDM',
  cinematic_pop: 'CIN',
  acoustic_pop: 'AC',
  indie_folk: 'IND',
  alternative_rock: 'ROCK',
  electronic_pop: 'ELEC',
  experimental_electronic: 'EXP',
  avant_garde: 'AV',
  ambient_electronic: 'AMB',
  psychedelic_rock: 'PSY',
  classical_ambient: 'CLS',
};

const MATRIX_CONFIG: Array<{ key: keyof PersonalityMatrix; label: string; low: string; mid: string; high: string }> = [
  { key: 'emotion', label: '情緒深度', low: '冷靜收斂', mid: '溫柔穩定', high: '情感濃烈' },
  { key: 'logic', label: '邏輯判斷', low: '直覺優先', mid: '理性平衡', high: '結構清楚' },
  { key: 'social', label: '人際連結', low: '保留距離', mid: '自然互動', high: '感染力強' },
  { key: 'leadership', label: '主導能力', low: '低調觀察', mid: '穩定帶領', high: '號召明確' },
  { key: 'security', label: '安全感', low: '需要安定', mid: '逐步建立', high: '穩固可靠' },
  { key: 'creativity', label: '創造力', low: '務實簡潔', mid: '靈感穩定', high: '想像力強' },
  { key: 'risk', label: '冒險度', low: '保守謹慎', mid: '願意嘗試', high: '突破性強' },
  { key: 'attachment', label: '依附感', low: '獨立自主', mid: '重視陪伴', high: '情感黏著' },
];

const OCEAN_CONFIG: Array<{ key: keyof OceanProfile; label: string }> = [
  { key: 'openness', label: '開放度' },
  { key: 'conscientiousness', label: '責任感' },
  { key: 'extraversion', label: '外向度' },
  { key: 'agreeableness', label: '親和度' },
  { key: 'neuroticism', label: '敏感度' },
];

function getScoreWord(score: number, low: string, mid: string, high: string) {
  if (score >= 75) return high;
  if (score >= 50) return mid;
  return low;
}

function simplifyClientText(value?: string, fallback = '') {
  if (!value) return fallback;
  const simplified = value
    .replace(/[A-Za-z][A-Za-z0-9+./_-]*/g, '')
    .replace(/\b\d+\s*(?:BPM|MP3|WAV|API|AI|KEY)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return simplified || fallback;
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
        <span className="text-xs text-[color:var(--text-muted)]">歌曲草稿</span>
      </div>

      <h4 className="font-serif text-xl text-[color:var(--text-main)]">《{draft.title}》</h4>
      <p className="mt-3 text-xs leading-7 text-[color:var(--text-sub)]">{draft.concept}</p>

      <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
        <div className="space-y-1.5 font-serif text-sm leading-7 text-[color:var(--text-main)]">
          {draft.lyrics.map((line, index) => {
            const isSection = /^\s*\[.+\]\s*$/.test(line);
            return isSection ? (
              <p key={`${line}-${index}`} className="pt-2 text-xs font-semibold tracking-[0.25em]" style={{ color: accentStyle.text }}>
                {line.replace(/[\[\]]/g, '')}
              </p>
            ) : (
              <p key={`${line}-${index}`}>{line}</p>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs leading-6 text-[color:var(--text-muted)]">
        <p>
          <span style={{ color: accentStyle.text }}>風格：</span>
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

function addDanceDrums(
  buffer: Float32Array,
  sampleRate: number,
  beat: number,
  startBeat: number,
  beats: number,
  intensity: number,
  mode: 'build' | 'drop' | 'outro',
) {
  for (let i = 0; i < beats; i += 1) {
    const at = (startBeat + i) * beat;
    const barBeat = i % 4;

    if (mode !== 'outro' || i < beats - 4) {
      addKick(buffer, sampleRate, at, (mode === 'drop' ? 0.24 : 0.17) * intensity);
    }

    if (barBeat === 1 || barBeat === 3) {
      addNoiseHit(buffer, sampleRate, at, 0.1, (mode === 'drop' ? 0.095 : 0.07) * intensity);
      addNoiseHit(buffer, sampleRate, at + beat * 0.03, 0.08, 0.035 * intensity);
    }

    addHihat(buffer, sampleRate, at + beat * 0.5, (mode === 'drop' ? 0.062 : 0.045) * intensity);

    if (mode === 'drop') {
      addHihat(buffer, sampleRate, at + beat * 0.25, 0.028 * intensity);
      addHihat(buffer, sampleRate, at + beat * 0.75, 0.028 * intensity);
    }
  }
}

function addDanceBassLine(
  buffer: Float32Array,
  sampleRate: number,
  root: number,
  scale: number[],
  beat: number,
  startBeat: number,
  bars: number,
  progression: number[],
  gain: number,
) {
  for (let bar = 0; bar < bars; bar += 1) {
    const degree = progression[bar % progression.length];
    const bass = frequencyFromInterval(root, scale[degree], -2);
    const baseBeat = startBeat + bar * 4;

    [0.12, 1.12, 2.12, 3.12].forEach((offset, index) => {
      addTone(buffer, sampleRate, (baseBeat + offset) * beat, beat * 0.42, bass, gain * (index === 2 ? 0.82 : 1), 'bass');
    });

    addTone(buffer, sampleRate, (baseBeat + 3.58) * beat, beat * 0.22, bass * 1.5, gain * 0.42, 'bass');
  }
}

function addDanceRiser(
  buffer: Float32Array,
  sampleRate: number,
  root: number,
  beat: number,
  startBeat: number,
  beats: number,
  gain: number,
) {
  for (let i = 0; i < beats; i += 1) {
    const progress = i / Math.max(1, beats - 1);
    const frequency = frequencyFromInterval(root, 7 + progress * 12, 1);
    addTone(buffer, sampleRate, (startBeat + i * 0.5) * beat, beat * 0.42, frequency, gain * (0.35 + progress * 0.65), 'bell');

    if (i % 2 === 0) {
      addNoiseHit(buffer, sampleRate, (startBeat + i) * beat, beat * 0.42, gain * (0.03 + progress * 0.05));
    }
  }
}

function createPlayableSongDemo(
  musicParameters: MusicParameters,
  fusionSong: FusionSong,
  songDrafts?: SongDrafts,
) {
  const sampleRate = 22_050;
  const bpm = clampNumber(Math.max(Number.isFinite(musicParameters.bpm) ? musicParameters.bpm : 124, 124), 122, 128);
  const beat = 60 / bpm;
  const totalBeats = 96;
  const duration = totalBeats * beat;
  const buffer = new Float32Array(Math.ceil(duration * sampleRate));
  const root = getRootFrequency(musicParameters.key);
  const isMinor = /minor|撠矽/i.test(musicParameters.key);
  const scale = isMinor ? [0, 2, 3, 5, 7, 8, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12];
  const progression = isMinor ? [0, 6, 3, 5] : [0, 5, 3, 4];
  const englishSeed = lyricSeed(songDrafts?.english.lyrics ?? fusionSong.fusion_lyrics.slice(0, 5));
  const mandarinSeed = lyricSeed(songDrafts?.mandarin.lyrics ?? fusionSong.fusion_lyrics.slice(5, 10));
  const sharedHookSeed = englishSeed + mandarinSeed;
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
  const mandarinPreChorus = applySmallVariation(
    isMinor ? [2, 3, 5, 7, 5, 3, 2, 0] : [2, 4, 5, 7, 5, 4, 2, 0],
    mandarinSeed + englishSeed,
    'lift',
  );
  const chorusMotif = [
    ...sharedHook,
    ...mandarinPreChorus.slice(0, 4),
    ...englishHook.slice(0, 4),
  ];
  const liftedChorusMotif = chorusMotif.map((interval, index) => (
    index % 4 === 3 ? interval + 2 : interval + 1
  ));
  const straightEight = [0, 1, 2, 3, 4, 5, 6, 7];
  const verseRhythm = [0, 1, 2.5, 3.5, 4, 5, 6.5, 7.25, 8, 9, 10.5, 11.5, 12, 13, 14.5, 15.25];
  const chorusRhythm = [0, 0.75, 1.5, 2.5, 4, 4.75, 5.5, 6.5, 8, 8.75, 9.5, 10.5, 12, 12.75, 13.5, 14.5];
  const shortDurations = [0.62, 0.62, 0.9, 1.1];
  const verseDurations = [0.78, 0.72, 0.95, 0.62, 0.78, 0.72, 1.1, 0.55];

  // 0-8 beats嚗old Hook嚗???唾??園??湔銝靘????脤??湔?隤?
  addChordProgression(buffer, sampleRate, root, scale, beat, 0, 2, progression, 0.05, 'bell');
  addPatternedMelody(buffer, sampleRate, root, beat, 0, englishHook, straightEight, [0.6, 0.6, 0.78, 1.05], 0.14, 'bell', 1);
  addPatternedMelody(buffer, sampleRate, root, beat, 4, sharedHook, straightEight.slice(0, 4), [0.78, 0.78, 0.92, 1.1], 0.1, 'pluck', 0);
  addDanceRiser(buffer, sampleRate, root, beat, 4, 6, 0.035);

  // 8-24 beats嚗?隤蜓甇??? Kick 雿撥摨阡脣嚗蜓??靽?皜?
  addChordProgression(buffer, sampleRate, root, scale, beat, 2, 4, progression, 0.062, 'pluck');
  addDanceBassLine(buffer, sampleRate, root, scale, beat, 8, 4, progression, 0.075);
  addPatternedMelody(buffer, sampleRate, root, beat, 8, mandarinVerse, verseRhythm, verseDurations, 0.17, 'pluck', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 16, sharedHook, straightEight, shortDurations, 0.08, 'bell', 1);
  addDanceDrums(buffer, sampleRate, beat, 8, 16, 0.58, 'build');

  // 24-32 beats嚗re-drop嚗??餌?急???其?????望? Hook ??隤蜓???亥絲靘?
  addChordProgression(buffer, sampleRate, root, scale, beat, 6, 2, progression.slice(1), 0.06, 'soft');
  addPatternedMelody(buffer, sampleRate, root, beat, 24, mandarinPreChorus, straightEight, [0.72, 0.72, 0.92, 1.08], 0.14, 'soft', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 28, englishHook.slice(0, 4), [0, 1.5, 3, 5], [0.55, 0.62, 0.76, 0.96], 0.06, 'bell', 1);
  addDanceRiser(buffer, sampleRate, root, beat, 26, 10, 0.05);
  addNoiseHit(buffer, sampleRate, 31.75 * beat, beat * 0.2, 0.12);

  // 32-64 beats嚗ance Drop嚗?????頝?Bass??隤?Hook ???抵憚
  addChordProgression(buffer, sampleRate, root, scale, beat, 8, 8, progression, 0.09, 'soft');
  addDanceBassLine(buffer, sampleRate, root, scale, beat, 32, 8, progression, 0.135);
  addPatternedMelody(buffer, sampleRate, root, beat, 32, chorusMotif, chorusRhythm, shortDurations, 0.18, 'pluck', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 36, englishHook, straightEight, [0.5, 0.5, 0.66, 0.88], 0.065, 'bell', 1);
  addPatternedMelody(buffer, sampleRate, root, beat, 44, mandarinVerse.slice(8, 16), straightEight, [0.62, 0.62, 0.82, 1.05], 0.1, 'soft', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 48, liftedChorusMotif, chorusRhythm, shortDurations, 0.2, 'pluck', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 52, englishHook, straightEight, [0.5, 0.5, 0.66, 0.88], 0.075, 'bell', 1);
  addPatternedMelody(buffer, sampleRate, root, beat, 56, sharedHook, straightEight, [0.58, 0.58, 0.76, 0.98], 0.12, 'soft', 1);
  addDanceDrums(buffer, sampleRate, beat, 32, 32, 1, 'drop');
  addGlobalTrendPulse(buffer, sampleRate, beat, 32, 32, 0.36);

  // 64-80 beats嚗洵鈭憚瘣 Hook嚗????脫?脖?皜??啣?蝝?霈?敺摰寞?閮?
  addChordProgression(buffer, sampleRate, root, scale, beat, 16, 4, progression, 0.083, 'pluck');
  addDanceBassLine(buffer, sampleRate, root, scale, beat, 64, 4, progression, 0.12);
  addPatternedMelody(buffer, sampleRate, root, beat, 64, sharedHook, straightEight, [0.62, 0.62, 0.82, 1.02], 0.14, 'pluck', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 68, englishHook.slice(0, 6), [0, 1, 2, 3, 4, 6], [0.48, 0.48, 0.62, 0.78], 0.07, 'bell', 1);
  addPatternedMelody(buffer, sampleRate, root, beat, 72, mandarinPreChorus, straightEight, [0.68, 0.68, 0.86, 1.08], 0.105, 'soft', 0);
  addDanceDrums(buffer, sampleRate, beat, 64, 16, 0.88, 'drop');

  // 80-96 beats嚗ngineer Stop Cut嚗郊?嗆?嚗????銝餅?敺偏撌湛??嫣噶敺??交迤撘犖??
  addChordProgression(buffer, sampleRate, root, scale, beat, 20, 4, progression, 0.06, 'bell');
  addDanceBassLine(buffer, sampleRate, root, scale, beat, 80, 2, progression, 0.075);
  addPatternedMelody(buffer, sampleRate, root, beat, 80, sharedHook.slice(0, 6), [0, 1, 2, 4, 6, 8], [0.72, 0.72, 0.9, 1.1], 0.1, 'soft', 0);
  addPatternedMelody(buffer, sampleRate, root, beat, 88, mandarinPreChorus.slice(4, 8), [0, 2, 4, 6], [1.1, 1.1, 1.25, 1.65], 0.095, 'soft', 0);
  addDanceDrums(buffer, sampleRate, beat, 80, 12, 0.42, 'outro');

  let peak = 0.001;
  for (let i = 0; i < buffer.length; i += 1) peak = Math.max(peak, Math.abs(buffer[i]));
  const normalizer = 0.84 / peak;
  for (let i = 0; i < buffer.length; i += 1) buffer[i] *= normalizer;

  return encodeWav(buffer, sampleRate);
}

const DEFAULT_POPULAR_MUSIC_DNA = [
  '前 8 秒建立清楚記憶點，讓副歌一進來就能被記住。',
  '主歌保留呼吸與空間，讓聲線有貼近感。',
  '副歌核心句重複 2 到 3 次，形成情緒鉤子。',
  '樂器層次由少到多，最後把主唱推到最前面。',
  '避免模仿既有歌曲，只保留流行音樂的結構精神。',
  '結尾收束乾淨，留下可以二次播放的餘韻。',
];

const DEFAULT_GLOBAL_TREND_BLEND = [
  'Global Pop: 清楚的 hook 與乾淨低頻。',
  'K-Pop / Cross-genre: 分段明確，情緒推進快。',
  'Electronic Pop: 用合成器增加空間與高級感。',
  'R&B / Emotional Pop: 主唱靠前，保留呼吸與尾音。',
  'Short-form friendly: 12 到 18 秒內出現第一個記憶點。',
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
    '以 Global Pop 的乾淨結構為主，主歌留白，副歌加寬，最後讓主唱成為唯一焦點。';
  const rhythmStrategy = productionPlan.rhythm_strategy ??
    '節奏先穩住心跳，再逐步加入鼓組與 hi-hat，讓情緒自然推到副歌。';
  const trendSafetyNote = productionPlan.trend_safety_note ??
    '不得複製任何既有歌曲、旋律、歌詞或編曲，只能使用通用流行結構。';
  const hitFormula = productionPlan.hit_formula ??
    '主歌靠近、前副歌拉高期待、副歌一句打中核心。';
  const hookRepeatStrategy = productionPlan.hook_repeat_strategy ??
    '核心 hook 至少重複兩次，第二次加入和聲與更強節奏。';
  const emotionalArc = productionPlan.emotional_arc ??
    '從壓抑到被理解，再到願意往前走。';
  const cleanLyrics = fusionSong.fusion_lyrics
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  const draftSummary = songDrafts
    ? [
      `Heaven layer: "${songDrafts.english.title}" ??${songDrafts.english.concept}`,
      `Earth layer: "??{songDrafts.mandarin.title}?? ??${songDrafts.mandarin.concept}`,
      `Human layer: "??{songDrafts.taiwanese.title}?? ??${songDrafts.taiwanese.concept}`,
    ].join('\n')
    : 'Use the Tiandiren song matrix lyrics and production plan as source material.';

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
      tiandiren_weight: productionPlan.language_distribution,
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
      'Heaven intro: English music identity, airy motif, era feeling, space',
      'Earth verse: Mandarin vocal phrasing, rhythm, drums, harmony, arrangement body',
      'Earth chorus: chorus emotion and pop hook lift without overriding Heaven style',
      'Human bridge: Mandarin core lyric phrase and personal story landing',
      'Fusion final chorus: one unified Tiandiren personality song',
      'Outro: keep one personal signature phrase',
    ],
    arrangement_prompt:
      `Arrange a complete original song titled "${fusionSong.fusion_title}". ` +
      `Style: ${musicParameters.genre}, ${musicParameters.bpm} BPM, ${musicParameters.key}. ` +
      `Mood: ${musicParameters.mood.join(', ')}. Instruments: ${musicParameters.instrument.join(', ')}. ` +
      `The arrangement must follow one Tiandiren song matrix: Heaven 35% = English music identity, melody direction, era feeling, BPM, emotional color, and space; Earth 35% = Mandarin vocal phrasing, rhythm, drums, harmony, arrangement density, and chorus emotion; Human 30% = Mandarin story lyric feeling, personal story, name temperament, core phrase, memory point, and emotional landing. ` +
      `Global trend blend: ${globalTrendBlend.join(' ')} ` +
      `Trend arrangement recipe: ${trendArrangementRecipe} Rhythm strategy: ${rhythmStrategy} ` +
      `Apply popular music DNA: ${popularMusicDna.join(' ')} ` +
      `Use this hit formula: ${hitFormula} Emotional arc: ${emotionalArc} ` +
      `Build dynamically from intimate intro to one memorable Tiandiren chorus. ${trendSafetyNote}`,
    vocal_prompt:
      `${productionPlan.lead_vocal_choice} ` +
      `Lead vocal should sound emotional, intimate, natural, and singable. ` +
      `Heaven provides the music soul, Earth provides the song body and Mandarin vocal emotion, Human provides the Mandarin story landing. ` +
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

interface LyriaGenerateResponse {
  audioBase64?: string;
  mimeType?: string;
  filename?: string;
  lyricsText?: string;
  promptPreview?: string;
  error?: string;
  detail?: string;
  googleStatus?: string;
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

function IntegratedSongMaker({
  fusionSong,
  productionPlan,
  musicParameters,
  songDrafts,
  name,
  voiceProfile,
  started,
  onStart,
}: {
  fusionSong?: FusionSong;
  productionPlan?: ProductionPlan;
  musicParameters: MusicParameters;
  songDrafts?: SongDrafts;
  name: string;
  voiceProfile?: VoiceProfile;
  started: boolean;
  onStart: () => void;
}) {
  const [audioUrl, setAudioUrl] = useState('');
  const [audioReady, setAudioReady] = useState(false);
  const [lyriaAudioUrl, setLyriaAudioUrl] = useState('');
  const [lyriaFilename, setLyriaFilename] = useState('');
  const [lyriaPromptPreview, setLyriaPromptPreview] = useState('');
  const [lyriaLyricsText, setLyriaLyricsText] = useState('');
  const [lyriaError, setLyriaError] = useState('');
  const [lyriaLoading, setLyriaLoading] = useState(false);
  const audioUrlRef = useRef('');
  const lyriaAudioUrlRef = useRef('');
  const playableAudioRef = useRef<HTMLAudioElement | null>(null);
  const [sharedSong, setSharedSong] = useState(false);
  const [favoriteSaved, setFavoriteSaved] = useState(false);
  const [servicePackageText, setServicePackageText] = useState('');
  const [copiedServicePackage, setCopiedServicePackage] = useState(false);
  const [elevenLabsShellText, setElevenLabsShellText] = useState('');
  const [elevenLabsShellSummary, setElevenLabsShellSummary] = useState<ElevenLabsShellSummary | null>(null);
  const [elevenLabsShellLoading, setElevenLabsShellLoading] = useState(false);

  useEffect(() => () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    if (lyriaAudioUrlRef.current) URL.revokeObjectURL(lyriaAudioUrlRef.current);
  }, []);

  if (!fusionSong || !productionPlan) return null;

  const popularMusicDna = productionPlan.popular_music_dna?.length
    ? productionPlan.popular_music_dna
    : DEFAULT_POPULAR_MUSIC_DNA;
  const globalTrendBlend = productionPlan.global_trend_blend?.length
    ? productionPlan.global_trend_blend
    : DEFAULT_GLOBAL_TREND_BLEND;
  const trendArrangementRecipe = productionPlan.trend_arrangement_recipe ??
    '以 Global Pop 的乾淨結構為主，主歌留白，副歌加寬，最後讓主唱成為唯一焦點。';
  const rhythmStrategy = productionPlan.rhythm_strategy ??
    '節奏先穩住心跳，再逐步加入鼓組與 hi-hat，讓情緒自然推到副歌。';
  const hitFormula = productionPlan.hit_formula ??
    '主歌靠近、前副歌拉高期待、副歌一句打中核心。';
  const hookRepeatStrategy = productionPlan.hook_repeat_strategy ??
    '核心 hook 至少重複兩次，第二次加入和聲與更強節奏。';
  const emotionalArc = productionPlan.emotional_arc ??
    '從壓抑到被理解，再到願意往前走。';

  const readySteps = [
    '讀取生命歌曲資料',
    '建立主唱 hook',
    '整理歌曲情緒',
    '完成正式生成',
  ];

  function handleGeneratePlayableDemo(tryPlay = false) {
    if (!fusionSong) return;

    setAudioReady(false);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

    const blob = createPlayableSongDemo(musicParameters, fusionSong, songDrafts);
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    setAudioUrl(url);
    setAudioReady(true);
    if (tryPlay) window.setTimeout(() => { void playableAudioRef.current?.play().catch(() => undefined); }, 80);
  }

  async function handleGenerateLyriaMp3() {
    if (!fusionSong || !productionPlan || lyriaLoading) return;

    onStart();
    setLyriaLoading(true);
    setLyriaError('');
    setLyriaPromptPreview('');
    setLyriaLyricsText('');
    if (lyriaAudioUrlRef.current) {
      URL.revokeObjectURL(lyriaAudioUrlRef.current);
      lyriaAudioUrlRef.current = '';
      setLyriaAudioUrl('');
    }

    try {
      const response = await fetch('/api/music-lyria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: name,
          fusionSong,
          productionPlan,
          musicParameters,
          voiceProfile,
        }),
      });
      const data = await response.json() as LyriaGenerateResponse;

      if (!response.ok || !data.audioBase64) {
        setLyriaError([
          data.error || 'Lyria 30 秒 MP3 生成失敗，請稍後再試。',
          data.googleStatus ? `狀態：${data.googleStatus}` : '',
          data.detail ? `細節：${data.detail}` : '',
        ].filter(Boolean).join('\n'));
        setLyriaPromptPreview(data.promptPreview || '');
        return;
      }

      const mimeType = data.mimeType || 'audio/mpeg';
      const blob = base64ToBlob(data.audioBase64, mimeType);
      const url = URL.createObjectURL(blob);
      lyriaAudioUrlRef.current = url;
      setLyriaAudioUrl(url);
      setLyriaFilename(data.filename || `AI生命歌曲-${name || fusionSong.fusion_title}.mp3`);
      setLyriaPromptPreview(data.promptPreview || '');
      setLyriaLyricsText(data.lyricsText || '');
    } catch {
      setLyriaError('目前無法連線到 Lyria 生成服務，請稍後再試。');
    } finally {
      setLyriaLoading(false);
    }
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
        nextAction: data.next_action ?? '下一步：連接正式聲音生成服務',
      });
      setElevenLabsShellText(JSON.stringify(data, null, 2));
    } catch {
      setElevenLabsShellSummary(null);
      setElevenLabsShellText(JSON.stringify({
        error: 'ElevenLabs 聲音服務暫時無法建立，請稍後再試。',
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

  async function handleShareSong() {
    if (!fusionSong) return;
    const shareText = `這是我的 AI 生命歌曲《${fusionSong.fusion_title}》：${fusionSong.fusion_concept}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: fusionSong.fusion_title, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
      setSharedSong(true);
    } catch {
      setSharedSong(false);
    }
  }

  function handleSaveFavorite() {
    if (!fusionSong) return;
    try {
      const key = 'tdh_music_favorites_v1';
      const raw = window.localStorage.getItem(key);
      const current = raw ? JSON.parse(raw) as unknown[] : [];
      const next = [{ title: fusionSong.fusion_title, concept: fusionSong.fusion_concept, savedAt: new Date().toISOString() }, ...current].slice(0, 20);
      window.localStorage.setItem(key, JSON.stringify(next));
      setFavoriteSaved(true);
    } catch {
      setFavoriteSaved(false);
    }
  }

  return (
    <div className="fortune-card music-song-maker-card overflow-hidden border-amber-300/20 px-6 py-8 sm:px-8">
      <div className="text-center">
        <div className="mx-auto mb-5 max-w-2xl rounded-[22px] border border-amber-300/25 bg-amber-300/10 px-5 py-4 shadow-[0_0_34px_rgba(251,191,36,0.12)]">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200">MAGNETIC VOICE</p>
          <h3 className="mt-2 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">磁性聲音正式生成</h3>
          <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">
            只保留正式 MP3 生成，不再顯示工程預覽。讓聲線、呼吸與情緒記憶點成為主角。
          </p>
        </div>
        <p className="hidden text-xs uppercase tracking-[0.4em] text-amber-300/70">
          Your Personal Theme Song
        </p>
        <h3 className="hidden mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
          雿?撠惇鈭箸銝駁??脤?閬?
        </h3>
        <p className="hidden mx-auto mt-3 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
          ??甇?雿??????憪??渡??箸?敺??銝銝??閬惇?潔??璅?閬賬?
        </p>
      </div>

      <div className="hidden mt-6 grid gap-4 md:grid-cols-4">
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
        className="hidden vip-gold-btn mt-6 w-full py-4 text-sm sm:text-base"
      >
        {started ? '歌曲資料已準備' : '開始生成歌曲'}
      </button>

      {true && (
        <div className="mt-6 space-y-4">
          <div className="rounded-[22px] border border-amber-300/20 bg-black/20 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-300/70">AI SONG BLUEPRINT</p>
            <h4 className="font-serif text-2xl text-[color:var(--text-main)]">《{fusionSong.fusion_title}》</h4>
            <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{fusionSong.fusion_concept}</p>
          </div>

          <div className="music-primary-generate-panel rounded-[22px] border border-emerald-300/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),rgba(15,23,42,0.68)_58%,rgba(2,6,23,0.9)_100%)] p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-emerald-200/80">MAGNETIC VOICE</p>
            <h4 className="font-serif text-2xl font-black leading-tight text-emerald-50">磁性聲音正式生成</h4>
            <p className="mt-3 text-sm font-semibold leading-8 text-[color:var(--text-sub)]">
              低質感本地預覽已移除。這裡只保留正式 MP3 生成，讓聲線、呼吸、情緒與副歌記憶點成為主角。
            </p>
            <button
              type="button"
              onClick={handleGenerateLyriaMp3}
              disabled={lyriaLoading}
              className="music-primary-generate-button mt-4 w-full rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-4 text-sm font-black tracking-[0.18em] text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/15 disabled:cursor-wait disabled:opacity-60"
            >
              {lyriaLoading ? '正在生成磁性聲音 MP3...' : lyriaAudioUrl ? '重新生成磁性聲音 MP3' : '生成磁性聲音 MP3'}
            </button>
            {lyriaError && (
              <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs leading-6 text-rose-200">
                {lyriaError}
              </div>
            )}
            {lyriaAudioUrl && (
              <div className="mt-4 space-y-3">
                <audio controls src={lyriaAudioUrl} className="w-full">
                  <track kind="captions" />
                </audio>
                <a
                  href={lyriaAudioUrl}
                  download={lyriaFilename || `${fusionSong.fusion_title || 'AI生命歌曲'}.mp3`}
                  className="inline-flex w-full items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-xs font-bold tracking-[0.18em] text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/15"
                >
                  下載 MP3
                </a>
                <p className="text-xs leading-6 text-emerald-100/75">
                  這是依照本次生命歌曲資料生成的正式 MP3，檔案只保存在此瀏覽器記憶體中。
                </p>
              </div>
            )}
          </div>

          <details className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <summary className="cursor-pointer text-xs font-semibold tracking-[0.22em] text-[color:var(--text-muted)] transition hover:text-white">
              展開歌曲資料
            </summary>
            <div className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">完整歌詞</p>
              <div className="space-y-1.5 font-serif text-sm leading-8 text-[color:var(--text-main)]">
                {fusionSong.fusion_lyrics.map((line, index) => {
                  const isSection = /^\s*\[.+\]\s*$/.test(line);
                  return isSection ? (
                    <p key={`${line}-${index}`} className="pt-2 text-xs font-semibold tracking-[0.28em] text-amber-300/70">
                      {line.replace(/[\[\]]/g, '')}
                    </p>
                  ) : (
                    <p key={`${line}-${index}`}>{line}</p>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[22px] border border-cyan-300/15 bg-cyan-950/10 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-300/70">AI 主唱選擇</p>
                <p className="text-sm leading-8 text-[color:var(--text-main)]">{productionPlan.lead_vocal_choice}</p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">歌曲融合策略</p>
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
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-fuchsia-200/70">全球趨勢編曲</p>
                <div className="space-y-2 text-xs leading-6 text-[color:var(--text-sub)]">
                  {globalTrendBlend.slice(0, 4).map((item) => (
                    <p key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">{item}</p>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-7 text-fuchsia-100/75">{trendArrangementRecipe}</p>
              </div>

              <div className="rounded-[22px] border border-violet-300/15 bg-violet-950/15 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-violet-200/70">下一階段音樂生成指令</p>
                <p className="font-mono text-xs leading-7 text-violet-50/85">{productionPlan.generation_prompt}</p>
              </div>

              <div className="rounded-[22px] border border-emerald-300/15 bg-emerald-950/10 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-emerald-200/70">正式 AI 服務 / 聲音生成</p>
                <p className="text-xs leading-7 text-[color:var(--text-muted)]">
                  這裡只保留正式服務需要的歌曲 prompt、聲線設定、BPM、Key 與情緒指令。工程預覽已移除，前端不再顯示低質感 WAV。
                </p>
                <div className="mt-3 rounded-xl border border-emerald-300/10 bg-black/20 px-3 py-2 text-xs leading-6 text-emerald-100/80">
                  下一步：串接正式音樂／聲音生成服務，並由後端保存正式 MP3。
                </div>
                <div className="mt-3 space-y-2 rounded-xl border border-emerald-300/10 bg-black/20 px-3 py-3 text-xs leading-6 text-emerald-50/75">
                  <p>Hit Formula：{hitFormula}</p>
                  <p>情緒曲線：{emotionalArc}</p>
                  <p>節奏策略：{rhythmStrategy}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateServicePackage}
                  className="mt-4 w-full rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-xs font-semibold tracking-[0.15em] text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/15"
                >
                  產生正式 AI 服務資料
                </button>
                <button
                  type="button"
                  onClick={handleCheckElevenLabsShell}
                  disabled={elevenLabsShellLoading}
                  className="mt-3 w-full rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-xs font-semibold tracking-[0.15em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-wait disabled:opacity-60"
                >
                  {elevenLabsShellLoading ? '正在檢查 ElevenLabs 服務...' : '檢查 ElevenLabs Music API 服務'}
                </button>
                <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">
                  這裡只做服務狀態檢查，不會在前端暴露 API key；正式生成仍由後端處理。
                </p>
              </div>
            </div>
          </div>

          {elevenLabsShellText && (
            <div className="rounded-[22px] border border-cyan-300/15 bg-cyan-950/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">ElevenLabs Shell Check</p>
              <p className="mt-1 text-xs leading-6 text-[color:var(--text-muted)]">
                服務檢查結果會顯示 dry-run、安全狀態與下一步，前端只保留正式聲音生成流程。
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
                      {elevenLabsShellSummary.dryRun && !elevenLabsShellSummary.externalRequestSent ? 'Dry-run，未送出外部請求' : '正式服務已啟用'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">Plan</p>
                    <p className="mt-2 text-xs leading-6 text-cyan-50/90">
                      {elevenLabsShellSummary.sectionCount} 段，約 {elevenLabsShellSummary.targetDurationSeconds} 秒
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
                    這份資料提供給下一階段正式 AI 音樂／聲音生成服務使用。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyServicePackage}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
                >
                  {copiedServicePackage ? '已複製' : '複製資料'}
                </button>
              </div>
              <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 p-4 font-mono text-[11px] leading-6 text-emerald-50/80">
                {servicePackageText}
              </pre>
            </div>
          )}
            </div>
          </details>

          <p className="text-center text-xs leading-6 text-[color:var(--text-muted)]">
            正式生成以磁性聲線為主角；多餘工程預覽與低質感按鈕已移除。
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
  voiceProfile,
  lifeSongContext,
  name,
  onReset,
}: PersonalityMusicReportProps) {
  // ?????芸?閮曹?擐??冽嚗????曉???箄鈭銵?
  const [openPlayer, setOpenPlayer] = useState<'english' | 'mandarin' | 'taiwanese' | null>(null);
  const [songMakerStarted, setSongMakerStarted] = useState(false);
  const [showAdvancedDetails] = useState(false);

  const genreName = GENRE_NAMES[musicParameters.genre] || musicParameters.genre;
  const genreEmoji = GENRE_EMOJI[musicParameters.genre] || 'MUSIC';

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
          <p className="text-xs uppercase tracking-[0.4em] text-violet-300/70">人格主題曲</p>
          <h2 className="mt-3 font-serif leading-tight text-[color:var(--text-main)]" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)' }}>
            《{simplifyClientText(musicReport.song_title_suggestion, '生命主題曲')}》
          </h2>
          <p className="mt-3 font-serif text-base italic leading-8 sm:text-lg" style={{ color: meta.wuxingColor ?? 'var(--earth-gold)' }}>
            {simplifyClientText(musicReport.lyric_opening)}
          </p>
          <p className="mt-5 text-sm leading-9 text-[color:var(--text-sub)]">{simplifyClientText(musicReport.music_narrative)}</p>

          {lifeSongContext && (
            <div className="mt-6 rounded-[22px] border border-amber-300/20 bg-amber-300/[0.07] p-5">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200">AI 生命歌曲定位</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-[11px] font-bold text-[color:var(--text-muted)]">創作目標</p>
                  <p className="mt-1 text-sm font-black text-amber-100">{lifeSongContext.goal}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-[11px] font-bold text-[color:var(--text-muted)]">創作風格</p>
                  <p className="mt-1 text-sm font-black text-cyan-100">{lifeSongContext.creativeStyle}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--text-sub)]">{lifeSongContext.worldView}</p>
              <p className="mt-2 text-xs leading-6 text-[color:var(--text-muted)]">{lifeSongContext.growthSummary}</p>
            </div>
          )}

          {/* ?? 憭扳?絞閮飛?亙??瑕戊甇????Ｘ */}
          {showAdvancedDetails && (musicReport.famous_singers_mandarin || musicReport.famous_singers_english || musicReport.famous_singers_taiwanese) && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-xs uppercase tracking-[0.3em] text-violet-300/70 mb-4">
                ?? ?函?瘚?憭扳??繚 隞?”?瑕戊甇?蝯梯?摮詨?璅?
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {musicReport.famous_singers_english && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 relative overflow-hidden">
                    <span className="absolute top-1 right-2 text-[8px] text-violet-400/40 font-mono">GLOBAL</span>
                    <p className="text-[10px] font-mono text-[color:var(--text-muted)] tracking-wider">
                      [憭拙惜] ?梯?憭扳??璅?
                    </p>
                    <p className="mt-2 text-sm font-bold text-[color:var(--text-main)]">
                      {musicReport.famous_singers_english}
                    </p>
                    <p className="mt-1 text-[9px] text-[color:var(--text-sub)]">
                      ?函?瘚?蝯梯?摮豢?蝡?
                    </p>
                  </div>
                )}
                {musicReport.famous_singers_mandarin && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 relative overflow-hidden">
                    <span className="absolute top-1 right-2 text-[8px] text-amber-400/40 font-mono">MANDARIN</span>
                    <p className="text-[10px] font-mono text-[color:var(--text-muted)] tracking-wider">
                      [?啣惜] ??憭扳??璅?
                    </p>
                    <p className="mt-2 text-sm font-bold text-[color:var(--text-main)]">
                      {musicReport.famous_singers_mandarin}
                    </p>
                    <p className="mt-1 text-[9px] text-[color:var(--text-sub)]">
                      ?航?瘚?蝯梯?摮豢?蝡?
                    </p>
                  </div>
                )}
                {musicReport.famous_singers_taiwanese && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 relative overflow-hidden">
                    <span className="absolute top-1 right-2 text-[8px] text-cyan-400/40 font-mono">TAIWANESE</span>
                    <p className="text-[10px] font-mono text-[color:var(--text-muted)] tracking-wider">
                      [鈭箏惜] ??憭扳??璅?
                    </p>
                    <p className="mt-2 text-sm font-bold text-[color:var(--text-main)]">
                      {musicReport.famous_singers_taiwanese}
                    </p>
                    <p className="mt-1 text-[9px] text-[color:var(--text-sub)]">
                      ?砍?瘞?蝯梯?摮豢?蝡?
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-[10px] text-[color:var(--text-muted)] italic leading-relaxed">
                * ?酉嚗之?豢?甇?撠??臬?潭?犖?潮璅惇?扯??誨???孵噩嚗????銵之?豢??亙?摨血虜??雿?蝞?敺???瑚誨銵冽抒憟單??芋??靘雿憸冽隤????璅?
              </p>
            </div>
          )}
        </div>
      </div>


      {showAdvancedDetails && songDrafts && (
        <div className="fortune-card px-6 py-8 sm:px-8">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/70">
              憭拙鈭箸??脩??繚 蝚砌??挾
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
              ?梁??乓??????????惜
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-7 text-[color:var(--text-sub)]">
              ?ㄐ???Ｙ??單?嚗?銝??銝?甇?蝟餌絞?芸遣蝡予撅扎撅扎犖撅支????惜嚗?敺甇??撘?頛詨銝擐?撅砍予?唬犖鈭箸甇??
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SongDraftCard draft={songDrafts.english} accent="violet" />
            <SongDraftCard draft={songDrafts.mandarin} accent="amber" />
            <SongDraftCard draft={songDrafts.taiwanese} accent="cyan" />
          </div>
        </div>
      )}

      {showAdvancedDetails && productionPlan && (
        <div className="vip-gold-card rounded-[24px] px-6 py-8 sm:px-8">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70">
              AI 鋆賭?蝮賜 繚 ?芸??芸???
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
              ?予?唬犖蝝?撅方ˊ雿?銝擐犖?潔蜓憿
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
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-300/70">主唱配置</p>
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
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">生成流程</p>
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
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">語言分配</p>
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
                  {productionPlan.hit_formula ?? '主歌靠近、前副歌拉高期待、副歌一句打中核心。'}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">情緒曲線 / Hook 重複</p>
                <p className="text-sm leading-7 text-[color:var(--text-main)]">
                  {productionPlan.emotional_arc ?? '先建立親密感，再推向副歌，最後留下情緒落點。'}
                </p>
                <p className="mt-3 text-xs leading-7 text-[color:var(--text-muted)]">
                  {productionPlan.hook_repeat_strategy ?? '核心 hook 重複兩次，第二次加入和聲與更強節奏。'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-fuchsia-300/15 bg-fuchsia-950/10 p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-fuchsia-200/70">全球趨勢編曲</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {(productionPlan.global_trend_blend?.length ? productionPlan.global_trend_blend : DEFAULT_GLOBAL_TREND_BLEND).map((item) => (
                <p key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-[color:var(--text-sub)]">
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-7 text-fuchsia-50/80">
                {productionPlan.trend_arrangement_recipe ?? '以 Global Pop 的乾淨結構為主，主歌留白，副歌加寬，最後讓主唱成為唯一焦點。'}
              </p>
              <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-7 text-fuchsia-50/80">
                {productionPlan.rhythm_strategy ?? '節奏先穩住心跳，再逐步加入鼓組與 hi-hat，讓情緒自然推到副歌。'}
              </p>
            </div>
            <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">
              {productionPlan.trend_safety_note ?? '不得複製任何既有歌曲、旋律、歌詞或編曲，只使用通用流行結構。'}
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

      {fusionSong && productionPlan && (
        <IntegratedSongMaker
          fusionSong={fusionSong}
          productionPlan={productionPlan}
          musicParameters={musicParameters}
          songDrafts={songDrafts}
          name={name}
          voiceProfile={voiceProfile}
          started={songMakerStarted}
          onStart={() => setSongMakerStarted(true)}
        />
      )}

      {showAdvancedDetails && (
        <>
      <div className="space-y-4">
        <div className="fortune-card p-6 sm:p-8 border-violet-500/30 bg-gradient-to-r from-violet-950/15 via-slate-900/40 to-violet-950/15 relative overflow-hidden">
          <div className="absolute top-2 right-3 text-[8px] text-violet-400/40 font-mono tracking-widest">[DATA_STATISTICS_AI_MATCH]</div>
          <p className="text-xs uppercase tracking-[0.35em] text-violet-300 font-semibold mb-4">AI 音樂頻率契合度</p>
          <div className="rounded-2xl bg-slate-950/50 border border-violet-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-violet-200">
              天地人共鳴年代：{meta.eraDisplayName ?? meta.era}
            </p>
            <p className="mt-2 text-xs text-[color:var(--text-sub)] leading-6">
              系統依照出生年代、人格特質與五行喜忌，整理適合的歌曲頻率與聲線方向。
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-pulse" style={{ width: '99.8%' }}></div>
              </div>
              <span className="text-[10px] font-mono text-violet-300">AI 匹配度 99.8%</span>
            </div>
          </div>
        </div>

        <MusicPlayer
          label={`天層英文音樂錨點 · ${meta.eraDisplayName ?? meta.era}`}
          flag="GLOBAL"
          track={englishTrack}
          reason={musicReport.english_song_reason}
          affinityScore={Math.round((personalityMatrix.creativity + personalityMatrix.emotion) / 2)}
          isOpen={openPlayer === 'english'}
          onToggleOpen={(open) => setOpenPlayer(open ? 'english' : null)}
        />
        {mandarinTrack && (
          <MusicPlayer
            label={`地層國語情緒錨點 · ${meta.eraDisplayName ?? meta.era}`}
            flag="MAND"
            track={mandarinTrack}
            reason={musicReport.mandarin_song_reason}
            affinityScore={Math.round((personalityMatrix.attachment + personalityMatrix.emotion) / 2)}
            isOpen={openPlayer === 'mandarin'}
            onToggleOpen={(open) => setOpenPlayer(open ? 'mandarin' : null)}
          />
        )}
        {taiwaneseTrack && (
          <MusicPlayer
            label={`人層故事錨點 · ${meta.eraDisplayName ?? meta.era}`}
            flag="STORY"
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
              AI 天地人人格原創主題曲
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[color:var(--text-main)] sm:text-3xl">
              《{fusionSong.fusion_title}》
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-7 text-[color:var(--text-sub)]">
              {fusionSong.fusion_concept}
            </p>
          </div>

          <div className="rounded-[18px] border border-amber-300/15 bg-black/20 px-5 py-5">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-300/60">天地人融合歌詞</p>
            <div className="space-y-1.5 font-serif text-sm leading-8 text-[color:var(--text-main)]">
              {fusionSong.fusion_lyrics.map((line, i) => {
                const isSection = /^\s*\[.+\]\s*$/.test(line);
                return isSection ? (
                  <p key={i} className="pt-2 text-xs font-semibold tracking-[0.3em] text-amber-300/70">
                    {line.replace(/[\[\]]/g, '')}
                  </p>
                ) : (
                  <p key={i}>{line}</p>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/5 px-5 py-4">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[color:var(--text-muted)]">天地人曲風設定</p>
            <p className="text-sm leading-7 text-[color:var(--text-sub)]">{fusionSong.fusion_style}</p>
          </div>

          <p className="mt-4 text-center text-xs leading-6 text-[color:var(--text-muted)]">
            目前只保留正式磁性聲音生成入口，讓聲線與情緒記憶點成為主角。
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
                  <span className="text-xs font-semibold text-[color:var(--text-sub)]">{word} 繚 {score}</span>
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
        </>
      )}

      <div className="sky-card fortune-card px-6 py-7 sm:px-8">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-violet-300/70">這首歌想對你說</p>
        <p className="text-sm leading-9 text-[color:var(--text-main)]">{simplifyClientText(musicReport.music_message)}</p>
      </div>

      <div className="vip-gold-card rounded-[24px] px-6 py-8 sm:px-8">
        <div className="mb-7 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-amber-300/70">善意提醒</p>
          <p className="mx-auto mt-5 max-w-2xl font-serif text-sm leading-9 text-[color:var(--text-main)]">
            {simplifyClientText(musicReport.wisdom_note)}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-xs leading-7 text-[color:var(--text-sub)]">
            {name} 的生命歌曲已整理完成。正式生成會以磁性聲線、情緒記憶點與清楚副歌為核心。
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
