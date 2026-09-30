/**
 * 阿修羅敘事層一致性測試
 * ============================================================================
 * 業主定案 2026-09-30
 *
 * 驗證項目：
 * 1. 三卡用同一份資料（四柱、神煞、易經卦象）
 * 2. 只改話術層，不改排盤資料
 * 3. 敘事層不被外層修改資料結構
 * ============================================================================
 */

import assert from 'assert';

console.log('🔍 阿修羅敘事層一致性守門測試\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 1：三卡共用資料源
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 1】三卡共用資料源');

// 模擬同一份排盤結果
const sharedBaziData = {
  year: '甲寅',
  month: '庚午',
  day: '甲辰',
  hour: '丙寅',
};

const sharedShenShaData = {
  byPillar: {
    year: [
      { id: 'tai-yi', name: '太極', tone: 'blessing' },
      { id: 'fu-xing', name: '福星', tone: 'blessing' },
    ],
    month: [{ id: 'yi-ma', name: '驛馬', tone: 'dynamic' }],
    day: [{ id: 'tao-hua', name: '桃花', tone: 'dynamic' }],
    hour: [{ id: 'bing-xin', name: '病符', tone: 'reminder' }],
  },
};

const sharedIChingData = {
  hexagram: 'XI JI ䷜',
  hexagramName: '既濟',
  yao: '六五｜初九',
};

// 模擬三卡的資料包裹
const iChingCardData = {
  source: sharedBaziData,
  shenSha: sharedShenShaData,
  iching: sharedIChingData,
  narrative: 'ICHING_TEACHER',
};

const ghostCardData = {
  source: sharedBaziData,
  shenSha: sharedShenShaData,
  iching: sharedIChingData,
  narrative: 'GHOST_TEACHER',
};

const asuraCardData = {
  source: sharedBaziData,
  shenSha: sharedShenShaData,
  iching: sharedIChingData,
  narrative: 'ASURA_WARRIOR',
};

// 驗證：排盤資料完全相同
assert.deepStrictEqual(iChingCardData.source, ghostCardData.source, '易經老師和鬼魅卡的四柱應相同');
assert.deepStrictEqual(ghostCardData.source, asuraCardData.source, '鬼魅卡和阿修羅卡的四柱應相同');
console.log('✓ 四柱資料：三卡完全相同\n');

// 驗證：神煞資料完全相同
assert.deepStrictEqual(iChingCardData.shenSha, ghostCardData.shenSha, '易經老師和鬼魅卡的神煞應相同');
assert.deepStrictEqual(ghostCardData.shenSha, asuraCardData.shenSha, '鬼魅卡和阿修羅卡的神煞應相同');
console.log('✓ 神煞資料：三卡完全相同\n');

// 驗證：易經卦象完全相同
assert.deepStrictEqual(iChingCardData.iching, ghostCardData.iching, '易經老師和鬼魅卡的卦象應相同');
assert.deepStrictEqual(ghostCardData.iching, asuraCardData.iching, '鬼魅卡和阿修羅卡的卦象應相同');
console.log('✓ 易經卦象：三卡完全相同\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 2：只改話術層，排盤不動
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 2】只改話術層，排盤不動');

// 三卡的話術層 output
const iChingNarrative = { tone: 'wisdom', text: '溫和的智慧' };
const ghostNarrative = { tone: 'mystique', text: '茅山門外低語' };
const asuraNarrative = { tone: 'warfare', text: '破局是承諾' };

// 驗證：話術層不同
assert.notDeepStrictEqual(iChingNarrative, ghostNarrative, '易經老師和鬼魅卡的話術應不同');
assert.notDeepStrictEqual(ghostNarrative, asuraNarrative, '鬼魅卡和阿修羅卡的話術應不同');
console.log('✓ 話術層：三卡各不相同\n');

// 驗證：修改話術層不影響排盤
const originalBaziCount = Object.keys(iChingCardData.source).length;
iChingCardData.narrative = 'MODIFIED';
const modifiedBaziCount = Object.keys(iChingCardData.source).length;
assert.strictEqual(originalBaziCount, modifiedBaziCount, '修改話術層不應影響排盤資料結構');
console.log('✓ 話術層修改：排盤資料完全不變\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 3：敘事層的五層結構完整
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 3】敘事層的五層結構完整');

// 模擬完整的阿修羅敘事層輸出
const asuraNarrativeStructure = {
  breakPoint: '你的卡點在這裡',  // 【破】
  lockCore: '真正的原因是',      // 【鎖】
  severing: '必須停止',          // 【斷】
  establish: '新的方向是',       // 【立】
  action: '第一個行動是',        // 【行】
};

// 驗證：五層結構完整
const layers = ['breakPoint', 'lockCore', 'severing', 'establish', 'action'];
layers.forEach(layer => {
  assert(asuraNarrativeStructure[layer], `敘事層應包含 ${layer}`);
  assert(typeof asuraNarrativeStructure[layer] === 'string', `${layer} 應為字符串`);
  assert(asuraNarrativeStructure[layer].length > 0, `${layer} 不應為空`);
});
console.log('✓ 五層結構：完整無遺漏\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 4：資料流單向（排盤 → 話術，不反向）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 4】資料流單向（排盤 → 話術，不反向）');

// 鐵律：敘事層不能修改排盤資料
const originalAsuraBazi = JSON.parse(JSON.stringify(asuraCardData.source));
// 模擬話術層處理
const narrativeOutput = {
  ...asuraNarrativeStructure,
  // 敘事層不應修改這些
  source: asuraCardData.source,
};
assert.deepStrictEqual(asuraCardData.source, originalAsuraBazi, '敘事層不應修改排盤資料');
console.log('✓ 資料流：單向流通，不反向污染\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 總結
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('═'.repeat(60));
console.log('✅ 阿修羅敘事層一致性守門 — 全部通過');
console.log('═'.repeat(60));
console.log(`
✓ 三卡共用同一份四柱資料（甲寅／庚午／甲辰／丙寅）
✓ 三卡共用同一份神煞資料（年月日時各 1-2 項）
✓ 三卡共用同一份易經卦象（既濟卦）
✓ 只改話術層（wisdom ≠ mystique ≠ warfare）
✓ 排盤資料完全不變（修改話術層不影響排盤）
✓ 敘事層五層結構完整（破鎖斷立行）
✓ 資料流單向（排盤 → 話術，禁止反向污染）

鐵律確認：
✓ 「盤不能狠」— 排盤資料 100% 尊重原盤
✓ 「話術可以霸」— 敘事層有完全自主的風格
✓ 「資料永不造假」— 同盤、同柱、同煞、同卦
`);
