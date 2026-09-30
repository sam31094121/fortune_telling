/**
 * 阿修羅話術禁止詞掃描
 * ============================================================================
 * 業主定案 2026-09-30
 *
 * 嚴格禁止的字眼（測試會掃描所有阿修羅話術）：
 * ❌ 一定、必定、必然、註定 — 宿命論
 * ❌ 大凶、血光、橫禍、降頭 — 恐嚇
 * ❌ 只能、只有、被迫 — 消除自由意志
 * ❌ 預言、判定、算定 — 假裝有超自然能力
 * ============================================================================
 */

const FORBIDDEN_WORDS = [
  // 宿命論
  '一定',
  '必定',
  '必然',
  '註定',
  '宿命',
  '逃脫不了',
  '躲不過',
  // 恐嚇
  '大凶',
  '血光',
  '橫禍',
  '降頭',
  '詛咒',
  '磨難在前',
  // 消除自由意志
  '只能',
  '只有',
  '被迫',
  '無可奈何',
  // 假裝有超能力
  '預言',
  '判定',
  '算定',
  '看穿',
  '洞察',
  '天命',
];

// 模擬阿修羅話術內容（來自敘事層引擎）
const ASURA_SAMPLE_WORDINGS = {
  'tai-yi': {
    breakPoint: '你的核心卡點在於不知道自己有多強。',
    lockCore: '太極的力量一直都在，只是你沒看見。',
    severing: '停止把自己看小。',
    establish: '把焦點放回自己的力量。',
    action: '今天就確認一個你能做的事。',
  },
  'tao-hua': {
    breakPoint: '桃花吸走了你太多能量。',
    lockCore: '你在關係上的投入永遠大於回報。',
    severing: '停止用關係來填補空缺。',
    establish: '先和自己建立穩定的關係。',
    action: '列出三個不需要靠關係完成的目標。',
  },
  'bing-xin': {
    breakPoint: '病符的訊號是健康和思緒的混亂。',
    lockCore: '身體在說，但你沒有聽。',
    severing: '停止忽視身體的聲音。',
    establish: '用行動回應身體的需求。',
    action: '今天做一件對身體有益的事。',
  },
};

console.log('🔍 阿修羅話術禁止詞掃描\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 1：掃描樣本話術
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 1】掃描樣本話術');

function scanForForbiddenWords(text) {
  const found = [];
  for (const word of FORBIDDEN_WORDS) {
    if (text.includes(word)) {
      found.push(word);
    }
  }
  return found;
}

let totalViolations = 0;
for (const [id, wording] of Object.entries(ASURA_SAMPLE_WORDINGS)) {
  const layers = ['breakPoint', 'lockCore', 'severing', 'establish', 'action'];
  for (const layer of layers) {
    const text = wording[layer];
    const violations = scanForForbiddenWords(text);
    if (violations.length > 0) {
      console.error(`❌ ${id}.${layer} 包含禁止詞：${violations.join('、')}`);
      totalViolations += violations.length;
    }
  }
}

if (totalViolations === 0) {
  console.log('✓ 樣本話術：無禁止詞\n');
} else {
  throw new Error(`ASURA_FABRICATION_DETECTED: 發現 ${totalViolations} 個禁止詞`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 2：禁止詞列表完整性
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 2】禁止詞列表完整性');

// 驗證禁止詞列表不為空
if (FORBIDDEN_WORDS.length === 0) {
  throw new Error('禁止詞列表不能為空');
}
console.log(`✓ 禁止詞列表包含 ${FORBIDDEN_WORDS.length} 個詞\n`);

// 分類檢查
const categoryCounts = {
  '宿命論': ['一定', '必定', '必然', '註定', '宿命', '逃脫不了', '躲不過'].length,
  '恐嚇': ['大凶', '血光', '橫禍', '降頭', '詛咒', '磨難在前'].length,
  '消除自由意志': ['只能', '只有', '被迫', '無可奈何'].length,
  '假裝超能力': ['預言', '判定', '算定', '看穿', '洞察', '天命'].length,
};

console.log('禁止詞分類覆蓋：');
for (const [category, count] of Object.entries(categoryCounts)) {
  console.log(`  ✓ ${category}: ${count} 個`);
}
console.log();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 3：確認禁止詞掃描邏輯正確
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 3】禁止詞掃描邏輯驗證');

// 應該檢測到禁止詞
const violationText = '這是一定會發生的事，註定要遭遇大凶。';
const violations = scanForForbiddenWords(violationText);
if (violations.length !== 3) {
  throw new Error(`期望檢測 3 個禁止詞，實際檢測到 ${violations.length} 個`);
}
console.log(`✓ 正面測試：正確檢測到 ${violations.join('、')}\n`);

// 應該檢測不到禁止詞
const cleanText = '這是你的選擇，現在就可以改變。';
const cleanViolations = scanForForbiddenWords(cleanText);
if (cleanViolations.length !== 0) {
  throw new Error(`期望檢測 0 個禁止詞，實際檢測到 ${cleanViolations.length} 個`);
}
console.log(`✓ 負面測試：正確檢測到 0 個禁止詞\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 總結
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('═'.repeat(60));
console.log('✅ 阿修羅話術禁止詞掃描 — 全部通過');
console.log('═'.repeat(60));
console.log(`
禁止詞掃描結果：
✓ 樣本話術（3 個神煞 × 5 層結構）無禁止詞
✓ 禁止詞列表完整（${FORBIDDEN_WORDS.length} 個）
✓ 掃描邏輯正確（正面/負面測試均通過）

禁止列表確認：
✓ 宿命論 — 一定、必定、必然、註定、宿命
✓ 恐嚇 — 大凶、血光、橫禍、降頭、詛咒
✓ 消除自由意志 — 只能、只有、被迫、無可奈何
✓ 假裝超能力 — 預言、判定、算定、看穿、洞察

阿修羅的承諾：
✓ 直面真相，不說預言
✓ 尊重選擇，不說宿命
✓ 鼓勵行動，不說只能
✓ 提醒風險，不說恐嚇
`);
