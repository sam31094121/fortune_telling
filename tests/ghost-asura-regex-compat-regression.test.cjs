/**
 * 鬼魅阿修羅 — 正則跨平台相容性與語境回歸測試套件
 * ============================================================================
 * 測試維度：
 * 1. 舊版 Safari (< 16.4) 語法相容性靜態檢測（禁絕 Lookbehind 語法崩潰）
 * 2. Node.js 執行期效能與無回溯測試
 * 3. 標點符號分隔防誤殺（逗號、頓號、引號阻隔情境）
 * 4. 空白插入、Tab、零寬字符與連字號防穿透繞過
 * 5. 合法地質與民間宗教語境白名單豁免
 * 6. 真實紫微術數術語 100% 精確攔截
 * ============================================================================
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const engineFilePath = path.join(root, 'lib/ghost-asura-ziwei-engine.ts');
const engineSrc = fs.readFileSync(engineFilePath, 'utf8');

// 轉譯 TypeScript 引擎模組
const compiled = ts.transpileModule(engineSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

const engineModule = { exports: {} };
new Function('module', 'exports', compiled)(engineModule, engineModule.exports);

const {
  sanitizeZiweiOutput,
  isLegitimateContext,
  BRIGHTNESS_PATTERNS,
  FORBIDDEN_BRIGHTNESS_TERMS
} = engineModule.exports;

console.log('🧪 鬼魅阿修羅正則跨平台相容性與語境回歸測試開始...\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 維度 1：舊版 Safari (< 16.4) 語法相容性靜態檢測
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【維度 1】舊版 Safari (< 16.4) 語法相容性靜態檢測');

// Safari 16.4 以前版本若在 RegExp 中發現 Lookbehind (?<= 或 (?<! 會拋出致命 SyntaxError
// 故驗證整支引擎源碼中不允許存在任何 Lookbehind 正則表達式
const lookbehindRegex = /\(\?<[=!]/g;
const lookbehindMatches = engineSrc.match(lookbehindRegex);

assert.equal(
  lookbehindMatches,
  null,
  `[Safari相容性失敗] 程式碼中仍包含 Lookbehind 語法: ${JSON.stringify(lookbehindMatches)}，將導致 Safari < 16.4 語法解析失敗！`
);

// 驗證導出的所有正則物件其 source 均無 Lookbehind
for (const [key, pattern] of Object.entries(BRIGHTNESS_PATTERNS)) {
  assert(
    !lookbehindRegex.test(pattern.source),
    `[Safari相容性失敗] BRIGHTNESS_PATTERNS.${key} 正則源碼包含 Lookbehind 語法: ${pattern.source}`
  );
}

console.log('✓ Safari 相容性：源碼 100% 無 Lookbehind，在 Safari < 16.4 及舊版 iOS WebKit 安全無崩潰\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 維度 2：標點符號分隔容錯與語境豁免（防誤殺）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【維度 2】標點符號分隔防誤殺測試（逗號、頓號、冒號、引號阻隔）');

const punctuationNegativeCases = [
  {
    title: '路面與落陷之間夾雜逗號與頓號',
    text: '連日豪雨沖刷，路面、地層，落陷情況相當嚴重。',
    term: '落陷'
  },
  {
    title: '地面與落陷夾雜引號與副詞',
    text: '工務局表示「地面」已出現局部落陷，請車輛改道。',
    term: '落陷'
  },
  {
    title: '入廟與參拜之間夾雜逗號與副詞',
    text: '他初次入廟，虔誠參拜了正殿神明。',
    term: '入廟'
  },
  {
    title: '寺廟語境夾雜冒號',
    text: '遊客進入這座百年宮廟：入廟參觀時請保持肅靜。',
    term: '入廟'
  },
  {
    title: '廟宇建築門檻名詞',
    text: '信眾依序邁入廟門，向神明祈求安康。',
    term: '入廟'
  },
  {
    title: '落入陷阱夾雜標點',
    text: '商場競爭激烈，切勿落入、落進對手的陷阱。',
    term: '落陷'
  },
  {
    title: '大軍陷入泥沼語境',
    text: '先鋒部隊一時不察，落陷於泥沼與深坑之中。',
    term: '落陷'
  }
];

for (const { title, text, term } of punctuationNegativeCases) {
  const result = sanitizeZiweiOutput(text);
  assert.equal(
    result.leaks.length,
    0,
    `[標點容錯誤殺] 測試「${title}」被誤殺為洩漏！洩漏項: ${JSON.stringify(result.leaks)}，原句: ${text}`
  );
}

console.log('✓ 標點符號容錯：7 組複雜標點分隔之日常語境均成功豁免，0 誤殺\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 維度 3：空白插入、Tab、零寬字符與連字號防繞過測試
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【維度 3】空白、Tab、零寬字符與分隔符防繞過測試（混淆穿透防禦）');

const delimiterEvasionCases = [
  {
    type: '半形空格插入',
    text: '此時此星入 廟，氣勢極旺。',
    expectedTerm: '入廟'
  },
  {
    type: '全形空格插入',
    text: '若見主星落　陷，難有轉圜。',
    expectedTerm: '落陷'
  },
  {
    type: 'Tab 製表符插入',
    text: '形勢呈現廟\t旺之象。',
    expectedTerm: '廟旺'
  },
  {
    type: '連字號插入',
    text: '此處星曜平-陷，當守為宜。',
    expectedTerm: '平陷'
  },
  {
    type: '底線符號插入',
    text: '全盤廟_旺_利_陷極其繁雜。',
    expectedTerm: '廟旺'
  },
  {
    type: '中文字間隔號·插入',
    text: '此星位入·廟，能量聚集。',
    expectedTerm: '入廟'
  },
  {
    type: '零寬空白 (Zero-Width Space U+200B) 穿透攻擊',
    text: '命宮主星落\u200B陷，無力支撐。',
    expectedTerm: '落陷'
  }
];

for (const { type, text, expectedTerm } of delimiterEvasionCases) {
  const result = sanitizeZiweiOutput(text);
  const found = result.leaks.some((l) => l.includes(expectedTerm));
  assert(
    found,
    `[混淆繞過漏洞] 測試「${type}」未能成功攔截【${expectedTerm}】！原句: ${text}`
  );
}

console.log('✓ 混淆穿透防禦：7 種空格、Tab、連字號、零寬字符穿透攻擊全數成功攔截\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 維度 4：合法地質與宗教語境邊界回歸測試
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【維度 4】合法地質工程與民間宗教語境邊界測試');

const legitimateDomainCases = [
  '山區邊坡土質鬆動，導致路基落陷。',
  '地震過後，地下水管破裂造成地層落陷。',
  '信徒隨大甲媽祖繞境，入廟參拜祈求闔家平安。',
  '古剎香火鼎盛，信眾入廟祈福絡繹不絕。',
  '居廟堂之高則憂其民，處江湖之遠則憂其君。',
  '天后宮落成，各地陣頭依序入廟行禮。'
];

for (const text of legitimateDomainCases) {
  const result = sanitizeZiweiOutput(text);
  assert.equal(
    result.leaks.length,
    0,
    `[合法語境誤殺] 語句被誤判為術語洩漏！洩漏項: ${JSON.stringify(result.leaks)}，原句: ${text}`
  );
}

console.log('✓ 合法語境白名單：地質塌陷與宗教祭祀語句 100% 豁免，無誤殺\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 維度 5：真實紫微術數術語 100% 精準攔截（正向守門）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【維度 5】真實紫微術數術語精準攔截（正向守門）');

const truePositiveCases = [
  { text: '此星入廟，光芒四射。', expected: '入廟' },
  { text: '逢凶星衝擊，局勢落陷。', expected: '落陷' },
  { text: '本命星曜廟旺，無往不利。', expected: '廟旺' },
  { text: '四煞夾擊之下，呈現平陷之勢。', expected: '平陷' },
  { text: '主星入廟，威嚴自顯。', expected: '主星' }
];

for (const { text, expected } of truePositiveCases) {
  const result = sanitizeZiweiOutput(text);
  const found = result.leaks.some((l) => l.includes(expected));
  assert(found, `[術數漏網] 術語【${expected}】未被成功檢出！原句: ${text}`);
}

console.log('✓ 術數正面攔截：所有紫微星曜亮度術語 100% 精確識別\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 維度 6：Node.js 運行時高頻效能與無回溯爆炸測試
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【維度 6】Node.js 高頻執行效能與回溯測試');

const benchmarkText = `
你習慣自己做決定。遇到舊框架卡住時，敢拆也敢重新洗牌。
連日豪雨導致山區道路路面落陷，工務局緊急搶修中。
信眾在過年期間入廟參拜祈求身體健康，廟方熱情招待。
真正厲害的不是翻桌，是你翻完之後，下一桌的底牌已經準備好了。
`;

const startTime = process.hrtime.bigint();
const iterations = 1000;

for (let i = 0; i < iterations; i++) {
  sanitizeZiweiOutput(benchmarkText);
}

const endTime = process.hrtime.bigint();
const durationMs = Number(endTime - startTime) / 1e6;
const avgPerCall = (durationMs / iterations).toFixed(4);

console.log(`✓ 效能測試：執行 ${iterations} 次檢測，總耗時: ${durationMs.toFixed(2)} ms，平均每次調用: ${avgPerCall} ms`);
assert(durationMs < 500, `效能不達標：1000 次調用耗時 ${durationMs} ms 超出閾值 (500 ms)`);

console.log('\n' + '═'.repeat(60));
console.log('✅ 鬼魅阿修羅正則跨平台相容性與語境回歸測試 — 全部通過');
console.log('═'.repeat(60));
