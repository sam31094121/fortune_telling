/**
 * 紫微三老師系統｜核心型別（2026-08-22）
 *
 * 依業主規格書「七、八、九、十」逐字建立，不額外發明欄位。
 * 這裡只是型別，不含任何排盤或 AI 呼叫邏輯。
 */

export type TeacherId = 'STRUCTURE_MASTER' | 'LIFE_MASTER' | 'NARRATIVE_MASTER';

export type PalaceId =
  | 'LIFE'
  | 'SIBLINGS'
  | 'SPOUSE'
  | 'CHILDREN'
  | 'WEALTH'
  | 'HEALTH'
  | 'TRAVEL'
  | 'FRIENDS'
  | 'CAREER'
  | 'PROPERTY'
  | 'FORTUNE'
  | 'PARENTS';

export interface ZiweiStar {
  id: string;
  name: string;
  category: 'MAJOR' | 'SUPPORTING' | 'MALEFIC';
}

export interface ZiweiTransformation {
  starId: string;
  starName: string;
  type: 'LU' | 'QUAN' | 'KE' | 'JI';
}

export interface PalaceSnapshot {
  palaceId: PalaceId;
  palaceName: string;

  majorStars: ZiweiStar[];
  supportingStars: ZiweiStar[];
  maleficStars: ZiweiStar[];

  transformations: ZiweiTransformation[];
}

export interface PalaceAnalysisContext {
  analysisId: string;

  selectedPalace: PalaceSnapshot;

  threeHarmony: {
    harmonyA: PalaceSnapshot;
    harmonyB: PalaceSnapshot;
    opposite: PalaceSnapshot;
  };

  timeContext: {
    currentAge: number | null;
    annualYear: number;
    annualTheme: string | null;
    annualLevel: string | null;
    readingPeriod: 'YANG_DAY' | 'YIN_NIGHT';
    readingPeriodLabel: string;
    observedAt: string;
  };

  decadeSignals: unknown[];
  annualSignals: unknown[];

  engineVersion: string;

  verified: boolean;
}

/* ---------------- 老師輸出（規格「八、九、十」） ---------------- */

export interface StructureTeacherResult {
  teacherId: 'STRUCTURE_MASTER';

  palace: string;

  corePattern: string;
  primaryStarSynthesis: string;
  threeHarmonySynthesis: string;
  transformationEffect: string;
  importantSupportingStars: string[];
  structuralStrength: string;
  structuralPressure: string;
  conclusion: string;

  evidenceRefs: string[];
}

export interface LifeTeacherResult {
  teacherId: 'LIFE_MASTER';

  lifeMeaning: string;
  strengthInReality: string;
  repeatedPattern: string;
  blindSpot: string;
  decisionStyle: string;
  relationshipWithEnvironment: string;
  practicalDirection: string;

  evidenceRefs: string[];
}

export interface NarrativeTeacherResult {
  teacherId: 'NARRATIVE_MASTER';

  visualTitle: string;
  scene: string;
  mainCharacter: string;
  symbols: Array<{ symbol: string; meaning: string; sourceRef: string }>;
  story: string;
  finalMetaphor: string;

  evidenceRefs: string[];
}

export type TeacherResult = StructureTeacherResult | LifeTeacherResult | NarrativeTeacherResult;

/* ---------------- 老師共識（規格「十二」） ---------------- */

export interface TeacherConsensus {
  palaceId: PalaceId;

  consensus: {
    coreStrength: string;
    coreChallenge: string;
    firstDirection: string;
  };

  differences: Array<{ teacher: TeacherId; insight: string }>;

  evidenceRefs: string[];
  verified: boolean;
}

/** INSUFFICIENT_DATA（規格「二十」）：資料不足時老師必須明確回這個，不得補故事假裝完整 */
export const INSUFFICIENT_DATA = 'INSUFFICIENT_DATA' as const;
