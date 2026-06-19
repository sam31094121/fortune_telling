export type BloodType = '' | 'A' | 'B' | 'AB' | 'O';
export type Gender = 'male' | 'female';

// ── 天地人 V5.0 人格解碼系統 ──────────────────────

/**
 * 第一階段：生日輸入
 * 完成度 35% - 啟動天之人格
 */
export interface Step1_BirthdayInput {
  birthday: string; // YYYY-MM-DD
}

/**
 * 第二階段：血型輸入
 * 完成度 70% - 地之人格融合
 */
export interface Step2_BloodTypeInput extends Step1_BirthdayInput {
  bloodType: Exclude<BloodType, ''>;
}

/**
 * 第三階段：姓名 + 性別輸入
 * 完成度 100% - 人之人格完成
 */
export interface Step3_PersonInput extends Step2_BloodTypeInput {
  name: string;
  gender: Gender;
}

// 向後相容
export interface PersonInput extends Step3_PersonInput {}

export interface AnalyzeRequest {
  person: PersonInput;
}

export interface PreviewRequest {
  birthday: string;
  bloodType: Exclude<BloodType, ''>;
}

// ── 人格矩陣：12 個固定維度 ──────────────────────
// 名稱對照：中文 → 英文代碼

export const DIMENSION_KEYS = [
  'emotion',      // 情緒敏感度
  'logic',        // 理性程度
  'social',       // 社交需求
  'leadership',   // 領導傾向
  'security',     // 安全感需求
  'execution',    // 執行力
  'creativity',   // 創造力
  'empathy',      // 同理心
  'risk',         // 冒險傾向
  'control',      // 控制傾向
  'wealth',       // 財富動機
  'attachment',   // 情感依附
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export type DimensionScores = Record<DimensionKey, number>;
export type DimensionAdjustments = Record<DimensionKey, number>;

export interface AnalysisResult {
  resonance_score: number;
  base_scores: DimensionScores;
  blood_adjustments: DimensionAdjustments;
  name_adjustments: DimensionAdjustments;
  final_scores: DimensionScores;
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
  music_profile: MusicProfile;
  wisdom_perspective: string;
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

// ── Music Profile ──────────────────────────────────────────────

export interface GenreMatch {
  key: string;
  name: string;
  emoji: string;
  score: number;      // 0-100 affinity score
  artists: string[];
  soundDesc: string;
}

export interface SoundProfile {
  tempo: '快節奏' | '適中' | '慢節奏';
  intensity: '高張力' | '平衡' | '輕柔';
  emotionDepth: '情感濃郁' | '情感適中' | '清爽理性';
  structure: '結構複雜' | '層次分明' | '簡潔直覺';
}

export interface MusicProfile {
  topGenres: GenreMatch[];     // top 3 by affinity
  allGenres: GenreMatch[];     // all 10, sorted
  soundProfile: SoundProfile;
  listeningSummary: string;
}
