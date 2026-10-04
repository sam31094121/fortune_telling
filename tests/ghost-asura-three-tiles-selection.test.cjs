// 鬼魅阿修羅三格：後端只輸出「印記覺醒＋交叉精準對上（rules VERIFIED）＋真實文案」；沉眠／佔位字／未交叉驗證一律不出；話術過 lint。
// 以實際端點驗證（需 dev server 在 8888）：node tests/ghost-asura-three-tiles-selection.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const base = process.env.ASURA_BASE ?? 'http://localhost:8888';
const PLACEHOLDERS = ['此域暫無可用判讀', '此印記尚待確認，暫不提供正式解讀。', '此印是否覺醒尚未確認，仍維持待校核。', '印記待校核', '候機，不強求。', '沉眠'];

// 話術 lint：直接轉譯 voice 模組（去掉 server-only 匯入）
const voiceSrc = fs.readFileSync(path.join(root, 'lib/server/ghost-asura-voice.ts'), 'utf8').replace("import 'server-only';", '');
const voice = { exports: {} };
new Function('module', 'exports', ts.transpileModule(voiceSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(voice, voice.exports);
const { ASURA_VOICE, ASURA_PLAIN, ASURA_TIMELINE, lintAsuraVoice, lintPlain } = voice.exports;
for (const [id, tl] of Object.entries(ASURA_TIMELINE)) {
  for (const when of ['past', 'present', 'future']) {
    assert.deepEqual(lintAsuraVoice(tl[when].text), [], `timeline ${id}.${when} violates spec: ${tl[when].text}`);
    assert.deepEqual(lintPlain(tl[when].plain), [], `timeline ${id}.${when} plain violates plain lint: ${tl[when].plain}`);
    // 誠實：時間軸不得含具體年份、年齡、月份、日期
    assert(!/\d|歲|年後|月份|幾月|哪一年/.test(tl[when].text + tl[when].plain), `timeline ${id}.${when} must not invent concrete time`);
  }
}
// 過去：連續讀盤，各種組合都過話術 lint
{
  const ids = Object.keys(ASURA_TIMELINE);
  const pillars = ['year', 'month', 'day', 'hour'];
  const combos = [];
  for (const p1 of pillars) for (const p2 of pillars) combos.push([{ resultId: ids[0], name: 'A', pillar: p1, fallback: [] }, { resultId: ids[1], name: 'B', pillar: p2, fallback: [] }, { resultId: ids[2], name: 'C', pillar: p2, fallback: [] }]);
  for (const id of ids) combos.push([{ resultId: id, name: 'A', pillar: 'hour', fallback: [] }]);
  for (const marks of combos) {
    for (const when of ['past', 'present', 'future']) {
      const r = voice.exports.composeTime(when, marks);
      for (const line of r.narrative.split('\n')) assert.deepEqual(lintAsuraVoice(line), [], `${when} narrative violates spec: ${line}`);
      const prefix = voice.exports.TIME_VOICE[when].codaPrefix;
      assert(r.coda.startsWith(prefix) && r.coda.endsWith('。'), `${when} coda shape`);
      assert.equal(prefix, { past: '這些事，已經落在你身上：', present: '這些事，正在發生：', future: '這些事，必然來到：' }[when]);
      // 收尾：固定前綴（使用者指定）＋顯示印記的情境類型；整句過 lint，不得含身分標籤
      assert.deepEqual(lintAsuraVoice(prefix), [], `${when} coda prefix`);
      assert(!/這樣的人/.test(r.coda), 'coda must not be an identity label');
      for (const item of r.coda.slice(prefix.length).replace(/。$/, '').split('；')) assert.deepEqual(lintAsuraVoice(item), [], `${when} coda item: ${item}`);
    }
    // 三卡句子互不重用
    const sets = ['past', 'present', 'future'].map((w) => new Set(voice.exports.composeTime(w, marks).narrative.split(/[\n。]/).filter((x) => x && !/之上，/.test(x))));
    for (const x of sets[0]) assert(!sets[1].has(x) && !sets[2].has(x), `sentence reused across cards: ${x}`);
    for (const x of sets[1]) assert(!sets[2].has(x), `sentence reused across cards: ${x}`);
  }
  assert.equal(voice.exports.composePast([]), null);
}
const awaitLine = fs.readFileSync(path.join(root, 'lib/ghost-asura-display-contract.ts'), 'utf8').match(/ASURA_AWAIT_BIRTH = '([^']+)'/)[1];
assert.deepEqual(lintAsuraVoice(awaitLine), [], `await-birth line violates spec: ${awaitLine}`);
for (const [id, text] of Object.entries(ASURA_PLAIN)) assert.deepEqual(lintPlain(text), [], `plain ${id} violates plain lint: ${text}`);
for (const [id, entry] of Object.entries(ASURA_VOICE)) {
  for (const [field, text] of Object.entries(entry)) {
    assert.deepEqual(lintAsuraVoice(text), [], `voice ${id}.${field} violates spec: ${text}`);
  }
}

async function check(body, ip) {
  const res = await fetch(`${base}/api/ghost-asura/reading`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, 'X-Forwarded-For': ip },
    body: JSON.stringify({ ...body, calendarType: 'solar', timezone: 'Asia/Taipei' }),
  });
  assert.equal(res.status, 200);
  const { data } = await res.json();
  const sections = Object.fromEntries(data.sections.map((s) => [s.key, s]));
  const names = (key) => sections[key].items.map((i) => i.label);
  assert.equal(data.sections.length, 3, '三格永遠都在');
  // 時間軸：三卡各自依時段觸發，彼此不必相同；後端須回報各卡區間（只在 audit，不渲染）
  assert(data.audit.timeAxis && data.audit.timeAxis.cards.length === 3, 'timeAxis audit');
  const [pastC, nowC, futC] = data.audit.timeAxis.cards;
  assert.deepEqual(nowC.flowYears, [data.audit.timeAxis.flowYear, data.audit.timeAxis.flowYear], '現在＝只看今年');
  assert.equal(futC.flowYears[0], data.audit.timeAxis.flowYear + 1, '未來 從明年立春起');
  assert.equal(futC.flowYears[1] - futC.flowYears[0] + 1, 10, '未來 10 個流年');
  if (pastC.flowYears) assert.equal(pastC.flowYears[1], data.audit.timeAxis.flowYear - 1, '過去 至今年立春前');
  for (const [s, c] of [[sections.hits, pastC], [sections.pillars, nowC], [sections.verdict, futC]]) assert.deepEqual(s.items.map((i) => i.label), c.shown, `${s.heading} shows its own range`);
  for (const s of data.sections) {
    for (const item of s.items) {
      for (const p of PLACEHOLDERS) assert(!item.text.includes(p), `placeholder in ${s.key}: ${item.label}`);
      assert(!/印記沉眠|待校核/.test(item.text), `dormant/pending in ${s.key}: ${item.label}`);
      assert(item.plain, `shown item needs 白話: ${s.key} ${item.label}`);
      assert.deepEqual(lintPlain(item.plain, [item.label]), [], `plain lint ${item.label}`);
    }
  }
  for (const s of data.sections) {
    const empty = s.items.length === 0 && !(s.key === 'verdict' && s.lead);
    // 0 印的卡：後端一個字都不出（無空行、無白話、無收尾、無 lead）；非空卡也不帶空行
    assert(!('emptyText' in s), `${s.key} has no empty-line field (removed)`);
    assert(!JSON.stringify(s).includes('無印可照'), `${s.key} must not carry the old empty line`);
    if (empty) {
      assert(!s.narrative && !s.coda && !s.lead, `empty tile ${s.key} must render nothing`);
      assert(!s.items.some((i) => i.plain), `empty tile ${s.key} has no 白話`);
    }
  }
  const a = data.audit;
  const hidden = [...a.droppedDormantNames, ...a.droppedNotCrossVerifiedNames, ...a.droppedPlaceholderNames, ...a.droppedPendingNames, ...a.droppedNoPillarNames];
  for (const s of data.sections) {
    const own = new Set(s.items.map((i) => i.label));
    if (s.items.length > 0) {
      assert(s.narrative && s.coda, `${s.heading} has narrative + coda`);
      // 白話緊接段落：blocks 與 narrative 同序；每個印記的白話恰出現一次；開場與收句後不帶白話
      assert(Array.isArray(s.blocks) && s.blocks.length >= 3, `${s.heading} has interleaved blocks`);
      assert.equal(s.blocks.map((b) => b.text).join('\n'), s.narrative, `${s.heading} blocks follow narrative order`);
      assert.equal(s.blocks[0].plain.length, 0, `${s.heading} opening has no 白話`);
      assert.equal(s.blocks[s.blocks.length - 1].plain.length, 0, `${s.heading} closing has no 白話`);
      const placed = s.blocks.flatMap((b) => b.plain.map((l) => l.label));
      assert.deepEqual([...placed].sort(), s.items.filter((i) => i.plain).map((i) => i.label).sort(), `${s.heading} each 白話 placed once`);
      for (const b of s.blocks) for (const l of b.plain) assert(b.text.includes(l.label), `${s.heading} 白話 ${l.label} sits right after the paragraph that reads it`);
    } else assert(!s.blocks && !s.narrative && !s.coda, `${s.heading} empty has no narrative/blocks`);
    for (const name of hidden) if (!own.has(name)) assert(!((s.narrative ?? '') + (s.coda ?? '')).includes(name), `${s.heading} mentions a mark it does not show: ${name}`);
    // 區間只在後端：卡面文字不得出現年份
    assert(!/\d{4}/.test((s.narrative ?? '') + (s.coda ?? '')), `${s.heading} must not render year ranges`);
  }
  assert.equal(data.hourAssumed, body.timeUnknown === true, 'hourAssumed 誠實標示');
  if (data.hourAssumed) {
    assert.equal(data.assumedHour, '子時');
    assert.equal(data.hourNote, '時辰未知，以子時排。');
    assert.deepEqual(a.hourDependentNames, a.hourPillarNames, '時辰預設時列出依賴時柱的印記');
  } else {
    assert.equal(data.hourNote, null);
    assert.deepEqual(a.hourDependentNames, []);
  }
  assert(sections.hits.items.length >= a.emitted, '過去 含本命底盤');
  assert.equal(a.pipelineTotal, a.emitted + a.droppedDormant + a.droppedPending + a.droppedNoPillar + a.droppedNotCrossVerified + a.droppedPlaceholder);
  return { timeAxis: data.audit.timeAxis, hourAssumed: data.hourAssumed, hourNote: data.hourNote, tiles: data.sections.map((s) => ({ heading: s.heading, label: s.label, lead: s.lead, narrative: s.narrative, blocks: s.blocks, coda: s.coda, items: s.items.map((i) => ({ label: i.label, text: i.text, plain: i.plain })) })), lead: sections.verdict.lead, audit: a };
}

(async () => {
  const one = await check({ birthDate: '1974-06-28', birthTime: '18:00', gender: 'male' }, '10.77.0.1');
  const two = await check({ birthDate: '1990-03-15', birthTime: '09:30', gender: 'female' }, '10.77.0.2');
  const three = await check({ birthDate: '1974-06-28', timeUnknown: true, gender: 'male' }, '10.77.0.3');
  // 不知道時辰＝以子時（00:00）排：結果須與明確送 00:00 的盤相同（除旗標外）
  const zi = await check({ birthDate: '1974-06-28', birthTime: '00:00', gender: 'male' }, '10.77.0.4');
  assert.deepEqual(three.tiles, zi.tiles, '不知道時辰 = 子時 00:00');
  console.log('PASS', JSON.stringify({ one, two, unknownHour1974: three }, null, 1));
})().catch((e) => { console.error(e); process.exitCode = 1; });
