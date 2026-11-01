/** 5v5 敵方：五隻正式 .v2 神獸、HP/倒數、選目標、反擊、連線攻擊。 */
const assert = require('node:assert/strict');
const M = require('../.beast-game-build/lib/beast-game/match3');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('  ok ' + n); };
t('敵方剛好 5 隻、不重複、都在 60 張 .v2 卡池', () => {
  const pool = require('../.beast-game-build/lib/beast-game/registry').playableCards();
  assert.equal(M.MATCH3_ENEMY_NAMES.length, 5);
  assert.equal(new Set(M.MATCH3_ENEMY_NAMES).size, 5);
  for (const n of M.MATCH3_ENEMY_NAMES) { const c = pool.find((x) => x.name === n); assert.ok(c, n); assert.match(c.art.thumbnail, /\.v2/); }
});
t('makeFoe：HP 滿、倒數 3', () => {
  const f = M.makeFoe('beast_a22', 'WATER');
  assert.equal(f.hp, M.MATCH3_ENEMY_HP); assert.equal(f.maxHp, M.MATCH3_ENEMY_HP); assert.equal(f.cd, 3);
});
const foes = () => M.MATCH3_ENEMY_NAMES.map((id, i) => M.makeFoe(id, ['WATER', 'EARTH', 'FIRE', 'AIR', 'SPACE'][i]));
t('damageFoe 只傷指定那隻、不低於 0', () => {
  const f = M.damageFoe(foes(), 2, 999);
  assert.equal(f[2].hp, 0); assert.equal(f[0].hp, M.MATCH3_ENEMY_HP); assert.equal(f[4].hp, M.MATCH3_ENEMY_HP);
});
t('aliveTarget：目標倒下自動換活著的', () => {
  const f = M.damageFoe(foes(), 1, 999);
  assert.equal(M.aliveTarget(f, 0), 0);
  assert.notEqual(M.aliveTarget(f, 1), 1);
  assert.ok(f[M.aliveTarget(f, 1)].hp > 0);
});
const team = () => [
  { id: 'a', element: 'FIRE', attack: 30, hp: 40, energy: 0 },
  { id: 'b', element: 'WATER', attack: 20, hp: 25, energy: 0 },
];
t('每 3 步反擊一次：前兩步不打、第三步打並重置 3', () => {
  let tm = team(), f = foes(), r;
  r = M.counterPhase(tm, f); assert.equal(r.hits.length, 0); assert.equal(r.foes[0].cd, 2);
  r = M.counterPhase(r.team, r.foes); assert.equal(r.hits.length, 0);
  r = M.counterPhase(r.team, r.foes); assert.equal(r.hits.length, 5);
  assert.ok(r.foes.every((x) => x.cd === 3));
  const lost = tm.reduce((s, u) => s + u.hp, 0) - r.team.reduce((s, u) => s + u.hp, 0);
  assert.ok(lost > 0);
});
t('倒下的敵人不反擊', () => {
  let f = foes().map((x) => ({ ...x, cd: 1 })); f = M.damageFoe(f, 0, 999);
  const r = M.counterPhase(team(), f); assert.equal(r.hits.length, 4);
});
t('連線攻擊：至少 2 張、每張 50 能量、倍率遞增', () => {
  assert.equal(M.linkProblem([{ id: 'a', element: 'FIRE', attack: 1, hp: 1, energy: 100 }], ['a']), 'tooFew');
  const tm = [{ id: 'a', element: 'FIRE', attack: 10, hp: 1, energy: 50 }, { id: 'b', element: 'AIR', attack: 10, hp: 1, energy: 40 }];
  assert.equal(M.linkProblem(tm, ['a', 'b']), 'energyLow');
  tm[1].energy = 60; assert.equal(M.linkProblem(tm, ['a', 'b']), null);
  assert.equal(M.linkMultiplier(2), 1); assert.equal(M.linkMultiplier(4), 2);
  assert.equal(M.linkDamage([10, 10]), 60);
});
console.log(`beast-match3-enemies: ${pass} passed`);

// Presentation facts preserve formula damage while reporting actual sequential HP loss.
{
 const allies=[{id:'low',element:'FIRE',hp:3,energy:50},{id:'next',element:'FIRE',hp:20,energy:30},{id:'down',element:'FIRE',hp:0,energy:0}];
 const foes=[{id:'a',element:'FIRE',hp:10,maxHp:10,attack:10,cd:1},{id:'b',element:'FIRE',hp:10,maxHp:10,attack:10,cd:1},{id:'dead',element:'FIRE',hp:0,maxHp:10,attack:100,cd:1}];
 const result=M.counterPhase(allies,foes,1);
 assert.deepEqual(result.hits.map(h=>[h.enemyId,h.targetId,h.damage,h.hpBefore,h.hpAfter,h.actualDamage]),[['a','low',10,3,0,3],['b','next',10,20,10,10]]);
 assert.equal(result.team[0].energy,0);assert.equal(allies[0].hp,3);
 const guarded=M.counterPhase(allies,foes,1,undefined,true);
 assert.deepEqual(guarded.hits.map(h=>[h.damage,h.actualDamage,h.hpAfter]),[[5,3,0],[5,5,15]]);
 assert.equal(M.counterPhase(allies.map(u=>({...u,hp:0})),foes,1).hits.length,0);
}
console.log('PASS counter facts: sequential actual HP, overkill, guard and no dead actors/targets');

