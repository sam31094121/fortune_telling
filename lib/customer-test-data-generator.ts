/**
 * 客戶測試數據生成器
 *
 * 為客戶三端驗證提供標準測試數據
 * 確保所有設備使用相同的輸入進行驗證
 */

import type { AsuraDisplayModelV1 } from './ghost-asura-cross-device-validator';

/**
 * 標準測試用例
 */
export const STANDARD_TEST_CASES = {
  // 測試用例 1：基本驗證
  basic: {
    label: '基本驗證',
    clientInputHash: 'test_basic_2026_10_07',
    backendVersion: '1.0.0',
    skillVersion: '2.0.0',
    description: '包含 3 個阿修羅的基本驗證',
  },

  // 測試用例 2：完整驗證
  complete: {
    label: '完整驗證',
    clientInputHash: 'test_complete_2026_10_07',
    backendVersion: '1.0.0',
    skillVersion: '2.0.0',
    description: '包含 5 個阿修羅的完整驗證',
  },

  // 測試用例 3：性能測試
  performance: {
    label: '性能測試',
    clientInputHash: 'test_performance_2026_10_07',
    backendVersion: '1.0.0',
    skillVersion: '2.0.0',
    description: '測試系統在大數據集下的性能',
  },
} as const;

/**
 * 生成基本測試數據
 */
export function generateBasicTestData(): AsuraDisplayModelV1[] {
  return [
    {
      asuraId: 'guchen',
      displayName: '孤辰絕界',
      column: 'year',
      meaningStrong: '孤絕不是懲罰，是你被迫學會的絕技。',
      meaning: '命盤上的孤絕：沒人幫，只能自救；沒路走，就自己開路。',
      battleLine: '獨行時最強，團隊時最危險——因為你習慣了一個人。',
      sealStatus: 'awakened',
      skillVersion: '2.0.0',
      backendVersion: '1.0.0',
    },
    {
      asuraId: 'jiesha',
      displayName: '劫魂之刃',
      column: 'month',
      meaningStrong: '一刻不停的奪取，這就是你的宿命。',
      meaning: '命盤上的掠奪之氣不是貪婪，是對手早就在你面前的信號。',
      battleLine: '別人的失手，就是你的進攻機會。',
      sealStatus: 'dormant',
      skillVersion: '2.0.0',
      backendVersion: '1.0.0',
    },
    {
      asuraId: 'tiande',
      displayName: '天德護印',
      column: 'day',
      meaningStrong: '德是力量的審視，不是退縮。',
      meaning: '你有能力傷人，但你選擇不傷無辜。',
      battleLine: '你賭的是自己的力量，不是別人的憐憫。',
      sealStatus: 'pending',
      skillVersion: '2.0.0',
      backendVersion: '1.0.0',
    },
  ];
}

/**
 * 生成完整測試數據
 */
export function generateCompleteTestData(): AsuraDisplayModelV1[] {
  return [
    ...generateBasicTestData(),
    {
      asuraId: 'longgui',
      displayName: '龍鬼之爪',
      column: 'hour',
      meaningStrong: '龍鬼之爪，撕裂命運的武器。',
      meaning: '你的力量足以改變局面，問題是你敢不敢用。',
      battleLine: '關鍵時刻，唯有全力一擊。',
      sealStatus: 'awakened',
      skillVersion: '2.0.0',
      backendVersion: '1.0.0',
    },
    {
      asuraId: 'baihu',
      displayName: '白虎殺局',
      column: 'year',
      meaningStrong: '白虎之煞，命盤上的凶星。',
      meaning: '不是所有的衝突都能避免，有些必須正面對決。',
      battleLine: '戰場上，猶豫就是死亡。',
      sealStatus: 'awakened',
      skillVersion: '2.0.0',
      backendVersion: '1.0.0',
    },
  ];
}

/**
 * 生成性能測試數據（大數據集）
 */
export function generatePerformanceTestData(): AsuraDisplayModelV1[] {
  const baseAsuraIds = [
    'guchen',
    'jiesha',
    'tiande',
    'longgui',
    'baihu',
    'qinglong',
    'xuanwu',
    'zhuque',
    'yingzhao',
    'luocha',
  ];

  const columns: Array<'year' | 'month' | 'day' | 'hour'> = [
    'year',
    'month',
    'day',
    'hour',
  ];

  const data: AsuraDisplayModelV1[] = [];

  for (let i = 0; i < baseAsuraIds.length; i++) {
    const asuraId = baseAsuraIds[i];
    const column = columns[i % columns.length];

    data.push({
      asuraId,
      displayName: `${asuraId} (${i + 1})`,
      column,
      meaningStrong: `這是 ${asuraId} 的強力意義層 (重複 #${i + 1})`,
      meaning: `這是 ${asuraId} 的核心意義 (重複 #${i + 1})`,
      battleLine: `這是 ${asuraId} 的戰鬥台詞 (重複 #${i + 1})`,
      sealStatus: i % 3 === 0 ? 'awakened' : i % 3 === 1 ? 'dormant' : 'pending',
      skillVersion: '2.0.0',
      backendVersion: '1.0.0',
    });
  }

  return data;
}

/**
 * 驗證測試數據完整性
 */
