/**
 * 鬼魅阿修羅完整度守門測試
 *
 * 業主定案《工程師專用｜鬼魅阿修羅單卡｜直接開工版》
 *
 * 檢查項目：
 * 1. 附件「四」固定映射全覆蓋（含天煞）
 * 2. 固定名稱不得重名
 * 3. 穩定 Hash 無隨機性
 * 4. 前後端數量一致（completeness guard）
 * 5. 禁止把總數寫死成驗收條件
 */

import assert from 'assert';
import {
  GHOST_ASURA_50_SEEDS,
  GHOST_ASURA_FIXED_MAP,
  stableHash,
  translateMultipleNames,
  translateToAsuraName,
  validateGhostAsuraCompleteness,
} from '../lib/ghost-asura-registry.ts';

/** 附件「四」必收清單（驗收用，非總數上限） */
const ATTACHMENT_SECTION_FOUR_REQUIRED = [
  ['天德合', '天赦神契'],
  ['驛馬', '逐界行者'],
  ['隔角', '孤界之門'],
  ['金匱', '玄金寶庫'],
  ['五鬼', '五陰纏影'],
  ['沐浴', '洗魂之境'],
  ['日破', '裂日之痕'],
  ['天狗', '噬天之影'],
  ['災煞', '劫境之門'],
  ['天煞', '裂天劫印'],
  ['月破', '碎月之痕'],
  ['將星', '鎮軍之魂'],
  ['龍德', '天龍護命'],
  ['六厄', '六劫之關'],
  ['元辰', '幽辰之障'],
  ['羊刃', '血刃之鋒'],
  ['桃花', '魅生之印'],
  ['外桃花', '界外魅緣'],
  ['天乙貴人', '天乙神印'],
  ['太極貴人', '玄極天印'],
  ['文昌貴人', '文魂天契'],
  ['福星貴人', '福曜護命'],
  ['國印貴人', '鎮國之印'],
  ['學堂', '靈學之門'],
  ['詞館', '文魄秘殿'],
  ['天廚', '天饗神庫'],
  ['祿神', '玄祿寶印'],
  ['天醫', '天醫靈契'],
  ['華蓋', '孤華幽冠'],
  ['劫煞', '劫魂之刃'],
  ['亡神', '亡影幽魂'],
  ['白虎', '白虎血印'],
  ['喪門', '喪界幽門'],
  ['弔客', '弔魂之影'],
  ['披麻', '麻衣冥印'],
  ['孤辰', '孤辰絕界'],
  ['寡宿', '寡宿幽宮'],
  ['紅鸞', '紅鸞魅印'],
  ['天喜', '天喜緣契'],
  ['咸池', '魅池情印'],
  ['紅艷', '緋艷魅魂'],
  ['童子', '童靈之印'],
  ['陰差陽錯', '陰陽錯界'],
  ['十惡大敗', '十敗劫印'],
  ['魁罡', '魁罡戰魂'],
  ['飛刃', '飛刃血痕'],
  ['流霞', '流霞魅痕'],
  ['天羅地網', '羅網禁界'],
  ['血刃', '赤血刃印'],
  ['勾絞', '勾魂絞界'],
  ['空亡', '虛界空印'],
];

console.log('🔍 鬼魅阿修羅完整度守門測試');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 1：附件「四」必收項完整（含天煞）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 1】附件「四」固定映射完整');
assert.ok(GHOST_ASURA_50_SEEDS.length >= ATTACHMENT_SECTION_FOUR_REQUIRED.length, '母種不得少於附件「四」');
assert.strictEqual(
  GHOST_ASURA_50_SEEDS.length,
  Object.keys(GHOST_ASURA_FIXED_MAP).length,
  'seeds 與 FIXED_MAP 數量必須一致'
);

