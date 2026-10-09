// 鬼魅阿修羅｜舊資料回歸＋API 禁用詞（需 dev server 在 8888）：node tests/ghost-asura-nature-api-regression.test.cjs
// 以改動前快照（tests/fixtures/ghost-asura-nature/baseline-*.json，2026-10-09 於 HEAD a850ae6 擷取）比對：
//   舊欄位全在且可讀；三卡 key／項目／順序不變；三卡文字差異只能來自翻譯桶 ASURA_TERM_BUCKET（逐條列出）；
//   其餘舊欄位內容完全相同；新欄位 nature 只含 version,title,essence,risk（或 null）；
//   三卡只准多 story 欄（故事線）；nature 與三卡零術語；整份 JSON 的紫微名稱命中數不得多於改動前（舊欄位既有命中照列）。
// 時間相依：三卡依「今日所在立春年」取素材；快照年份與今天不同時，三卡內容比對改為只比結構並註明。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./fixtures/ghost-asura-nature/load.cjs');
const tl = load('lib/server/ghost-asura-translation-layer.ts');

const base = process.env.ASURA_BASE ?? 'http://localhost:8888';
const CASES = {
  u0030: { birthDate: '1968-09-02', birthTime: '00:30', gender: 'female' },
  u2330: { birthDate: '1968-09-01', birthTime: '23:30', gender: 'female' },
  m1974: { birthDate: '1974-07-02', birthTime: '03:30', gender: 'male' },
};
const count = (s, terms) => terms.map((t) => [t, s.split(t).length - 1]).filter(([, n]) => n > 0);
const changes = [];

function compareText(where, before, after) {
  if (typeof before !== 'string') { assert.deepEqual(after, before, where); return; }
  assert.equal(after, tl.asuraTranslateLine(before), `${where}: only the translation bucket may change wording`);
  if (after !== before) changes.push({ where, before, after });
}

(async () => {
  let i = 0;
  const summary = {};
  for (const [name, input] of Object.entries(CASES)) {
    i++;
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, `fixtures/ghost-asura-nature/baseline-${name}.json`), 'utf8')).data;
    const res = await fetch(`${base}/api/ghost-asura/reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base, 'x-forwarded-for': `10.18.${Date.now() % 250}.${i}` },
      body: JSON.stringify({ ...input, calendarType: 'solar', timezone: 'Asia/Taipei' }),
    });
    assert.equal(res.status, 200, `${name} status`);
    const now = (await res.json()).data;
    // 舊欄位全在、可讀、順序不變（只在最後新增 nature）
    assert.deepEqual(Object.keys(now).filter((k) => k !== 'nature'), Object.keys(fixture), `${name} legacy keys`);
    const sameYear = now.audit?.timeAxis?.flowYear === fixture.audit?.timeAxis?.flowYear && now.audit?.timeAxis?.todayTaipei === fixture.audit?.timeAxis?.todayTaipei;
    for (const key of Object.keys(fixture)) {
      if (key === 'sections') continue;
      if (key === 'audit' && !sameYear) continue;
      assert.deepEqual(now[key], fixture[key], `${name}.${key} unchanged`);
    }
    // 三卡：結構不變；文字只准翻譯桶差異
    assert.deepEqual(now.sections.map((s) => s.key), fixture.sections.map((s) => s.key));
    now.sections.forEach((s, si) => {
      const b = fixture.sections[si];
      assert.deepEqual(Object.keys(s).filter((k) => k !== 'story'), Object.keys(b), `${name}.${s.key} fields (only story may be added)`);
      if (s.story !== undefined) assert.deepEqual(count(s.story, tl.ASURA_CARD_FORBIDDEN_TERMS), [], `${name}.${s.key}.story terms`);
      if (!sameYear) return;
      for (const f of ['heading', 'label', 'lead', 'narrative', 'coda']) compareText(`${name}.${s.key}.${f}`, b[f], s[f]);
      assert.equal(s.items.length, b.items.length);
      s.items.forEach((it, ii) => { for (const f of Object.keys(b.items[ii])) compareText(`${name}.${s.key}.items[${ii}].${f}`, b.items[ii][f], it[f]); });
      assert.equal((s.blocks || []).length, (b.blocks || []).length);
      (s.blocks || []).forEach((bl, bi) => {
        compareText(`${name}.${s.key}.blocks[${bi}].text`, b.blocks[bi].text, bl.text);
        assert.equal(bl.plain.length, b.blocks[bi].plain.length);
        bl.plain.forEach((p, pi) => { compareText(`${name}.${s.key}.blocks[${bi}].plain[${pi}].label`, b.blocks[bi].plain[pi].label, p.label); compareText(`${name}.${s.key}.blocks[${bi}].plain[${pi}].plain`, b.blocks[bi].plain[pi].plain, p.plain); });
      });
    });
    // nature：只有公開欄位；零術語
    if (now.nature !== null) { const k = Object.keys(now.nature); assert.deepEqual(k.slice(0, 4), ['version', 'title', 'essence', 'risk'], `${name} nature public fields`); assert(k.slice(4).every((x) => ['strength', 'weakness'].includes(x)), `${name} nature optional fields`); }
    const all = tl.ASURA_CARD_FORBIDDEN_TERMS;
    assert.deepEqual(count(JSON.stringify(now.nature), all), [], `${name} nature has terms`);
    assert.deepEqual(count(JSON.stringify(now.sections), tl.ZIWEI_TERMS), [], `${name} sections have ziwei terms`);
    ['natureKey', 'riskKeys', 'evidence', 'refs', 'sourceRefs'].forEach((k) => assert(!JSON.stringify(now).includes(`"${k}"`), `${name} leaks ${k}`));
    // 整份 JSON：紫微名稱命中不得多於改動前
    const before = Object.fromEntries(count(JSON.stringify(fixture), tl.ZIWEI_TERMS));
    const after = Object.fromEntries(count(JSON.stringify(now), tl.ZIWEI_TERMS));
    for (const [t, n] of Object.entries(after)) assert(n <= (before[t] ?? 0), `${name} new ziwei term ${t}`);
    summary[name] = { sameYear, nature: now.nature, story: Object.fromEntries(now.sections.map((s) => [s.key, s.story ?? null])), ziweiHitsBefore: before, ziweiHitsAfter: after, natureHits: count(JSON.stringify(now.nature), all).length, sectionsHits: count(JSON.stringify(now.sections), tl.ZIWEI_TERMS).length };
  }
  for (const k of Object.keys(CASES)) assert.notEqual(summary[k].nature, null, `${k} nature card present`);
  console.log(JSON.stringify({ summary, wordingChanges: changes }, null, 1));
  console.log(`ghost-asura-nature-api-regression: PASS (${changes.length} wording changes, all from the translation bucket)`);
})().catch((e) => { console.error(e); process.exit(1); });