export function validateTestData(data: AsuraDisplayModelV1[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['數據不是陣列'] };
  }

  if (data.length === 0) {
    return { valid: false, errors: ['數據為空'] };
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    if (!item.asuraId) {
      errors.push(`項目 ${i}: 缺少 asuraId`);
    }
    if (!item.displayName) {
      errors.push(`項目 ${i}: 缺少 displayName`);
    }
    if (!item.column) {
      errors.push(`項目 ${i}: 缺少 column`);
    }
    if (!item.meaningStrong) {
      errors.push(`項目 ${i}: 缺少 meaningStrong`);
    }
    if (!item.meaning) {
      errors.push(`項目 ${i}: 缺少 meaning`);
    }
    if (!item.battleLine) {
      errors.push(`項目 ${i}: 缺少 battleLine`);
    }
    if (
      !['awakened', 'dormant', 'pending'].includes(
        item.sealStatus as string
      )
    ) {
      errors.push(
        `項目 ${i}: sealStatus 無效（應為 awakened/dormant/pending）`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 生成客戶測試報告
 */
export function generateTestReport(
  caseLabel: string,
  deviceType: 'mobile' | 'tablet' | 'desktop',
  hashValue: string,
  verificationResult: 'PASSED' | 'FAILED',
  responseTime: number
): string {
  const timestamp = new Date().toISOString();

  return `
╔════════════════════════════════════════════════════════════════╗
║                     三端驗證報告                              ║
╚════════════════════════════════════════════════════════════════╝

📋 測試信息
───────────────────────────────────────────────────────────────
  測試用例：${caseLabel}
  設備型別：${
    deviceType === 'mobile'
      ? '📱 手機'
      : deviceType === 'tablet'
        ? '📱 平板'
        : '💻 電腦'
  }
  時間戳：${timestamp}

🔐 驗證結果
───────────────────────────────────────────────────────────────
  狀態：${verificationResult === 'PASSED' ? '✅ 通過' : '❌ 失敗'}
  Hash 值：${hashValue}
  回應時間：${responseTime}ms

📊 性能指標
───────────────────────────────────────────────────────────────
  回應時間：${responseTime}ms
  評估：${
    responseTime < 200
      ? '⚡ 非常快速'
      : responseTime < 500
        ? '✓ 正常'
        : '⚠️ 較慢'
  }

✨ 建議
───────────────────────────────────────────────────────────────
${
  verificationResult === 'PASSED'
    ? '  ✓ 此設備驗證成功，已通過規範檢查'
    : '  ⚠️ 此設備驗證失敗，請檢查以下項目：\n    1. 網路連線是否穩定\n    2. 數據是否完整\n    3. 是否清除了快取'
}

════════════════════════════════════════════════════════════════
  請保存此報告以備後續參考
════════════════════════════════════════════════════════════════
`;
}

/**
 * 驗證三端一致性
 */
export function verifyThreeDeviceConsistency(
  mobileHash: string,
  tabletHash: string,
  desktopHash: string
): {
  consistent: boolean;
  message: string;
  differences: string[];
} {
  const differences: string[] = [];

  if (mobileHash !== tabletHash) {
    differences.push('手機和平板 Hash 值不同');
  }

  if (tabletHash !== desktopHash) {
    differences.push('平板和電腦 Hash 值不同');
  }

  if (mobileHash !== desktopHash) {
    differences.push('手機和電腦 Hash 值不同');
  }

  const consistent = differences.length === 0;

  return {
    consistent,
    message: consistent
      ? '✅ 三端數據完全一致，系統已通過規範驗收'
      : '❌ 三端數據不一致，請檢查以下問題',
    differences,
  };
}

/**
 * 客戶測試清單
 */
export const CUSTOMER_VALIDATION_CHECKLIST = {
  preparation: [
    '✓ 清除瀏覽器快取',
    '✓ 確保網速 > 5 Mbps',
    '✓ 準備三台設備',
    '✓ 備好測試 URL',
  ],
  mobile: [
    '✓ 頁面載入無卡頓',
    '✓ 設備識別為「手機」',
    '✓ 看到四個欄位（年、月、日、時）',
    '✓ 欄位寬度均勻分佈',
    '✓ 可左右滑動所有欄位',
    '✓ 滑動流暢無延遲',
    '✓ 驗證成功（✅ PASSED）',
    '✓ 記錄 Hash 值',
  ],
  tablet: [
    '✓ 設備識別為「平板」',
    '✓ 四個欄位自動擴展',
    '✓ 無需水平滑動',
    '✓ 驗證成功（✅ PASSED）',
    '✓ Hash 值與手機相同',
  ],
  desktop: [
    '✓ 設備識別為「電腦」',
    '✓ 四個欄位最大化顯示',
    '✓ F12 檢查無 JavaScript 錯誤',
    '✓ 網絡請求狀態 200',
    '✓ 驗證成功（✅ PASSED）',
    '✓ Hash 值與其他設備相同',
  ],
  final: [
    '✓ 三端 Hash 值完全相同',
    '✓ 所有驗證均顯示 ✅ PASSED',
    '✓ 沒有任何錯誤警告',
    '✓ 可以確認上線',
  ],
} as const;
