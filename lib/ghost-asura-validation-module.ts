/**
 * 模組 13：Validation — 四層驗證
 *
 * 規範 #12：禁止空殼
 * 任何顯示中的印記必須有：asuraId + displayName + meaningStrong + coreMeaning + battleSignificance
 * 缺任何必要項：INVALID，不得 Render
 *
 * 四層驗證：
 * 1. FACT_LAYER — asuraId + displayName + sourceId + evidence
 * 2. MEANING_LAYER — meaningStrong + coreMeaning + battleSignificance
 * 3. PERSONALITY_LAYER — 人格個人化（可選）
 * 4. EXPRESSION_LAYER — advice + tone（可選但推薦）
 */

import type { AsuraInterpretation } from './ghost-asura-master-skill';
import type { AsuraSkillEntry } from './ghost-asura-interpretation-resolver';

/**
 * 驗證狀態
 */
export enum ValidationStatus {
  VALID = 'VALID',
  PARTIAL = 'PARTIAL',      // 核心四層不完整，但可補救
  INVALID = 'INVALID',      // 無法救
  BLOCKED = 'BLOCKED',      // 包含禁止內容
}

/**
 * 驗證結果
 */
export interface ValidationResult {
  status: ValidationStatus;
  asuraId: string;
  displayName: string | null;
  layers: {
    fact: {
      isValid: boolean;
      missing: string[];
      issues: string[];
    };
    meaning: {
      isValid: boolean;
      missing: string[];
      issues: string[];
    };
    personality: {
      isValid: boolean;
      missing: string[];
      issues: string[];
    };
    expression: {
      isValid: boolean;
      missing: string[];
      issues: string[];
    };
  };
  placeholders: string[];
  leakedTerms: string[];
  completionPercentage: number;
}

/**
 * 驗證模組
 */
export class GhostAsuraValidationModule {
  /**
   * 禁止的佔位字
   */
  private static readonly PLACEHOLDER_TEXTS = [
    '此域暫無可用判讀',
    '待校核',
    '待補',
    '尚未定案',
    '未知',
    '暫無',
    '缺少話術',
    '尚未補齊',
  ];

  /**
   * 前端禁止洩漏的命理術語
   */
  private static readonly LEAKED_TERMS = [
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
    '納甲',
    '爻位',
    '沙參斗君',
    '宮幡',
  ];

  /**
   * 主驗證方法
   */
  static validate(interpretation: AsuraInterpretation | AsuraSkillEntry): ValidationResult {
    const result: ValidationResult = {
      status: ValidationStatus.VALID,
      asuraId: interpretation.asuraId,
      displayName: interpretation.displayName || null,
      layers: {
        fact: { isValid: true, missing: [], issues: [] },
        meaning: { isValid: true, missing: [], issues: [] },
        personality: { isValid: true, missing: [], issues: [] },
        expression: { isValid: true, missing: [], issues: [] },
      },
      placeholders: [],
      leakedTerms: [],
      completionPercentage: 0,
    };

    // Step 1: 驗證 FACT_LAYER
    this.validateFactLayer(interpretation, result);

    // Step 2: 驗證 MEANING_LAYER
    this.validateMeaningLayer(interpretation, result);

    // Step 3: 驗證 PERSONALITY_LAYER（可選但推薦）
    this.validatePersonalityLayer(interpretation, result);

    // Step 4: 驗證 EXPRESSION_LAYER（可選但推薦）
    this.validateExpressionLayer(interpretation, result);

    // Step 5: 檢查禁止內容
    this.checkForPlaceholders(interpretation, result);
    this.checkForLeakedTerms(interpretation, result);

    // Step 6: 決定最終狀態
    this.determineStatus(result);

    // Step 7: 計算完成度
    this.calculateCompletion(result);

    return result;
  }

  /**
   * 驗證 FACT_LAYER
   * 必須有：asuraId + displayName + sourceId（推斷）
   */
  private static validateFactLayer(
    interp: AsuraInterpretation | AsuraSkillEntry,
    result: ValidationResult,
  ): void {
    const layer = result.layers.fact;

    if (!interp.asuraId) {
      layer.missing.push('asuraId');
      layer.isValid = false;
    }

    if (!interp.displayName) {
      layer.missing.push('displayName');
      layer.isValid = false;
    }

    if ('sourceId' in interp && !interp.sourceId) {
      layer.missing.push('sourceId');
      layer.isValid = false;
    }
  }

  /**
   * 驗證 MEANING_LAYER
   * 規範 #12：禁止空殼 — 必須三項齊全
   * 必須有：meaningStrong + coreMeaning + battleSignificance（全部必須有）
   */
  private static validateMeaningLayer(
    interp: AsuraInterpretation | AsuraSkillEntry,
    result: ValidationResult,
  ): void {
    const layer = result.layers.meaning;
    const hasMeaningStrong = !!interp.meaningStrong;
    const hasCoreMeaning = !!interp.coreMeaning;
    const hasBattleSignificance = !!interp.battleSignificance;

    if (!hasMeaningStrong) layer.missing.push('meaningStrong');
    if (!hasCoreMeaning) layer.missing.push('coreMeaning');
    if (!hasBattleSignificance) layer.missing.push('battleSignificance');

    // 規範 #12：禁止空殼 — 必須三項全齐
    // 只要缺少任何一項，就算無效
    if (!hasMeaningStrong || !hasCoreMeaning || !hasBattleSignificance) {
      layer.isValid = false;
      layer.issues.push(`意義層缺失：${layer.missing.join(', ')} — 禁止空殼`);
    }
  }

