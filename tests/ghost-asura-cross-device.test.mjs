/**
 * 鬼魅阿修羅跨設備驗證測試
 *
 * 驗證規範 #30-33：三端資料一致性
 */

import assert from 'assert/strict';
import {
  generateAsuraDataHash,
  validateCrossDeviceConsistency,
  formatValidationResult,
} from '../lib/ghost-asura-cross-device-validator.ts';

console.log('🔐 鬼魅阿修羅跨設備驗證測試');
console.log('─'.repeat(60));

// 測試資料（三端相同）
const clientInputHash = 'input_2026_06_28_18_00';
const backendVersion = '1.0.0';
const skillVersion = '2.0.0';

const testAsuraData = [
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

// Test 1: 基本 Hash 生成
console.log('\n✅ Test 1: Hash 生成');
try {
  const hash = generateAsuraDataHash(
    clientInputHash,
    backendVersion,
    skillVersion,
    testAsuraData,
  );

  assert(hash, '應該生成 Hash');
  assert(hash.length === 64, 'SHA256 Hash 應為 64 字符');
  assert(/^[a-f0-9]{64}$/.test(hash), 'Hash 應為十六進制');

  console.log(`  ✓ Hash 生成成功: ${hash.slice(0, 16)}...`);
  console.log(`  ✓ Hash 長度: ${hash.length} 字符`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

// Test 2: 三端完全一致
console.log('\n✅ Test 2: 三端完全一致');
try {
  const result = validateCrossDeviceConsistency(
    clientInputHash,
    backendVersion,
    skillVersion,
    testAsuraData,
    testAsuraData, // 平板資料完全相同
    testAsuraData, // 電腦資料完全相同
  );

  assert(result.isConsistent, '三端應該一致');
  assert(result.mobileHash === result.tabletHash, 'Mobile 和 Tablet Hash 應相同');
  assert(result.tabletHash === result.desktopHash, 'Tablet 和 Desktop Hash 應相同');
  assert(result.inconsistencies.length === 0, '不應有不一致的項目');

  console.log(`  ✓ 三端 Hash 一致：${result.mobileHash.slice(0, 16)}...`);
  console.log(`  ✓ 命中項目數：${result.mobileData.hitCount}`);
  console.log(`  ✓ asuraId 集合：${result.mobileData.asuraIds.length} 個`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

// Test 3: 檢測不一致（手機資料不同）
console.log('\n✅ Test 3: 檢測不一致');
try {
  const mobileDataModified = [
    ...testAsuraData,
    {
      asuraId: 'new_asura',
      displayName: '新阿修羅',
      column: 'hour',
      meaningStrong: '新增項目',
      meaning: '新增項目',
      battleLine: '新增項目',
      sealStatus: 'awakened',
      skillVersion: '2.0.0',
      backendVersion: '1.0.0',
    },
  ];

  const result = validateCrossDeviceConsistency(
    clientInputHash,
    backendVersion,
    skillVersion,
    mobileDataModified, // 手機多一項
    testAsuraData,      // 平板相同
    testAsuraData,      // 電腦相同
  );

  assert(!result.isConsistent, '三端應該不一致');
  assert(result.mobileData.hitCount !== result.tabletData.hitCount, '命中項目數應不同');
  assert(result.inconsistencies.length > 0, '應檢測到不一致');

  console.log(`  ✓ 成功檢測到不一致`);
  console.log(`  ✓ Mobile: ${result.mobileData.hitCount} 項`);
  console.log(`  ✓ Tablet: ${result.tabletData.hitCount} 項`);
  console.log(`  ✓ 不一致詳情: ${result.inconsistencies[0]}`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

// Test 4: 結果格式化
console.log('\n✅ Test 4: 結果格式化');
try {
  const result = validateCrossDeviceConsistency(
    clientInputHash,
    backendVersion,
    skillVersion,
    testAsuraData,
    testAsuraData,
    testAsuraData,
  );

  const formatted = formatValidationResult(result);

  assert(formatted.includes('✅ PASSED'), '應顯示通過狀態');
  assert(formatted.includes('鬼魅阿修羅跨設備驗證結果'), '應包含標題');
  assert(formatted.includes('三端一致性'), '應包含一致性驗證');

  console.log(`  ✓ 格式化成功`);
  console.log(`  ✓ 輸出行數: ${formatted.split('\n').length} 行`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

// Test 5: 版本變更檢測
console.log('\n✅ Test 5: 版本變更檢測');
try {
  const resultSame = validateCrossDeviceConsistency(
    clientInputHash,
    backendVersion,
    skillVersion,
    testAsuraData,
    testAsuraData,
    testAsuraData,
  );

  const resultDiffBackend = validateCrossDeviceConsistency(
    clientInputHash,
    '2.0.0', // 不同的後端版本
    skillVersion,
    testAsuraData,
    testAsuraData,
    testAsuraData,
  );

  assert(resultSame.backendVersion === '1.0.0', '應保存版本');
  assert(resultDiffBackend.backendVersion === '2.0.0', '應捕捉版本變更');

  console.log(`  ✓ 版本追蹤正常`);
  console.log(`  ✓ 版本 1.0.0 Hash: ${resultSame.mobileHash.slice(0, 16)}...`);
  console.log(`  ✓ 版本 2.0.0 Hash: ${resultDiffBackend.mobileHash.slice(0, 16)}...`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

console.log('\n' + '═'.repeat(60));
console.log('✅ 跨設備驗證測試完成');
console.log('═'.repeat(60));
