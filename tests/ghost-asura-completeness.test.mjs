/**
 * 鬼魅阿修羅完整度守門測試
 * ============================================================================
 * 業主定案 2026-09-30
 *
 * 檢查項目：
 * 1. 50 項母種完整
 * 2. 50 項不得重名
 * 3. 穩定 Hash 無隨機性
 * 4. 前後端數量一致（completeness guard）
 * ============================================================================
 */

import assert from 'assert';
import { GHOST_ASURA_50_SEEDS, GHOST_ASURA_FIXED_MAP, stableHash, translateMultipleNames, validateGhostAsuraCompleteness } from '../lib/ghost-asura-registry.ts';

console.log('🔍 鬼魅阿修羅完整度守門測試');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 1：50 項母種完整
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 1】50 項母種完整');
assert.strictEqual(GHOST_ASURA_50_SEEDS.length, 50, '母種必須 50 項');
console.log(`✓ 50 項母種完整（實際：${GHOST_ASURA_50_SEEDS.length}）`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 2：50 項不得重名
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 2】50 項不得重名');
const asuraNames = GHOST_ASURA_50_SEEDS.map(s => s.asura);
const uniqueNames = new Set(asuraNames);
assert.strictEqual(asuraNames.length, uniqueNames.size, '50 項阿修羅名稱不得重複');
console.log(`✓ 50 項名稱唯一（${uniqueNames.size} 個不同名稱）`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 3：穩定 Hash 無隨機性
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 3】穩定 Hash 無隨機性');
const testInputs = ['天德合', '驛馬', '隔角', '金匱', '五鬼'];
testInputs.forEach(input => {
  const hash1 = stableHash(input);
  const hash2 = stableHash(input);
  const hash3 = stableHash(input);
  assert.strictEqual(hash1, hash2, `${input} 第一次和第二次 Hash 必須相同`);
  assert.strictEqual(hash2, hash3, `${input} 第二次和第三次 Hash 必須相同`);
});
console.log(`✓ 5 個測試詞穩定 Hash 通過（同輸入 = 同輸出）`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 4：映射表覆蓋 50 項
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 4】映射表覆蓋 50 項');
const mapKeys = Object.keys(GHOST_ASURA_FIXED_MAP);
assert.strictEqual(mapKeys.length, 50, '映射表必須 50 項');

GHOST_ASURA_50_SEEDS.forEach(seed => {
  assert.strictEqual(GHOST_ASURA_FIXED_MAP[seed.original], seed.asura, `${seed.original} 映射錯誤`);
});
console.log(`✓ 50 項映射完整且正確`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 5：前後端數量一致（completeness guard）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 5】前後端數量一致');

// 模擬後端有 50 項原始神煞
const backendCount = 50;
const frontendAsuraCount = translateMultipleNames(GHOST_ASURA_50_SEEDS.map(s => s.original)).length;

const validation = validateGhostAsuraCompleteness(backendCount, frontendAsuraCount);
assert.strictEqual(validation.status, 'PASSED', validation.message);
console.log(`✓ ${validation.message}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 6：不同數量的失敗案例
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 6】不同數量的失敗案例');
const failedValidation = validateGhostAsuraCompleteness(50, 49);
assert.strictEqual(failedValidation.status, 'FAILED', '數量不符應該失敗');
console.log(`✓ 完整度檢查：50 ≠ 49 → FAILED（預期行為）`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 總結
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n' + '═'.repeat(60));
console.log('✅ 鬼魅阿修羅完整度守門 — 全部通過');
console.log('═'.repeat(60));
console.log(`
✓ 50 項母種完整
✓ 50 項不得重名
✓ 穩定 Hash 無隨機性
✓ 映射表完整正確
✓ 前後端數量一致守門
✓ 不同數量檢測失敗案例
`);
