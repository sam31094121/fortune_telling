// 八字來源登記完整性檢查（只讀，不修改登記表）
// 每一筆 claim 都要：自身 status 為 VERIFIED、lib/iching-source-gate.ts 的 evaluateClaim 算出 VERIFIED、
// 至少掛一個登記表內確實存在的來源、沒有指向不存在的來源；非工程類（古籍知識）還必須掛至少一個原典類來源。
// 任何一項不符即列為 ERROR，並令 process.exitCode = 1。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const REGISTRY_PATH = 'docs/技能戰鬥檔案/八字/來源登記.json';
const LINK_FIELDS = ['authority_files', 'big_data_sources', 'cross_references'];

function loadTs(file, dependencies = {}) {
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function linkedSourceIds(claim) {
  const ids = [];
  for (const field of LINK_FIELDS) ids.push(...asArray(claim[field]));
  for (const conflict of asArray(claim.conflicts)) ids.push(...asArray(conflict && conflict.sources));
  return [...new Set(ids.filter((id) => typeof id === 'string' && id))];
}

// 登記表只讀取、解析一次；閘門模組只載入一次、來源只索引一次，所有 claim 共用。
function checkRegistry(registryOverride) {
  const registry = registryOverride ?? JSON.parse(fs.readFileSync(path.join(root, REGISTRY_PATH), 'utf8'));
  const gate = loadTs('lib/iching-source-gate.ts');
  const index = gate.indexSources({ ...registry, sources: asArray(registry.sources) });
  const originalKinds = ['原典', '原始研究'];
  const engineeringDomains = asArray(gate.ENGINEERING_DOMAINS);
  const claims = asArray(registry.claims);

  const results = claims.map((claim) => {
    const claimId = claim.claim_id || '(缺 claim_id)';
    const declaredStatus = claim.status ?? '(未填)';
    const reasons = [];
    let gateStatus = 'ERROR';
    try {
      const normalized = { ...claim, conflicts: asArray(claim.conflicts) };
      for (const field of LINK_FIELDS) normalized[field] = asArray(claim[field]);
      const evaluated = gate.evaluateClaim(normalized, index);
      gateStatus = evaluated.status;
      if (gateStatus !== 'VERIFIED') reasons.push(`閘門計算 ${gateStatus}：${evaluated.reasons.join('；') || '無細項'}`);
    } catch (error) {
      reasons.push(`閘門計算失敗：${error.message}`);
    }
    if (declaredStatus !== 'VERIFIED') reasons.push(`登記狀態 ${declaredStatus}（非 VERIFIED）`);

    const linked = linkedSourceIds(claim);
    const existing = linked.filter((id) => index[id]);
    const missing = linked.filter((id) => !index[id]);
    if (!existing.length) reasons.push('未掛任何登記表內存在的來源');
    if (missing.length) reasons.push(`指向不存在的來源：${missing.join('、')}`);
    const needsClassical = !engineeringDomains.includes(claim.domain);
    const classical = existing.filter((id) => originalKinds.includes(index[id].kind));
    if (needsClassical && !classical.length) reasons.push('未掛原典（古籍）來源');

    return {
      claimId,
      declaredStatus,
      gateStatus,
      ok: reasons.length === 0,
      reasons,
      linkedSources: existing,
      missingSources: missing,
      classicalSources: classical,
    };
  });

  if (!claims.length) {
    results.push({ claimId: '(無)', declaredStatus: '-', gateStatus: '-', ok: false, reasons: ['登記表沒有任何 claim'], linkedSources: [], missingSources: [], classicalSources: [] });
  }
  const errors = results.filter((r) => !r.ok).length;
  return { ok: errors === 0, total: claims.length, passed: results.length - errors, errors, results };
}

module.exports = { checkRegistry, linkedSourceIds, loadTs, REGISTRY_PATH };

if (require.main === module) {
  let report;
  try {
    report = checkRegistry();
  } catch (error) {
    console.error(`ERROR: 無法讀取或檢查 ${REGISTRY_PATH}：${error.message}`);
    process.exitCode = 1;
    return;
  }
  for (const r of report.results) {
    const missingNote = r.missingSources.length ? ` | 缺來源：${r.missingSources.join('、')}` : '';
    const sourceNote = r.linkedSources.length ? `來源 ${r.linkedSources.length} 個` : '無來源';
    if (r.ok) {
      console.log(`OK: ${r.claimId} status=${r.declaredStatus} gate=${r.gateStatus} ${sourceNote}`);
    } else {
      console.log(`ERROR: ${r.claimId} status=${r.declaredStatus} gate=${r.gateStatus} ${sourceNote} | ${r.reasons.join(' / ')}${missingNote}`);
    }
  }
  console.log(`SUMMARY: ${report.total} 筆 claim，OK ${report.passed}，ERROR ${report.errors}`);
  process.exitCode = report.ok ? 0 : 1;
}
