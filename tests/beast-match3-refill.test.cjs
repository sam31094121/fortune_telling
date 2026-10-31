const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const M = require('../.beast-game-build/lib/beast-game/match3');
const { refillPresentation } = require('../.beast-game-build/lib/beast-game/match3/refill-presentation');
// Captured from the published engine before adding visual provenance.
const baseline = {
  three: '61b73bf6f64370c539f71acb922c97ed280d5ab273a7cea118fa5e2df04320c0',
  four: 'a5e7d85ba8e7c1c2679cd0698578efbe820fade793659d2245db4447bdee68bc',
  seven: 'f79849c628f2a49acd8df214c8c41b383aec5cbd9268e6cc9a66694ad42f83f9',
  shield: '76e1f68f6e019430ad19146ec39cd55b1da86a3fc640ea62f8f9868e3bca9c3c',
  fusion: 'da26574f3131195aaa91c5807c921ce5154555963126b9486655913a237e842e',
};
for (const kind of Object.keys(baseline)) {
  const b = Array.from({length:7},(_,r)=>Array.from({length:7},(_,c)=>M.MATCH3_ORB_ELEMENTS[(r*2+c)%5]));
  b[6] = Array(7).fill('FIRE'); const magic = M.emptyMagic(b);
  const n = kind === 'four' ? 4 : kind === 'seven' ? 7 : 3;
  if (kind === 'shield') magic[6][0] = 7;
  if (kind === 'fusion') { b[6][1]='WATER'; b[6][2]='AIR'; magic[6][0]=magic[6][1]=magic[6][2]=7; }
  const path = Array.from({length:n},(_,c)=>({r:6,c}));
  const result = M.resolveDrag(b,path,M.seededRng(91),magic,50,true,true,3);
  const unchanged = { ...result, steps: result.steps.map(({falls,clearedCells,...step})=>step) };
  assert.equal(createHash('sha256').update(JSON.stringify(unchanged)).digest('hex'), baseline[kind], 'presentation must not change RNG, boards, magic, damage or rewards');
  let before = b;
  for (const step of result.steps) {
    const removed = new Set(step.clearedCells.map(p=>p.r*1000+p.c));
    assert.equal(new Set(step.falls.map(p=>p.r*1000+p.c)).size,step.falls.length);
    assert.equal(step.falls.filter(p=>p.fromRow<0).length,removed.size,'exactly replenish actual holes');
    for (const fall of step.falls) {
      assert(fall.fromRow<fall.r,'gravity only moves downward');
      if (fall.fromRow>=0) { assert(!removed.has(fall.fromRow*1000+fall.c)); assert.equal(step.boardAfter[fall.r][fall.c],before[fall.fromRow][fall.c]); }
    }
    before = step.boardAfter;
  }
  if (kind==='four'||kind==='seven') assert(!result.steps[0].clearedCells.some(p=>p.r===6&&p.c===n-1),'retained reward must not flash away');
  const timeline = refillPresentation(result.steps);
  timeline.frames.forEach((frame,i)=> {
    assert(frame.fallAt>frame.clearAt);
    if(i) assert.equal(frame.clearAt,timeline.frames[i-1].endAt);
    assert.equal(new Set(frame.motions.map(m=>m.delayMs)).size,frame.motions.length,'each falling orb has its own start');
    for(const motion of frame.motions) assert(frame.fallAt+motion.delayMs+motion.durationMs<=frame.endAt+1e-7);
  });
  assert(timeline.durationMs<=5000);
  const reduced=refillPresentation(result.steps,true);assert(reduced.frames.every(f=>f.motions.every(m=>m.delayMs===0&&m.durationMs===0)));
  const simple=M.resolveDrag(b,path,M.seededRng(91),magic,1,false,false,3);
  assert(simple.steps.every(s=>!('falls'in s)&&!('clearedCells'in s)),'legacy contract unchanged');
}
const heavy=refillPresentation(Array.from({length:50},()=>({falls:Array.from({length:49},(_,i)=>({r:Math.floor(i/7),c:i%7,fromRow:Math.floor(i/7)-7}))})));
assert(heavy.durationMs<=5000.000001,'many cascades must not lock the player out for a minute');
console.log('PASS refill provenance, unchanged outcomes, retained rewards, stagger, reduced motion and bounded wait');
