import { integrateSignals } from './integration-engine';
import { resolveZiweiAnalysisMode, validateUnifiedAnalysisRequest, type UnifiedAnalysisRequest, type ZiweiAnalysisMode } from './types';
import type { EngineResult } from './contracts';
import type { IntegratedTheme, IntegrationSignal } from './integration-types';

type ProfessionalEngineResult = EngineResult<unknown, IntegrationSignal[]>;

export interface UnifiedInterpretationResult {
  layer1: {
    coreJudgment: string;
    coreObstacle: string;
    firstDirection: string;
    immediateAction: string;
  };
  layer2: {
    consensus: string[];
    uniqueInsights: string[];
    conflicts: string[];
    evidence: string[];
  };
  layer3?: {
    professionalSummary: string;
    evidenceRefs: string[];
  };
}

export interface UnifiedAnalysisOutput {
  analysisId: string;
  engineVersion: 'unified_analysis_v1';
  status: 'COMPLETED';
  subjectType: UnifiedAnalysisRequest['subjectType'];
  ziweiAnalysisMode: ZiweiAnalysisMode;
  professionalResults: {
    name: unknown;
    bazi: unknown;
    ziwei: unknown;
  };
  integratedThemes: IntegratedTheme[];
  interpretation: UnifiedInterpretationResult;
  verification: {
    deterministicEnginesCompleted: boolean;
    aiRanAfterDeterministicEngines: boolean;
    noGuessingMode: boolean;
    persisted: boolean;
  };
}

export interface UnifiedAnalysisDependencies {
  nameEngine: {
    execute(input: UnifiedAnalysisRequest): Promise<ProfessionalEngineResult>;
  };
  baziEngine: {
    execute(input: UnifiedAnalysisRequest): Promise<ProfessionalEngineResult>;
  };
  ziweiEngine: {
    execute(input: UnifiedAnalysisRequest): Promise<ProfessionalEngineResult & { analysisMode?: ZiweiAnalysisMode }>;
  };
  interpretationEngine: {
    create(input: {
      request: UnifiedAnalysisRequest;
      themes: IntegratedTheme[];
      professionalResults: UnifiedAnalysisOutput['professionalResults'];
      ziweiAnalysisMode: ZiweiAnalysisMode;
    }): Promise<UnifiedInterpretationResult>;
  };
  persist(result: UnifiedAnalysisOutput): Promise<void>;
}

function createAnalysisId() {
  return globalThis.crypto?.randomUUID?.() ?? `unified_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function assertEngineCompleted(label: string, result: ProfessionalEngineResult): void {
  if (result.status !== 'COMPLETED' || !result.verification.engineCompleted || !result.verification.resultComplete) {
    throw new Error(`${label}_ENGINE_INCOMPLETE`);
  }
}

export class UnifiedAnalysisOrchestrator {
  constructor(private readonly dependencies: UnifiedAnalysisDependencies) {}

  async execute(request: UnifiedAnalysisRequest): Promise<UnifiedAnalysisOutput> {
    validateUnifiedAnalysisRequest(request);

    const requestedZiweiMode = resolveZiweiAnalysisMode(request.birth);

    const nameResult = await this.dependencies.nameEngine.execute(request);
    assertEngineCompleted('NAME_ANALYSIS', nameResult);

    const baziResult = await this.dependencies.baziEngine.execute(request);
    assertEngineCompleted('BAZI', baziResult);

    const ziweiResult = await this.dependencies.ziweiEngine.execute(request);
    assertEngineCompleted('ZIWEI', ziweiResult);

    const ziweiAnalysisMode = ziweiResult.analysisMode ?? requestedZiweiMode;
    const professionalResults = {
      name: nameResult.professionalData,
      bazi: baziResult.professionalData,
      ziwei: ziweiResult.professionalData,
    };

    const integratedThemes = integrateSignals([
      ...nameResult.integrationSignals,
      ...baziResult.integrationSignals,
      ...ziweiResult.integrationSignals,
    ]);

    const interpretation = await this.dependencies.interpretationEngine.create({
      request,
      themes: integratedThemes,
      professionalResults,
      ziweiAnalysisMode,
    });

    const output: UnifiedAnalysisOutput = {
      analysisId: createAnalysisId(),
      engineVersion: 'unified_analysis_v1',
      status: 'COMPLETED',
      subjectType: request.subjectType,
      ziweiAnalysisMode,
      professionalResults,
      integratedThemes,
      interpretation,
      verification: {
        deterministicEnginesCompleted: true,
        aiRanAfterDeterministicEngines: true,
        noGuessingMode: ziweiAnalysisMode === 'FULL_CHART' || request.birth.birthTimePrecision === 'UNKNOWN',
        persisted: false,
      },
    };

    await this.dependencies.persist(output);

    return {
      ...output,
      verification: {
        ...output.verification,
        persisted: true,
      },
    };
  }
}
