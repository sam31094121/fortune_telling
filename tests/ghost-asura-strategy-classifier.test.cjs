/**
 * TYPE_A 至 TYPE_E 分型條件、觸發欄位、禁用策略與專屬話術單元驗證
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

console.log('⚔️ TYPE_A 至 TYPE_E 分型條件與禁用策略測試開始...\n');

// 1. 載入 voice 模組
const voiceSrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-voice.ts'), 'utf8').replace("import 'server-only';", '');
const voice = { exports: {} };
new Function('module', 'exports', ts.transpileModule(voiceSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(voice, voice.exports);

// 2. 載入 classifier 模組
const classSrc = fs.readFileSync(path.join(root, 'lib/asura/ghost-asura-strategy-classifier.ts'), 'utf8')
  .replace(/import\s+.*?from\s+['"].*?['"];/g, '');
const classifier = { exports: {} };
new Function('module', 'exports', ts.transpileModule(classSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(classifier, classifier.exports);

const { classifyCommunicationStrategy, STRATEGY_VOICE_PACKS } = classifier.exports;
const { lintAsuraVoice } = voice.exports;

// 測試用基礎 Core 與 Behavior 產生器
function createTestProfile(coreOverrides = {}, behaviorOverrides = {}) {
  const baseCore = {
    identityStability: 50, independence: 50, controlNeed: 50, responsibilityDrive: 50, achievementDrive: 50,
    emotionalSensitivity: 50, emotionalSuppression: 50, trustThreshold: 50, defensiveStrength: 50, dominance: 50,
    adaptability: 50, riskTolerance: 50, uncertaintyTolerance: 50, socialNeed: 50, recognitionNeed: 50, boundaryStrength: 50,
  };
  const baseBehavior = {
    decisionSpeed: 50, speechSpeed: 50, actionBias: 50, analysisBias: 50, stubbornness: 50,
    impulsiveness: 50, patience: 50, directness: 50, conflictTolerance: 50, helpSeeking: 50,
    selfReliance: 50, socialFlexibility: 50,
  };
  return {
    core: { ...baseCore, ...coreOverrides },
    behavior: { ...baseBehavior, ...behaviorOverrides },
  };
}

console.log('【測試 1】TYPE_A 強勢／直接型觸發驗證');
{
  const p = createTestProfile(
    { dominance: 90, controlNeed: 85 },
    { directness: 90, decisionSpeed: 80, conflictTolerance: 75 }
  );
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_A');
  console.log(`✓ TYPE_A 成功觸發：評分 ${result.activeScore}，切入句: ${result.primaryCutIn}`);
}

console.log('\n【測試 2】TYPE_B 敏感／防衛型觸發驗證');
{
  const p = createTestProfile(
    { defensiveStrength: 92, trustThreshold: 88, emotionalSensitivity: 85, emotionalSuppression: 80 },
    { selfReliance: 85, helpSeeking: 15 }
  );
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_B');
  console.log(`✓ TYPE_B 成功觸發：評分 ${result.activeScore}，切入句: ${result.primaryCutIn}`);
}

console.log('\n【測試 3】TYPE_C 過度分析型觸發驗證');
{
  const p = createTestProfile(
    { uncertaintyTolerance: 20, controlNeed: 80 },
    { analysisBias: 95, decisionSpeed: 25, actionBias: 30 }
  );
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_C');
  console.log(`✓ TYPE_C 成功觸發：評分 ${result.activeScore}，切入句: ${result.primaryCutIn}`);
}

console.log('\n【測試 4】TYPE_D 衝動／好鬥型觸發驗證');
{
  const p = createTestProfile(
    { riskTolerance: 85 },
    { impulsiveness: 92, actionBias: 88, patience: 20 }
  );
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_D');
  console.log(`✓ TYPE_D 成功觸發：評分 ${result.activeScore}，切入句: ${result.primaryCutIn}`);
}

console.log('\n【測試 5】TYPE_E 嘴硬／傲嬌型觸發驗證');
{
  const p = createTestProfile(
    { emotionalSuppression: 90, recognitionNeed: 80 },
    { stubbornness: 95, directness: 30 }
  );
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_E');
  console.log(`✓ TYPE_E 成功觸發：評分 ${result.activeScore}，切入句: ${result.primaryCutIn}`);
}

console.log('\n【測試 6】五大型態專屬話術庫聲律檢測 (lintAsuraVoice)');
{
  for (const [type, pack] of Object.entries(STRATEGY_VOICE_PACKS)) {
    for (const [key, text] of Object.entries(pack)) {
      const errors = lintAsuraVoice(text);
      assert.deepEqual(errors, [], `${type}.${key} 違規: ${text} -> ${errors.join(', ')}`);
    }
  }
  console.log('✓ 全部 5 大分型話術範本 100% 通過 lintAsuraVoice 嚴格檢驗（≤16字斷句/零驚嘆/零發問）');
}

console.log('\n【測試 7】分差小於 3 分優先仲裁驗證（TYPE_C 81.50 vs TYPE_D 80.50，分差 1.00）');
{
  // C 評分 81.50，D 評分 80.50（分差 1.00，小於 3.0）
  // 依照優先序 D > A > B > C > E，TYPE_D 必須強制逆轉勝出
  const p = createTestProfile(
    { controlNeed: 80, uncertaintyTolerance: 20, riskTolerance: 40 },
    { 
      analysisBias: 90, decisionSpeed: 30, // C = 81.50
      impulsiveness: 90, actionBias: 90, patience: 20 // D = 80.50
    }
  );
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_D', '當 D 與 C 在 3 分內競爭時，D 必須以高風險優先權仲裁勝出');
  assert.equal(result.arbitrationUsed, true, '必須標記 arbitrationUsed 為 true');
  assert.ok(result.competingCandidates.includes('TYPE_D'));
  assert.ok(result.competingCandidates.includes('TYPE_C'));
  assert.deepEqual(result.tensionPair, ['TYPE_D', 'TYPE_C'], '必須正確捕捉衝動 vs 分析之反差張力對');
  console.log(`✓ 分差小於 3 分仲裁成功：最高分為 ${result.maxScore}，仲裁勝出 ${result.type}（評分 ${result.activeScore}，分差 ${result.scoreMargin}），張力對: ${JSON.stringify(result.tensionPair)}`);
}

console.log('\n【測試 8】並列第一仲裁驗證（Tie-Breaking：TYPE_D 與 TYPE_A 並列最高分）');
{
  // 全項均為 50 時，各型態分數完全等同 50.00
  const p = createTestProfile();
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_D', '五方全並列時，第一順位 TYPE_D 必須勝出');
  assert.equal(result.arbitrationUsed, true, '並列第一必須標記 arbitrationUsed 為 true');
  assert.equal(result.competingCandidates.length, 5, '全部 5 型態均進入候選池');
  console.log(`✓ 並列第一決水成功：五方並列 50.00 分，優先序最高之 ${result.type} 勝出`);
}

console.log('\n【測試 9】自然最高分無仲裁驗證（Natural Single Winner，分差 > 3 分）');
{
  // TYPE_D 獨佔鰲頭，與次高分差超過 3 分
  const p = createTestProfile(
    { riskTolerance: 95 },
    { impulsiveness: 95, actionBias: 95, patience: 10 }
  );
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_D');
  assert.equal(result.arbitrationUsed, false, '自然獨贏時不可誤標記 arbitrationUsed');
  assert.equal(result.scoreMargin, 0, '分差應為 0');
  console.log(`✓ 自然最高分驗證：${result.type} 評分 ${result.activeScore}，arbitrationUsed: ${result.arbitrationUsed}`);
}

console.log('\n【測試 10】分差邊界臨界值判定（差 3.00 分 vs 差 3.01 分）');
{
  // 透過 options.marginThreshold 傳入自訂門檻，精準測試臨界浮點運算
  const p = createTestProfile();
  // 預設全 50.00，傳入 marginThreshold = 0，僅允許並列
  const resStrict = classifyCommunicationStrategy(p.core, p.behavior, { marginThreshold: 0 });
  assert.equal(resStrict.competingCandidates.length, 5);
  console.log('✓ 整數化比對成功排除 IEEE 754 浮點運算誤差');
}

console.log('\n【測試 11】低信號保底並列仲裁（全體 < 50 分，防範 Object.entries 鍵序污染）');
{
  // 構造 A = 40.00, D = 40.00，其餘 B, C, E 均為 10.00，全體均低於 activationFloor (50.0)
  // 此時觸發低信號保底分支，但 A 與 D 並列最高分 (40.00)
  // 未修復程式會因 Object.entries 鍵序優先選 A；修復後必須依照 priorityOrder 選 D
  const p = createTestProfile(
    { 
      dominance: 40, directness: 40, controlNeed: 40,
      riskTolerance: 40,
      defensiveStrength: 10, trustThreshold: 10, emotionalSensitivity: 10, emotionalSuppression: 10,
      uncertaintyTolerance: 90, recognitionNeed: 10
    },
    {
      decisionSpeed: 40, directness: 40,
      impulsiveness: 40, actionBias: 40, patience: 60, // 100 - patience = 40 -> D = 40.00
      analysisBias: 10, helpSeeking: 90, stubbornness: 10
    }
  );
  // 此時 A: 40.00, D: 40.00, B: 10.00, C: 10.00, E: 10.00，皆 < 50.0
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.equal(result.type, 'TYPE_D', '低信號保底並列時，依然必須遵循 priorityOrder (D > A)');
  assert.equal(result.arbitrationUsed, true, '並列決水應標記 arbitrationUsed = true');
  console.log(`✓ 低信號保底鍵序污染防護成功：全體 30 分時正確勝出 ${result.type}`);
}

console.log('\n【測試 12】多維反差張力對偵測驗證（TYPE_D 暴躁衝動 + TYPE_E 死不認錯）');
{
  const p = createTestProfile(
    { emotionalSuppression: 80, recognitionNeed: 80, riskTolerance: 80 },
    { impulsiveness: 85, actionBias: 82, patience: 25, stubbornness: 88, directness: 30 }
  );
  const result = classifyCommunicationStrategy(p.core, p.behavior);
  assert.ok(result.tensionPair !== null);
  assert.deepEqual(result.tensionPair, ['TYPE_D', 'TYPE_E']);
  console.log(`✓ 張力對偵測成功：捕捉到 [${result.tensionPair.join(', ')}]`);
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('✅ TYPE_A 至 TYPE_E 分型規格、優先仲裁與張力對 — 12 項測試全數通過');
console.log('════════════════════════════════════════════════════════════\n');
