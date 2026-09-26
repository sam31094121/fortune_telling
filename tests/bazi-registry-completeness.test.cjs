const assert = require('node:assert/strict');
const { checkRegistry } = require('../scripts/bazi-registry-completeness.cjs');

const source = (id, kind, extra = {}) => ({
  source_id: id, author: 'a', locator: 'l', data_type: 'd', kind,
  can_cite: 'PASS', can_reproduce: 'PASS', bulk_extraction: 'PASS', automated_crawl: 'PASS', training_use: 'PASS',
  license_terms: '公有領域', accessed_at: '2026-09-26', edition: '初版', trust: 'A', ...extra,
});
const sources = [source('S-ORIG-1', '原典'), source('S-ORIG-2', '原典'), source('S-ORIG-3', '原典')];
const claim = (id, extra = {}) => ({
  claim_id: id, title: 't', domain: '八字知識', files: [],
  authority_files: ['S-ORIG-1'], big_data_sources: ['S-ORIG-2'], cross_references: ['S-ORIG-1', 'S-ORIG-2', 'S-ORIG-3'],
  conflicts: [], status: 'VERIFIED', ...extra,
});
const registry = (...claims) => ({ version: '1', updatedAt: '2026-09-26', sources, claims });
const errorFor = (report, id) => report.results.find((r) => r.claimId === id);

// 1. 全部 VERIFIED 且有來源 → 通過
const good = checkRegistry(registry(claim('C-GOOD-1'), claim('C-GOOD-2')));
assert.equal(good.ok, true, JSON.stringify(good.results));
assert.equal(good.errors, 0);

// 2. PENDING_POOL → 失敗
const pending = checkRegistry(registry(claim('C-GOOD'), claim('C-PENDING', { status: 'PENDING_POOL' })));
assert.equal(pending.ok, false);
assert.equal(pending.errors, 1);
assert.ok(errorFor(pending, 'C-PENDING').reasons.some((r) => r.includes('PENDING_POOL')));

// 3. 標 VERIFIED 但沒掛任何來源 → 失敗（登記自稱 VERIFIED 也不放過）
const noSource = checkRegistry(registry(claim('C-NOSRC', { authority_files: [], big_data_sources: [], cross_references: [] })));
assert.equal(noSource.ok, false);
const noSrc = errorFor(noSource, 'C-NOSRC');
assert.ok(noSrc.reasons.includes('未掛任何登記表內存在的來源'));
assert.notEqual(noSrc.gateStatus, 'VERIFIED');

// 4. 指向不存在的來源 → 失敗
const dangling = checkRegistry(registry(claim('C-DANGLING', { cross_references: ['S-ORIG-1', 'S-ORIG-2', 'S-ORIG-3', 'S-GHOST'] })));
assert.equal(dangling.ok, false);
assert.deepEqual(errorFor(dangling, 'C-DANGLING').missingSources, ['S-GHOST']);

// 5. CONFLICT 狀態 → 失敗
const conflict = checkRegistry(registry(claim('C-CONFLICT', { status: 'CONFLICT' })));
assert.equal(conflict.ok, false);

// 6. 古籍知識類只掛工程證據（無原典）→ 失敗
const eng = { ...registry(claim('C-NOCLASSIC', { authority_files: ['S-E1'], big_data_sources: ['S-E1'], cross_references: ['S-E1', 'S-E2', 'S-E3'] })) };
eng.sources = [...sources, source('S-E1', '工程證據'), source('S-E2', '工程證據'), source('S-E3', '工程證據')];
const noClassic = checkRegistry(eng);
assert.equal(noClassic.ok, false);
assert.ok(errorFor(noClassic, 'C-NOCLASSIC').reasons.includes('未掛原典（古籍）來源'));

// 7. 空登記表 → 失敗，不得靜默通過
assert.equal(checkRegistry({ version: '1', updatedAt: 'x', sources, claims: [] }).ok, false);

console.log('PASS: bazi registry completeness — verified+sourced passes; PENDING_POOL, CONFLICT, no source, dangling source, no classical source, empty registry all fail');
