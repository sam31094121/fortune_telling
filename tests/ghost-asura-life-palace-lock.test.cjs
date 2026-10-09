// 鬼魅阿修羅｜命宮準確度鎖（2026-10-09 13:23／13:24 使用者規格）：node tests/ghost-asura-life-palace-lock.test.cjs
//   1. 釘死引擎命宮：固定盤的命宮地支、主星（含亮度）、小星、四化，與下表一字不差（命宮錯會骨牌效應）。
//   2. 本性層只讀引擎命宮、不重算：runNatureGates 的 lifePalace 素材＝引擎 allPalaces 命宮原樣。
//   3. 命宮每顆星（主星全部、小星全部）＋四化都要有證據；查無原意者（13:29）照列「列出、不解讀」，且只能是 PERSONA_KNOWN_SOURCE_GAPS 列出的已知缺口。
//   5. 13:39：武曲＋七殺 使用者定稿組合文案（證據照舊、前台零術語、其他盤不套用）。
//   4. 13:29：本性只取命宮主星；有主星不借遷移宮（對宮）；無八字證據；列出不解讀的星不進前台。
'use strict';
const assert = require('node:assert/strict');
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const persona = load('lib/server/ghost-asura-persona.ts');
const threeCore = load('lib/three-core-engine.ts');
const tl = load('lib/server/ghost-asura-translation-layer.ts');

const CHARTS = {
  '1968-09-02 00:30 F': { input: { birthDate: '1968-09-02', birthTime: '00:30', gender: 'female' }, branch: '申', major: [], mode: 'empty', listed: [] },
  '1968-09-01 23:30 F': { input: { birthDate: '1968-09-01', birthTime: '23:30', gender: 'female' }, branch: '申', major: [], mode: 'empty', listed: [] },
  '1974-06-28 18:00 M': { input: { birthDate: '1974-06-28', birthTime: '18:00', gender: 'male' }, branch: '酉', major: ['武曲', '七殺'], mode: 'main', listed: ['天福', '空亡', '破碎'] },
  '1974-06-28 16:00 M': { input: { birthDate: '1974-06-28', birthTime: '16:00', gender: 'male' }, branch: '戌', major: ['七殺'], mode: 'main', listed: ['八座', '封誥', '華蓋', '蜚廉'] },
  '1974-07-02 03:30 M': { input: { birthDate: '1974-07-02', birthTime: '03:30', gender: 'male' }, branch: null, major: ['武曲'], mode: 'main', listed: ['封誥', '天哭'] },
};

