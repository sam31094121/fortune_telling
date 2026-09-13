const assert=require('node:assert/strict');
const {newMatch,advance,legalActions,interactiveCatalog}=require('../.beast-game-build/lib/beast-game/interactive');
const {elementGenerates}=require('../.beast-game-build/lib/beast-game/elements');
const cards=interactiveCatalog();
const id=e=>cards.find(c=>c.element===e).id;
const make=()=>newMatch([id('FIRE'),id('AIR')],[id('FIRE'),id('AIR')],21);
for(const [source,target] of [['SPACE','WATER'],['WATER','AIR'],['AIR','FIRE'],['FIRE','EARTH'],['EARTH','SPACE']]) {
  assert(elementGenerates(source,target));
  assert(!elementGenerates(target,source));
}
const can=(s,side='player')=>legalActions(s,side).some(a=>a.type==='RAGE');
let s=make();assert(can(s));assert(can(s,'opponent'));
let next=advance(s,{type:'RAGE'},{type:'RAGE'});
assert.equal(next.player.rageAvailable,0);assert.equal(next.opponent.rageAvailable,0);
assert(!can(next));assert.equal(s.player.rageAvailable,1);
assert.deepEqual(next,advance(s,{type:'RAGE'},{type:'RAGE'}));
const ordinary=advance(s,{type:'ATTACK'},{type:'ATTACK'});
const fusion=advance(s,{type:'RAGE'},{type:'ATTACK'});
assert(fusion.opponent.team[0].hp<ordinary.opponent.team[0].hp,'fusion must be a real stronger hit');
assert.equal(fusion.player.team[1].defeated,false,'fusion must not consume reserve');
s=make();s.player.team[1].hp=0;s.player.team[1].defeated=true;assert(!can(s));
s=make();s.player.team[0].stunnedTurns=1;assert(!can(s));
s=make();delete s.player.rageAvailable;assert(!can(s));
s=newMatch([id('FIRE'),id('WATER')],[id('AIR')],21);assert(!can(s));
assert.throws(()=>advance(s,{type:'RAGE'}));
console.log('Rage fusion: deployed generating reserve, symmetry, once-only, stun, old-save and replay checks passed.');
