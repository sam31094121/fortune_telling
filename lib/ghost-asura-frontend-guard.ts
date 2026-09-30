/**
 * 鬼魅阿修羅前端完整度守門
 * ============================================================================
 * 業主定案 2026-09-30
 *
 * 職責：
 * 1. 確保後端的每一筆神煞都被前端接收
 * 2. 確保每一筆神煞都用 displayName 顯示
 * 3. 禁止任何 filter/slice 導致數據遺漏
 * 4. 後端數量 = 前端顯示數量
 * ============================================================================
 */

import { translateToAsuraName } from './ghost-asura-registry';

export interface ShenShaLineItem {
  name: string; // originalName
  tone?: string;
  narrative?: any;
}

export interface AsuraLineItem extends ShenShaLineItem {
  displayName: string;
}

export interface ShenShaGroupData {
  pillar: string;
  intro?: string;
  lines: ShenShaLineItem[];
}

export interface AsuraGroupData extends ShenShaGroupData {
  lines: AsuraLineItem[];
}

/**
 * 轉譯單筆神煞 — 保留原始名稱，添加 displayName
 */
export function translateShenShaLine(line: ShenShaLineItem): AsuraLineItem {
  return {
    ...line,
    displayName: translateToAsuraName(line.name),
  };
}

/**
 * 轉譯整組神煞 — 完整保留，不過濾
 */
export function translateShenShaGroup(group: ShenShaGroupData): AsuraGroupData {
  return {
    ...group,
    lines: group.lines.map(translateShenShaLine),
  };
}

/**
 * 完整度驗證：後端數量 = 前端數量
 *
 * 鐵律：
 * ❌ 禁止 filter
 * ❌ 禁止 slice
 * ❌ 禁止 undefined displayName
 * ✅ 必須 100% 對應
 */
export function validateAsuraFrontendCompleteness(
  backendLines: ShenShaLineItem[],
  frontendLines: AsuraLineItem[]
): {
  status: 'PASSED' | 'FAILED';
  backendCount: number;
  frontendCount: number;
  missingLines: string[];
  message: string;
} {
  // 1. 數量檢查
  if (backendLines.length !== frontendLines.length) {
    return {
      status: 'FAILED',
      backendCount: backendLines.length,
      frontendCount: frontendLines.length,
      missingLines: backendLines
        .filter(
          backend =>
            !frontendLines.some(frontend => frontend.name === backend.name)
        )
        .map(line => line.name),
      message: `GHOST_ASURA_FRONTEND_INCOMPLETE: 後端 ${backendLines.length} 項，前端只有 ${frontendLines.length} 項。缺少 ${backendLines.length - frontendLines.length} 項。`,
    };
  }

  // 2. displayName 檢查（不能為 undefined）
  const undefinedDisplayNames = frontendLines
    .filter(line => !line.displayName)
    .map(line => line.name);

  if (undefinedDisplayNames.length > 0) {
    return {
      status: 'FAILED',
      backendCount: backendLines.length,
      frontendCount: frontendLines.length,
      missingLines: undefinedDisplayNames,
      message: `GHOST_ASURA_UNDEFINED_DISPLAY_NAME: 以下神煞缺少 displayName: ${undefinedDisplayNames.join('、')}`,
    };
  }

  // 3. 逐筆對應檢查
  for (let i = 0; i < backendLines.length; i++) {
    const backend = backendLines[i];
    const frontend = frontendLines[i];

    if (backend.name !== frontend.name) {
      return {
        status: 'FAILED',
        backendCount: backendLines.length,
        frontendCount: frontendLines.length,
        missingLines: [backend.name],
        message: `GHOST_ASURA_MISMATCH: 第 ${i + 1} 項不匹配。後端: ${backend.name}，前端: ${frontend.name}`,
      };
    }
  }

  return {
    status: 'PASSED',
    backendCount: backendLines.length,
    frontendCount: frontendLines.length,
    missingLines: [],
    message: `GHOST_ASURA_COMPLETE: ${backendLines.length} 項完全對應，全部使用 displayName 顯示`,
  };
}

/**
 * 逐柱完整度檢查
 */
export function validateAsuraGroupsCompleteness(
  backendGroups: ShenShaGroupData[],
  frontendGroups: AsuraGroupData[]
): {
  status: 'PASSED' | 'FAILED';
  totalBackendLines: number;
  totalFrontendLines: number;
  perPillarResults: Array<{
    pillar: string;
    status: 'PASSED' | 'FAILED';
    backendCount: number;
    frontendCount: number;
    message: string;
  }>;
  message: string;
} {
  const results = backendGroups.map(backendGroup => {
    const frontendGroup = frontendGroups.find(
      fg => fg.pillar === backendGroup.pillar
    );

    if (!frontendGroup) {
      return {
        pillar: backendGroup.pillar,
        status: 'FAILED' as const,
        backendCount: backendGroup.lines.length,
        frontendCount: 0,
        message: `ASURA_GROUP_MISSING: ${backendGroup.pillar} 後端有 ${backendGroup.lines.length} 項，前端缺失整組`,
      };
    }

    const validation = validateAsuraFrontendCompleteness(
      backendGroup.lines,
      frontendGroup.lines
    );

    return {
      pillar: backendGroup.pillar,
      status: validation.status,
      backendCount: validation.backendCount,
      frontendCount: validation.frontendCount,
      message: validation.message,
    };
  });

  const allPassed = results.every(r => r.status === 'PASSED');
  const totalBackendLines = backendGroups.reduce((sum, g) => sum + g.lines.length, 0);
  const totalFrontendLines = frontendGroups.reduce((sum, g) => sum + g.lines.length, 0);

  return {
    status: allPassed ? 'PASSED' : 'FAILED',
    totalBackendLines,
    totalFrontendLines,
    perPillarResults: results,
    message: allPassed
      ? `✓ 四柱完整度檢查通過：${totalBackendLines} 項完全對應`
      : `✗ 四柱完整度檢查失敗：後端 ${totalBackendLines} 項，前端 ${totalFrontendLines} 項`,
  };
}
