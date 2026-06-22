export type BloodType = '' | 'A' | 'B' | 'AB' | 'O';
export type Gender = 'male' | 'female';

export interface Step1_BirthdayInput {
  birthday: string;
}

export interface Step2_BloodTypeInput extends Step1_BirthdayInput {
  bloodType: Exclude<BloodType, ''>;
}

export interface Step3_PersonInput extends Step2_BloodTypeInput {
  name: string;
  gender: Gender;
}

export interface PersonInput extends Step3_PersonInput {}

export interface AnalyzeRequest {
  person: PersonInput;
}

export interface InsightRequest {
  name: string;
  birthDate: string;
  bloodType: Exclude<BloodType, ''>;
  gender: Gender;
}

export interface PreviewRequest {
  birthday: string;
  bloodType: Exclude<BloodType, ''>;
}

export const DIMENSION_KEYS = [
  'emotion',
  'logic',
  'social',
  'leadership',
  'security',
  'execution',
  'creativity',
  'empathy',
  'risk',
  'control',
  'wealth',
  'attachment',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];
export type DimensionScores = Record<DimensionKey, number>;
export type DimensionAdjustments = Record<DimensionKey, number>;

export interface AnalysisResult {
  resonance_score: number;
  final_scores: DimensionScores;
  base_scores: DimensionScores;
  blood_adjustments: DimensionAdjustments;
  name_adjustments: DimensionAdjustments;
  birth_scores?: DimensionScores;
  blood_scores?: DimensionScores;
  name_scores?: DimensionScores;
  raw_personality?: DimensionScores;
  gender_adjustments?: DimensionAdjustments;
  ai_skeleton_summary?: string;
  ai_behavior_summary?: string;
  ai_individuality_summary?: string;
  ai_final_summary?: string;
  ai_wisdom_perspective?: string;
  skeleton_summary: string;
  behavior_summary: string;
  individuality_summary: string;
  final_summary: string;
  wealth_motivation_summary: string;
  love_pattern_summary: string;
  blind_spot_summary: string;
  life_advantage_summary: string;
  wisdom_perspective: string;
  music_profile: MusicProfile;
}

export interface PreviewAnalysisResult {
  preview_score: number;
  base_scores: DimensionScores;
  blood_adjustments: DimensionAdjustments;
  preview_scores: DimensionScores;
  skeleton_summary: string;
  behavior_summary: string;
  preview_summary: string;
  music_profile: MusicProfile;
}

export interface ApiError {
  error: string;
}

export interface GenreMatch {
  key: string;
  name: string;
  emoji: string;
  score: number;
  artists: string[];
  soundDesc: string;
}

export interface SoundProfile {
  tempo: '慢速' | '中速' | '快速';
  intensity: '柔和' | '平衡' | '強烈';
  emotionDepth: '輕盈' | '中層' | '深層';
  structure: '自由' | '流動' | '規律';
}

export interface MusicProfile {
  topGenres: GenreMatch[];
  allGenres: GenreMatch[];
  soundProfile: SoundProfile;
  listeningSummary: string;
}

/* ────────────────────────────────────────────
   天地人 AI 人格音樂系統 V1.0 - 新增類型定義
   ──────────────────────────────────────────── */

export interface PersonalityMatrixData {
  emotion: number;
  logic: number;
  social: number;
  leadership: number;
  security: number;
  creativity: number;
  risk: number;
  attachment: number;
}

export interface MusicParametersData {
  bpm: number;
  key: string;
  genre: string;
  mood: string[];
  vocal_style: string;
  instrument: string[];
  lyric_theme: string[];
}

export interface AIPersonalityMusicInput {
  birthDate: string;
  zodiacSign: string;
  gender: "male" | "female" | "non-binary";
  bloodType: "A" | "B" | "AB" | "O";
  firstName: string;
  lastName?: string;
  voiceCharacteristics?: string[];
  era?: string;
}

export interface AIPersonalityMusicReport {
  input: {
    birthDate: string;
    zodiac: string;
    gender: string;
    bloodType: string;
    name: string;
  };
  personality_matrix: PersonalityMatrixData;
  music_parameters: MusicParametersData;
  interpretation: {
    dominant_trait: string;
    emotional_signature: string;
    creative_potential: number;
    social_capacity: number;
    life_philosophy: string;
  };
  ai_note: string;
}
