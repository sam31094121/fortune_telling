/**
 * 模組 15：Coverage — 覆蓋率審計
 *
 * 規範 #16：所有可能項目自動掃描
 * 禁止人工逐張打開檢查。
 *
 * 規範 #15：Coverage 不只檢查「有名稱」
 * 必須驗：Mapped + SkillEntry + CoreMeaning + NarrativeResolvable + BattleLineResolvable + FrontendSafe
 *
 * 規範 #18：命中數 = 完成數
 * hitCount = resolvedCount
 */

import { GhostAsuraInterpretationResolver, type AsuraSkillEntry } from './ghost-asura-interpretation-resolver';
import { GhostAsuraValidationModule, ValidationStatus } from './ghost-asura-validation-module';
import { COMPLETE_ASURA_DICTIONARY } from './ghost-asura-complete-dictionary';

/**
 * 覆蓋率審計結果
 */
export interface CoverageAuditResult {
  timestamp: number;
  skillVersion: string;

  // 計數
  totalAsuraIds: number;
  mapped: number;               // 有 Skill Entry
  complete: number;             // Skill Entry 完整（四層齊全）
  incomplete: number;           // Skill Entry 缺少某層
  broken: number;               // Skill Entry 無法通過驗證

  // 詳細列表
  incompleteIds: string[];
  brokenIds: string[];
  duplicateIds: string[];
  leakedTerminologyIds: string[];

  // 統計
  completionPercentage: number; // complete / totalAsuraIds × 100
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';

  // 詳細報告
  details: Map<string, {
    asuraId: string;
    displayName: string | null;
    status: 'complete' | 'incomplete' | 'broken';
    issues: string[];
    completionPercentage: number;
  }>;
}

/**
 * 覆蓋率審計模組
 */
export class GhostAsuraCoverageAudit {
  /**
   * 執行完整審計
   *
   * 規範 #15 要求驗證六項：
   * 1. Mapped — asuraId 有對應的 Skill Entry
   * 2. SkillEntry — 條目存在
   * 3. CoreMeaning — 核心意義有內容
   * 4. NarrativeResolvable — 話術可解析
   * 5. BattleLineResolvable — 戰鬥線可解析
   * 6. FrontendSafe — 前端安全（無洩露術語、無佔位字）
   */
  static async runAudit(
    skillVersion: string = '2.0.0',
  ): Promise<CoverageAuditResult> {
    const result: CoverageAuditResult = {
      timestamp: Date.now(),
      skillVersion,
      totalAsuraIds: 0,
      mapped: 0,
      complete: 0,
      incomplete: 0,
      broken: 0,
      incompleteIds: [],
      brokenIds: [],
      duplicateIds: [],
      leakedTerminologyIds: [],
      completionPercentage: 0,
      healthStatus: 'HEALTHY',
      details: new Map(),
    };

    // Step 1: 取得所有已知 asuraId
    const allAsuraIds = this.getAllAsuraIds();
    result.totalAsuraIds = allAsuraIds.length;

    // Step 2: 逐一驗證每個 asuraId
    for (const asuraId of allAsuraIds) {
      try {
        const entry = GhostAsuraInterpretationResolver.resolve(asuraId);

        result.mapped++;

        // 驗證完整性
        const isComplete = GhostAsuraInterpretationResolver.isComplete(entry);
        const validation = GhostAsuraValidationModule.validate(entry);

        const detail: {
          asuraId: string;
          displayName: string | null;
          status: 'complete' | 'incomplete' | 'broken';
          issues: string[];
          completionPercentage: number;
        } = {
          asuraId: entry.asuraId,
          displayName: entry.displayName || null,
          status: 'complete',
          issues: [],
          completionPercentage: validation.completionPercentage,
        };

        // 檢查驗證狀態
        if (validation.status === ValidationStatus.BLOCKED) {
          result.broken++;
          detail.status = 'broken';
          detail.issues.push(`驗證狀態：${validation.status}`);
          if (validation.placeholders.length > 0) {
            detail.issues.push(`包含佔位字：${validation.placeholders.join(', ')}`);
            result.leakedTerminologyIds.push(asuraId);
          }
          if (validation.leakedTerms.length > 0) {
            detail.issues.push(`洩漏術語：${validation.leakedTerms.join(', ')}`);
            result.leakedTerminologyIds.push(asuraId);
          }
          result.brokenIds.push(asuraId);
        } else if (validation.status === ValidationStatus.INVALID) {
          result.broken++;
          detail.status = 'broken';
          detail.issues.push('驗證失敗：缺少核心字段');
          result.brokenIds.push(asuraId);
        } else if (!isComplete) {
          result.incomplete++;
          detail.status = 'incomplete';
          detail.issues.push(...validation.layers.meaning.missing.map(f => `缺少 ${f}`));
          result.incompleteIds.push(asuraId);
        } else {
          result.complete++;
          detail.status = 'complete';
        }

        result.details.set(asuraId, detail);
      } catch (error) {
        result.broken++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.details.set(asuraId, {
          asuraId,
          displayName: null,
          status: 'broken',
          issues: [errorMsg],
          completionPercentage: 0,
        });
        result.brokenIds.push(asuraId);
      }
    }

    // Step 3: 計算覆蓋率百分比
    result.completionPercentage = result.totalAsuraIds > 0
      ? Math.round((result.complete / result.totalAsuraIds) * 100)
      : 0;

    // Step 4: 決定健康狀態
    if (result.brokenIds.length === 0 && result.incompleteIds.length === 0) {
      result.healthStatus = 'HEALTHY';
    } else if (result.completionPercentage >= 80) {
      result.healthStatus = 'WARNING';
    } else {
      result.healthStatus = 'CRITICAL';
    }

    return result;
  }

