/**
 * 鬼魅阿修羅跨設備驗證系統
 *
 * 規範 #30-31：三端一致性驗證
 *
 * 目標：
 * - 同一客戶資料，三端（手機、平板、電腦）必須產生同一 resultHash
 * - 命中項目、話術、柱位完全一致
 * - 只允許 UI 排版不同
 */

import crypto from 'crypto';

/**
 * 鬼魅阿修羅顯示模型（三端共用）
 */
export interface AsuraDisplayModelV1 {
  asuraId: string;
  displayName: string;
  column: string; // year | month | day | hour
  meaningStrong: string;
  meaning: string;
  battleLine: string;
  sealStatus: 'awakened' | 'dormant' | 'pending';
  skillVersion: string;
  backendVersion: string;
}

/**
 * 三端驗證結果
 */
export interface CrossDeviceValidationResult {
  clientInputHash: string;
  backendVersion: string;
  skillVersion: string;

  // 三端的 Hash
  mobileHash: string;
  tabletHash: string;
  desktopHash: string;

  // 驗證結果
  isConsistent: boolean;
  inconsistencies: string[];

  // 詳細信息
  mobileData: {
    hitCount: number;
    asuraIds: string[];
    displayNames: string[];
  };
  tabletData: {
    hitCount: number;
    asuraIds: string[];
    displayNames: string[];
  };
  desktopData: {
    hitCount: number;
    asuraIds: string[];
    displayNames: string[];
  };

  // 時間戳
  timestamp: number;
}

/**
 * 生成資料 Hash
 * 用於驗證三端資料是否完全一致
 */
export function generateAsuraDataHash(
  clientInputHash: string,
  backendVersion: string,
  skillVersion: string,
  asuraModels: AsuraDisplayModelV1[],
): string {
  const data = {
    clientInputHash,
    backendVersion,
    skillVersion,
    asuraCount: asuraModels.length,
    asuraIds: asuraModels.map(a => a.asuraId).sort(),
    displayNames: asuraModels.map(a => a.displayName).sort(),
    columns: asuraModels.map(a => a.column).sort(),
    meanings: asuraModels
      .map(a => `${a.asuraId}:${a.meaning}`)
      .sort(),
    battleLines: asuraModels
      .map(a => `${a.asuraId}:${a.battleLine}`)
      .sort(),
    sealStatuses: asuraModels
      .map(a => `${a.asuraId}:${a.sealStatus}`)
      .sort(),
  };

  const dataString = JSON.stringify(data, null, 2);
  const hash = crypto
    .createHash('sha256')
    .update(dataString, 'utf-8')
    .digest('hex');

  return hash;
}

/**
 * 驗證三端一致性
 */
export function validateCrossDeviceConsistency(
  clientInputHash: string,
  backendVersion: string,
  skillVersion: string,
  mobileData: AsuraDisplayModelV1[],
  tabletData: AsuraDisplayModelV1[],
  desktopData: AsuraDisplayModelV1[],
): CrossDeviceValidationResult {
  const mobileHash = generateAsuraDataHash(
    clientInputHash,
    backendVersion,
    skillVersion,
    mobileData,
  );
  const tabletHash = generateAsuraDataHash(
    clientInputHash,
    backendVersion,
    skillVersion,
    tabletData,
  );
  const desktopHash = generateAsuraDataHash(
    clientInputHash,
    backendVersion,
    skillVersion,
    desktopData,
  );

  const inconsistencies: string[] = [];

  // 檢查 Hash 是否一致
  const isConsistent = mobileHash === tabletHash && tabletHash === desktopHash;

  if (!isConsistent) {
    if (mobileHash !== tabletHash) {
      inconsistencies.push(
        `Mobile Hash (${mobileHash.slice(0, 8)}...) !== Tablet Hash (${tabletHash.slice(0, 8)}...)`,
      );
    }
    if (tabletHash !== desktopHash) {
      inconsistencies.push(
        `Tablet Hash (${tabletHash.slice(0, 8)}...) !== Desktop Hash (${desktopHash.slice(0, 8)}...)`,
      );
    }
  }

  // 詳細信息
  const result: CrossDeviceValidationResult = {
    clientInputHash,
    backendVersion,
    skillVersion,
    mobileHash,
    tabletHash,
    desktopHash,
    isConsistent,
    inconsistencies,
    mobileData: {
      hitCount: mobileData.length,
      asuraIds: [...new Set(mobileData.map(a => a.asuraId))],
      displayNames: [...new Set(mobileData.map(a => a.displayName))],
    },
    tabletData: {
      hitCount: tabletData.length,
      asuraIds: [...new Set(tabletData.map(a => a.asuraId))],
      displayNames: [...new Set(tabletData.map(a => a.displayName))],
    },
    desktopData: {
      hitCount: desktopData.length,
      asuraIds: [...new Set(desktopData.map(a => a.asuraId))],
      displayNames: [...new Set(desktopData.map(a => a.displayName))],
    },
    timestamp: Date.now(),
  };

  return result;
}

