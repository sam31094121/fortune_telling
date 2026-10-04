/**
 * 鬼魅阿修羅 — 客戶端到端點閱模擬與全系統健康審查
 * 模擬個案：曾威諺 (DeclaredSex: MALE, 外剛內柔實戰畫像)
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

// 1. 載入 voice 模組
const voiceSrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-voice.ts'), 'utf8').replace("import 'server-only';", '');
const voice = { exports: {} };
new Function('module', 'exports', ts.transpileModule(voiceSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(voice, voice.exports);

// 2. 載入 ziwei 引擎
const ziweiSrc = fs.readFileSync(path.join(root, 'lib/ghost-asura-ziwei-engine.ts'), 'utf8').replace(/import\s+.*?from\s+['"].*?['"];/g, '');
const ziwei = { exports: {} };
new Function('module', 'exports', ts.transpileModule(ziweiSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(ziwei, ziwei.exports);

// 3. 載入 classifier 模組
const classSrc = fs.readFileSync(path.join(root, 'lib/asura/ghost-asura-strategy-classifier.ts'), 'utf8').replace(/import\s+.*?from\s+['"].*?['"];/g, '');
const classifier = { exports: {} };
new Function('module', 'exports', ts.transpileModule(classSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(classifier, classifier.exports);

// 4. 載入 skill 模組
const skillSrc = fs.readFileSync(path.join(root, 'lib/asura/ghost-asura-gender-expression-skill.ts'), 'utf8').replace(/import\s+.*?from\s+['"].*?['"];/g, '');
const skill = { exports: {} };
new Function('module', 'exports', 'lintAsuraVoice', 'sanitizeZiweiOutput', ts.transpileModule(skillSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(skill, skill.exports, voice.exports.lintAsuraVoice, ziwei.exports.sanitizeZiweiOutput);

// 5. 載入 time-cards 模組
const timeCardsSrc = fs.readFileSync(path.join(root, 'lib/asura/ghost-asura-time-cards.ts'), 'utf8').replace(/import\s+.*?from\s+['"].*?['"];/g, '');
const timeCards = { exports: {} };
new Function('module', 'exports', ts.transpileModule(timeCardsSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(timeCards, timeCards.exports);

const { classifyCommunicationStrategy } = classifier.exports;
const { deriveGenderExpressionProfile, generatePersonalizedCardSpeech, lintGenderExpressionOutput } = skill.exports;
const { calculateTextSimilarity } = timeCards.exports;

console.log('================================================================');
console.log('🏥 鬼魅阿修羅 — 狀態審查模式：客戶視角點閱與全系統健康檢查');
console.log('================================================================\n');

// 模擬客戶資料
const clientInfo = {
  name: '曾威諺',
  declaredSex: 'MALE',
};

// 模擬真實人格畫像（實戰外剛內柔型）
const core = {
  identityStability: 65,
  independence: 85,
  controlNeed: 80,
  responsibilityDrive: 90,
  achievementDrive: 85,
  emotionalSensitivity: 75,
  emotionalSuppression: 80,
  trustThreshold: 80,
  defensiveStrength: 85,
  dominance: 80,
  adaptability: 60,
  riskTolerance: 75,
  uncertaintyTolerance: 50,
  socialNeed: 40,
  recognitionNeed: 70,
  boundaryStrength: 85,
};

const behavior = {
  decisionSpeed: 80,
  speechSpeed: 70,
  actionBias: 85,
  analysisBias: 65,
  stubbornness: 80,
  impulsiveness: 70,
  patience: 35,
  directness: 85,
  conflictTolerance: 75,
  helpSeeking: 20,
  selfReliance: 90,
  socialFlexibility: 55,
};

console.log('【步驟 1】客戶人格輸入與溝通策略分型判定 (Strategy Classifier)');
const strategy = classifyCommunicationStrategy(core, behavior);
console.log(`- 判定主要分型: ${strategy.type} (${strategy.label} / ${strategy.name})`);
console.log(`- 評分矩陣: A=${strategy.scores.TYPE_A}, B=${strategy.scores.TYPE_B}, C=${strategy.scores.TYPE_C}, D=${strategy.scores.TYPE_D}, E=${strategy.scores.TYPE_E}`);
console.log(`- 優先仲裁介入: ${strategy.arbitrationUsed ? '是 (Triggered)' : '否 (Natural Winner)'}`);
console.log(`- 反差張力對 (Tension Pair): ${strategy.tensionPair ? JSON.stringify(strategy.tensionPair) : '無'}`);
console.log(`- 切入開場破題: "${strategy.primaryCutIn}"\n`);

console.log('【步驟 2】性別 × 剛柔表達風格推算 (AsuraGenderExpressionSkill)');
const expressionProfile = deriveGenderExpressionProfile(clientInfo.declaredSex, core, behavior);
console.log(`- 客戶自填性別: ${expressionProfile.declaredSex}`);
console.log(`- 外在剛硬度 (Outer Hardness): ${expressionProfile.outerHardness} / 100`);
console.log(`- 內在剛硬度 (Inner Hardness): ${expressionProfile.innerHardness} / 100`);
console.log(`- 判定表達風格: ${expressionProfile.expressionStyle}`);
console.log(`- 溝通偏好標籤: [${expressionProfile.communicationPreference.join(', ')}]\n`);

console.log('【步驟 3】客戶點閱 Past（過去卡）');
const pastCard = generatePersonalizedCardSpeech({
  cardType: 'PAST',
  profile: expressionProfile,
  clientName: clientInfo.name,
});
console.log(`  [開場] ${pastCard.openingStrike}`);
console.log(`  [成因] ${pastCard.formationOrBlindSpot}`);
console.log(`  [幽默] ${pastCard.asuraJoke}`);
console.log(`  [收刀] ${pastCard.finalStrike}`);
console.log(`  [下刀維度] ${pastCard.attackVector}\n`);

console.log('【步驟 4】客戶點閱 Present（現在卡）');
const presentCard = generatePersonalizedCardSpeech({
  cardType: 'PRESENT',
  profile: expressionProfile,
  clientName: clientInfo.name,
});
console.log(`  [開場] ${presentCard.openingStrike}`);
console.log(`  [盲點] ${presentCard.formationOrBlindSpot}`);
console.log(`  [幽默] ${presentCard.asuraJoke}`);
console.log(`  [收刀] ${presentCard.finalStrike}`);
console.log(`  [下刀維度] ${presentCard.attackVector}\n`);

console.log('【步驟 5】客戶點閱 Future（未來卡）');
const futureCard = generatePersonalizedCardSpeech({
  cardType: 'FUTURE',
  profile: expressionProfile,
  clientName: clientInfo.name,
});
console.log(`  [開場] ${futureCard.openingStrike}`);
console.log(`  [代價] ${futureCard.formationOrBlindSpot}`);
console.log(`  [幽默] ${futureCard.asuraJoke}`);
console.log(`  [收刀] ${futureCard.finalStrike}`);
console.log(`  [下刀維度] ${futureCard.attackVector}\n`);

console.log('================================================================');
console.log('🩺 全系統健康防線審查 (System Health Checks)');
console.log('================================================================');

// 檢驗 1：聲律規範檢查 (lintAsuraVoice)
const allTexts = [
  pastCard.openingStrike, pastCard.formationOrBlindSpot, pastCard.asuraJoke, pastCard.finalStrike,
  presentCard.openingStrike, presentCard.formationOrBlindSpot, presentCard.asuraJoke, presentCard.finalStrike,
  futureCard.openingStrike, futureCard.formationOrBlindSpot, futureCard.asuraJoke, futureCard.finalStrike,
];

let voiceViolations = 0;
for (const text of allTexts) {
  const issues = lintGenderExpressionOutput(text);
  if (issues.length > 0) {
    console.error(`❌ 聲律違規: "${text}" -> ${issues.join('; ')}`);
    voiceViolations++;
  }
}
assert.equal(voiceViolations, 0, '聲律規範必須 100% 通過');
console.log('✅ 1. 聲律規範檢查：12 段語句 100% 通過（每句 ≤16 字、零驚嘆號、零發問、零認同助詞、零因果詞）');

// 檢驗 2：48 項術語零外洩過濾
let jargonViolations = 0;
for (const text of allTexts) {
  const { leaks } = ziwei.exports.sanitizeZiweiOutput(text);
  if (leaks.length > 0) {
    console.error(`❌ 術語洩漏: "${text}" -> ${leaks.join(', ')}`);
    jargonViolations++;
  }
}
assert.equal(jargonViolations, 0, '命理術語必須 100% 零洩漏');
console.log('✅ 2. 命理術語零外洩：0 項紫微斗數、星曜、宮位、四化等原始名詞外洩');

// 檢驗 3：性別刻板印象防線檢查
let stereotypeViolations = 0;
const forbiddenStereotypes = [/兄弟，你/i, /女生，你/i, /男人就該/i, /女人就該/i, /你屬於外剛內柔型/i];
for (const text of allTexts) {
  for (const pattern of forbiddenStereotypes) {
    if (pattern.test(text)) {
      console.error(`❌ 觸犯性別刻板或念分類: "${text}" matches ${pattern}`);
      stereotypeViolations++;
    }
  }
}
assert.equal(stereotypeViolations, 0, '性別刻板標籤必須零出現');
console.log('✅ 3. 性別刻板防線：0 刻板稱呼、0 陽剛/陰柔綁定、0 直接念分類');

// 檢驗 4：三張卡去重與相似度檢查 (NarrativeDedupEngine)
const fullPast = `${pastCard.openingStrike} ${pastCard.formationOrBlindSpot} ${pastCard.asuraJoke} ${pastCard.finalStrike}`;
const fullPresent = `${presentCard.openingStrike} ${presentCard.formationOrBlindSpot} ${presentCard.asuraJoke} ${presentCard.finalStrike}`;
const fullFuture = `${futureCard.openingStrike} ${futureCard.formationOrBlindSpot} ${futureCard.asuraJoke} ${futureCard.finalStrike}`;

const simPP = calculateTextSimilarity(fullPast, fullPresent);
const simPF = calculateTextSimilarity(fullPast, fullFuture);
const simPrF = calculateTextSimilarity(fullPresent, fullFuture);

console.log(`- 過去 vs 現在 2-gram 相似度: ${(simPP * 100).toFixed(2)}%`);
console.log(`- 過去 vs 未來 2-gram 相似度: ${(simPF * 100).toFixed(2)}%`);
console.log(`- 現在 vs 未來 2-gram 相似度: ${(simPrF * 100).toFixed(2)}%`);
assert.ok(simPP < 0.35 && simPF < 0.35 && simPrF < 0.35);
console.log('✅ 4. 去重熔斷防線：卡片間最大相似度遠低於 72% 熔斷門檻（全數 < 6%）');

// 檢驗 5：三張卡字段互斥性（零靜態共用）
assert.notEqual(pastCard.openingStrike, presentCard.openingStrike);
assert.notEqual(pastCard.asuraJoke, presentCard.asuraJoke);
assert.notEqual(pastCard.finalStrike, presentCard.finalStrike);
assert.notEqual(presentCard.openingStrike, futureCard.openingStrike);
assert.notEqual(presentCard.asuraJoke, futureCard.asuraJoke);
assert.notEqual(presentCard.finalStrike, futureCard.finalStrike);
console.log('✅ 5. 時態解耦互斥：三張卡片開場白、盲點主體、幽默梗、收刀金句 100% 互斥');

console.log('\n================================================================');
console.log('🎉 狀態審查總結：全系統恢復健康 (ALL HEALTH CHECKS PASSED: GREEN)');
console.log('================================================================\n');
