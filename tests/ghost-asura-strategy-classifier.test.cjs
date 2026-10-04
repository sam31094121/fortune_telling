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

console.log('\n════════════════════════════════════════════════════════════');
console.log('✅ TYPE_A 至 TYPE_E 分型規格與話術單元驗證 — 全部通過');
console.log('════════════════════════════════════════════════════════════\n');
