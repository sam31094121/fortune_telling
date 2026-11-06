// 鬼魅阿修羅｜十二陣・四十八道戰痕（後端）：node tests/ghost-asura-palace-verses.test.cjs（不需 dev server）
// 1) 576 組合查詢表（12 陣×4 層×12 值）逐列：ASURA_CARD_FORBIDDEN_TERMS＋四組名稱／48 神名／宮名子字串＋干支組合＝零命中；lintAsuraVoice 通過；
//    sourceLevel 分級（later＝後世整理）與來源報告一致。
// 2) 1974-06-28 男 酉時（2026-11-06）：與紫微命盤頁同一份 period 值，依大限起歲排序，逐句比對；isCurrent 只有 44–53。
// 3) 外送 JSON 不含 sourceLevel／note／陣鍵／神名；多組生辰全數 12×4、零禁詞；翻譯層不 import 引擎。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, root } = require('./fixtures/ghost-asura-nature/load.cjs');
const tl = load('lib/server/ghost-asura-translation-layer.ts');
const voice = load('lib/server/ghost-asura-voice.ts');
const display = load('lib/server/ghost-asura-display.ts');
const { calculateDualChart } = load('lib/dual-chart.ts');

// ── 1) 576 ──
assert.equal(Object.keys(tl.PALACE_VERSE_DOMAIN).length, 12);
assert.deepEqual(tl.PALACE_VERSE_LAYERS.map((l) => l.key), ['stage', 'banner', 'decree', 'force']);
for (const l of tl.PALACE_VERSE_LAYERS) assert.equal(Object.keys(l.table).length, 12, `${l.key} 12 values`);
assert.equal(tl.PALACE_VERSE_TABLE.size, 576, '576 combos');
const lint = []; const forb = []; const later = new Set();
for (const [k, e] of tl.PALACE_VERSE_TABLE) {
  const h = tl.palaceVerseForbiddenHits(e.text); if (h.length) forb.push(`${k}: ${h}`);
  const p = voice.lintAsuraVoice(e.text); if (p.length) lint.push(`${k}: ${e.text} → ${p.join('/')}`);
  assert(['classic', 'later'].includes(e.sourceLevel));
  if (e.sourceLevel === 'later') later.add(`${e.layer}:${e.value}`);
  assert.equal(tl.lookupPalaceVerse(e.palaceKey, e.layer, e.value), e);
}
assert.deepEqual(forb, [], '576 forbidden');
assert.deepEqual(lint, [], '576 lintAsuraVoice');
assert.deepEqual([...later].sort(), ['decree:大耗', 'decree:小耗', 'decree:晦氣', 'decree:歲建', 'decree:病符', 'decree:貫索', 'decree:龍德', 'force:天煞', 'force:息神', 'force:指背', 'force:攀鞍', 'force:月煞', 'force:歲驛'].sort(), 'later set');
for (const l of tl.PALACE_VERSE_LAYERS) assert.deepEqual(tl.palaceVerseForbiddenHits(l.label), []);
assert.deepEqual(tl.palaceVerseForbiddenHits(tl.PALACE_VERSES_TITLE + Object.values(tl.PALACE_VERSE_DOMAIN).join('')), []);
// 檢查器自測：隱藏命中
assert.deepEqual(tl.palaceVerseForbiddenHits('今天才出門'), ['天才']);
assert(tl.palaceVerseForbiddenHits('先養好').includes('養'));
assert(tl.palaceVerseForbiddenHits('甲子年').includes('干支組合'));
// 承接句／hook／戰意開場：零行話
const JARGON2 = ['立纛', '歃血', '淬鋒', '擂鼓', '擂', '掛印', '封金', '破釜', '沉舟', '臥薪', '嘗膽', '虎賁', '金戈', '鐵馬', '封刀', '按劍', '鳴金', '出鞘'];
for (const t of [...Object.values(tl.AGE_BRIDGE_OPEN).flat(), ...Object.values(tl.AGE_BRIDGE_CLOSE).flat(), ...tl.AGE_HOOK_TO_HISTORY, ...tl.AGE_HOOK_TO_ACTION]) assert.deepEqual(JARGON2.filter((w) => t.includes(w)), [], `jargon ${t}`);
for (const l of tl.PALACE_VERSE_LAYERS) for (const row of Object.values(tl.PALACE_VERSE_ONION[l.key])) for (const t of [row.depth.basis.hook, row.depth.history ? row.depth.history.hook : '']) assert.deepEqual(JARGON2.filter((w) => t.includes(w)), [], `hook jargon ${t}`);
assert.equal(tl.buildTimelineDecree().lines[1].body, '你手裡這股勁剛冒頭，刃還沒開過鋒。嫩，卻已握在掌心。');
assert.equal(tl.buildTimelineDecree().lines[0].body, '你腳下這片地，不是今日才踏上的。早年一寸一寸夯實的路，就是你的根基，站得穩。');
const src = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-translation-layer.ts'), 'utf8');
assert(!/from '@\/lib\/(ziwei|dual-chart|three-core)/.test(src), 'translation layer imports no engine');

// ── 1b) 洋蔥層＋headline：48 值全覆蓋、逐欄禁詞（代入 12 領域）、單字「星」、headline（含最長起歲前綴）≤26、action 1–2、史事必附原典出處 ──
const onionHits = []; let histories = 0; const sources = new Set();
for (const l of tl.PALACE_VERSE_LAYERS) {
  assert.deepEqual(Object.keys(tl.PALACE_VERSE_ONION[l.key]).sort(), Object.keys(l.table).sort(), `onion covers ${l.key}`);
  for (const [val, row] of Object.entries(tl.PALACE_VERSE_ONION[l.key])) {
    assert(Number.isInteger(row.weight) && row.weight >= 1 && row.weight <= 10, `weight ${val}`);
    const dp = row.depth;
    assert(dp.action.length >= 1 && dp.action.length <= 2, `action count ${val}`);
    assert(dp.basis.text && dp.basis.hook, `basis ${val}`);
    if (dp.history) { histories++; sources.add(dp.history.source); assert(dp.history.text && dp.history.hook && /^《[^》]+》$/.test(dp.history.source), `history ${val}`); }
    for (const d of Object.values(tl.PALACE_VERSE_DOMAIN)) {
      const headline = `114 歲起，${row.headline}`;
      assert(Array.from(headline).length <= 26, `headline ≤26: ${headline}`);
      assert(row.headline.includes('你'), `headline 對你說: ${row.headline}`);
      const all = [headline, dp.basis.text, dp.basis.hook, ...(dp.history ? [dp.history.text, dp.history.source, dp.history.hook] : []), ...dp.action].join('\n');
      const h = tl.palaceVerseForbiddenHits(all); if (h.length) onionHits.push(`${l.key}:${val}:${d}: ${h}`);
      if (/星/.test(all)) onionHits.push(`${l.key}:${val}: 星`);
    }
  }
}
for (const [t, p] of Object.entries(tl.AGE_OPENING_POSITION)) for (const d of Object.values(tl.PALACE_VERSE_DOMAIN)) { const x = p.replace('{d}', d); assert.deepEqual(tl.palaceVerseForbiddenHits(x), [], x); assert(!/星/.test(x)); }
assert.deepEqual(onionHits, [], 'onion forbidden');
// 層層承接：basis.hook → history（有史事）或 → action（無史事）；history.hook → action
const endsWithAny = (s, list) => list.some((x) => s.endsWith(x));
const aliasTerms = load('lib/asura-display-alias.ts').ASURA_FORBIDDEN_TERMS;
assert(aliasTerms.length > 20, 'alias forbidden list');
for (const l of tl.PALACE_VERSE_LAYERS) for (const [val, row] of Object.entries(tl.PALACE_VERSE_ONION[l.key])) {
  const dp = row.depth;
  assert(endsWithAny(dp.basis.hook, dp.history ? tl.AGE_HOOK_TO_HISTORY : tl.AGE_HOOK_TO_ACTION), `basis.hook lead ${val}: ${dp.basis.hook}`);
  if (dp.history) assert(endsWithAny(dp.history.hook, tl.AGE_HOOK_TO_ACTION), `history.hook lead ${val}: ${dp.history.hook}`);
  // 場景（我→你）＋收束：close 必有；除史事原文外全部過 lintAsuraVoice、零禁詞、無「星」
  assert(dp.basis.text.includes('我') && dp.basis.text.includes('你'), `scene ${val}`);
  assert(typeof dp.close === 'string' && dp.close.length > 0, `close ${val}`);
  for (const t of [row.headline + '。', dp.basis.text, dp.basis.hook, ...(dp.history ? [dp.history.hook] : []), ...dp.action, dp.close]) {
    assert.deepEqual(tl.palaceVerseForbiddenHits(t), [], `onion text ${val}: ${t}`); assert(!/星/.test(t), t);
    assert.deepEqual(aliasTerms.filter((w) => t.includes(w)), [], `alias term ${val}: ${t}`);
    assert.deepEqual(voice.lintAsuraVoice(t), [], `onion lint ${val}: ${t}`);
  }
}
// bridge／guide：分類涵蓋 48 值；25 句＋guide 零禁詞、無「星」、lintAsuraVoice 通過
const newLint = [];
for (const l of tl.PALACE_VERSE_LAYERS) assert.deepEqual(Object.keys(tl.AGE_BRIDGE_KIND[l.key]).sort(), Object.keys(l.table).sort(), `bridge kind covers ${l.key}`);
const KINDS = ['rise', 'hold', 'cut', 'loss', 'clash'];
const allBridges = KINDS.flatMap((a) => KINDS.flatMap((b) => tl.AGE_BRIDGE_OPEN[a].flatMap((o) => tl.AGE_BRIDGE_CLOSE[b].map((c) => `${o}，${c}。`))));
const newTexts = [...allBridges, ...Object.values(tl.AGE_TIMELINE_GUIDE), ...tl.AGE_HOOK_TO_HISTORY, ...tl.AGE_HOOK_TO_ACTION];
assert.equal(new Set(allBridges).size, 225, 'bridge combos unique');
for (const t of newTexts) {
  assert.deepEqual(tl.palaceVerseForbiddenHits(t), [], `new text forbidden: ${t}`); assert(!/星/.test(t), t);
  const p = voice.lintAsuraVoice(t); if (p.length) newLint.push(`${t} → ${p.join('/')}`);
}
assert.deepEqual(newLint, [], 'bridge/guide lint');
assert.deepEqual({ ...tl.AGE_TIMELINE_GUIDE }, { hereLabel: '你現在在這段，往下看', toPast: '點這裡看上一段', toFuture: '點這裡看下一段', endLine: '往後的路你都看完了。點最上面的亮點，回到你現在這段。' });
// 前端 fallback 與後端 guide 逐字相同
{ const fe = fs.readFileSync(path.join(root, 'features/ghost-asura/components/AsuraAgeTimeline.tsx'), 'utf8'); for (const t of Object.values(tl.AGE_TIMELINE_GUIDE)) assert(fe.includes(`'${t}'`), `frontend fallback ${t}`); }
// 招牌語／權重標題：零禁詞、無「星」、無別名詞、我→你、除單句長度外過 lintAsuraVoice、加最長前綴 ≤26、不含行話
const JARGON = ['收割', '披麻', '披一回麻', '渡', '歃血', '立纛', '淬鋒', '藏鋒', '出鞘', '史書'];
for (const t of [...tl.AGE_PREMIUM_TITLES, ...tl.AGE_WEIGHTED_TITLES].map((p) => p.phrase)) {
  assert.deepEqual(tl.palaceVerseForbiddenHits(t), [], `title forbidden ${t}`); assert(!/星/.test(t), t);
  assert.deepEqual(aliasTerms.filter((w) => t.includes(w)), [], `title alias ${t}`);
  assert(t.includes('我') && t.includes('你'), `title 我→你 ${t}`);
  assert.deepEqual(voice.lintAsuraVoice(t).filter((x) => !x.startsWith('句子過長')), [], `title lint ${t}`);
  assert(Array.from(`114 歲起，${t}`).length <= 26, `title ≤26 ${t}`);
  assert.deepEqual(JARGON.filter((w) => t.includes(w)), [], `title jargon ${t}`);
}
for (const row of Object.values(tl.AGE_ROW_HEADLINE).flatMap((o) => Object.values(o))) assert.deepEqual(JARGON.filter((w) => row.includes(w)), [], `row headline jargon ${row}`);
// 姓名清洗
assert.equal(tl.sanitizeViewerName('  王小明  '), '王小明');
assert.equal(tl.sanitizeViewerName('<b>阿明</b>'), 'b阿明b');
assert.equal(tl.sanitizeViewerName('天同小姐'), null);
assert.equal(tl.sanitizeViewerName('阿養'), null);
assert.equal(tl.sanitizeViewerName('甲子'), null);
assert.equal(tl.sanitizeViewerName('   '), null);
assert.equal(tl.sanitizeViewerName(42), null);
assert.equal(Array.from(tl.sanitizeViewerName('一二三四五六七八九十甲乙丙丁')).length, 12);
// decreeAnchors 邊界
const mk = (cur) => ({ title: 't', guide: tl.AGE_TIMELINE_GUIDE, segments: [0, 1, 2].map((i) => ({ ageLabel: `a${i}`, tense: i < cur ? '過去' : i === cur ? '現在' : '未來', isCurrent: i === cur, opening: { text: '', headline: '' }, lines: [], depth: [], bridge: null })) });
assert.equal(tl.buildDecreeAnchors(mk(-1)), null); assert.equal(tl.buildDecreeAnchors(null), null);
assert.deepEqual(tl.buildDecreeAnchors(mk(0)).map((a) => [a.segmentIndex, a.focus]), [[0, 'segment'], [0, 'segment'], [0, 'action'], [1, 'segment']]);
assert.deepEqual(tl.buildDecreeAnchors(mk(2)).map((a) => [a.segmentIndex, a.focus]), [[1, 'segment'], [2, 'segment'], [2, 'action'], [2, 'segment']]);

// ── 2) 1974 ──
const now = new Date('2026-11-06T05:00:00Z');
const r = calculateDualChart({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' });
const v = display.computeAgeTimeline(r, now);
assert(v && v.segments.length === 6, '1974 實歲 52 → 截到含 62 的段（54–63），共 6 段');
assert.deepEqual(Object.keys(v), ['title', 'guide', 'viewerLine', 'segments', 'premiumTitles']);
assert.equal(v.viewerLine, '你今年 52 歲（虛歲 53），正走在 44–53 歲這段。');
assert(v.segments.every((g) => JSON.stringify(Object.keys(g)) === JSON.stringify(['ageLabel', 'tense', 'isCurrent', 'opening', 'lines', 'depth', 'bridge'])), 'segment shape');
const srv = tl.buildAgeTimelineServer(r.ziwei.palaces.map((p) => ({ palaceKey: p.key, range: p.period.range, stage: p.period.stage, boshi: p.period.boshi, suiqian: p.period.suiqian, jiangqian: p.period.jiangqian })), 53, { name: null, age: 52 });
assert.deepEqual(srv.timeline, v);
const T = Object.fromEntries(tl.PALACE_VERSE_LAYERS.map((l) => [l.key, l.table]));
const L = (k, n, d) => T[k][n].text.replace('{d}', d);
const expect = [
  [4, 13, '過去', ['帝旺', '喜神', '龍德', '息神'], '你自己'],
  [14, 23, '過去', ['衰', '病符', '白虎', '華蓋'], '上一代'],
  [24, 33, '過去', ['病', '大耗', '天德', '劫煞'], '心氣'],
  [34, 43, '過去', ['死', '伏兵', '弔客', '災煞'], '家門'],
  [44, 53, '現在', ['墓', '官府', '病符', '天煞'], '戰功'],
  [54, 63, '未來', ['絕', '博士', '歲建', '指背'], '身邊人馬'],
];
expect.forEach(([a, b, tense, [s, bo, sq, jq], d], i) => {
  const g = v.segments[i];
  assert.equal(g.ageLabel, `約 ${a}–${b} 歲`); assert.deepEqual(srv.ranges[i], [a, b]);
  assert.equal(g.tense, tense); assert.equal(g.isCurrent, tense === '現在');
  assert.deepEqual(g.lines, [L('stage', s, d), L('banner', bo, d), L('decree', sq, d), L('force', jq, d)], `group ${a}`);
});
assert.equal(v.segments.filter((g) => g.isCurrent).length, 1);
assert(srv.ranges.every((x, i) => i === 0 || x[0] > srv.ranges[i - 1][0]), 'sorted by age');
const blob = JSON.stringify(v);
assert.deepEqual(tl.palaceVerseForbiddenHits(blob), []);
for (const leak of ['sourceLevel', 'classic', 'later', 'note', 'palaceKey', 'MING', 'FU_MU']) assert(!blob.includes(leak), `leaks ${leak}`);
assert.equal(v.segments.flatMap((g) => g.lines).length, 24);
assert(v.segments.every((g) => g.depth.length === 4 && g.depth.every((x) => x.basis && 'history' in x && x.action.length >= 1 && x.action.length <= 2 && typeof x.close === 'string' && x.close.length > 0)), 'depth parallel to lines');
const HEADLINES_1974 = ["4 歲起，我把你推到最高點，守得住才是你的", "14 歲起，你前面有險，出手留三分", "24 歲起，錢在往外流，我要你先守住家底", "34 歲起，這段有場傷心事，我陪你哭完再站起來", "44 歲起，身體在喊停，我要你先停，再打下一仗", "54 歲起，舊路我替你斷了，新路從你腳下開始"];
assert.deepEqual(v.segments.map((g) => g.opening.headline), HEADLINES_1974, '1974 headlines');
assert.deepEqual(v.segments.map((g) => g.opening.text), ["你 4–13 歲走過這段，落在你自己。", "你 14–23 歲走過這段，落在上一代。", "你 24–33 歲走過這段，落在心氣。", "你 34–43 歲走過這段，落在家門。", "你今年虛歲 53，正走在這段，落在戰功；今年是這段最後一年。", "再過 1 年，你 54 歲進這段，落在身邊人馬。"]);
// 姓名版：只在現在段位置句與 viewerLine 前綴姓名
{ const vn = display.computeAgeTimeline(r, now, '  阿勝 '); assert.equal(vn.viewerLine, '阿勝，你今年 52 歲（虛歲 53），正走在 44–53 歲這段。'); assert(vn.segments[4].opening.text.startsWith('阿勝，你今年虛歲 53')); assert.equal(vn.segments.filter((g) => g.opening.text.includes('阿勝')).length, 1);
  // 截斷：18／40／80 歲各留到含「實歲＋10」的段
  const kept = (bd) => display.computeAgeTimeline(calculateDualChart({ birthDate: bd, birthTime: '18:00', gender: 'male', calendarType: 'solar', timezone: 'Asia/Taipei' }), now).segments.map((g) => g.ageLabel);
  assert.deepEqual(kept('2008-01-15'), ["約 6–15 歲", "約 16–25 歲", "約 26–35 歲"], 'age18 cutoff 28');
  assert.deepEqual(kept('1986-06-28'), ["約 6–15 歲", "約 16–25 歲", "約 26–35 歲", "約 36–45 歲", "約 46–55 歲"], 'age40 cutoff 50');
  assert.deepEqual(kept('1946-06-28'), ["約 6–15 歲", "約 16–25 歲", "約 26–35 歲", "約 36–45 歲", "約 46–55 歲", "約 56–65 歲", "約 66–75 歲", "約 76–85 歲", "約 86–95 歲"], 'age80 cutoff 90'); assert.equal(display.computeAgeTimeline(r, now, '天同').viewerLine, v.viewerLine); }
for (const leak of ['weight', 'headlineLayers']) assert(!blob.includes(leak), `leaks ${leak}`);
const BRIDGES_1974 = ["這段你往上走，下一段你正面迎戰。", "這段有人衝你來，下一段你守住錢。", "這段你先顧傷，下一段你放下舊的。", "這段你放下舊的，下一段你先止損。", "這段你要止損，下一段你斷舊路。", null];
fs.writeFileSync(path.join(require('node:os').tmpdir(), 'ga-1974-bridges.json'), JSON.stringify({ bridges: v.segments.map((g) => [g.ageLabel, g.opening.headline, g.bridge]), guide: v.guide, anchors: tl.buildDecreeAnchors(v) }, null, 1));
assert.deepEqual(v.segments.map((g) => g.bridge), BRIDGES_1974, '1974 bridges');
assert.deepEqual(tl.buildDecreeAnchors(v).map((a) => [a.segmentIndex, a.tense, a.focus]), [[3, '過去', 'segment'], [4, '現在', 'segment'], [4, '現在', 'action'], [5, '未來', 'segment']], '1974 anchors');
assert.deepEqual(tl.buildDecreeAnchors(v, { name: null, age: 52 }).map((a) => [a.label, a.ageRange, a.mark, a.headline === v.segments[a.segmentIndex].opening.headline]), [['你 34–43 歲・走過的路', '34–43', '走過', true], ['你今年 52 歲・就在這段', '44–53', '現在', true], ['你今年 52 歲・現在就做', '44–53', '現在就做', true], ['你 54 歲起・下一段', '54–63', '下一段', true]], '1974 anchor markers');
assert.deepEqual(v.premiumTitles.map((p) => [p.segmentIndex, p.phrase]), [[3, "這段有場傷心事，我陪你哭完再站起來"], [4, "身體在喊停，我要你先停，再打下一仗"]], '1974 premium');

// ── 3) 多組生辰 ──
let n = 0; let ms = 0; let premHits = 0;
for (let y = 1950; y <= 2005; y += 5) for (const m of [1, 4, 8, 12]) for (const t of ['00:30', '07:00', '13:00', '22:00']) for (const gender of ['male', 'female']) {
  const chart = calculateDualChart({ birthDate: `${y}-${String(m).padStart(2, '0')}-15`, birthTime: t, gender, calendarType: 'solar', timezone: 'Asia/Taipei' });
  const t0 = process.hrtime.bigint();
  const x = display.computeAgeTimeline(chart, now);
  const pv = chart.ziwei.palaces.map((p) => p.period).filter((p) => p && Array.isArray(p.range)).sort((a, b) => a.range[0] - b.range[0]);
  const PREM = Object.fromEntries(tl.AGE_PREMIUM_TITLES.map((p) => [p.value, p.phrase]));
  x && x.segments.forEach((g, i) => {
    const phrase = PREM[pv[i].suiqian]; const pt = x.premiumTitles.find((p) => p.segmentIndex === i);
    assert(Array.from(g.opening.headline).length <= 26 && g.opening.headline.startsWith(`${pv[i].range[0]} 歲起，`), `headline ≤26 + age ${y}-${m} seg${i}: ${g.opening.headline}`);
    if (phrase) { premHits++; assert(pt && pt.phrase === phrase && pt.headline === g.opening.headline && g.opening.headline.endsWith(phrase), `premium ${y}-${m} seg${i}`); }
    else { assert(!pt, `premium without source ${y}-${m} seg${i}`); for (const q of Object.values(PREM)) assert(!g.opening.headline.includes(q), `phrase leak ${y}-${m} seg${i}: ${g.opening.headline}`); }
  });
  assert.deepEqual(tl.palaceVerseForbiddenHits(JSON.stringify(x.premiumTitles)), []);
  ms += Number(process.hrtime.bigint() - t0) / 1e6;
  assert(x && x.segments.length >= 1 && x.segments.length <= 12 && x.segments.every((g) => g.lines.length === 4), `${y}-${m} ${t} ${gender}`);
  { const last = pv[x.segments.length - 1].range; const age = 2026 - y - (m <= 11 ? 0 : 1); assert((last[0] <= age + 10 && age + 10 <= last[1]) || x.segments.length === 12, `cutoff ${y}-${m}`); }
  assert(x.segments.filter((g) => g.isCurrent).length <= 1);
  assert(x.segments.slice(0, -1).every((g) => typeof g.bridge === 'string' && g.bridge.length > 0) && x.segments[x.segments.length - 1].bridge === null, 'bridges');
  assert.equal(new Set(x.segments.slice(0, -1).map((g) => g.bridge)).size, x.segments.length - 1, `bridge repeat ${y}-${m}`);
  assert(x.segments.every((g) => g.depth.every((d) => d.close)), 'close');
  const an = tl.buildDecreeAnchors(x);
  if (x.segments.some((g) => g.isCurrent)) assert(an.length === 4 && an.every((a) => x.segments[a.segmentIndex].ageLabel === a.ageLabel && x.segments[a.segmentIndex].tense === a.tense), 'anchors'); else assert.equal(an, null);
  assert.deepEqual(tl.palaceVerseForbiddenHits(JSON.stringify(x)), []);
  n++;
}
console.log(`ghost-asura-palace-verses: PASS (576 combos, ${later.size} later-level values, onion 48 rows / ${histories} histories / ${sources.size} sources, 1974 case, ${n} charts, avg ${(ms / n).toFixed(3)} ms/chart, ${premHits} premium headlines)`);
