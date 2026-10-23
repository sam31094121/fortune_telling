// 九宮格 × 姓名五格交叉對照：生日輸出不變＋與姓名學引擎一致（npx tsx tests/nine-grid-name-overlay.test.mjs）
import assert from 'node:assert/strict';
import { buildNineGridStudy, parseBirthDate } from '../lib/nine-grid-numbers.ts';
import { buildNineGridNameOverlay } from '../lib/nine-grid-name-overlay.ts';
import { buildNameologyAnalysis } from '../lib/nameology-engine.ts';
import { getNamePersonalityScores } from '../lib/name-model-db.ts';
import { loadLocalNameologyDictionary } from '../lib/nameology-dictionary-loader.ts';
import { POST } from '../app/api/nine-grid/route.ts';
import { NINE_GRID_SOURCE_NOTES } from '../lib/nine-grid-name-overlay.ts';
import { readFileSync } from 'node:fs';

let passed = 0;
const check = async (n, fn) => { await fn(); passed += 1; console.log(`  ✓ ${n}`); };
const post = (body) => POST(new Request('http://x/api/nine-grid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
const DATES = ['1974-06-28', '1990-01-01', '2001-12-25'];

for (const d of DATES) {
  await check(`無姓名時 ${d} 回應與原生日運算逐字相同`, async () => {
    const p = parseBirthDate(d); assert.equal(p.ok, true);
    const res = await post({ birthDate: d });
    assert.equal(await res.text(), JSON.stringify({ ok: true, study: buildNineGridStudy(p) }));
    const res2 = await post({ birthDate: d, name: '' });
    assert.equal(await res2.text(), JSON.stringify({ ok: true, study: buildNineGridStudy(p) }));
  });
}

const dict = await loadLocalNameologyDictionary();
for (const name of ['王小明', '陳怡君', '林志玲']) {
  await check(`${name}：五格與姓名學引擎一致，格子計數＝五格各位數字`, async () => {
    const p = parseBirthDate('1974-06-28');
    const study = buildNineGridStudy(p);
    const before = JSON.stringify(study);
    const analysis = buildNameologyAnalysis(name, getNamePersonalityScores(name), { birthDate: '1974-06-28', dictionarySnapshot: dict });
    const ov = buildNineGridNameOverlay(study, name, analysis.grids, analysis.characters);
    assert.equal(JSON.stringify(study), before, 'study 不得被改動');
    assert.deepEqual(ov.grids.map((g) => [g.key, g.value]), analysis.grids.map((g) => [g.key, g.value]));
    const digits = analysis.grids.flatMap((g) => String(g.value).split('').map(Number));
    assert.deepEqual(ov.drop.map((s) => s.digit), digits);
    for (const pal of ov.palaces) assert.equal(pal.nameCount, digits.filter((x) => x === pal.digit).length);
    for (const d of ov.doubleEmphasis) assert.ok(study.cells.find((c) => c.digit === d).count > 0 && ov.palaces.find((x) => x.digit === d).nameCount > 0);
    for (const l of ov.lines) {
      const comb = (x) => study.cells.find((c) => c.digit === x).count + ov.palaces.find((q) => q.digit === x).nameCount;
      assert.equal(l.litWithName, study.lines.find((s) => s.id === l.id).digits.every((x) => comb(x) > 0));
      assert.equal(l.litByBirth, study.lines.find((s) => s.id === l.id).lit);
    }
    const lit = ov.drop.flatMap((s) => s.linesLit);
    assert.deepEqual([...lit].sort(), ov.lines.filter((l) => l.litWithName && !l.litByBirth).map((l) => l.id).sort());
    if (analysis.standardOutput.verification.readyForFrontend) {
      const res = await post({ birthDate: '1974-06-28', name });
      const json = await res.json();
      assert.deepEqual(json.study, JSON.parse(before));
      assert.deepEqual(json.nameOverlay, JSON.parse(JSON.stringify(ov)));
    }
  });
}
await check('不收主命數／天賦數／八十一靈動數', async () => {
  const ov = buildNineGridNameOverlay(buildNineGridStudy(parseBirthDate('1974-06-28')), '王小明', [{ key: 'sky', label: '天格', value: 5 }]);
  assert.ok(!/主命數|天賦數|八十一/.test(JSON.stringify(ov)));
});
await check('曾威燕／1974-06-28：每字筆畫、拆數、來源格子都來自引擎', async () => {
  const study = buildNineGridStudy(parseBirthDate('1974-06-28'));
  const analysis = buildNameologyAnalysis('曾威燕', getNamePersonalityScores('曾威燕'), { birthDate: '1974-06-28', dictionarySnapshot: dict });
  const ov = buildNineGridNameOverlay(study, '曾威燕', analysis.grids, analysis.characters);
  assert.deepEqual(ov.chars.map((c) => c.strokes), analysis.characters.map((c) => c.strokeCount));
  for (const g of ov.split) assert.equal(Number(g.digits.join('')), g.value);
  for (const c of ov.contributors) assert.equal(c.from.length, ov.palaces.find((p) => p.digit === c.digit).nameCount);
  assert.ok(!/出現最多次的是 .*（1 次）/.test(study.summary.text), '每個數字只出現一次時不得寫「出現最多次…（1 次）」');
  console.log('    ', ov.chars.map((c) => c.char + c.strokes).join(' '), ov.grids.map((g) => g.label + g.value).join(' '), ov.contributors.find((c) => c.digit === 1).text);
});
await check('每個來源標記都對得到登記表與技能檔標籤', async () => {
  const reg = JSON.parse(readFileSync(new URL('../docs/技能戰鬥檔案/易經/來源登記.json', import.meta.url), 'utf8'));
  const labels = { ...JSON.parse(readFileSync(new URL('../docs/技能戰鬥檔案/九宮格靈動數字/九宮格靈動數字.json', import.meta.url), 'utf8')).sourceLabels, ...JSON.parse(readFileSync(new URL('../docs/技能戰鬥檔案/姓名學/姓名學.json', import.meta.url), 'utf8')).sourceLabels };
  for (const note of Object.values(NINE_GRID_SOURCE_NOTES)) {
    if (note.tier === 'site') { assert.equal(note.cites.length, 0); continue; }
    assert.ok(note.cites.length > 0, note.key);
    for (const c of note.cites) {
      const entry = reg.sources.find((s) => s.source_id === c.id);
      assert.ok(entry, `${c.id} 不在來源登記`);
      assert.equal(c.trust, entry.trust, `${c.id} 等級不符`);
      assert.equal(c.label, labels[c.id], `${c.id} 標籤與技能檔不一致`);
    }
  }
});
console.log(`九宮格姓名對照：${passed} 項通過`);
