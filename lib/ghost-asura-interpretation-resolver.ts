/**
 * 模組 12：InterpretationResolver — 統一解析器
 *
 * 規範 #13：Resolver 必須唯一
 * 禁止不同元件自己各寫一套 fallback。
 *
 * 責任：
 * - 統一入口，所有 asuraId 都通過此函式解析
 * - 優先級：人工話術 > Skill 條目 > 字典 > 生成
 * - Fail Closed：錯誤記錄完整後拋出，不隱藏
 * - Deterministic：同輸入必須同結果
 */

import { ASURA_WORDINGS } from '@/features/ghost-asura/wordings';
import { COMPLETE_ASURA_DICTIONARY, type AsuraId as CompleteAsuraId, getAllAsuraIds } from './ghost-asura-complete-dictionary';
import type { AsuraInterpretation } from './ghost-asura-master-skill';

/**
 * 所有已知 asuraId 的完整話術字典
 * 資料來源：
 * 1. features/ghost-asura/wordings.ts (16 個人工核准話術)
 * 2. lib/asura-translation-resolver.ts (51+ 個映射)
 * 3. 後端已產出的話術快取
 */
export interface AsuraSkillEntry {
  asuraId: string;
  displayName: string;
  meaningStrong: string | null;    // FACT_LAYER
  coreMeaning: string | null;       // MEANING_LAYER
  battleSignificance: string | null; // EVIDENCE_LAYER
  advice: string | null;            // EXPRESSION_LAYER (可選)
  source: 'approved' | 'skill' | 'dictionary' | 'generated'; // 來源追蹤
}

/**
 * 核心字典：所有 60+ asuraId 的映射
 * 規範 #5：字典是「阿修羅讀過的書」，提供字義、詞義、意境
 *
 * 資料來源：lib/ghost-asura-complete-dictionary.ts
 */
const ASURA_SKILL_ENTRIES: Record<string, AsuraSkillEntry> = (() => {
  const entries: Record<string, AsuraSkillEntry> = {};

  // 從完整字典轉換到 AsuraSkillEntry 格式
  for (const [displayName, entry] of Object.entries(COMPLETE_ASURA_DICTIONARY)) {
    entries[displayName] = {
      asuraId: displayName, // 使用中文名作為 asuraId（也可轉換為 camelCase）
      displayName,
      meaningStrong: entry.meaningStrong,
      coreMeaning: entry.coreMeaning,
      battleSignificance: entry.battleSignificance,
      advice: entry.advice || null,
      source: 'dictionary',
    };
  }

  return entries;
})();

/**
 * 統一解析器 — 規範 #13
 *
 * 流程（優先級固定）：
 * 1. 驗證 asuraId 有效性
 * 2. 查人工核准話術（ASURA_WORDINGS）
 * 3. 查 Skill 字典（ASURA_SKILL_ENTRIES）
 * 4. 查後端快取（如有）
 * 5. 都沒有 → throw，不隱藏
 */
export class GhostAsuraInterpretationResolver {
  /**
   * 主解析方法
   *
   * @throws AsuraResolutionError 當 asuraId 無法解析時
   */
  static resolve(
    asuraId: string,
    context?: {
      displayName?: string;
      clientHash?: string;
      skillVersion?: string;
    },
  ): AsuraSkillEntry {
    // Step 1: 驗證 asuraId 不為空
    if (!asuraId || typeof asuraId !== 'string') {
      throw new AsuraResolutionError(
        `Invalid asuraId: ${asuraId}`,
        { asuraId, context },
      );
    }

    // Step 2: 優先查人工核准話術（ASURA_WORDINGS）
    // ASURA_WORDINGS 使用中文 displayName 作為鍵
    const displayNameKey = context?.displayName;
    if (displayNameKey && displayNameKey in ASURA_WORDINGS) {
      const approved = ASURA_WORDINGS[displayNameKey as keyof typeof ASURA_WORDINGS];
      return {
        asuraId,
        displayName: displayNameKey,
        meaningStrong: approved.shortDeclaration,
        coreMeaning: approved.coreWarning,
        battleSignificance: approved.battleSignificance,
        advice: approved.verdict,
        source: 'approved',
      };
    }

    // Step 3: 查 Skill 字典（ASURA_SKILL_ENTRIES）
    const entry = ASURA_SKILL_ENTRIES[asuraId];
    if (entry) {
      return entry;
    }

    // Step 4: 都沒找到 → Fail Closed，不隱藏
    throw new AsuraResolutionError(
      `No interpretation found for asuraId: ${asuraId}`,
      {
        asuraId,
        context,
        availableIds: Object.keys(ASURA_SKILL_ENTRIES),
      },
    );
  }

  /**
   * 驗證完整性 — 規範 #12：禁止空殼
   */
  static isComplete(entry: AsuraSkillEntry): boolean {
    return !!(
      entry.asuraId &&
      entry.displayName &&
      entry.meaningStrong &&
      entry.coreMeaning &&
      entry.battleSignificance
      // advice 可選（EXPRESSION_LAYER 可變）
    );
  }

  /**
   * 驗證來源 — 優先級追蹤
   */
  static getSourcePriority(entry: AsuraSkillEntry): number {
    const priorityMap = {
      approved: 1,      // 最高：人工核准
      skill: 2,         // 次優：Skill 條目
      dictionary: 3,    // 再次：字典
      generated: 4,     // 最低：生成
    };
    return priorityMap[entry.source] ?? 999;
  }

  /**
   * 批量驗證所有 asuraId
   */
  static auditAllEntries(): {
    total: number;
    complete: number;
    incomplete: string[];
    missing: string[];
  } {
    const allIds = Object.keys(ASURA_SKILL_ENTRIES);
    const complete: string[] = [];
    const incomplete: string[] = [];

    for (const id of allIds) {
      const entry = ASURA_SKILL_ENTRIES[id];
      if (this.isComplete(entry)) {
        complete.push(id);
      } else {
        incomplete.push(id);
      }
    }

    return {
      total: allIds.length,
      complete: complete.length,
      incomplete,
      missing: [],
    };
  }
}

/**
 * 自定義錯誤類 — Fail Closed 要求
 */
export class AsuraResolutionError extends Error {
  constructor(
    message: string,
    public context: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AsuraResolutionError';
  }
}

/**
 * 導出單例
 */
export const resolveAsuraInterpretation = (
  asuraId: string,
  context?: { displayName?: string; clientHash?: string; skillVersion?: string },
): AsuraSkillEntry => {
  return GhostAsuraInterpretationResolver.resolve(asuraId, context);
};

export const isCompleteAsuraInterpretation = (entry: AsuraSkillEntry): boolean => {
  return GhostAsuraInterpretationResolver.isComplete(entry);
};

export const auditAsuraInterpreations = (): ReturnType<typeof GhostAsuraInterpretationResolver.auditAllEntries> => {
  return GhostAsuraInterpretationResolver.auditAllEntries();
};
