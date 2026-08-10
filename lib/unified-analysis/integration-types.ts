export type SourceModule = 'NAME_ANALYSIS' | 'BAZI' | 'ZIWEI';

export type SignalDimension =
  | 'ACTION'
  | 'STABILITY'
  | 'DECISION'
  | 'COMMUNICATION'
  | 'RELATIONSHIP'
  | 'CREATIVITY'
  | 'DISCIPLINE'
  | 'EMOTION'
  | 'LEADERSHIP'
  | 'RESOURCE';

export type SignalDirection = 'STRENGTH' | 'CHALLENGE' | 'NEUTRAL';

export interface IntegrationSignal {
  id: string;
  sourceModule: SourceModule;
  dimension: SignalDimension;
  direction: SignalDirection;
  weight: number;
  confidence: number;
  summary: string;
  evidenceRefs: string[];
}

export interface IntegratedTheme {
  dimension: SignalDimension;
  classification: 'CONSENSUS' | 'UNIQUE' | 'CONFLICT';
  sources: SourceModule[];
  strength: number;
  confidence: number;
  summaries: string[];
  evidenceRefs: string[];
}
