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
    { id: 'BAZI_PILLAR_SHENSHA', title: '雙命盤四柱神煞', available: gate.shenShaReady, rules: gate.shenShaRules, claims: ['C-BAZI-CHART', ...Object.values(gateModule.BAZI_SHENSHA_CLAIMS)] },
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

module.exports = { readAvailability };
if (require.main === module) {
  const report = readAvailability();
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
  // 正確地擋住未驗證資料 ≠ 對客戶提供了完整功能。
  process.exitCode = report.ok ? 0 : 1;
}