  /**
   * 獲取所有已知的 asuraId
   */
  private static getAllAsuraIds(): string[] {
    // 使用完整字典中的所有 asuraId
    return Object.keys(COMPLETE_ASURA_DICTIONARY);
  }

  /**
   * 生成人類可讀的報告
   */
  static printReport(audit: CoverageAuditResult): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════',
      '🔍 鬼魅阿修羅 覆蓋率審計報告',
      `═══════════════════════════════════════════════════════════`,
      `📅 時間戳：${new Date(audit.timestamp).toLocaleString('zh-TW')}`,
      `🔧 技能版本：${audit.skillVersion}`,
      ``,
      `📊 覆蓋率統計：`,
      `  總 asuraId：${audit.totalAsuraIds}`,
      `  已映射：${audit.mapped}`,
      `  完整：${audit.complete} (${audit.completionPercentage}%)`,
      `  不完整：${audit.incomplete}`,
      `  損壞：${audit.broken}`,
      ``,
      `🎯 健康狀態：${audit.healthStatus}`,
      ``,
    ];

    if (audit.brokenIds.length > 0) {
      lines.push(`❌ 損壞的 asuraId (${audit.brokenIds.length}):`);
      for (const id of audit.brokenIds) {
        const detail = audit.details.get(id);
        const issues = detail?.issues.join('; ') || '未知錯誤';
        lines.push(`  - ${id}: ${issues}`);
      }
      lines.push(``);
    }

    if (audit.incompleteIds.length > 0) {
      lines.push(`⚠️  不完整的 asuraId (${audit.incompleteIds.length}):`);
      for (const id of audit.incompleteIds.slice(0, 10)) {
        const detail = audit.details.get(id);
        const issues = detail?.issues.join('; ') || '未知';
        lines.push(`  - ${id}: ${issues}`);
      }
      if (audit.incompleteIds.length > 10) {
        lines.push(`  ... 還有 ${audit.incompleteIds.length - 10} 個`);
      }
      lines.push(``);
    }

    if (audit.leakedTerminologyIds.length > 0) {
      lines.push(`🚨 洩露術語的 asuraId (${audit.leakedTerminologyIds.length}):`);
      for (const id of audit.leakedTerminologyIds.slice(0, 5)) {
        lines.push(`  - ${id}`);
      }
      if (audit.leakedTerminologyIds.length > 5) {
        lines.push(`  ... 還有 ${audit.leakedTerminologyIds.length - 5} 個`);
      }
      lines.push(``);
    }

    lines.push(`═══════════════════════════════════════════════════════════`);

    return lines.join('\n');
  }

  /**
   * 驗證是否達到規範要求
   * 規範 #16：complete = total, incomplete = 0, broken = 0
   */
  static isCoverageComplete(audit: CoverageAuditResult): boolean {
    return (
      audit.complete === audit.totalAsuraIds &&
      audit.incomplete === 0 &&
      audit.broken === 0 &&
      audit.leakedTerminologyIds.length === 0
    );
  }

  /**
   * 返回規範 #30 要求的 14 項指標（其中包含 coverage）
   */
  static getCompletionReport(audit: CoverageAuditResult): {
    totalAsuraIds: number;
    completeSkillEntries: number;
    coveragePercentage: number;
    missingIds: string[];
    brokenMapping: string[];
    emptyCards: number;
    fallbackCount: number;
    rerunnInconsistencies: number;
    cachCollisions: number;
    leakedTerminologyCount: number;
    batchTestResult: string;
    otherCardsDiff: number;
    skillVersion: string;
    baselineVersion: string;
  } {
    return {
      totalAsuraIds: audit.totalAsuraIds,
      completeSkillEntries: audit.complete,
      coveragePercentage: audit.completionPercentage,
      missingIds: audit.incompleteIds,
      brokenMapping: audit.brokenIds,
      emptyCards: audit.brokenIds.length, // 無話術 = 損壞
      fallbackCount: audit.incomplete,     // 用 fallback 補救
      rerunnInconsistencies: 0,            // 由 Test 模組提供
      cachCollisions: 0,                   // 由 Version 模組提供
      leakedTerminologyCount: audit.leakedTerminologyIds.length,
      batchTestResult: 'PENDING',          // 由 Test 模組提供
      otherCardsDiff: 0,                   // 由 Test 模組提供
      skillVersion: audit.skillVersion,
      baselineVersion: '2.0.0',            // GHOST_ASURA_STABILITY_LOCK_V2
    };
  }
}

/**
 * 導出
 */
export const runCoverageAudit = async (skillVersion?: string) => {
  return GhostAsuraCoverageAudit.runAudit(skillVersion);
};

export const printCoverageReport = (audit: CoverageAuditResult): string => {
  return GhostAsuraCoverageAudit.printReport(audit);
};

export const isCoverageComplete = (audit: CoverageAuditResult): boolean => {
  return GhostAsuraCoverageAudit.isCoverageComplete(audit);
};
