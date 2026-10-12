// 鬼魅阿修羅：補充區（supplements）與戰場列（battleField）不得漏出「旺」等術數用語（2026-10-09 16:12）。
// 來源原文不改（lib/iching-shensha-combos.ts 第 41 行「人緣與魅力特別旺」），只由顯示別名層 lib/asura-display-alias.ts 在上畫面前換字。
// 單元段不需伺服器；API 段需 dev server 在 8888（ASURA_BASE 可改）：node tests/ghost-asura-supplement-forbidden-terms.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const base = process.env.ASURA_BASE ?? 'http://localhost:8888';
const load = (rel) => {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  const m = { exports: {} };
  new Function('module', 'exports', 'require', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(m, m.exports, require);
  return m.exports;
};
const { asuraScrub, asuraDeepScrub, ASURA_FORBIDDEN_TERMS: ALIAS_FORBIDDEN } = load('lib/asura-display-alias.ts');
// 本測試的禁用清單＝別名層共用清單 ∪「旺」。「旺」不加進共用清單：ghost-asura-skill-coverage 會掃上畫面前的技能原文（如安祿「越流越旺」），那層照規定不改。
const ASURA_FORBIDDEN_TERMS = [...ALIAS_FORBIDDEN, '旺'];

// 1) 「旺」由顯示別名層逐詞規則濾掉（單字兜底）
assert.equal(asuraScrub('旺'), '盛', '單字兜底：旺 → 盛');

// 2) 來源原文不改（顯示層換字，不是改來源）
const comboSrc = fs.readFileSync(path.join(root, 'lib/iching-shensha-combos.ts'), 'utf8');
assert(comboSrc.includes('人緣與魅力特別旺'), '來源 lib/iching-shensha-combos.ts 原文保留');

// 3) 已知會進阿修羅顯示的含「旺」句：換字後零「旺」、意思不變
const CASES = [
  ['蛻變新生、魅力引力、界外吸引同時出現：人緣與魅力特別旺，容易被看見、被喜歡。', '人緣與魅力特別強'],
  ['桃花是人緣與魅力，走到哪裡都容易被看見、被喜歡，感情緣分也較旺。', '感情緣分也較盛'],
  ['天轉是日柱正逢當季最旺之氣，力量強、轉變快，也提醒不要一時衝得太猛。', '當季最盛之氣'],
  ['地轉是日柱逢當季地支旺氣，根基的力量強，做事扎實，也容易固執己見。', '盛氣'],
  ['記得那些默默幫你的人；把這份福氣傳下去，暗泉會越流越旺。', '越流越盛'],
];
for (const [raw, expected] of CASES) {
  const out = asuraScrub(raw);
  assert(!out.includes('旺'), `scrub 後無「旺」：${out}`);
  assert(out.includes(expected), `scrub 結果含「${expected}」：${out}`);
}
// 4) 巢狀（補充區形狀）一樣換
const deep = asuraDeepScrub({ supplements: [{ key: 'chain', heading: 'x', entries: [{ id: 'c1', title: 't', members: 'm', text: CASES[0][0] }] }] });
assert(!JSON.stringify(deep).includes('旺'), 'deepScrub 補充區無「旺」');
assert.equal(deep.supplements[0].entries[0].id, 'c1', '識別鍵不動');
console.log('✓ unit: 旺 filtered in display alias layer (', CASES.length, 'phrases )');

// 5) API：曾威艷 1974-06-28 18:00 男（tests/ghost-asura-nature-page.test.mjs 的測試盤）
const scanAll = (label, value, hits) => {
  if (typeof value === 'string') { for (const t of ASURA_FORBIDDEN_TERMS) if (value.includes(t)) hits.push(`${label}: ${t} …${value.slice(0, 60)}`); return hits; }
  if (Array.isArray(value)) value.forEach((v, i) => scanAll(`${label}[${i}]`, v, hits));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (!['id', 'key', 'tone'].includes(k)) scanAll(`${label}.${k}`, v, hits);
  return hits;
};
(async () => {
  const res = await fetch(`${base}/api/ghost-asura/reading`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, Referer: `${base}/ghost-asura`, 'x-forwarded-for': `10.88.${Date.now() % 250}.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei', name: '曾威艷' }),
  });
  assert.equal(res.status, 200, `API status ${res.status}`);
  const { data } = await res.json();
  assert(Array.isArray(data.supplements) && data.supplements.length > 0, 'supplements present');
  const text = JSON.stringify(data.supplements);
  assert(text.includes('人緣與魅力特別強'), '補充區該句仍在（只換字，不刪句）');
  const hits = [...scanAll('supplements', data.supplements, []), ...scanAll('battleField', data.battleField, [])];
  assert.deepEqual(hits, [], `補充區／戰場列零術語：\n${hits.join('\n')}`);
  assert(!JSON.stringify({ s: data.supplements, b: data.battleField, n: data.nature }).includes('旺'), 'API 補充區／戰場列／本性卡無「旺」');
  console.log('✓ api: 曾威艷 supplements', data.supplements.reduce((n, g) => n + g.entries.length, 0), 'entries, battleField', data.battleField.rows.length, 'rows — zero forbidden terms');
  console.log('PASS ghost-asura-supplement-forbidden-terms');
})().catch((e) => { console.error(e); process.exit(1); });
