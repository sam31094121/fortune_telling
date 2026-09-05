const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const compile = text => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const source = fs.readFileSync(path.join(root, 'lib/insight-engine.ts'), 'utf8');
const ast = ts.createSourceFile('engine.ts', source, ts.ScriptTarget.Latest, true);
const names = new Set(['INSIGHT_RITUAL_STEP_IDS', 'INSIGHT_RITUAL_STEP_LABELS', 'buildInsightRitualSteps']);
const snippets = ast.statements.filter(node => names.has(node.name?.text) || (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.text)))).map(n => n.getText(ast));
const ctx = { exports: {} };
vm.runInNewContext(compile(snippets.join('\n') + '\nexports.build = buildInsightRitualSteps;'), ctx);
for (const timeConfidence of ['unknown', 'estimated', undefined]) {
  assert.equal(ctx.exports.build({ ziweiSanFang: { timeConfidence } }).length, 0);
}
const palace = { key: 'MING', name: '命宮', majorStars: ['天梁'], minorStars: [], transformations: [] };
const chart = { timeConfidence: 'exact', allPalaces: Array.from({ length: 12 }, () => palace), palaces: [palace], pattern: { name: 'test', stars: ['天梁'] }, crossChecks: [{}], palaceAnalyses: Array(12).fill({}) };
const steps = ctx.exports.build({
  ziweiSanFang: chart, shichen: { dayPillar: '丙寅', hourPillar: { ganzhi: '甲午' } },
  statisticalAnalysis: [{}], dataSourceCount: 1, accuracyBreakdown: [{}], accuracyScore: 50,
  annualFortune: { overallScore: 50 }, fiveElement: { decision: { conclusion: 'test' } },
  aiAnalysis: { psychology_insights: [{}], recommendations: ['test'], summary: 'test' },
});
assert.equal(steps.length, 12);
assert.ok(steps.every(s => s.status === 'PASSED'));
const cardContext = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync(path.join(root, 'lib/ziwei-destiny-card.ts'), 'utf8')), cardContext);
assert.equal(cardContext.exports.buildZiweiDestinyCard({ analysisId: 'test', chart: { timeConfidence: 'unknown' } }), null);
const card = cardContext.exports.buildZiweiDestinyCard({ analysisId: 'test', chart });
assert.equal(card.cardType, 'DESTINY_CARD');
assert.equal(card.verification.readyForFrontend, true);
const page = fs.readFileSync(path.join(root, 'app/insight/page.tsx'), 'utf8');
assert.ok(page.includes("if (!card || analysis?.timeConfidence !== 'exact') return null"));
assert.ok(page.includes("result?.ziweiSanFang?.timeConfidence === 'exact' && result?.ritualSteps?.length"));
assert.ok(!page.includes('暫以午時權重換算'));
console.log('PASS: unknown time has no verified ritual or star card; exact-time path retained; cached UI guarded');

// ---- 品質核心：前端不准編結論 ----
// 解讀文字與五行統計都必須來自引擎；呈現層自己寫一段看起來像判讀的話，
// 就等於前端在編結論（2026-09-04 自我審查發現並修正）。
assert.ok(
  !/const YEAR_RELATION_PLAIN/.test(page),
  '五行關係的白話解讀不得寫在前端，必須由 annual-fortune-engine 產出',
);
assert.ok(
  !/const ZIWEI_STEM_ELEMENT|const ZIWEI_BRANCH_ELEMENT/.test(page),
  '前端不得自備天干地支五行對照表自行統計，必須用引擎的 elementBalanceThreePillar',
);
assert.ok(page.includes('yearRelationPlain'), '前端要顯示引擎產出的白話解讀');
assert.ok(page.includes('elementBalanceThreePillar'), '三柱五行分布要用引擎欄位');

const annualEngine = fs.readFileSync(path.join(root, 'lib/annual-fortune-engine.ts'), 'utf8');
assert.ok(annualEngine.includes('yearRelationPlain'), '引擎必須輸出白話解讀欄位');
const sanfangEngine = fs.readFileSync(path.join(root, 'lib/ziwei-sanfang-engine.ts'), 'utf8');
assert.ok(sanfangEngine.includes('elementBalanceThreePillar'), '引擎必須輸出三柱五行分布');

// ---- 信任核心：不得端出系統自己否認的宣稱 ----
// scoreMethodology 明講「未採用人群百分位」，畫面就不能寫「超越全國 N% 的人」。
// 只鎖真的會渲染出去的寫法；註解裡為了說明而引用舊字串是允許的。
const pageWithoutComments = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
assert.ok(
  !/超越全國/.test(pageWithoutComments),
  '後端已否認人群百分位，前端不得宣稱超越全國多少人',
);
assert.ok(!/percentile\}%/.test(pageWithoutComments), '不得渲染 percentile 百分位數字');

// ---- 服務核心：無時辰不得是死路 ----
assert.ok(page.includes('補上出生時辰，解鎖完整命盤'), '無時辰結果頁必須有可點的補時辰入口');
assert.ok(page.includes('🔒 補上時辰即可解鎖'), '無時辰的紫微區必須顯示鎖定提示');
assert.ok(!pageWithoutComments.includes('良辰暫定盤'), '無時辰不得在畫面宣稱使用暫定盤');

const insightEngine = fs.readFileSync(path.join(root, 'lib/insight-engine.ts'), 'utf8');
assert.ok(!insightEngine.includes('系統依生日自動選用良辰吉時'), '後端提示不得把未知時辰說成自動選良辰');

for (const route of [
  'app/api/ziwei/[analysisId]/teacher-analysis/route.ts',
  'app/api/ziwei/[analysisId]/entertainment-analysis/route.ts',
]) {
  const routeSource = fs.readFileSync(path.join(root, route), 'utf8');
  assert.ok(routeSource.includes('runThreeInOne'), `${route} 必須經過三合一驗證`);
  assert.ok(routeSource.includes("threeInOne.status !== 'PASSED'"), `${route} 未通過三合一時必須鎖定`);
}

console.log('PASS: 前端不編結論、不做已否認的宣稱、無時辰不是死路');
