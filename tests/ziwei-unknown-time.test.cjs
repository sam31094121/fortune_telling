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
