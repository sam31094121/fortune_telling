/**
 * 鬼魅阿修羅 — 過去／現在／未來 三張卡片全面強化回測 (GHOST_ASURA_TIME_CARDS_V1)
 * ============================================================================
 * 驗收標準：
 * 1. 過去卡只解形成、現在卡只解當下、未來卡只解趨勢（三個獨立解題器）
 * 2. 三張卡語氣明顯不同，內容零高度重複（相似度 < 0.72 通過）
 * 3. 證據強度對齊（LEVEL_1 到 LEVEL_4 話術映射）
 * 4. 零紫微斗數/八字術語、零恐嚇詛咒禁止詞
 * 5. 前端複製話術與卡片程式碼資料模型結構完整性
 * ============================================================================
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const engineFilePath = path.join(root, 'lib/asura/ghost-asura-time-cards.ts');
const engineSrc = fs.readFileSync(engineFilePath, 'utf8');

// 轉譯 TypeScript
const compiled = ts.transpileModule(engineSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

// 轉譯加載依賴的 ghost-asura-ziwei-engine.ts
const ziweiEngineSrc = fs.readFileSync(path.join(root, 'lib/ghost-asura-ziwei-engine.ts'), 'utf8');
const compiledZiwei = ts.transpileModule(ziweiEngineSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const ziweiModule = { exports: {} };
new Function('module', 'exports', compiledZiwei)(ziweiModule, ziweiModule.exports);

const customRequire = (id) => {
  if (id.includes('ghost-asura-ziwei-engine')) {
    return ziweiModule.exports;
  }
  return require(id);
};

const timeCardsModule = { exports: {} };
new Function('module', 'exports', 'require', compiled)(timeCardsModule, timeCardsModule.exports, customRequire);

const {
  buildPastCard,
  buildPresentCard,
  buildFutureCard,
  buildGhostAsuraTimeCards,
  calculateTextSimilarity,
  STRENGTH_VERDICTS
} = timeCardsModule.exports;

console.log('⚔️ 鬼魅阿修羅過去／現在／未來 三張卡片全面強化測試開始...\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 1：三張卡獨立解題器驗證
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 1】三張卡獨立解題器結構與內容驗證');

const sampleParams = {
  userName: '韓立',
  evidenceStrength: 4,
  evidenceIds: ['EV_QISHA_DOMINANT', 'EV_POJUN_ACTION']
};

const pastCard = buildPastCard(sampleParams);
const presentCard = buildPresentCard(sampleParams);
const futureCard = buildFutureCard(sampleParams);

// 過去卡：只解形成
assert.equal(pastCard.period, 'past');
assert(pastCard.formationCause.length > 20, '過去卡必須包含形成原因');
assert(pastCard.survivalPattern.length > 20, '過去卡必須包含生存防衛模式');
assert(pastCard.personalityTrace.length > 20, '過去卡必須包含性格痕跡');
assert(pastCard.openingStrike.includes('自動防禦'), '過去卡梗必須揭穿以前留下來的自動防禦');
console.log('✓ 過去卡：成功解構「我是怎麼被塑造成現在這個人的」，揭底感明確');

// 現在卡：只解當下
assert.equal(presentCard.period, 'present');
assert(presentCard.currentState.length > 20, '現在卡必須包含當前狀態');
assert(presentCard.dominantForce.length > 20, '現在卡必須包含當前最強力量');
assert(presentCard.currentBlindSpot.length > 20, '現在卡必須包含致命盲點');
assert(presentCard.currentAdvice.length > 20, '現在卡必須包含當前指引');
assert(presentCard.openingStrike.includes('散會'), '現在卡梗必須當場戳破');
console.log('✓ 現在卡：成功直指「我現在到底處在什麼狀態」，當面點醒直截了當');

// 未來卡：只解趨勢
assert.equal(futureCard.period, 'future');
assert(futureCard.futureTrend.length > 20, '未來卡必須包含趨勢');
assert(futureCard.turningPoint.length > 20, '未來卡必須包含轉折點');
assert(futureCard.choiceBranch.length > 20, '未來卡必須包含選擇分支');
assert(futureCard.openingStrike.includes('門變多'), '未來卡梗必須有提前預警感');
assert(!futureCard.coreNarrative.includes('一定') && !futureCard.coreNarrative.includes('註定'), '未來卡嚴禁宿命論斷言');
console.log('✓ 未來卡：成功預判「照這個趨勢走下去，後面會怎麼發展」，時間與選擇感鮮明\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 2：NarrativeDedupEngine 去重與相似度檢查
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 2】NarrativeDedupEngine 語意去重檢查');

const timeCardsOutput = buildGhostAsuraTimeCards(sampleParams);

console.log(`- 過去 vs 現在 相似度: ${timeCardsOutput.dedupScore.pastPresentSim}`);
console.log(`- 現在 vs 未來 相似度: ${timeCardsOutput.dedupScore.presentFutureSim}`);
console.log(`- 過去 vs 未來 相似度: ${timeCardsOutput.dedupScore.pastFutureSim}`);
console.log(`- 最大相似度: ${timeCardsOutput.dedupScore.maxSimilarity} (門檻: < 0.72)`);

assert(timeCardsOutput.dedupScore.passed, `去重失敗！最大相似度 ${timeCardsOutput.dedupScore.maxSimilarity} 超過 0.72 門檻`);
console.log('✓ 去重引擎：三張卡內容高度獨立，最大相似度遠低於 0.72 門檻\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 3：證據強度等級話術對齊 (LEVEL_1 到 LEVEL_4)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 3】證據強度等級話術映射驗證');

for (const level of [1, 2, 3, 4]) {
  const card = buildPresentCard({ ...sampleParams, evidenceStrength: level });
  const expectedPrefix = STRENGTH_VERDICTS[level];
  assert(card.openingStrike.includes(expectedPrefix), `LEVEL_${level} 開場話術未對齊: ${card.openingStrike}`);
}
console.log('✓ 證據強度：LEVEL_1 到 LEVEL_4 話術精準跟隨證據信心度\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 4：零紫微術語與零禁詞過濾守門
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 4】零紫微術語與合規禁詞安全檢驗');

assert(timeCardsOutput.cleanPass, `檢測到術語或禁止詞洩漏: ${JSON.stringify(timeCardsOutput.leaks)}`);
assert.equal(timeCardsOutput.leaks.length, 0, '三張卡片嚴禁洩漏任何命理技術術語或恐嚇詞');
console.log('✓ 安全守門：0 紫微斗數/八字術語、0 宿命恐嚇禁止詞\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試 5：前端修羅檔案 DOM 介面與複製工具列整合驗證
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('【測試 5】前端 GhostAsuraCard 修羅檔案複製工具列靜態契約檢查');

const componentPath = path.join(root, 'features/ghost-asura/components/GhostAsuraCard.tsx');
const componentSrc = fs.readFileSync(componentPath, 'utf8');

assert(componentSrc.includes('data-asura-action-bar'), 'GhostAsuraCard 必須包含 data-asura-action-bar 操作工具列');
assert(componentSrc.includes('複製修羅話術'), 'GhostAsuraCard 必須包含複製修羅話術功能按鈕');
assert(componentSrc.includes('複製卡片代碼'), 'GhostAsuraCard 必須包含複製卡片程式碼功能按鈕');
assert(componentSrc.includes('【過去｜解形成】'), 'GhostAsuraCard 必須包含【過去｜解形成】徽章');
assert(componentSrc.includes('【現在｜解當下】'), 'GhostAsuraCard 必須包含【現在｜解當下】徽章');
assert(componentSrc.includes('【未來｜解趨勢】'), 'GhostAsuraCard 必須包含【未來｜解趨勢】徽章');

console.log('✓ 前端契約：asuraTiles 對應展開面板已完整整合修羅檔案專用複製話術與程式碼功能\n');

console.log('═'.repeat(60));
console.log('✅ 鬼魅阿修羅 過去／現在／未來 三張卡片全面強化回測 — 全部通過');
console.log('═'.repeat(60));
