const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readAvailability } = require('../scripts/bazi-functional-health.cjs');
const registry = JSON.parse(fs.readFileSync('docs/技能戰鬥檔案/八字/來源登記.json', 'utf8'));
const actual = readAvailability(registry);
assert.equal(actual.ok, false, 'unavailable customer features must not report healthy');
assert.equal(actual.capabilities.find(c => c.id === 'BAZI_CORE_SOURCE').available, true);
const actualShenSha = actual.capabilities.find(c => c.id === 'BAZI_PILLAR_SHENSHA');
assert.equal(actualShenSha.available, false, 'documented variant hold must not report complete availability');
assert.equal(actualShenSha.rules.tianyi.status, 'VERIFIED', 'selected source verification stays distinct');
assert.equal(actualShenSha.rules.tianyi.outputStatus, 'BLOCKED_VARIANT');
assert.equal(actualShenSha.rules.tianyi.ready, false);
assert.equal(actualShenSha.rules.wenchang.status, 'VERIFIED');
assert.equal(actualShenSha.rules.wenchang.outputStatus, 'BLOCKED_VARIANT');
assert.equal(actualShenSha.rules.wenchang.ready, false);
for (const id of ['taohua', 'yima', 'huagai']) assert.equal(actualShenSha.rules[id].ready, true, `${id} must remain independently available`);
assert.equal(actual.capabilities.find(c => c.id === 'BAZI_TEACHER_ADVANCED').available, false);

// 合成工程證據只用於狀態隔離測試，不寫回來源登記。
const verified = registry.claims.find(c => c.claim_id === 'C-BAZI-CHART');
const ruleIds = registry.claims.filter(c => c.claim_id.startsWith('C-BAZI-SHENSHA-')).map(c => c.claim_id);
const pending = { ...registry, claims: registry.claims.map(c => ruleIds.includes(c.claim_id) ? { ...c, authority_files: [], big_data_sources: [], cross_references: [] } : c) };
function withVerified(ids, base = pending) {
  return { ...base, claims: base.claims.map(c => ids.includes(c.claim_id) ? { ...c, ...verified, claim_id: c.claim_id, comparisons: [] } : c) };
}
const independent = readAvailability(withVerified(['C-RED-LUAN-SHENSHA']));
assert.equal(independent.capabilities.find(c => c.id === 'MATCH_RED_LUAN').available, true);
assert.equal(independent.capabilities.find(c => c.id === 'BAZI_PILLAR_SHENSHA').available, false, 'red-luan cannot unlock pillar shensha');
assert.equal(independent.capabilities.find(c => c.id === 'BAZI_TEACHER_ADVANCED').available, false);
const pillarOnly = readAvailability(withVerified(['C-BAZI-PILLAR-SHENSHA']));
assert.equal(pillarOnly.capabilities.find(c => c.id === 'BAZI_PILLAR_SHENSHA').available, false, 'legacy aggregate claim must not unlock all rules');
assert.equal(pillarOnly.capabilities.find(c => c.id === 'MATCH_RED_LUAN').available, false);
const oneRule = readAvailability(withVerified(['C-BAZI-SHENSHA-TIANYI'])).capabilities.find(c => c.id === 'BAZI_PILLAR_SHENSHA');
assert.equal(oneRule.available, false, 'partial availability is not full health');
assert.equal(oneRule.rules.tianyi.ready, true);
assert.equal(oneRule.rules.taohua.ready, false);
assert.equal(readAvailability(withVerified(registry.claims.map(c => c.claim_id))).ok, true);
const noCore = { ...registry, claims: registry.claims.filter(c => c.claim_id !== 'C-BAZI-CHART') };
assert.equal(readAvailability(noCore).capabilities.some(c => c.available), false);
console.log('PASS: availability failures are visible and unrelated Bazi capabilities stay isolated');
