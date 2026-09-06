const assert=require('node:assert/strict');
const {elementGuide,elementLesson}=require('../.beast-game-build/lib/beast-game/element-lesson.js');
const {ELEMENTS,ELEMENT_LABEL,elementMultiplier}=require('../.beast-game-build/lib/beast-game/elements.js');
const {playableCards}=require('../.beast-game-build/lib/beast-game/registry.js');
const guide=elementGuide();
assert.deepEqual(guide.rows.map(r=>`${r.element}生${r.generates}`).sort(),['空生水','水生風','風生火','火生地','地生空'].sort());
assert.deepEqual(guide.rows.map(r=>`${r.element}剋${r.counters}`).sort(),['空剋風','風剋地','地剋水','水剋火','火剋空'].sort());
assert.match(guide.generation,/不額外/);
for(const a of ELEMENTS)for(const b of ELEMENTS){
 const p=playableCards().find(c=>c.element===a),q=playableCards().find(c=>c.element===b);
 const lesson=elementLesson(p.id,q.id,'player',['actual server log']);
 assert.ok(lesson.impact.includes(`我方元素倍率 ×${elementMultiplier(a,b)}`));
 assert.ok(lesson.impact.includes(`對手元素倍率 ×${elementMultiplier(b,a)}`));
 assert.ok(lesson.player.includes(ELEMENT_LABEL[a]));
 assert.deepEqual(lesson.logs,['actual server log']);
 assert.equal(lesson.verdict,'本場我方獲勝');
}
assert.throws(()=>elementLesson('missing','beast_a01','DRAW',[]));
console.log('PASS: 五元素相生相剋表、25種配對倍率與核心一致、相生未加成如實顯示、戰報沿用後端');
