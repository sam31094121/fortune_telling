const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function loadTs(file, dependencies) {
  const compiledModule = { exports: {} };
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, require(id) {
    if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
    return dependencies[id];
  } }, { filename: file });
  return compiledModule.exports;
}

function readAvailability(registryOverride) {
  const registry = registryOverride ?? JSON.parse(fs.readFileSync(path.join(root, 'docs/技能戰鬥檔案/八字/來源登記.json'), 'utf8'));
  const sourceGate = loadTs('lib/iching-source-gate.ts', {});
  const gateModule = loadTs('lib/bazi-traditional-gate.ts', {
    './iching-source-gate': sourceGate,
    '../docs/技能戰鬥檔案/八字/來源登記.json': registry,
  });
  const gate = gateModule.getBaziTraditionalOutputGate(true);
  const index = sourceGate.indexSources(registry);
  const details = (ids) => ids.map(id => {
    const claim = registry.claims.find(item => item.claim_id === id);
    return { claim: id, ...(claim ? sourceGate.evaluateClaim(claim, index) : { status: 'PENDING_POOL', reasons: ['缺少獨立來源登記'] }) };
  });
  const capabilities = [
    { id: 'BAZI_CORE_SOURCE', title: '基礎排盤來源', available: gate.coreReady, claims: ['C-BAZI-CHART'] },
    { id: 'BAZI_PILLAR_SHENSHA', title: '易經神煞：四柱神煞', available: gate.shenShaReady, rules: gate.shenShaRules, claims: ['C-BAZI-CHART', ...Object.values(gateModule.BAZI_SHENSHA_CLAIMS)] },
    { id: 'BAZI_TEACHER_ADVANCED', title: '八字老師進階判讀', available: gate.interpretationReady, claims: ['C-BAZI-CHART', 'C-BAZI-CLASSICS', 'C-BAZI-FIVE-GODS'] },
    { id: 'BAZI_REINFORCEMENT', title: '喜用與配對五行補強', available: gate.interpretationReady, claims: ['C-BAZI-CHART', 'C-BAZI-CLASSICS', 'C-BAZI-FIVE-GODS'] },
    { id: 'MATCH_RED_LUAN', title: '配對紅鸞規則', available: gate.redLuanReady, claims: ['C-BAZI-CHART', 'C-RED-LUAN-SHENSHA'] },
  ].map(({ claims, ...item }) => ({ ...item, evidence: details(claims) }));
  return {
    ok: capabilities.every(item => item.available),
    scope: '來源與功能放行檢查；不取代本次命盤計算、瀏覽器操作或真機驗收',
    capabilities,
  };
}

/** Exercise the existing backend with synthetic data. Keep the legacy source
 * audit separate: enabling a reviewed endpoint does not certify its sources or
 * make a standalone page using the legacy gate available. */
async function readReviewedAvailability() {
  const createJiti = require('jiti');
  const load = createJiti(__filename, { interopDefault: true, cache: false, alias: { '@/': root + '/' } });
  const { runThreeInOne } = load(path.join(root, 'lib/three-in-one.ts'));
  const { getReviewedBaziOutputGate } = load(path.join(root, 'lib/bazi-reviewed-output.ts'));
  const sourceAudit = readAvailability();
  const checks = [];
  const gates = [];
  for (const [label, input] of [
    ['合成命盤甲', { birthDate: '1990-05-20', birthTime: '14:00', gender: 'male' }],
    ['合成命盤乙', { birthDate: '1992-08-16', birthTime: '18:00', gender: 'female' }],
  ]) {
    try {
      const result = await runThreeInOne(input);
      const gate = getReviewedBaziOutputGate(result);
      gates.push(gate);
      checks.push({ title: label + '後端核對', passed: gate.coreReady });
      const tampered = structuredClone(result);
      tampered.result.yijing.certificate.chartFingerprint = 'invalid-review-fixture';
      let rejected = false;
      try { getReviewedBaziOutputGate(tampered); } catch { rejected = true; }
      checks.push({ title: label + '錯誤命盤指紋阻擋', passed: rejected });
    } catch (error) {
      checks.push({ title: label + '後端核對', passed: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  try {
    const unknown = await runThreeInOne({ birthDate: '1990-05-20', birthTime: null, gender: 'male' });
    let rejected = false;
    try { getReviewedBaziOutputGate(unknown); } catch { rejected = true; }
    checks.push({ title: '未知時辰不放行延伸入口', passed: rejected && unknown.status === 'TIME_UNKNOWN' });
  } catch (error) {
    checks.push({ title: '未知時辰不放行延伸入口', passed: false, error: error instanceof Error ? error.message : String(error) });
  }
  let forgedRejected = false;
  try { getReviewedBaziOutputGate({ status: 'PASSED', verified: true }); } catch { forgedRejected = true; }
  checks.push({ title: '前端自行宣稱通過不能放行', passed: forgedRejected });
  const backendPassed = gates.length === 2 && checks.every(check => check.passed);
  const reviewedTitles = {
    BAZI_TEACHER_ADVANCED: '八字老師解讀 API（本次命盤已核對）',
    BAZI_REINFORCEMENT: '配對五行補強（雙方命盤已核對）',
    MATCH_RED_LUAN: '配對紅鸞（雙方命盤已核對）',
  };
  const capabilities = sourceAudit.capabilities.map(item => ({
    ...item,
    sourceReady: item.available,
    title: reviewedTitles[item.id] ?? item.title,
    available: reviewedTitles[item.id]
      ? backendPassed && gates.every(gate => item.id === 'MATCH_RED_LUAN' ? gate.redLuanReady : gate.interpretationReady)
      : item.available,
    approvalBasis: reviewedTitles[item.id] ? 'BACKEND_REVIEWED_OUTPUT' : 'SOURCE_GATE',
  }));
  return {
    ok: backendPassed && capabilities.every(item => item.available),
    scope: '指定老師API與配對入口的放行政策及合成命盤回歸；來源稽核另列，不代表八字頁所有功能、瀏覽器操作或真機皆可用。',
    capabilities,
    backendReview: { passed: backendPassed, checks },
    sourceAudit,
  };
}

module.exports = { readAvailability, readReviewedAvailability };
async function main() {
  const report = await readReviewedAvailability();
  for (const item of report.capabilities) {
    console.log(`${item.available ? 'AVAILABLE' : 'UNAVAILABLE'}: ${item.title}`);
    if (item.rules) for (const [id, rule] of Object.entries(item.rules)) {
      if (!rule.ready) console.log(`  ${id}: source=${rule.status}; output=${rule.outputStatus}; ${rule.reasons.join('；')}`);
    }
    if (!item.available) for (const entry of item.evidence.filter(e => e.status !== 'VERIFIED')) {
      console.log(`  ${entry.claim}: ${entry.reasons.join('；')}`);
    }
  }
  console.log(report.scope);
  console.log(`SOURCE AUDIT: ${report.sourceAudit.ok ? 'PASSED' : 'PENDING_OR_CONFLICT'}（獨立來源紀錄，不因產品放行改寫）`);
  for (const check of report.backendReview.checks) console.log(`${check.passed ? 'PASS' : 'FAIL'}: ${check.title}${check.error ? ' — ' + check.error : ''}`);
  // 正確地擋住未驗證資料 ≠ 對客戶提供了完整功能。
  process.exitCode = report.ok ? 0 : 1;
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
