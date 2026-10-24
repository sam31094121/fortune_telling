import assert from 'node:assert/strict';
import { buildNineGridStudy, parseBirthDate } from '../lib/nine-grid-numbers.ts';
import { buildNineGridNameOverlay } from '../lib/nine-grid-name-overlay.ts';

const study = buildNineGridStudy(parseBirthDate('1974-06-28'));
const before = JSON.stringify(study);
const values = [13,21,25,17,37];
const labels = ['天格','人格','地格','外格','總格'];
const overlay = buildNineGridNameOverlay(study,'曾威燕', values.map((value,i)=>({ key:String(i),label:labels[i],value })));
const guide = overlay.playback;
assert.equal(JSON.stringify(study), before);
assert.deepEqual(guide.frames.map(f=>f.digit), [1,3,2,1,2,5,1,7,3,7]);
assert.equal(guide.frames[0].source, '天格 13');
assert.equal(guide.frames[0].cue, '天格第 1 位 1 → 同號 1 宮');
assert.equal(guide.frames[0].landing, '原有 1 ＋ 本次 1 ＝ 2（重複累計）');
assert.equal(guide.frames[1].landing, '原有 0 ＋ 本次 1 ＝ 1（首次補入）');
assert.deepEqual(guide.summary, { original:'1、2、4、6、7、8、9', added:'3、5', missing:'無', completion:'九宮皆有數字' });
for (let i=0;i<guide.frames.length;i++) {
  const d=guide.frames[i].digit;
  for (let n=1;n<=9;n++) {
    assert.equal(guide.states[i+1][n-1].count, guide.states[i][n-1].count + Number(n===d));
  }
}
for(const cell of overlay.palaces) assert.equal(guide.states.at(-1)[cell.digit-1].added,cell.nameCount);
const birth = study.luoshu.birthOverlay.playback;
assert.deepEqual(birth.frames.map(f=>f.digit), [1,9,7,4,0,6,2,8]);
assert.deepEqual(birth.states[4],birth.states[5]);
assert.equal(birth.summary.missing,'3、5');
for(const cell of study.cells) assert.equal(birth.states.at(-1)[cell.digit-1].count,cell.count);
const sparse = buildNineGridNameOverlay(buildNineGridStudy(parseBirthDate('2000-02-02')), '測試', [{key:'test',label:'總格',value:10}]);
assert.equal(sparse.playback.summary.added,'1');
assert.equal(sparse.playback.summary.missing,'3、4、5、6、7、8、9');
assert.deepEqual(sparse.playback.states[1],sparse.playback.states[2]);
console.log('播放事實：五格來源、拆位、每步累積、生日零、不硬補滿及原結果保留通過');

const one = guide.details.find(d=>d.digit===1);
assert.equal(one.calculation,'生日原有 1 ＋ 姓名本次 3 ＝ 合計 4');
assert.equal(one.sources[0].steps.length,1);
assert.deepEqual(one.sources[1].steps, [
 '天格 13 → 1 · 3；第 1 位 1', '人格 21 → 2 · 1；第 2 位 1', '外格 17 → 1 · 7；第 1 位 1'
]);
assert.equal(guide.result.rows.find(r=>r.label==='首次補到新宮').value,'3、5');
assert.equal(guide.result.rows.find(r=>r.label==='重複累積').value,'1（3次）、2（2次）、3（1次）、7（2次）');
assert.equal(birth.details.find(d=>d.digit===3).status,'本次資料未出現此數');
assert.equal(birth.details.find(d=>d.digit===3).sources[0].steps.length,0);
assert.equal(sparse.playback.details.find(d=>d.digit===9).calculation,'生日原有 0 ＋ 姓名本次 0 ＝ 合計 0');
console.log('來源回看與結果分項：生日位置、五格拆數、重複及缺數通過');
