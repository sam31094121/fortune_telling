export type BloodType = '' | 'A' | 'B' | 'AB' | 'O';

export interface PersonInput {
  name: string;
  bloodType: BloodType;
  birthday: string;
}

export interface AnalyzeRequest {
  person: PersonInput;
}

export interface PreviewRequest {
  birthday: string;
  bloodType: Exclude<BloodType, ''>;
}

export const DIMENSION_KEYS = [
  'emotion_sensitivity',
  'logic',
  'social_need',
  'leadership',
  'risk_tendency',
  'execution',
  'creativity',
  'empathy',
  'control',
  'security_need',
  'wealth_motivation',
  'attachment',
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
  skeleton_summary: string;
  behavior_summary: string;
  individuality_summary: string;
  final_summary: string;
  wealth_motivation_summary: string;
  love_pattern_summary: string;
  blind_spot_summary: string;
  life_advantage_summary: string;
}

export interface PreviewAnalysisResult {
  preview_score: number;
  base_scores: DimensionScores;
  blood_adjustments: DimensionAdjustments;
  preview_scores: DimensionScores;
  skeleton_summary: string;
  behavior_summary: string;
  preview_summary: string;
}

export interface ApiError {
  error: string;
}
