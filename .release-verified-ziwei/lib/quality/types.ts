export type CardId =
  | 'CARD_01'
  | 'CARD_02'
  | 'CARD_03'
  | 'CARD_04'
  | 'CARD_05'
  | 'CARD_06'
  | 'CARD_07'
  | 'CARD_08'
  | 'CARD_09';

export type QualityDimension =
  | 'FUNCTIONALITY'
  | 'ACCURACY'
  | 'MOBILE_UX'
  | 'STABILITY'
  | 'CONTENT_QUALITY'
  | 'PERFORMANCE'
  | 'TRACEABILITY';

export type Severity = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
export type TestStatus = 'PASSED' | 'FAILED' | 'NOT_TESTED' | 'BLOCKED';
export type QualityTier = 'UNRATED' | 'STANDARD' | 'REFINED' | 'SIGNATURE';

export interface QualityIssue {
  id: string;
  cardId: CardId;
  severity: Severity;
  layer: 'FRONTEND' | 'INTERACTION' | 'API' | 'BACKEND' | 'ENGINE' | 'DATABASE' | 'INTEGRATION' | 'PERFORMANCE';
  step: string;
  actualProblem: string;
  rootCause: string;
  filePaths: string[];
  repairAction: string;
  verificationAction: string;
}

export interface DimensionScore {
  dimension: QualityDimension;
  score: number;
  maxScore: number;
  status: TestStatus;
  evidenceIds: string[];
}

export interface CardQualityReport {
  cardId: CardId;
  cardName: string;
  dimensions: DimensionScore[];
  issues: QualityIssue[];
  totalScore: number;
  tier: QualityTier;
  mandatoryChecks: {
    fullFlowPassed: boolean;
    backendVerified: boolean;
    mobilePassed: boolean;
    linePassed: boolean;
    noCriticalIssues: boolean;
    regressionPassed: boolean;
  };
  allowNextCard: boolean;
  generatedAt: string;
}