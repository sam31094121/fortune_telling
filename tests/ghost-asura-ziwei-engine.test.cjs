/**
 * 鬼魅阿修羅 — 紫微斗數話術全面阿修羅化引擎 V2 測試
 * ============================================================================
 * 守門驗證：
 * 1. 十四主星人格種子完整性（14 主星 × 13 欄位）
 * 2. 人格融合引擎（PersonalityFusionEngine）多星交叉融合為單一人格
 * 3. 前端零紫微術語（Zero Ziwei Technical Jargon）嚴格檢查
 * 4. 阿修羅 23 項合規禁詞檢查（無宿命論、恐嚇、消除自由意志、偽超能力）
 * ============================================================================
 */

const assert = require('node:assert/strict');
const path = require('node:path');

// 轉譯加載 TypeScript 引擎
const ts = require('typescript');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const engineSrc = fs.readFileSync(path.join(root, 'lib/ghost-asura-ziwei-engine.ts'), 'utf8');
const compiled = ts.transpileModule(engineSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

const engineModule = { exports: {} };
new Function('module', 'exports', compiled)(engineModule, engineModule.exports);

const {
  ZIWEI_PERSONALITY_REGISTRY,
  PALACE_TO_DOMAIN_MAP,
  mapPalaceToLifeDomain,
  fuseStarPersonalities,
  sanitizeZiweiOutput,
  buildGhostAsuraZiweiNarrative,
  FORBIDDEN_ZIWEI_JARGON,
  FORBIDDEN_FABRICATION_TERMS,
  FORBIDDEN_BRIGHTNESS_TERMS,
  BRIGHTNESS_CONTEXT_RULES
} = engineModule.exports;

console.log('🔍 鬼魅阿修羅紫微斗數話術全面阿修羅化引擎 V2 測試\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 1：十四主星內部 Registry 完整性
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 1】十四主星內部 Registry 完整性');

const expectedStars = [
  'ZIWEI', 'TIANJI', 'TAIYANG', 'WUQU', 'TIANTONG', 'LIANZHEN',
  'TIANFU', 'TAIYIN', 'TANLANG', 'JUMEN', 'TIANXIANG', 'TIANLIANG',
  'QISHA', 'POJUN'
];

assert.equal(Object.keys(ZIWEI_PERSONALITY_REGISTRY).length, 14, '必須完整收錄 14 主星');

for (const starKey of expectedStars) {
  const dna = ZIWEI_PERSONALITY_REGISTRY[starKey];
  assert(dna, `缺少主星配置: ${starKey}`);
  assert.equal(dna.starKey, starKey);
  assert(dna.coreDrive.length > 0, `${starKey} coreDrive 不得為空`);
  assert(dna.decisionStyle.length > 0, `${starKey} decisionStyle 不得為空`);
  assert(dna.speechStyle.length > 0, `${starKey} speechStyle 不得為空`);
  assert(dna.stressResponse.length > 0, `${starKey} stressResponse 不得為空`);
  assert(Array.isArray(dna.strength) && dna.strength.length > 0, `${starKey} strength 必須為非空陣列`);
  assert(Array.isArray(dna.shadow) && dna.shadow.length > 0, `${starKey} shadow 必須為非空陣列`);
  assert(dna.desire.length > 0, `${starKey} desire 不得為空`);
  assert(dna.fear.length > 0, `${starKey} fear 不得為空`);
  assert(dna.socialStyle.length > 0, `${starKey} socialStyle 不得為空`);
  assert(dna.conflictStyle.length > 0, `${starKey} conflictStyle 不得為空`);
  assert(Array.isArray(dna.dominantVerb) && dna.dominantVerb.length >= 2, `${starKey} 核心動詞至少 2 個`);
  assert(dna.mature.length > 0, `${starKey} mature 成熟態不得為空`);
  assert(dna.unbalanced.length > 0, `${starKey} unbalanced 失衡態不得為空`);
  assert(Array.isArray(dna.humorDNA) && dna.humorDNA.length > 0, `${starKey} humorDNA 必須有梗`);
}

console.log('✓ 十四主星 Registry：14 主星 × 13 欄位完整收錄\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 2：宮位轉人生領域（LifeDomain）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 2】宮位轉人生領域映射驗證');

assert.equal(mapPalaceToLifeDomain('官祿宮'), '工作舞台與權責');
assert.equal(mapPalaceToLifeDomain('事業宮'), '工作舞台與權責');
assert.equal(mapPalaceToLifeDomain('財帛宮'), '資源掌握與收益');
assert.equal(mapPalaceToLifeDomain('夫妻宮'), '親密關係與界線');
assert.equal(mapPalaceToLifeDomain('命宮'), '核心主場與本質');
assert.equal(mapPalaceToLifeDomain('未知宮位'), '特定領域');

console.log('✓ 宮位映射：全部轉為人生實體領域，無原始宮位術語洩漏\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 3：多星人格交叉融合（PersonalityFusionEngine）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 3】多星人格交叉融合（三方四正 ONE PERSON）');

const sampleSignals = [
  { starKey: 'QISHA', strength: 90, role: 'DOMINANT', traits: ['決斷', '衝鋒'], evidenceIds: ['EV_QISHA'] },
  { starKey: 'POJUN', strength: 85, role: 'ACTION', traits: ['破局', '拆除'], evidenceIds: ['EV_POJUN'] },
  { starKey: 'JUMEN', strength: 70, role: 'PRESSURE', traits: ['質疑', '戳破'], evidenceIds: ['EV_JUMEN'] },
  { starKey: 'TIANFU', strength: 80, role: 'HIDDEN', traits: ['儲備', '守底牌'], evidenceIds: ['EV_TIANFU'] }
];

const unifiedProfile = fuseStarPersonalities(sampleSignals);
assert(unifiedProfile.archetype.length > 0, '原型標籤不得為空');
assert(unifiedProfile.coreTraits.length >= 4, '應聚合主力星特質');
assert(unifiedProfile.decisionStyle.includes('行動時'), '應整合主導與行動特質');
assert(unifiedProfile.evidenceIds.length === 4, '完整保留證據鏈 ID');

console.log(`✓ 人格融合：成功將 4 顆主力星融合成單一人格【${unifiedProfile.archetype}】\n`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 4：前端零紫微術語過濾守門（AsuraOutputSanitizer）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 4】前端零紫微術語過濾守門');

// 正面測試：應攔截紫微術語
const dirtyText = '因為命宮有七殺與破軍，且官祿宮化忌，所以事業宮面臨考驗。';
const dirtyCheck = sanitizeZiweiOutput(dirtyText);
assert(dirtyCheck.leaks.length >= 4, `應檢出術語洩漏，實際檢出: ${dirtyCheck.leaks.join('、')}`);

// 負面測試：純淨阿修羅話術應 0 洩漏
const cleanSample = '你習慣自己做決定。遇到舊框架卡住時，敢拆也敢重新洗牌。今年先讓別人把話說完，你再出招。';
const cleanCheck = sanitizeZiweiOutput(cleanSample);
assert.equal(cleanCheck.leaks.length, 0, '純淨話術不應有任何洩漏');

console.log('✓ 輸出淨化守門：精準攔截原始星曜名、宮位名、四化與煞曜\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 4-B：亮度複合術語安全匹配與一般中文防誤殺檢驗
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 4-B】亮度複合術語安全匹配與一般中文防誤殺檢驗');

// 0. 規則載入驗證：BRIGHTNESS_CONTEXT_RULES
assert(Array.isArray(BRIGHTNESS_CONTEXT_RULES), 'BRIGHTNESS_CONTEXT_RULES 必須為陣列');
assert.equal(BRIGHTNESS_CONTEXT_RULES.length, 3, 'BRIGHTNESS_CONTEXT_RULES 必須包含 3 組規則');
for (const rule of BRIGHTNESS_CONTEXT_RULES) {
  assert(typeof rule.name === 'string' && rule.name.length > 0, `規則名稱不得為空: ${JSON.stringify(rule)}`);
  assert(rule.pattern instanceof RegExp, `規則 pattern 必須為 RegExp: ${rule.name}`);
  assert(typeof rule.description === 'string' && rule.description.length > 0, `規則 description 不得為空: ${rule.name}`);
}
console.log('✓ 規則清單載入：成功載入 BRIGHTNESS_CONTEXT_RULES（3 組語境規則結構完整）');

// 1. 正面測試：命中各類亮度複合術語與間隔繞過
const brightnessPositiveCases = [
  { text: '此星曜入廟，氣勢正盛。', expectedTerm: '入廟' },
  { text: '命主局勢落陷，無外部奧援。', expectedTerm: '落陷' },
  { text: '全盤呈現廟旺之象，推進極快。', expectedTerm: '廟旺' },
  { text: '目前形勢平陷，需待時機。', expectedTerm: '平陷' },
  { text: '這套星系廟旺利陷極為複雜。', expectedTerm: '廟旺' },
  { text: '若逢主星入 廟，亦不可大意。', expectedTerm: '入廟' },
  { text: '遭遇煞星落-陷，守成為上。', expectedTerm: '落陷' },
];

for (const { text, expectedTerm } of brightnessPositiveCases) {
  const check = sanitizeZiweiOutput(text);
  assert(
    check.leaks.some((l) => l.includes(expectedTerm)),
    `應檢出亮度術語【${expectedTerm}】，實際檢出: ${JSON.stringify(check.leaks)}，原句: ${text}`
  );
}
console.log('✓ 正面攔截：成功攔截「入廟」、「落陷」、「廟旺」、「平陷」及符號間隔繞過');

// 2. 負面測試：防誤殺日常中文（包含利、不、平、得、陷、入廟參拜、落陷阱、地面落陷等）
const commonChineseNegativeCases = [
  '我們要從中獲取最大的利益。',
  '這不是你的責任，不要過度內耗。',
  '保持平常心，自得其樂。',
  '不要輕易陷入無意義的情緒內耗。',
  '信徒在春節期間入廟參拜祈求平安。',
  '居廟堂之高則憂其民。',
  '小心對手的策略陷阱，別輕易落入陷阱。',
  '連日豪雨導致部分山區路段地面落陷。',
  '只要努力付出，就能得到應有的認可。',
];

for (const text of commonChineseNegativeCases) {
  const check = sanitizeZiweiOutput(text);
  assert.equal(
    check.leaks.length,
    0,
    `日常中文被誤殺！洩漏項: ${JSON.stringify(check.leaks)}，原句: ${text}`
  );
}
console.log('✓ 負面防誤殺：成功保護 9 組易混淆日常中文句子，0 誤殺\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 5：實體話術生成與 23 禁用詞檢驗
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 5】實體話術生成與 23 禁用詞檢驗');

const mockZiweiChart = {
  palaces: [
    { name: '命宮', mainStar: '七殺', secondaryStars: ['擎羊'], yearlyInfluence: '變革' },
    { name: '官祿宮', mainStar: '破軍', secondaryStars: ['文昌'], yearlyInfluence: '突破' },
    { name: '財帛宮', mainStar: '貪狼', secondaryStars: ['火星'], yearlyInfluence: '得財' },
    { name: '遷移宮', mainStar: '天府', secondaryStars: ['左輔'], yearlyInfluence: '拓展' },
  ],
  analysis: ''
};

const output = buildGhostAsuraZiweiNarrative(mockZiweiChart, '張無忌');

// 檢查四大維度皆有內容
assert(output.corePersonality.length > 50, 'corePersonality 長度不足');
assert(output.pastNarrative.length > 50, 'pastNarrative 長度不足');
assert(output.presentNarrative.length > 50, 'presentNarrative 長度不足');
assert(output.futureNarrative.length > 50, 'futureNarrative 長度不足');
assert(output.cleanPass === true, '話術必須通過 100% 零術語清潔檢查');

// 全文禁詞掃描
const fullNarrative = `${output.corePersonality}\n${output.pastNarrative}\n${output.presentNarrative}\n${output.futureNarrative}\n${output.asuraJokes.join(' ')}`;

for (const jargon of FORBIDDEN_ZIWEI_JARGON) {
  assert(!fullNarrative.includes(jargon), `生成的用戶話術中嚴禁包含紫微術語：${jargon}`);
}

for (const word of FORBIDDEN_FABRICATION_TERMS) {
  assert(!fullNarrative.includes(word), `生成的用戶話術中嚴禁包含禁止詞：${word}`);
}

console.log('✓ 實體話術生成：核心人格、過去、現在、未來十年四層完整產出');
console.log('✓ 嚴格驗證：0 術語洩漏、0 宿命論恐嚇禁詞\n');

console.log('═'.repeat(60));
console.log('✅ 鬼魅阿修羅紫微斗數話術全面阿修羅化引擎 V2 — 全部通過');
console.log('═'.repeat(60));
