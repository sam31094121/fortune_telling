/**
 * 《易經》來源閘門守門（2026-09-15 業主定案）
 *
 * 凡有「易經」兩個字，都要有交叉比對的來源、權威性的檔案、大數據的來源；
 * 易經洋蔥心理學一樣列入。這支測試把那句話變成會紅的斷言。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluateClaim, indexSources, permissionPass,
  REQUIRED_SOURCE_FIELDS, PERMISSION_VALUES, TRUST_SCORE, GATE_THRESHOLDS,
} from '../lib/iching-source-gate.ts';

const REGISTRY = 'docs/技能戰鬥檔案/易經/來源登記.json';
const GOVERNANCE = 'docs/技能戰鬥檔案/易經/來源治理.md';
// 治理工具本身（規格、登記表、閘門程式）不是要登記來源的易經內容。
const GOVERNANCE_FILES = new Set([REGISTRY, GOVERNANCE, 'lib/iching-source-gate.ts']);
let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`PASS: ${name}`); };

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const sources = indexSources(registry);

check('每一筆來源都有 SOURCE_PERMISSION_GATE 全部欄位，值合法、id 不重複', () => {
  assert.equal(new Set(registry.sources.map((s) => s.source_id)).size, registry.sources.length, 'source_id 重複');
  for (const s of registry.sources) {
    for (const field of REQUIRED_SOURCE_FIELDS) assert.ok(String(s[field] ?? '').trim(), `${s.source_id} 缺 ${field}`);
    for (const field of ['can_cite', 'can_reproduce', 'bulk_extraction', 'automated_crawl', 'training_use']) {
      assert.ok(PERMISSION_VALUES.includes(s[field]), `${s.source_id}.${field} 只能是 PASS／FAIL／待查核`);
    }
    assert.ok(Object.keys(TRUST_SCORE).includes(s.trust), `${s.source_id} 信任等級只能 A～D`);
    if (s.license_terms.includes('待查核')) assert.equal(permissionPass(s), false, `${s.source_id} 條款待查核卻算通過`);
  }
});

check('凡有「易經」的登記項目，都要列出權威性的檔案、大數據的來源、交叉比對的來源', () => {
  assert.ok(registry.claims.length >= 5);
  for (const c of registry.claims) {
    for (const key of ['authority_files', 'big_data_sources', 'cross_references', 'conflicts', 'files']) assert.ok(Array.isArray(c[key]), `${c.claim_id} 缺 ${key}`);
    for (const id of [...c.authority_files, ...c.big_data_sources, ...c.cross_references, ...c.conflicts.flatMap((x) => x.sources)]) {
      assert.ok(sources[id], `${c.claim_id} 引用不存在的來源 ${id}`);
    }
    for (const conflict of c.conflicts) {
      for (const key of ['topic', 'difference', 'adopted', 'reason']) assert.ok(String(conflict[key] ?? '').trim(), `${c.claim_id} 衝突紀錄缺 ${key}`);
    }
    if (c.status === 'VERIFIED') {
      assert.ok(c.authority_files.length && c.big_data_sources.length && c.cross_references.length >= GATE_THRESHOLDS.minCrossSources, `${c.claim_id} 標已驗證卻缺三要素`);
    }
  }
});

check('登記的狀態必須等於閘門算出的狀態（不得手填 VERIFIED）', () => {
  const rows = registry.claims.map((c) => ({ claim: c.claim_id, 登記: c.status, ...evaluateClaim(c, sources) }));
  for (const row of rows) console.log(`   ${row.claim}：${row.status}${row.reasons.length ? `｜${row.reasons.join('；')}` : ''}`);
  for (const row of rows) assert.equal(row.登記, row.status, `${row.claim} 登記 ${row.登記}，閘門算出 ${row.status}`);
});

check('登記引用的專案檔案都真的存在（只在本機的大數據須標 local_only）', () => {
  for (const s of registry.sources) {
    if (!s.tracked_path) continue;
    if (s.local_only) continue;
    assert.ok(fs.existsSync(s.tracked_path), `${s.source_id} 指向不存在的檔案 ${s.tracked_path}`);
  }
  for (const c of registry.claims) for (const f of c.files) assert.ok(fs.existsSync(f), `${c.claim_id} 涵蓋不存在的檔案 ${f}`);
});

check('名稱含 iching／易經 的檔案一個都不能漏登記', () => {
  const covered = new Set(registry.claims.flatMap((c) => c.files));
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/iching|易經/i.test(full)) found.push(full.split(path.sep).join('/'));
    }
  };
  for (const root of ['lib', 'data', 'docs']) if (fs.existsSync(root)) walk(root);
  const missing = found.filter((f) => !covered.has(f) && !GOVERNANCE_FILES.has(f));
  assert.deepEqual(missing, [], `以下「易經」檔案沒有登記來源：${missing.join('、')}`);
});

check('閘門本身：三要素齊全才 VERIFIED；有衝突就 CONFLICT；待查核就留在待驗證資料池', () => {
  const src = (id, kind, trust, extra = {}) => ({
    source_id: id, author: 'x', locator: 'x', data_type: 'x', kind, trust,
    can_cite: 'PASS', can_reproduce: 'PASS', bulk_extraction: 'PASS', automated_crawl: 'PASS', training_use: 'PASS',
    license_terms: '公有領域', accessed_at: '2026-09-15', edition: '底本甲', ...extra,
  });
  const pool = { O: src('O', '原典', 'A'), N: src('N', '古籍版本注疏', 'A'), L: src('L', '研究圖書館書目', 'A'), U: src('U', '原典', 'A', { license_terms: '待查核', can_cite: '待查核' }) };
  const claim = (extra) => ({ claim_id: 'T', title: 't', domain: '易經知識', files: [], authority_files: ['O'], big_data_sources: ['L'], cross_references: ['O', 'N', 'L'], conflicts: [], status: 'VERIFIED', ...extra });
  assert.equal(evaluateClaim(claim({}), pool).status, 'VERIFIED');
  assert.equal(evaluateClaim(claim({ cross_references: ['O', 'N'] }), pool).status, 'PENDING_POOL', '交叉不足 3');
  assert.equal(evaluateClaim(claim({ cross_references: ['N', 'L', 'U'] }), pool).status, 'PENDING_POOL', '待查核授權不得通過');
  assert.equal(evaluateClaim(claim({ big_data_sources: [] }), pool).status, 'PENDING_POOL', '缺大數據來源');
  assert.equal(evaluateClaim(claim({ conflicts: [{ topic: 't', sources: ['O', 'N'], difference: 'd', adopted: 'a', reason: 'r' }] }), pool).status, 'CONFLICT');
});

check('口令與文件接好：CLAUDE.md、新人檔案、易經.json 都指到來源治理', () => {
  const claude = fs.readFileSync('CLAUDE.md', 'utf8');
  assert.match(claude, /口令：「易經」/);
  assert.match(claude, /來源登記\.json/);
  assert.match(claude, /交叉比對的來源、權威性的檔案、大數據的來源/);
  assert.match(fs.readFileSync('docs/技能戰鬥檔案/易經/新人檔案.md', 'utf8'), /來源治理\.md/);
  const archive = JSON.parse(fs.readFileSync('docs/技能戰鬥檔案/易經/易經.json', 'utf8'));
  assert.equal(archive.sourceRegistry, REGISTRY);
  assert.match(fs.readFileSync(GOVERNANCE, 'utf8'), /待驗證資料池/);
});

console.log(`iching source gate — PASS ${passed}`);
