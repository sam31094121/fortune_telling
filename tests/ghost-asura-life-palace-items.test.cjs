// 鬼魅阿修羅｜14:18 貫穿規則：命宮全部項目在後端同一張清單（lifePalace.items），同等地位、各附 source。
// 逐盤把引擎命宮（calculateZiweiSanFang allPalaces[命宮]）與同輸入 iztro palaces[命宮] 的每一項對進清單；不需 dev server。
// 執行：node tests/ghost-asura-life-palace-items.test.cjs
const assert = require('node:assert/strict');
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const persona = load('lib/server/ghost-asura-persona.ts');
const threeCore = load('lib/three-core-engine.ts');
const ziweiEngine = load('lib/ziwei/engine.ts');

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const CASES = {
  'wei-1974-06-28-1800': { birthDate: '1974-06-28', birthTime: '18:00', gender: 'male' },
  'wei-1974-06-28-1600': { birthDate: '1974-06-28', birthTime: '16:00', gender: 'male' },
  'u-1968-09-02-0030': { birthDate: '1968-09-02', birthTime: '00:30', gender: 'female' },
  'b-1974-08-15-1800': { birthDate: '1974-08-15', birthTime: '18:00', gender: 'male' },
};
for (const [label, input] of Object.entries(CASES)) {
  const run = persona.runNatureGates(input);
  ok(run.materials && run.materials.lifePalace, `${label} gates pass`);
  const lp = run.materials.lifePalace;
  const items = lp.items;
  ok(Array.isArray(items) && items.length > 0, `${label} single items list`);
  ok(!('detail' in lp), `${label} no side detail object`);
  ok(items.every((i) => typeof i.source === 'string' && i.source.length > 0 && persona.LIFE_PALACE_ITEM_LABEL[i.kind]), `${label} every item has kind + source`);
  const key = (i) => `${i.kind}|${i.name}`;
  ok(new Set(items.map(key)).size === items.length, `${label} no duplicates`);
  const has = (kind, name) => items.some((i) => i.kind === kind && i.name === name);

  const tc = threeCore.computeThreeCore(input);
  const ming = tc.ziwei.analysis.allPalaces.find((p) => p.key === 'MING');
  const astroP = ziweiEngine.createZiweiAstrolabe(tc.ziwei.analysis.ziweiBirthInput).palaces.find((p) => p.name === '命宮' && String(p.earthlyBranch) === ming.branch);
  ok(Boolean(astroP), `${label} iztro 命宮 found at ${ming.branch}`);
  let expected = 0;
  for (const s of ming.majorStars ?? []) { expected++; ok(has('major', s), `${label} major ${s}`); }
  for (const s of astroP.majorStars) ok(has('major', String(s.name)), `${label} iztro major ${s.name}`);
  for (const d of ming.majorStarDetails ?? []) ok(items.find((i) => i.kind === 'major' && i.name === d.name)?.brightness === d.brightness, `${label} brightness ${d.name}`);
  for (const m of ming.transformations ?? []) { expected++; ok(items.some((i) => i.kind === 'mutagen' && i.value === m), `${label} mutagen ${m}`); }
  const adj = new Set(astroP.adjectiveStars.map((s) => String(s.name)));
  for (const s of ming.minorStars ?? []) { expected++; ok(has(adj.has(s) ? 'adjective' : 'minor', s), `${label} ${adj.has(s) ? 'adjective' : 'minor'} ${s}`); }
  for (const s of astroP.minorStars) ok(has('minor', String(s.name)), `${label} iztro minor ${s.name}`);
  for (const s of astroP.adjectiveStars) ok(has('adjective', String(s.name)), `${label} iztro adjective ${s.name}`);
  for (const [kind, field] of [['changsheng', 'changsheng12'], ['boshi', 'boshi12'], ['jiangqian', 'jiangqian12'], ['suiqian', 'suiqian12']]) { expected++; ok(has(kind, String(astroP[field])), `${label} ${kind} ${astroP[field]}`); }
  expected++; ok(has('decadal', `${astroP.decadal.range.join('-')}歲 ${astroP.decadal.heavenlyStem}${astroP.decadal.earthlyBranch}`), `${label} decadal`);
  expected++; ok(has('ages', astroP.ages.join(',')), `${label} ages`);
  assert.equal(items.length, expected, `${label} item count = engine count`); checks++;

  const ev = persona.analyzePersona(run.gates, run.materials);
  for (const i of items.filter((x) => ['changsheng', 'boshi', 'jiangqian', 'suiqian', 'decadal', 'ages'].includes(x.kind))) {
    ok(ev.some((e) => e.refs.some((r) => r.item === `${lp.palaceName}${persona.LIFE_PALACE_ITEM_LABEL[i.kind]}：${i.value ?? i.name}` && r.source.includes(i.source))), `${label} evidence for ${i.kind} ${i.name}`);
  }
  console.log(label, JSON.stringify(items.map((i) => `${i.kind}:${i.name}${i.brightness ? `（${i.brightness}）` : ''}`)));
}
console.log(`ghost-asura-life-palace-items: ${checks} checks passed`);