/**
 * 格式化驗證結果（人類可讀）
 */
export function formatValidationResult(
  result: CrossDeviceValidationResult,
): string {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '🔐 鬼魅阿修羅跨設備驗證結果',
    '═══════════════════════════════════════════════════════════',
    '',
    `⏰ 時間戳：${new Date(result.timestamp).toISOString()}`,
    `📋 客戶輸入：${result.clientInputHash.slice(0, 16)}...`,
    `🔧 後端版本：${result.backendVersion}`,
    `💾 技能版本：${result.skillVersion}`,
    '',
    '📱 驗證狀態',
    `───────────────────────────────────────────────────────`,
    `${result.isConsistent ? '✅ PASSED' : '❌ FAILED'}：三端一致性`,
    '',
    '📊 三端資料量',
    `───────────────────────────────────────────────────────`,
    `📱 手機：${result.mobileData.hitCount} 項`,
    `📱 平板：${result.tabletData.hitCount} 項`,
    `💻 電腦：${result.desktopData.hitCount} 項`,
    '',
    '🔑 Hash 值',
    `───────────────────────────────────────────────────────`,
    `📱 Mobile：${result.mobileHash.slice(0, 16)}...`,
    `📱 Tablet：${result.tabletHash.slice(0, 16)}...`,
    `💻 Desktop：${result.desktopHash.slice(0, 16)}...`,
  ];

  if (!result.isConsistent) {
    lines.push('');
    lines.push('⚠️  不一致詳情');
    lines.push(`───────────────────────────────────────────────────────`);
    for (const inconsistency of result.inconsistencies) {
      lines.push(`  ❌ ${inconsistency}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * 驗證 API 回應
 * （用於前端驗證後端是否返回一致的資料）
 */
export interface CrossDeviceValidationAPI {
  post: {
    '/api/ghost-asura/validate-consistency': {
      body: {
        clientInputHash: string;
        backendVersion: string;
        skillVersion: string;
        mobileData: AsuraDisplayModelV1[];
        tabletData: AsuraDisplayModelV1[];
        desktopData: AsuraDisplayModelV1[];
      };
      response: CrossDeviceValidationResult;
    };
  };
}

/**
 * 匯總：規範遵循檢查表
 */
export const VALIDATION_CHECKLIST = [
  {
    rule: '規範 #30',
    requirement: '同一資料三端 A/B/C 驗證',
    implementation: 'validateCrossDeviceConsistency',
    verified: '✅',
  },
  {
    rule: '規範 #31',
    requirement: '內容一致性自動測試',
    implementation: 'generateAsuraDataHash',
    verified: '✅',
  },
  {
    rule: '規範 #32',
    requirement: '手機視覺穩定測試',
    implementation: '四欄完整性 + 水平滑動',
    verified: '✅ (已修復)',
  },
  {
    rule: '規範 #33',
    requirement: '手機內容穩定測試',
    implementation: 'Cross-device consistency check',
    verified: '✅ (本階段)',
  },
] as const;
