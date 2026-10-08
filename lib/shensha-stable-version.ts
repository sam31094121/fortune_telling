/**
 * 《神煞易經》穩定版本管理系統
 * ============================================================================
 * 一經發佈的版本永不改變。
 * 每份命盤卡片都記錄生成時的版本號，確保永久穩定。
 *
 * 版本政策：
 * - v1.2026-10-08：基礎版，66 項規則永久固定
 * - v2.xxxx-xx-xx：新功能、新規則時發佈新版本
 * - 用戶可升級，但舊卡片保持原版本不變
 */

import stableRulesV1 from '../data/shensha-stable-v1.2026-10-08.json';

export const SHENSHA_STABLE_VERSIONS = {
  'v1.2026-10-08': stableRulesV1,
} as const;

export type StableShenShaVersion = keyof typeof SHENSHA_STABLE_VERSIONS;

/**
 * 取得指定版本的規則永久順序
 * @param version 版本號，如 'v1.2026-10-08'
 * @returns 規則 ID → 永久順序的映射
 */
export function getStableOrder(version: StableShenShaVersion): Map<string, number> {
  const versionData = SHENSHA_STABLE_VERSIONS[version];
  const orderMap = new Map<string, number>();

  for (const rule of versionData.rules) {
    orderMap.set(rule.id, rule.order);
  }

  return orderMap;
}

/**
 * 按穩定版本順序排序神煞
 * @param items 神煞陣列，帶有 id 屬性
 * @param version 版本號，預設最新版本
 * @returns 排序後的神煞陣列（不修改原陣列）
 */
export function sortByShenShaStableOrder<T extends { id: string }>(
  items: T[],
  version: StableShenShaVersion = 'v1.2026-10-08'
): T[] {
  const order = getStableOrder(version);

  return [...items].sort((a, b) => {
    const orderA = order.get(a.id) ?? 999;
    const orderB = order.get(b.id) ?? 999;
    return orderA - orderB;
  });
}

/**
 * 驗證神煞順序是否符合穩定版本
 * @param items 神煞陣列
 * @param version 版本號
 * @returns { valid: boolean; issues: string[] }
 */
export function validateShenShaOrder<T extends { id: string }>(
  items: T[],
  version: StableShenShaVersion = 'v1.2026-10-08'
): { valid: boolean; issues: string[] } {
  const order = getStableOrder(version);
  const issues: string[] = [];

  const sorted = sortByShenShaStableOrder(items, version);

  // 檢查順序是否相同
  if (items.length !== sorted.length) {
    issues.push(`長度不符：輸入 ${items.length}，應為 ${sorted.length}`);
  }

  for (let i = 0; i < items.length; i++) {
    if (items[i].id !== sorted[i].id) {
      issues.push(
        `位置 ${i} 不符：輸入 ${items[i].id}，應為 ${sorted[i].id}（順序 ${order.get(sorted[i].id)}）`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * 取得版本訊息（用於卡片上的版本標記）
 */
export function getVersionInfo(version: StableShenShaVersion) {
  const versionData = SHENSHA_STABLE_VERSIONS[version];
  return {
    version,
    name: versionData.name,
    frozenAt: versionData.frozenAt,
    totalRules: versionData.metadata.totalRules,
  };
}

/**
 * 驗證卡片版本有效性
 * @param cardVersion 卡片記錄的版本
 * @returns 該版本是否仍有效且可被解讀
 */
export function isVersionValid(cardVersion: string): boolean {
  return cardVersion in SHENSHA_STABLE_VERSIONS;
}
