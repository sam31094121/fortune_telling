/**
 * 阿修羅最終組合器 — AsuraFinalComposer
 *
 * 責任：
 * - 收納 17 個子模組的各層結果
 * - 組合成完整的 AsuraInterpretation
 * - 驗證完整性（四層必須齊全）
 * - 禁止空殼、禁止佔位字、禁止 Silent Failure
 *
 * 規範依據：
 * - #11 既有人工話術永遠優先
 * - #12 禁止空殼
 * - #13 Resolver 必須唯一
 * - #14 Fail Closed，不准 Silent Failure
 */

import type { AsuraInterpretation, CompletionStatus } from './ghost-asura-master-skill';

/**
 * 各層的組成部分（由子模組產出）
 */
export interface AsuraCompositionLayers {
  // FACT_LAYER — Identity + Evidence 模組
  factLayer: {
    asuraId: string;
    displayName: string;
    sourceId: string;
    evidenceHash: string;
  };

  // MEANING_LAYER — Dictionary + Meaning 模組
  meaningLayer: {
    meaningStrong: string | null;
    coreMeaning: string | null;
    battleSignificance: string | null;
  };

  // PERSONALITY_LAYER — Personality + GenderExpression 模組
  personalityLayer: {
    genderProfile?: string | null;
    personalityMarks?: string[];
    timeContexts?: string[];
  };

  // EXPRESSION_LAYER — Tone + Temper + Narrative 模組
  expressionLayer: {
    toneChoice: 'direct' | 'authoritative' | 'confrontational' | 'cold' | 'fierce';
    temperStrength: 0 | 1 | 2 | 3; // 0=溫和, 1=中立, 2=尖銳, 3=罵醒
    approvedNarrative?: string | null; // 優先：人工核准話術
    generatedNarrative?: string | null; // 次優：Skill 生成
  };
}

/**
 * 組合結果驗證
 */
export interface CompositionValidation {
  isValid: boolean;
  completion: CompletionStatus;
  issues: {
    missingFactLayer: string[];
    missingMeaningLayer: string[];
    circularReferences: string[];
    placeholderDetected: string[];
    leakedTerminology: string[];
  };
}

/**
 * AsuraFinalComposer — 組合所有層級成最終解釋
 */
export class AsuraFinalComposer {
  /**
   * 組合所有層級
   *
   * 優先順序（規範 #11）：
   * 1. 人工核准專屬話術
   * 2. Skill 母版話術
   * 3. 字典＋模板生成
   * 4. Evidence 驅動生成
   *
   * 禁止生成器覆蓋人工話術
   */
  static compose(layers: AsuraCompositionLayers, skillVersion: string): AsuraInterpretation {
    // Step 1: 驗證必要層
    this.validateFactLayer(layers.factLayer);

    // Step 2: 組合意義層（FACT_LAYER）
    const { asuraId, displayName, sourceId, evidenceHash } = layers.factLayer;

    // Step 3: 決定最終話術（優先順序）
    const finalAdvice =
      layers.expressionLayer.approvedNarrative ||
      layers.expressionLayer.generatedNarrative ||
      '';

    // Step 4: 驗證完整性
    const validation = this.validateComposition({
      ...layers,
      expressionLayer: {
        ...layers.expressionLayer,
        approvedNarrative: layers.expressionLayer.approvedNarrative || finalAdvice,
      },
    }, skillVersion);

    if (!validation.isValid) {
      throw new Error(
        `Composition validation failed: ${validation.issues.placeholderDetected.join(', ')}`
      );
    }

    // Step 5: 組合成最終解釋
    const interpretation: AsuraInterpretation = {
      asuraId,
      displayName,
      sourceId,
      meaningStrong: layers.meaningLayer.meaningStrong,
      coreMeaning: layers.meaningLayer.coreMeaning,
      battleSignificance: layers.meaningLayer.battleSignificance,
      advice: finalAdvice || null,
      timestamp: Date.now(),
      skillVersion,
      determinismSeed: `${asuraId}:${sourceId}:${evidenceHash}`,
    };

    return interpretation;
  }

