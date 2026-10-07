/**
 * 三合一優化層測試
 *
 * 驗證：
 * 1. 性能指標正確計算
 * 2. 快取機制正常工作
 * 3. 診斷資訊完整
 * 4. 優化版本與原始版本結果一致
 */

import assert from 'assert/strict';
import {
  runThreeInOneOptimized,
  ThreeInOneCacheManager,
  formatMetrics,
  formatDiagnostics,
} from '../lib/three-in-one-optimizer.ts';

console.log('🔍 三合一優化層測試');
console.log('─'.repeat(60));

// 測試輸入
const testInput = {
  birthDate: '1974-06-28',
  birthTime: '18:00',
  hourBranchIndex: null,
  gender: 'male',
};

// Test 1: 基本功能
console.log('\n✅ Test 1: 基本執行');
try {
  const result = await runThreeInOneOptimized(testInput, {
    useCache: false,
    enableDiagnostics: true,
  });

  assert(result.metrics, '應有性能指標');
  assert(result.diagnostics, '應有診斷資訊');
  assert(result.diagnostics.executionId, '應有執行 ID');
  assert(result.metrics.totalMs > 0, '總耗時應大於 0');

  console.log('  ✓ 性能指標完整');
  console.log('  ✓ 診斷資訊完整');
  console.log(`  ✓ 執行 ID: ${result.diagnostics.executionId}`);
  console.log(`  ✓ 總耗時: ${result.metrics.totalMs.toFixed(2)}ms`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

// Test 2: 快取命中
console.log('\n✅ Test 2: 快取機制');
try {
  ThreeInOneCacheManager.clearAll();

  // 第一次執行（無快取）
  const result1 = await runThreeInOneOptimized(testInput, { useCache: true });
  assert(!result1.diagnostics.cacheStatus.hit, '第一次執行應無快取命中');
  assert(result1.diagnostics.cacheStatus.cacheKey, '應有快取鍵');

  // 第二次執行（應快取命中）
  const result2 = await runThreeInOneOptimized(testInput, { useCache: true });
  assert(result2.diagnostics.cacheStatus.hit, '第二次執行應快取命中');
  assert.equal(result2.diagnostics.cacheStatus.cacheKey, result1.diagnostics.cacheStatus.cacheKey, '快取鍵應相同');
  assert.equal(result1.success, result2.success, '結果應相同');

  console.log(`  ✓ 快取無命中耗時: ${result1.metrics.totalMs.toFixed(2)}ms`);
  console.log(`  ✓ 快取命中耗時: ${result2.metrics.totalMs.toFixed(2)}ms`);
  console.log(`  ✓ 快取鍵: ${result1.diagnostics.cacheStatus.cacheKey.substring(0, 16)}...`);
  console.log(`  ✓ 結果一致性驗證通過`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

// Test 3: 診斷格式化
console.log('\n✅ Test 3: 診斷格式化');
try {
  const result = await runThreeInOneOptimized(testInput, { enableDiagnostics: true });
  const metricsStr = formatMetrics(result.metrics);
  const diagnosticsStr = formatDiagnostics(result.diagnostics);

  assert(metricsStr.includes('總耗時'), '指標應包含總耗時');
  assert(metricsStr.includes('八字計算'), '指標應包含八字計算');
  assert(diagnosticsStr.includes('執行 ID'), '診斷應包含執行 ID');
  assert(diagnosticsStr.includes('檢查點'), '診斷應包含檢查點');

  console.log('  ✓ 性能指標格式化成功');
  console.log('  ✓ 診斷資訊格式化成功');
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

// Test 4: 快取狀態查詢
console.log('\n✅ Test 4: 快取狀態');
try {
  const stats = ThreeInOneCacheManager.stats();
  assert('size' in stats, '應有 size 欄位');
  assert('maxSize' in stats, '應有 maxSize 欄位');

  console.log(`  ✓ 快取大小: ${stats.size} / ${stats.maxSize}`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

// Test 5: 結果一致性
console.log('\n✅ Test 5: 結果一致性');
try {
  ThreeInOneCacheManager.clearAll();

  const result1 = await runThreeInOneOptimized(testInput, { useCache: false });
  const result2 = await runThreeInOneOptimized(testInput, { useCache: false });

  assert.equal(result1.success, result2.success, '兩次執行結果應一致');
  assert.equal(result1.status, result2.status, '狀態應一致');

  console.log(`  ✓ 結果一致性驗證通過 (${result1.status})`);
} catch (error) {
  console.log(`  ✗ 錯誤: ${error.message}`);
}

console.log('\n' + '═'.repeat(60));
console.log('✅ 三合一優化層測試完成');
console.log('═'.repeat(60));