// The single planner previews the same bounded original skill event resolver.
{
 const S=require('../.beast-game-build/lib/beast-game/match3/enemy-strategy');
 const R=require('../.beast-game-build/lib/beast-game/match3/skill-runtime');
 const victim={id:'review-target',element:'SPACE',hp:500,maxHp:500,attack:10,energy:0,defense:0};
 const mk=(id,attack,element='FIRE')=>({...M.makeFoe(id,element),attack,hp:300,maxHp:300,cd:1});
 const fighters=[mk('review-basic',18),mk('beast_g_zhuque',10)];
 assert.equal(S.planOrbCounter([victim],fighters,[0,1],true,0,9,false)[0].enemy,0);
 assert.equal(S.planOrbCounter([victim],fighters,[0,1],true,0,10,false)[0].enemy,1,'original usable attack skill changes actor choice');
 const spent={...fighters[1],skillRuntime:{uses:{skill_302:2,skill_001:100,skill_101:100},initialized:{},lastEvents:{},shield:0,modifiers:[]}};
 const used=S.resolveOrbEnemyAction(spent,victim,10,false);
 assert(!used.events.some(e=>e.skillId==='skill_302'),'exhausted signature is never predicted again');
 const shielded={...victim,hp:10,skillRuntime:{uses:{},initialized:{},lastEvents:{},shield:100,modifiers:[]}};
 assert.equal(S.planOrbCounter([shielded,victim],[mk('review-basic',18)],[0],false,0,10,false)[0].target,1);
 const stunned={...fighters[1],skillRuntime:{...spent.skillRuntime,uses:{},stunnedTurns:1}};
 assert.equal(S.planOrbCounter([victim],[fighters[0],stunned],[0,1],true,0,10,false)[0].enemy,0);
 const pool=require('../.beast-game-build/lib/beast-game/registry').playableCards();
 const guards=pool.filter(c=>c.form==='GUARDIAN').map(c=>R.initializeFoeSkills(mk(c.id,20,c.element)).foe);
 const snapshot=JSON.stringify([guards,victim]);
 const plan=S.planOrbCounter([victim],guards,[0,1,2,3],false,0,12,false);
 assert.deepEqual(plan.map(p=>p.enemy),[0,1,2,3].sort((a,b)=>R.orbSkillSpeed(guards[b])-R.orbSkillSpeed(guards[a])));
 assert.equal(JSON.stringify([guards,victim]),snapshot,'preview must not consume real uses or HP');
 const a=M.counterPhase([victim],guards,1,undefined,false,12,{turnId:'review-one'});
 const again=M.counterPhase(a.team,a.foes,1,undefined,false,12,{turnId:'review-one'});
 assert.equal(again.hits.length,0);assert.equal(again.skillEvents.length,0);assert.deepEqual(again.team,a.team);
 const hit=M.damageFoeWithSkills(guards,0,5,12,'player-one',[victim],victim.id);
 const repeat=M.damageFoeWithSkills(hit.foes,0,5,12,'player-one',hit.team,victim.id);
 assert.deepEqual(repeat.foes,hit.foes);assert.equal(repeat.actualDamage,0);
 console.log('PASS single planner: original skills/uses/shields/stun, legal speed, immutable preview and action replay');
}

{
 const R=require('../.beast-game-build/lib/beast-game/match3/skill-runtime');
 const pool=require('../.beast-game-build/lib/beast-game/registry').playableCards();
 const foes=pool.filter(c=>c.form==='GUARDIAN').map(c=>R.initializeFoeSkills({...M.makeFoe(c.id,c.element),attack:20,cd:1}).foe);
 let improvements=0;
 for(let seed=1;seed<=500;seed++){
  const rng=M.seededRng(seed),team=['FIRE','WATER','AIR','SPACE','EARTH'].map((element,i)=>({id:'review-'+i,element,attack:20,hp:15+Math.floor(rng()*180),maxHp:200,energy:0,defense:0,skillRuntime:{uses:{},initialized:{},lastEvents:{},shield:Math.floor(rng()*30),modifiers:[]}}));
  const a=M.counterPhase(team,foes,1,undefined,false,11,{turnId:'same'}),b=M.counterPhase(team,foes,1,undefined,false,12,{turnId:'same'});
  const score=r=>[r.team.filter(x=>x.hp<=0).length,r.team.reduce((n,x,i)=>n+team[i].hp-x.hp,0)],sa=score(a),sb=score(b);
  assert(sb[0]>sa[0]||sb[0]===sa[0]&&sb[1]>=sa[1], 'legal full-skill search regressed seed '+seed);
  if(sb[0]>sa[0]||sb[0]===sa[0]&&sb[1]>sa[1])improvements++;
 }
 assert(improvements>0,'stage12 must do more than re-sort the same greedy moves');
 console.log('PASS 500 seeds: legal-speed skill/uses/shield lookahead retains greedy candidate; improvements '+improvements);
}
