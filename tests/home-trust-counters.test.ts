/**
 * 首頁信任統計系統 — TDD 測試
 *
 * 版本：HOME_TRUST_COUNTERS_V2
 *
 * RED → GREEN → REFACTOR
 */

import assert from 'assert/strict';
import {
  handleAgreeIncrement,
  handleDisagreeIncrement,
  handleViewIncrement,
} from '../lib/home-trust/counters.handlers';
import { getCurrentCounters } from '../lib/home-trust/counters.repository';

console.log('🔴 首頁信任統計 — TDD 測試套件');
console.log('═'.repeat(60));

// ═════════════════════════════════════════════════════════════
// 🔴 RED — 失敗測試（驗證目前 Bug）
// ═════════════════════════════════════════════════════════════

console.log('\n🔴 TEST 01: 認同計數 +1');
try {
  (async () => {
    const before = await getCurrentCounters();
    const beforeAgree = before.agreeCount;

    const result = await handleAgreeIncrement();

    assert.equal(
      result.counters.agreeCount,
      beforeAgree + 1,
      `認同計數應該從 ${beforeAgree} 變成 ${beforeAgree + 1}，但是收到 ${result.counters.agreeCount}`
    );

    console.log(`  ✓ 認同計數正確增加：${beforeAgree} → ${result.counters.agreeCount}`);
  })().catch(err => {
    console.log(`  ✗ TEST 01 FAILED: ${err.message}`);
  });
} catch (error) {
  console.log(`  ✗ TEST 01 FAILED: ${(error as Error).message}`);
}

console.log('\n🔴 TEST 02: 不認同計數 +1');
try {
  (async () => {
    const before = await getCurrentCounters();
    const beforeDisagree = before.disagreeCount;

    const result = await handleDisagreeIncrement();

    assert.equal(
      result.counters.disagreeCount,
      beforeDisagree + 1,
      `不認同計數應該從 ${beforeDisagree} 變成 ${beforeDisagree + 1}，但是收到 ${result.counters.disagreeCount}`
    );

    console.log(`  ✓ 不認同計數正確增加：${beforeDisagree} → ${result.counters.disagreeCount}`);
  })().catch(err => {
    console.log(`  ✗ TEST 02 FAILED: ${err.message}`);
  });
} catch (error) {
  console.log(`  ✗ TEST 02 FAILED: ${(error as Error).message}`);
}

console.log('\n🔴 TEST 03: 瀏覽計數 +1');
try {
  (async () => {
    const before = await getCurrentCounters();
    const beforeView = before.viewCount;

    const result = await handleViewIncrement();

    assert.equal(
      result.counters.viewCount,
      beforeView + 1,
      `瀏覽計數應該從 ${beforeView} 變成 ${beforeView + 1}，但是收到 ${result.counters.viewCount}`
    );

    console.log(`  ✓ 瀏覽計數正確增加：${beforeView} → ${result.counters.viewCount}`);
  })().catch(err => {
    console.log(`  ✗ TEST 03 FAILED: ${err.message}`);
  });
} catch (error) {
  console.log(`  ✗ TEST 03 FAILED: ${(error as Error).message}`);
}

console.log('\n🔴 TEST 04: Reload 後數字不倒退');
try {
  (async () => {
    const result1 = await handleAgreeIncrement();
    const value1 = result1.counters.agreeCount;

    // 模擬 Reload
    const result2 = await getCurrentCounters();
    const value2 = result2.agreeCount;

    assert.equal(
      value2,
      value1,
      `Reload 後數字應該保持 ${value1}，但是收到 ${value2}`
    );

    assert(
      value2 >= value1,
      `Reload 後數字不得倒退：${value1} → ${value2}`
    );

    console.log(`  ✓ Reload 後數字持久化：${value1} → ${value2}`);
  })().catch(err => {
    console.log(`  ✗ TEST 04 FAILED: ${err.message}`);
  });
} catch (error) {
  console.log(`  ✗ TEST 04 FAILED: ${(error as Error).message}`);
}

console.log('\n🔴 TEST 05: 單調性約束（禁止倒退）');
try {
  (async () => {
    const before = await getCurrentCounters();
    const agreeStart = before.agreeCount;

    // 連續增加 3 次
    const r1 = await handleAgreeIncrement();
    const after1 = r1.counters.agreeCount;

    const r2 = await handleAgreeIncrement();
    const after2 = r2.counters.agreeCount;

    const r3 = await handleAgreeIncrement();
    const after3 = r3.counters.agreeCount;

    // 驗證單調遞增
    assert(agreeStart < after1, `第 1 次應該增加`);
    assert(after1 < after2, `第 2 次應該增加`);
    assert(after2 < after3, `第 3 次應該增加`);

    // 驗證沒有跳躍
    assert.equal(after1, agreeStart + 1, `第 1 次應該 +1`);
    assert.equal(after2, after1 + 1, `第 2 次應該 +1`);
    assert.equal(after3, after2 + 1, `第 3 次應該 +1`);

    console.log(`  ✓ 單調性約束：${agreeStart} → ${after1} → ${after2} → ${after3}`);
  })().catch(err => {
    console.log(`  ✗ TEST 05 FAILED: ${err.message}`);
  });
} catch (error) {
  console.log(`  ✗ TEST 05 FAILED: ${(error as Error).message}`);
}

console.log('\n🔴 TEST 06: 三端同步（數字一致）');
try {
  (async () => {
    // 模擬三台設備各自取得數據
    const mobile = await getCurrentCounters();
    const tablet = await getCurrentCounters();
    const desktop = await getCurrentCounters();

    assert.equal(
      mobile.agreeCount,
      tablet.agreeCount,
      `手機與平板認同數應相同`
    );

    assert.equal(
      tablet.agreeCount,
      desktop.agreeCount,
      `平板與電腦認同數應相同`
    );

    assert.equal(
      mobile.disagreeCount,
      tablet.disagreeCount,
      `手機與平板不認同數應相同`
    );

    assert.equal(
      mobile.viewCount,
      tablet.viewCount,
      `手機與平板瀏覽數應相同`
    );

    console.log(`  ✓ 三端數據同步：手機=${mobile.agreeCount}, 平板=${tablet.agreeCount}, 電腦=${desktop.agreeCount}`);
  })().catch(err => {
    console.log(`  ✗ TEST 06 FAILED: ${err.message}`);
  });
} catch (error) {
  console.log(`  ✗ TEST 06 FAILED: ${(error as Error).message}`);
}

console.log('\n' + '═'.repeat(60));
console.log('✅ TDD 測試套件完成');
console.log('═'.repeat(60));

console.log('\n📋 下一步：');
console.log('  1. 運行 npm test 確認測試');
console.log('  2. 所有測試應該 PASS（綠燈）');
console.log('  3. 進行 REFACTOR 優化代碼結構');
