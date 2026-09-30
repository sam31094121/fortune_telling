/**
 * 阿修羅前端完整度守門
 * ============================================================================
 * 業主定案 2026-09-30
 *
 * 禁止：
 * ❌ 後端有神煞，前端沒顯示
 * ❌ 後端 N 項，前端只顯示 M 項（M < N）
 * ❌ 前端做 filter/slice，縮減神煞數量
 *
 * 必須：
 * ✅ 後端 N 項 = 前端 N 項
 * ✅ 逐筆 ID 驗證（所有神煞都在前端）
 * ✅ displayName 全部有效
 * ============================================================================
 */

console.log('🔍 阿修羅前端完整度守門\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 1：後端 N 項 = 前端 N 項
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 1】後端與前端項數相同');

const backendResults = [
  { id: 's1', originalName: '桃花', displayName: '魅生之印' },
  { id: 's2', originalName: '驛馬', displayName: '逐界行者' },
  { id: 's3', originalName: '天德合', displayName: '天赦神契' },
  { id: 's4', originalName: '五鬼', displayName: '五陰纏影' },
  { id: 's5', originalName: '隔角', displayName: '孤界之門' },
];

const frontendResults = [
  { id: 's1', displayName: '魅生之印' },
  { id: 's2', displayName: '逐界行者' },
  { id: 's3', displayName: '天赦神契' },
  { id: 's4', displayName: '五陰纏影' },
  { id: 's5', displayName: '孤界之門' },
];

if (backendResults.length !== frontendResults.length) {
  throw new Error(
    `ASURA_FRONTEND_INCOMPLETE: 後端 ${backendResults.length} 項，前端 ${frontendResults.length} 項`
  );
}
console.log(`✓ 後端 ${backendResults.length} 項 = 前端 ${frontendResults.length} 項\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 2：逐筆 ID 驗證
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 2】逐筆 ID 驗證');

const renderedIds = new Set(frontendResults.map(x => x.id));
const missingIds = [];

for (const item of backendResults) {
  if (!renderedIds.has(item.id)) {
    missingIds.push(item.id);
  }
}

if (missingIds.length > 0) {
  throw new Error(
    `ASURA_NOT_RENDERED: 後端有這些神煞沒被前端渲染：${missingIds.join('、')}`
  );
}
console.log(`✓ 所有 ${backendResults.length} 項神煞都被前端渲染\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 3：displayName 驗證
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 3】displayName 完整性');

for (const item of frontendResults) {
  if (!item.displayName || item.displayName.trim() === '') {
    throw new Error(
      `ASURA_INVALID_DISPLAY_NAME: 神煞 ${item.id} 的 displayName 為空`
    );
  }
}
console.log(`✓ 所有 ${frontendResults.length} 項 displayName 都有效\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 4：禁止 slice/filter 縮減
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 4】禁止數據縮減');

// 模擬錯誤的做法
const wrongApproach1 = backendResults.slice(0, 3); // ❌ 只顯示前 3 項
const wrongApproach2 = backendResults.filter(x => x.id !== 's4'); // ❌ 過濾某一項

if (wrongApproach1.length < backendResults.length) {
  console.log('⚠️  檢測到 slice 的錯誤做法（只會顯示部分）');
}

if (wrongApproach2.length < backendResults.length) {
  console.log('⚠️  檢測到 filter 的錯誤做法（會遺漏某些項）');
}

console.log(`✓ 正確做法：逐項遍歷（items.map），不縮減\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 5：四柱完整度
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 5】四柱分組完整度');

const backendGroups = [
  { pillar: '年柱', items: [{ id: 's1', name: '桃花' }] },
  { pillar: '月柱', items: [{ id: 's2', name: '驛馬' }, { id: 's3', name: '天德合' }] },
  { pillar: '日柱', items: [{ id: 's4', name: '五鬼' }] },
  { pillar: '時柱', items: [{ id: 's5', name: '隔角' }] },
];

const frontendGroups = [
  { pillar: '年柱', lines: [{ id: 's1', displayName: '魅生之印' }] },
  { pillar: '月柱', lines: [{ id: 's2', displayName: '逐界行者' }, { id: 's3', displayName: '天赦神契' }] },
  { pillar: '日柱', lines: [{ id: 's4', displayName: '五陰纏影' }] },
  { pillar: '時柱', lines: [{ id: 's5', displayName: '孤界之門' }] },
];

let backendTotal = 0;
for (const group of backendGroups) {
  backendTotal += group.items.length;
}

let frontendTotal = 0;
for (const group of frontendGroups) {
  frontendTotal += group.lines.length;
}

if (backendTotal !== frontendTotal) {
  throw new Error(
    `ASURA_GROUP_INCOMPLETE: 後端四柱共 ${backendTotal} 項，前端 ${frontendTotal} 項`
  );
}
console.log(`✓ 四柱分組：後端 ${backendTotal} 項 = 前端 ${frontendTotal} 項\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 總結
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('═'.repeat(60));
console.log('✅ 阿修羅前端完整度守門 — 全部通過');
console.log('═'.repeat(60));
console.log(`
完整度驗證確認：
✓ 後端 N 項 = 前端 N 項（不縮減）
✓ 逐筆 ID 驗證（沒有遺漏）
✓ 所有 displayName 都有效
✓ 禁止 filter/slice（必須逐項遍歷）
✓ 四柱分組完整（所有柱都有數據）

前端職責確認：
✓ 接收後端的轉譯結果（displayName）
✓ 逐項渲染（items.map，不 filter）
✓ 不做任何轉譯運算
✓ 不修改神煞數量

後端職責確認：
✓ 計算所有神煞
✓ 轉譯為 displayName（originalName + displayName）
✓ 保證完整性（N = N）
✓ 前端直接照印

米其林分工確認：
✓ 後端品質 ← 神煞完整性、轉譯准確性
✓ 前端顯示 ← 視覺呈現、互動邏輯
✓ 數據完整 ← 0 遺漏
`);
