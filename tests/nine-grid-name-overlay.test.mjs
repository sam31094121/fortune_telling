// 九宮格 × 姓名五格交叉對照：生日輸出不變＋與姓名學引擎一致（npx tsx tests/nine-grid-name-overlay.test.mjs）
import assert from 'node:assert/strict';
import { buildNineGridStudy, parseBirthDate } from '../lib/nine-grid-numbers.ts';
import { buildNineGridNameOverlay } from '../lib/nine-grid-name-overlay.ts';
import { buildNameologyAnalysis } from '../lib/nameology-engine.ts';
import { getNamePersonalityScores } from '../lib/name-model-db.ts';
import { loadLocalNameologyDictionary } from '../lib/nameology-dictionary-loader.ts';
import { POST } from '../app/api/nine-grid/route.ts';

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
    const ov = buildNineGridNameOverlay(study, name, analysis.grids);
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
console.log(`九宮格姓名對照：${passed} 項通過`);