  /**
   * 驗證 PERSONALITY_LAYER（可選）
   */
  private static validatePersonalityLayer(
    interp: AsuraInterpretation | AsuraSkillEntry,
    result: ValidationResult,
  ): void {
    const layer = result.layers.personality;

    // 這層目前是可選的，但檢查是否有任何人格化的內容
    // 實際實現時由 Personality 模組補充
    if (!('personalityMarks' in interp)) {
      // 保留給未來的人格化數據
    }
  }

  /**
   * 驗證 EXPRESSION_LAYER（可選但推薦）
   */
  private static validateExpressionLayer(
    interp: AsuraInterpretation | AsuraSkillEntry,
    result: ValidationResult,
  ): void {
    const layer = result.layers.expression;

    if (!interp.advice) {
      layer.missing.push('advice');
      // 這不是致命的，但記錄下來
    }

    // 檢查話術品質
    if (interp.advice && interp.advice.length < 5) {
      layer.issues.push('advice 內容過短，可能不完整');
    }
  }

  /**
   * 檢查禁止的佔位字
   */
  private static checkForPlaceholders(
    interp: AsuraInterpretation | AsuraSkillEntry,
    result: ValidationResult,
  ): void {
    const fieldsToCheck = [
      interp.meaningStrong,
      interp.coreMeaning,
      interp.battleSignificance,
      interp.advice,
    ].filter(Boolean) as string[];

    for (const field of fieldsToCheck) {
      for (const placeholder of this.PLACEHOLDER_TEXTS) {
        if (field.includes(placeholder)) {
          result.placeholders.push(placeholder);
        }
      }
    }

    if (result.placeholders.length > 0) {
      result.status = ValidationStatus.BLOCKED;
    }
  }

  /**
   * 檢查洩漏的術語
   */
  private static checkForLeakedTerms(
    interp: AsuraInterpretation | AsuraSkillEntry,
    result: ValidationResult,
  ): void {
    const fieldsToCheck = [
      interp.meaningStrong,
      interp.coreMeaning,
      interp.battleSignificance,
      interp.advice,
    ].filter(Boolean) as string[];

    for (const field of fieldsToCheck) {
      for (const term of this.LEAKED_TERMS) {
        if (field.includes(term)) {
          result.leakedTerms.push(term);
        }
      }
    }

    if (result.leakedTerms.length > 0) {
      result.status = ValidationStatus.BLOCKED;
    }
  }

  /**
   * 決定最終驗證狀態
   */
  private static determineStatus(result: ValidationResult): void {
    // 如果包含禁止內容，直接 BLOCKED
    if (result.placeholders.length > 0 || result.leakedTerms.length > 0) {
      result.status = ValidationStatus.BLOCKED;
      return;
    }

    // 檢查核心層是否完整
    const factValid = result.layers.fact.isValid;
    const meaningValid = result.layers.meaning.isValid;

    if (!factValid || !meaningValid) {
      result.status = ValidationStatus.INVALID;
      return;
    }

    // 如果表達層缺失，降級為 PARTIAL
    if (!result.layers.expression.isValid && result.layers.expression.missing.length > 0) {
      result.status = ValidationStatus.PARTIAL;
      return;
    }

    result.status = ValidationStatus.VALID;
  }

  /**
   * 計算完成度百分比
   */
  private static calculateCompletion(result: ValidationResult): void {
    const totalFields = 10; // 4 層 × 2-3 個字段
    const completedFields = totalFields -
      result.layers.fact.missing.length -
      result.layers.meaning.missing.length -
      result.layers.personality.missing.length -
      result.layers.expression.missing.length;

    result.completionPercentage = Math.round((completedFields / totalFields) * 100);
  }

  /**
   * 批量驗證
   */
  static validateBatch(interpretations: (AsuraInterpretation | AsuraSkillEntry)[]): {
    total: number;
    valid: number;
    partial: number;
    invalid: number;
    blocked: number;
    details: ValidationResult[];
  } {
    const results = interpretations.map(i => this.validate(i));

    return {
      total: results.length,
      valid: results.filter(r => r.status === ValidationStatus.VALID).length,
      partial: results.filter(r => r.status === ValidationStatus.PARTIAL).length,
      invalid: results.filter(r => r.status === ValidationStatus.INVALID).length,
      blocked: results.filter(r => r.status === ValidationStatus.BLOCKED).length,
      details: results,
    };
  }

  /**
   * 快速驗證（只檢查致命缺陷）
   */
  static isRenderSafe(interpretation: AsuraInterpretation | AsuraSkillEntry): boolean {
    const result = this.validate(interpretation);
    return result.status === ValidationStatus.VALID;
  }
}

/**
 * 導出
 */
export const validateAsuraInterpretation = (
  interpretation: AsuraInterpretation | AsuraSkillEntry,
): ValidationResult => {
  return GhostAsuraValidationModule.validate(interpretation);
};

export const isRenderSafe = (
  interpretation: AsuraInterpretation | AsuraSkillEntry,
): boolean => {
  return GhostAsuraValidationModule.isRenderSafe(interpretation);
};
