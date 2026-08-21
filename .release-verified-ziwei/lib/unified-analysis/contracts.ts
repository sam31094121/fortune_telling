export type EngineStatus = 'COMPLETED' | 'FAILED' | 'BLOCKED';

export interface EngineVerification {
  inputVerified: boolean;
  engineCompleted: boolean;
  resultComplete: boolean;
  blockedReason?: string;
}

export interface EngineResult<TData, TSignals> {
  moduleId: string;
  engineVersion: string;
  status: EngineStatus;
  professionalData: TData;
  integrationSignals: TSignals;
  verification: EngineVerification;
}

export interface AnalysisEngine<TInput, TData, TSignals> {
  validate(input: TInput): Promise<void> | void;
  execute(input: TInput): Promise<EngineResult<TData, TSignals>>;
}