let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const report = {};
for (const [label, c] of Object.entries(CHARTS)) {
  const tc = threeCore.computeThreeCore(c.input);
  const ming = tc.ziwei.analysis.allPalaces.find((p) => p.key === 'MING');
  ok(ming, `${label} engine has 命宮`);
  if (c.branch) assert.equal(ming.branch, c.branch, `${label} 命宮地支`), checks++;
  assert.deepEqual([...(ming.majorStars ?? [])], c.major, `${label} 命宮主星`); checks++;
  const bright = new Map((ming.majorStarDetails ?? []).map((s) => [s.name, s.brightness]));

  const run = persona.runNatureGates(c.input);
  assert.deepEqual(run.gates, { bazi: 'PASS', ziwei: 'PASS', yijing: 'PASS', lifePalace: 'PASS' }, `${label} gates`); checks++;
  const lp = run.materials.lifePalace;
  assert.equal(lp.mode, c.mode, `${label} mode`); checks++;
  // 不重算：素材＝引擎命宮原樣
  assert.deepEqual(lp.majorStars, (ming.majorStars ?? []).map((name) => ({ name, brightness: bright.get(name) })), `${label} major = engine`); checks++;
  assert.deepEqual(lp.minorStars, (ming.minorStars ?? []).map((name) => ({ name, brightness: bright.get(name) })), `${label} minor = engine`); checks++;
  assert.deepEqual(lp.transformations ?? [], [...(ming.transformations ?? [])], `${label} transformations = engine`); checks++;
  if (c.mode === 'empty') {
    const travel = tc.ziwei.analysis.allPalaces.find((p) => p.key === persona.EMPTY_PALACE_BORROW_KEY);
    assert.deepEqual(lp.borrowed.majorStars.map((s) => s.name), [...(travel.majorStars ?? [])], `${label} borrowed = engine 遷移宮（對宮）`); checks++;
  }
  // 全部星都要有證據
  const ev = persona.analyzePersona(run.gates, run.materials);
  const cov = persona.lifePalaceCoverage(run.materials, ev);
  assert.deepEqual(cov.uncovered, [], `${label} uncovered stars: ${cov.uncovered.join('、')}`); checks++;
  assert.deepEqual(cov.unexpectedListed, [], `${label} listed-only stars not in known gaps: ${cov.unexpectedListed.join('、')}`); checks++;
  assert.deepEqual(cov.listedOnly, c.listed, `${label} listed, no interpretation`); checks++;
  ok(ev.every((e) => e.axis === 'lifePalace' && e.refs.every((r) => r.layer === 'lifePalace')), `${label} no bazi evidence`);
  if (c.mode === 'main') ok(!ev.some((e) => e.refs.some((r) => r.item.startsWith('遷移宮'))), `${label} main stars present → no borrowing`);
  const pub = JSON.stringify(tl.toPublic(tl.translateAsNature(ev)));
  for (const n of cov.listedOnly) ok(!pub.includes(n), `${label} ${n} not in public text`);
  for (const name of c.major) ok(cov.covered.includes(name), `${label} main star ${name} covered`);
  if (c.mode === 'main') {
    const card = tl.translateAsNature(ev);
    const essenceKeys = card.evidence.filter((e) => e.kind === 'essence' && e.axis === 'lifePalace').map((e) => e.refs[0].item);
    for (const name of c.major) ok(essenceKeys.some((i) => i.startsWith(name)), `${label} 本性 uses ${name}`);
    ok(card.evidence.find((e) => e.kind === 'essence').axis === 'lifePalace', `${label} 本性 leads from 命宮`);
  }
  report[label] = { branch: ming.branch, major: lp.majorStars, minor: lp.minorStars, transformations: lp.transformations ?? [], covered: cov.covered, listedNoInterpretation: cov.listedOnly };
}
// 13:39 使用者定稿：武曲＋七殺 組合 → 四段用定稿（逐字；本性去「命宮雙星，」待使用者決定），證據照舊；其他盤不套用
{
  const combo = tl.ASURA_USER_COMBO_COPY.find((c) => c.id === 'COMBO.EXECUTOR_DECIDER');
  ok(combo && /使用者提供 2026-10-09 13:39/.test(combo.source), 'combo copy is user-provided');
  ok(combo.essence === '你向來都是硬骨加殺氣，不繞彎。兩股力在你身上：一手是秤，只秤結果，只秤效率；一手是戰旗，你走在最前面，軍隊跟著你衝。這就是你的底色。', '13:41 essence verbatim');
  ok(combo.essenceRefs.some((r) => r.includes('WUQU.coreDrive')) && combo.essenceRefs.some((r) => r.includes('七殺（強）')), 'essence refs: 武曲 coreDrive + 七殺 strong');
  const input = CHARTS['1974-06-28 18:00 M'].input;
  const run = persona.runNatureGates(input);
  const card = tl.translateAsNature(persona.analyzePersona(run.gates, run.materials));
  ok(card.userCopyId === combo.id, 'wei 1800 uses combo copy');
  for (const k of ['essence', 'strength', 'weakness', 'risk']) ok(card[k] === combo[k], `wei 1800 ${k} = user copy`);
  ok(card.risk !== tl.ASURA_UNIVERSAL_RISK.text, 'combo risk replaces universal risk');
  for (const star of ['武曲', '七殺']) ok(card.evidence.some((e) => !e.listedOnly && e.refs.some((r) => r.item.startsWith(star))), `wei 1800 evidence keeps ${star}`);
  ok(card.evidence.some((e) => e.refs.some((r) => r.item.endsWith('化科'))), 'wei 1800 evidence keeps 化科');
  const pub = tl.toPublic(card);
  assert.deepEqual(tl.forbiddenTermsIn(JSON.stringify(pub)), [], 'wei 1800 public zero terms'); checks++;
  ok(!JSON.stringify(pub).includes('userCopyId') && !JSON.stringify(pub).includes('命宮'), 'wei 1800 public has no backend fields / terms');
  const story = tl.asuraStoryFor(card);
  ok(story.hits.endsWith(combo.essence) && story.pillars.endsWith(combo.strength) && story.verdict.endsWith(combo.risk), 'wei 1800 three-card story follows user copy');
// 14:41：過去段草稿只接在三卡故事線（asuraLinkStory）之後；asuraStoryFor 本身不變
ok(tl.ASURA_PAST_DRAFT.length === 6 && tl.ASURA_PAST_DRAFT.every((d) => d.dictionary.length > 0 && d.dictionary.every((e) => e.fallback === false && /^https:\/\/dict\.revised\.moe\.edu\.tw\/dictView\.jsp\?ID=\d+/.test(e.moeUrl) && e.inference.startsWith('INFERENCE'))), 'past draft: every line has MOE dictionary evidence, no fallback');
  for (const [label, c] of Object.entries(CHARTS)) {
    if (label === '1974-06-28 18:00 M') continue;
    const r = persona.runNatureGates(c.input); const k = tl.translateAsNature(persona.analyzePersona(r.gates, r.materials));
    ok(k.userCopyId === undefined && k.risk === tl.ASURA_UNIVERSAL_RISK.text, `${label} not combo, universal risk`);
  }
}

console.log(JSON.stringify(report, null, 1));
console.log(`ghost-asura-life-palace-lock: ${checks} checks passed`);