  /**
   * 驗證 FACT_LAYER 必要字段
   */
  private static validateFactLayer(factLayer: AsuraCompositionLayers['factLayer']): void {
    const errors: string[] = [];

    if (!factLayer.asuraId) errors.push('asuraId missing');
    if (!factLayer.displayName) errors.push('displayName missing');
    if (!factLayer.sourceId) errors.push('sourceId missing');
    if (!factLayer.evidenceHash) errors.push('evidenceHash missing');

    if (errors.length > 0) {
      throw new Error(`FACT_LAYER validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * 驗證整個組合的完整性
   *
   * 規範 #12：禁止空殼
   * 必須有：asuraId + displayName + meaningStrong/coreMeaning/battleSignificance + advice
   * 缺任何必要項：INVALID，不得 Render
   */
  private static validateComposition(
    layers: AsuraCompositionLayers,
    skillVersion: string,
  ): CompositionValidation {
    const issues = {
      missingFactLayer: [] as string[],
      missingMeaningLayer: [] as string[],
      circularReferences: [] as string[],
      placeholderDetected: [] as string[],
      leakedTerminology: [] as string[],
    };

    const { factLayer, meaningLayer, expressionLayer } = layers;

    // 驗證 FACT_LAYER
    if (!factLayer.asuraId) issues.missingFactLayer.push('asuraId');
    if (!factLayer.displayName) issues.missingFactLayer.push('displayName');

    // 驗證 MEANING_LAYER（至少一項）
    const hasMeaning =
      factLayer.asuraId &&
      factLayer.displayName &&
      (meaningLayer.meaningStrong ||
        meaningLayer.coreMeaning ||
        meaningLayer.battleSignificance);

    if (!hasMeaning) {
      issues.missingMeaningLayer.push(
        'meaningStrong, coreMeaning, or battleSignificance required'
      );
    }

    // 檢查佔位字（禁止）
    const PLACEHOLDER_PATTERNS = [
      '此域暫無可用判讀',
      '待校核',
      '待補',
      '尚未定案',
      '未知',
      '暫無',
    ];

    const checkForPlaceholder = (text: string | null | undefined, field: string) => {
      if (!text) return;
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (text.includes(pattern)) {
          issues.placeholderDetected.push(`${field} contains placeholder: "${pattern}"`);
        }
      }
    };

    checkForPlaceholder(meaningLayer.meaningStrong, 'meaningStrong');
    checkForPlaceholder(meaningLayer.coreMeaning, 'coreMeaning');
    checkForPlaceholder(meaningLayer.battleSignificance, 'battleSignificance');
    checkForPlaceholder(expressionLayer.approvedNarrative, 'approvedNarrative');
    checkForPlaceholder(expressionLayer.generatedNarrative, 'generatedNarrative');

    // 檢查洩漏術語（前端禁止顯示命理術語）
    const LEAKED_TERMS = [
      '十神',
      '星曜',
      '宮位',
      '四化',
      '合沖刑害破',
      '八字',
      '紫微',
      '易經',
      '干支',
      '十天干',
      '十二地支',
    ];

    const checkForLeak = (text: string | null | undefined, field: string) => {
      if (!text) return;
      for (const term of LEAKED_TERMS) {
        if (text.includes(term)) {
          issues.leakedTerminology.push(`${field} leaked term: "${term}"`);
        }
      }
    };

    checkForLeak(meaningLayer.meaningStrong, 'meaningStrong');
    checkForLeak(meaningLayer.coreMeaning, 'coreMeaning');
    checkForLeak(meaningLayer.battleSignificance, 'battleSignificance');
    checkForLeak(expressionLayer.approvedNarrative, 'approvedNarrative');

    const completion = this.getCompletion(layers);

    const isValid =
      issues.missingFactLayer.length === 0 &&
      issues.missingMeaningLayer.length === 0 &&
      issues.placeholderDetected.length === 0 &&
      issues.leakedTerminology.length === 0 &&
      completion.isComplete;

    return {
      isValid,
      completion,
      issues,
    };
  }

  /**
   * 獲取完整性狀態
   */
  private static getCompletion(layers: AsuraCompositionLayers): CompletionStatus {
    const { meaningLayer, expressionLayer } = layers;

    return {
      hasAsuraId: Boolean(layers.factLayer.asuraId),
      hasDisplayName: Boolean(layers.factLayer.displayName),
      hasMeaningStrong: Boolean(meaningLayer.meaningStrong),
      hasCoreMeaning: Boolean(meaningLayer.coreMeaning),
      hasBattleSignificance: Boolean(meaningLayer.battleSignificance),
      hasAdvice: Boolean(
        expressionLayer.approvedNarrative || expressionLayer.generatedNarrative
      ),
      isComplete:
        Boolean(layers.factLayer.asuraId) &&
        Boolean(layers.factLayer.displayName) &&
        (Boolean(meaningLayer.meaningStrong) ||
          Boolean(meaningLayer.coreMeaning) ||
          Boolean(meaningLayer.battleSignificance)) &&
        Boolean(expressionLayer.approvedNarrative || expressionLayer.generatedNarrative),
    };
  }

  /**
   * 防止同 ID 互相覆蓋（規範 #7）
   * 建立 renderKey = asuraId + column + occurrenceIndex + evidenceHash
   */
  static createRenderKey(
    asuraId: string,
    column: string,
    occurrenceIndex: number,
    evidenceHash: string,
  ): string {
    return `${asuraId}:${column}:${occurrenceIndex}:${evidenceHash}`;
  }
}

/**
 * 默認導出
 */
export const createAsuraFinalComposer = () => AsuraFinalComposer;