for (const [original, asura] of ATTACHMENT_SECTION_FOUR_REQUIRED) {
  assert.strictEqual(
    GHOST_ASURA_FIXED_MAP[original],
    asura,
    `${original} 必須映射為 ${asura}`
  );
}

assert.strictEqual(translateToAsuraName('天煞'), '裂天劫印');
assert.strictEqual(translateToAsuraName('五鬼'), '五陰纏影');
assert.strictEqual(translateToAsuraName('桃花'), '魅生之印');
assert.strictEqual(translateToAsuraName('羊刃'), '血刃之鋒');
console.log(`✓ 附件「四」 ${ATTACHMENT_SECTION_FOUR_REQUIRED.length} 項全覆蓋（實際母種 ${GHOST_ASURA_50_SEEDS.length}）`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 2：固定名稱不得重名
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 2】固定名稱不得重名');
const asuraNames = GHOST_ASURA_50_SEEDS.map((s) => s.asura);
const uniqueNames = new Set(asuraNames);
assert.strictEqual(asuraNames.length, uniqueNames.size, '阿修羅名稱不得重複');
console.log(`✓ 名稱唯一（${uniqueNames.size} 個不同名稱）`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 3：穩定 Hash 無隨機性
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 3】穩定 Hash 無隨機性');
const testInputs = ['天德合', '驛馬', '隔角', '金匱', '五鬼', '天煞', '未收錄神煞甲'];
testInputs.forEach((input) => {
  const hash1 = stableHash(input);
  const hash2 = stableHash(input);
  const hash3 = stableHash(input);
  assert.strictEqual(hash1, hash2, `${input} 第一次和第二次 Hash 必須相同`);
  assert.strictEqual(hash2, hash3, `${input} 第二次和第三次 Hash 必須相同`);
});

const generatedA = translateToAsuraName('未收錄神煞甲');
const generatedB = translateToAsuraName('未收錄神煞甲');
assert.strictEqual(generatedA, generatedB, '未收錄神煞必須穩定延伸同名');
assert.notStrictEqual(generatedA, '未收錄神煞甲', '未收錄神煞不得原樣消失／不轉譯');
console.log(`✓ 穩定 Hash + 未收錄延伸通過（同輸入 = 同輸出）`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 4：映射表與 seeds 對齊
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 4】映射表與 seeds 對齊');
GHOST_ASURA_50_SEEDS.forEach((seed) => {
  assert.strictEqual(
    GHOST_ASURA_FIXED_MAP[seed.original],
    seed.asura,
    `${seed.original} 映射錯誤`
  );
});
console.log(`✓ 映射完整且正確`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 5：前後端數量一致（completeness guard）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 5】前後端數量一致');

const originals = GHOST_ASURA_50_SEEDS.map((s) => s.original);
const backendCount = originals.length;
const frontendAsuraCount = translateMultipleNames(originals).length;

const validation = validateGhostAsuraCompleteness(backendCount, frontendAsuraCount);
assert.strictEqual(validation.status, 'PASSED', validation.message);
console.log(`✓ ${validation.message}`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 6：不同數量的失敗案例
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n【測試 6】不同數量的失敗案例');
const failedValidation = validateGhostAsuraCompleteness(backendCount, backendCount - 1);
assert.strictEqual(failedValidation.status, 'FAILED', '數量不符應該失敗');
console.log(`✓ 完整度檢查：${backendCount} ≠ ${backendCount - 1} → FAILED（預期行為）`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 總結
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('\n' + '═'.repeat(60));
console.log('✅ 鬼魅阿修羅完整度守門 — 全部通過');
console.log('═'.repeat(60));
console.log(`
✓ 附件「四」固定映射完整（含天煞→裂天劫印）
✓ 固定名稱不得重名
✓ 穩定 Hash 無隨機性
✓ 未收錄神煞穩定延伸
✓ 映射表完整正確
✓ 前後端數量一致守門
✓ 不同數量檢測失敗案例
✓ 未把總數寫死為驗收條件
`);
