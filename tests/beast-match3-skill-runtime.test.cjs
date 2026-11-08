const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const R=require('../lib/beast-game/match3/skill-runtime.ts'),{playableCards}=require('../lib/beast-game/registry.ts'),{getSkill}=require('../cards/skills/index.ts');
const cards=playableCards();const make=c=>({id:c.id,element:c.element,hp:40,maxHp:100,attack:30});
let mapped=0,unsupported=0;
for(const card of cards){for(const id of new Set([...card.skills,...card.passive])){const skill=getSkill(id);if(!skill)continue;const f=make(card),before=JSON.stringify(f);const res=R.runFoeSkillEvent(f,skill.trigger,{target:{id:'test-target',element:'EARTH',hp:1000,maxHp:1000,attack:20,defense:0},actualDamage:5,eventId:'first'});assert.equal(JSON.stringify(f),before,'immutable input');if(!R.isMappedFoeSkill(skill)){assert(res.unsupported.includes(id),'whole unsupported skill must be disclosed');assert(!res.events.some(e=>e.skillId===id));assert.equal(res.foe.skillRuntime?.uses[id],undefined);unsupported++;continue}mapped++;assert(res.events.some(e=>e.skillId===id));assert.deepEqual(R.runFoeSkillEvent(res.foe,skill.trigger,{target:{id:'test-target',element:'EARTH',hp:1000,maxHp:1000,attack:20,defense:0},actualDamage:5,eventId:'first'}).foe,res.foe,'same event cannot repeat');if(['ON_SUMMON','PASSIVE'].includes(skill.trigger))assert(!R.runFoeSkillEvent(res.foe,skill.trigger).events.length);if(skill.usesPerBattle){let current=res.foe;for(let n=0;n<skill.usesPerBattle+2;n++)current=R.runFoeSkillEvent(current,skill.trigger,{target:{id:'test-target',element:'EARTH',hp:1000,maxHp:1000,attack:20,defense:0},actualDamage:5,eventId:'next'+n}).foe;assert.equal(current.skillRuntime.uses[id],skill.usesPerBattle);}}}
assert(mapped>0&&unsupported>0);
const passive=cards.find(c=>[...c.skills,...c.passive].includes('skill_113'));assert(passive);const p=R.initializeFoeSkills(make(passive));assert.equal(R.foeSkillAttack(p.foe),37);assert.equal(p.foe.attack,30);let after=p.foe;for(let i=0;i<99;i++)after=R.tickFoeSkillDurations(after);assert.equal(R.foeSkillAttack(after),30);assert.deepEqual(R.initializeFoeSkills(p.foe).foe,p.foe);
const shield={...make(passive),skillRuntime:{uses:{},initialized:{},lastEvents:{},modifiers:[],shield:25}};const hit=R.absorbFoeShieldDamage(shield,30);assert.equal(hit.absorbed,25);assert.equal(hit.actualDamage,5);assert.equal(hit.foe.hp,35);assert.equal(hit.foe.skillRuntime.shield,0);assert.equal(shield.skillRuntime.shield,25);assert.equal(R.absorbFoeShieldDamage(shield,1000).actualDamage,40);assert.equal(R.absorbFoeShieldDamage(shield,NaN).actualDamage,0);
assert.deepEqual(R.runFoeSkillEvent(shield,'ON_DAMAGED',{actualDamage:0}).foe,shield);assert.equal(R.runFoeSkillEvent({...shield,hp:0},'ON_TURN_END').events.length,0);
const withSkill=id=>cards.find(c=>[...c.skills,...c.passive].includes(id));
const healed=R.runFoeSkillEvent({...make(withSkill('skill_202')),hp:98},'ON_TURN_END');assert.equal(healed.foe.hp,100);assert.equal(healed.events.find(e=>e.skillId==='skill_202').effects[0].applied,2);
const summoned=R.initializeFoeSkills(make(withSkill('skill_201')));assert.equal(summoned.foe.skillRuntime.shield,8);
const mixed=R.initializeFoeSkills(make(withSkill('skill_301')));assert(!mixed.unsupported.includes('skill_301'));assert.equal(mixed.events.filter(e=>e.skillId==='skill_301').length,2);assert.equal(R.foeSkillAttack(mixed.foe),45);assert.equal(R.orbSkillSpeed(mixed.foe),withSkill('skill_301').stats.speed+25);
const reactive=make(withSkill('skill_109'));assert.equal(R.foeSkillAttack(R.runFoeSkillEvent(reactive,'ON_DAMAGED',{actualDamage:0}).foe),30);const boosted=R.runFoeSkillEvent(reactive,'ON_DAMAGED',{actualDamage:1});assert.equal(R.foeSkillAttack(boosted.foe),42);assert.equal(R.foeSkillAttack(R.tickFoeSkillDurations(boosted.foe)),42);assert.equal(R.foeSkillAttack(R.tickFoeSkillDurations(R.tickFoeSkillDurations(boosted.foe))),30);
const {computeDamage}=require('../lib/beast-game/effects.ts');
const tiger=make(withSkill('skill_303')),target={id:'test-target',element:'EARTH',hp:100,maxHp:100,attack:20,defense:8,skillRuntime:{uses:{},initialized:{},lastEvents:{},shield:10,modifiers:[]}};
const tigerHit=R.runOrbSkillEvent(tiger,'ON_ATTACK',{target,eventId:'hit1'}),expected=computeDamage({attack:30+18,defense:8,attackerElement:tiger.element,defenderElement:target.element}).damage;
assert.equal(tigerHit.target.hp,100-Math.max(0,expected-10)-computeDamage({attack:30+10,defense:8,attackerElement:tiger.element,defenderElement:target.element}).damage);assert.equal(tigerHit.events[0].actualDamage,Math.max(0,expected-10));assert.equal(tigerHit.events[0].shieldAbsorbed,Math.min(10,expected));assert.equal(tigerHit.events[0].targetId,target.id);assert.equal(tigerHit.target.skillRuntime.stunnedTurns,1);assert(!R.orbSkillCanAttack(tigerHit.target));assert.equal(R.runOrbSkillEvent(tigerHit.target,'ON_ATTACK',{target:tiger}).events.length,0);assert(R.orbSkillCanAttack(R.tickFoeSkillDurations(tigerHit.target)));assert.equal(R.runOrbSkillEvent(tigerHit.source,'ON_ATTACK',{target,eventId:'hit2'}).events.filter(e=>e.skillId==='skill_303').length,0,'one-use tiger cannot repeat');assert.equal(target.hp,100,'opponent immutable');
const bird=make(withSkill('skill_302')),birdHit=R.runOrbSkillEvent(bird,'ON_ATTACK',{target:{...target,hp:1000,maxHp:1000},eventId:'bird1'});assert(birdHit.events.some(e=>e.targetId===bird.id&&e.effects[0].type==='ELEMENT_BOOST'));assert.equal(R.orbSkillElementBoost(birdHit.source),20);assert.equal(R.orbSkillElementBoost(birdHit.target),0);assert.equal(birdHit.source.skillRuntime.uses.skill_302,1);
const turtle=R.initializeFoeSkills(make(withSkill('skill_304')));assert.equal(turtle.foe.skillRuntime.shield,40);assert.equal(R.orbSkillDefense(turtle.foe),withSkill('skill_304').stats.defense+23);
const draw=R.runOrbSkillEvent(make(withSkill('skill_203')),'ON_TURN_START',{eventId:'draw1'});assert(draw.notApplicable.some(e=>e.skillId==='skill_203'&&e.reason==='no_deck'));assert(!draw.events.some(e=>e.skillId==='skill_203'));assert.equal(draw.source.skillRuntime.uses.skill_203,undefined);
const missing=R.runOrbSkillEvent(tiger,'ON_ATTACK');assert(missing.notApplicable.some(e=>e.reason==='no_target'));assert.equal(missing.source.skillRuntime.uses.skill_303,undefined);
console.log('PASS foe event runtime: '+mapped+' mapped card skills, '+unsupported+' whole-skill exclusions; immutable effects, once, event dedupe, uses, holder duration, actual shield HP');


// Same-turn replay must not advance a waiting foe's cooldown into an extra attack.
const {counterPhase}=require('../lib/beast-game/match3/enemies.ts');let cdTeam=[{id:'qa-ally',element:'EARTH',hp:100,maxHp:100,attack:10,energy:0}],cdFoes=[{id:'qa-foe',element:'EARTH',hp:100,maxHp:100,attack:10,cd:3}];for(let i=0;i<3;i++){const replay=counterPhase(cdTeam,cdFoes,3,undefined,false,11,{turnId:'same-turn'});assert.equal(replay.hits.length,0);assert.equal(replay.foes[0].cd,2);assert.equal(replay.team[0].hp,100);cdTeam=replay.team;cdFoes=replay.foes;}console.log('PASS same-turn cooldown replay does not grant an extra enemy action');
// Defense fusion applies once to original skill damage, then shield and HP clipping.
const guardSource=make(cards.find(c=>c.id==='beast_g_baihu'));
const guardTarget={id:'guard-target',element:guardSource.element,hp:10000,maxHp:10000,attack:10,defense:0};
const plain=R.runOrbSkillEvent(guardSource,'ON_ATTACK',{target:guardTarget,eventId:'guard-plain'});
const guarded=R.runOrbSkillEvent(guardSource,'ON_ATTACK',{target:guardTarget,eventId:'guard-half',incomingDamageScale:.5});
const rawHits=plain.events.filter(e=>e.effects[0].type==='DAMAGE');
const halfHits=guarded.events.filter(e=>e.effects[0].type==='DAMAGE');
assert(rawHits.length>=2,'white tiger emits multiple real damage effects');
assert.deepEqual(halfHits.map(e=>e.actualDamage),rawHits.map(e=>Math.round(e.actualDamage*.5)));
const shieldAmount=7;
const guardedShield=R.runOrbSkillEvent(guardSource,'ON_ATTACK',{target:{...guardTarget,skillRuntime:{uses:{},initialized:{},lastEvents:{},modifiers:[],shield:shieldAmount}},incomingDamageScale:.5});
assert.equal(guardedShield.targetActualDamage,halfHits.reduce((n,e)=>n+e.actualDamage,0)-shieldAmount);
assert.equal(guardedShield.events.reduce((n,e)=>n+e.shieldAbsorbed,0),shieldAmount);
const guardedKill=R.runOrbSkillEvent(guardSource,'ON_ATTACK',{target:{...guardTarget,hp:3},incomingDamageScale:.5});
assert.equal(guardedKill.targetActualDamage,3,'halve raw damage before overkill, not actual lost HP');
assert.equal(guardedKill.target.hp,0);
assert.equal(guarded.events.filter(e=>e.effects[0].type==='STUN')[0].effects[0].applied,plain.events.filter(e=>e.effects[0].type==='STUN')[0].effects[0].applied,'guard does not halve stun');
console.log('PASS guard skill raw-damage half once before shield/overkill; multiple hits; stun unchanged');
const sameIdTarget={...guardTarget,id:guardSource.id};
const sided=R.runOrbSkillEvent(guardSource,'ON_ATTACK',{target:sameIdTarget,sourceSide:'enemy',targetSide:'ally'});
assert(sided.events.length>0);assert(sided.events.every(e=>e.sourceSide==='enemy'));
assert(sided.events.filter(e=>e.effects[0].type==='DAMAGE').every(e=>e.targetSide==='ally'));
assert(R.initializeFoeSkills(make(withSkill('skill_304')),{sourceSide:'enemy'}).events.every(e=>e.sourceSide==='enemy'&&e.targetSide==='enemy'));
console.log('PASS same card ID across sides retains explicit skill source/target identity');

// Display grouping is not a second damage calculation; sum only recorded actual effects of one invocation.
const displayRun=R.runOrbSkillEvent(guardSource,'ON_ATTACK',{target:sameIdTarget,eventId:'display-new',sourceSide:'enemy',targetSide:'ally'});
const displayEvents=displayRun.events.filter(e=>e.skillId==='skill_303');
const display=R.orbSkillDisplay(displayEvents,guardSource.id,'ally');
assert(display);assert(display.effects.some(e=>e.type==='DAMAGE'));assert(display.effects.some(e=>e.type==='STUN'));
assert(display.displayDamage>0,'later STUN must not hide preceding actual damage');
assert.equal(display.displayDamage,displayRun.events.filter(e=>e.skillId===display.skillId&&e.targetSide==='ally').reduce((n,e)=>n+e.actualDamage,0));
assert.equal(R.orbSkillDisplay(displayEvents,guardSource.id,'enemy').displayDamage,0,'source does not display damage received');
assert.equal(R.orbSkillDisplay(displayEvents,'not-present','ally'),null);
const oldDisplayEvents=displayEvents.map(e=>({...e,eventId:'display-old',actualDamage:999}));
assert.equal(R.orbSkillDisplay([...oldDisplayEvents,...displayEvents],guardSource.id,'ally').displayDamage,display.displayDamage,'earlier same skill invocation cannot be added');
const wrongSide=displayEvents.map(e=>({...e,sourceId:'other',targetSide:'enemy',sourceSide:'enemy',eventId:'other'}));
assert.equal(R.orbSkillDisplay([...wrongSide,...displayEvents],guardSource.id,'ally').displayDamage,display.displayDamage,'same card ID on opposing side cannot be added');
assert(displayRun.events.every(e=>e.eventId==='display-new'));
console.log('PASS skill display retains same-invocation DAMAGE+STUN, excludes older invocation and opposite side');

const finalSkillId=displayRun.events[displayRun.events.length-1].skillId;
assert.equal(R.orbSkillDisplay(displayRun.events,guardSource.id,'ally').displayDamage,displayRun.events.filter(e=>e.skillId===finalSkillId&&e.targetSide==='ally').reduce((n,e)=>n+e.actualDamage,0),'different original skills must not be mixed');

// Stored-energy actions preserve the holder turn and do not provoke enemy skills.
{
 const E=require('../lib/beast-game/match3/enemies.ts');
 const c=cards.find(c=>c.skills.includes('skill_109'));
 const base=R.initializeFoeSkills({...make(c),hp:10000,maxHp:10000,cd:3},{sourceSide:'enemy'}).foe;
 base.skillRuntime={...base.skillRuntime,shield:0};
 const ally={...make(cards[0]),hp:1000,maxHp:1000,energy:100};
 const normal=E.damageFoeWithSkills([base],0,1,11,'orb-normal',[ally],ally.id);
 assert(normal.skillEvents.some(e=>e.trigger==='ON_DAMAGED'),'ordinary orb retains reaction');
 let foes=[base],team=[ally];
 for(let n=1;n<=3;n++){
  const hit=E.damageFoeWithSkills(foes,0,1,11,'energy:'+n,team,ally.id,false);
  assert.equal(hit.actualDamage,1);assert.deepEqual(hit.team,team);assert.deepEqual(hit.skillEvents,[]);
  assert.equal(hit.foes[0].cd,3);assert.deepEqual(hit.foes[0].skillRuntime,base.skillRuntime);
  const retry=E.damageFoeWithSkills(hit.foes,0,1,11,'energy:'+n,hit.team,ally.id,false);
  assert.equal(retry.actualDamage,0);foes=hit.foes;team=hit.team;
 }
 assert.equal(foes[0].hp,9997,'distinct stored-energy actions in one orb turn each deal damage');
 const kill=E.damageFoeWithSkills(foes,0,99999,11,'energy:kill',team,ally.id,false);
 assert.equal(kill.foes[0].hp,0);assert.deepEqual(kill.team,team);
}

{
 const E=require('../lib/beast-game/match3/enemies.ts');
 const guardian=cards.find(c=>c.form==='GUARDIAN'), adults=cards.filter(c=>c.form==='ADULT').slice(0,4);
 const foes=[...adults.map((c,i)=>({...make(c),hp:i===3?1:0,cd:3})),{...make(guardian),cd:3}];
 const ally={...make(cards[0]),energy:100};
 const res=E.damageFoeWithSkills(foes,3,1,12,'energy:last-escort',[ally],ally.id,false);
 assert(E.foeAvailable(res.foes,4,12));assert(res.foes[4].skillRuntime,'newly available guardian initializes without a counter turn');
 assert.equal(res.foes[4].cd,3);assert.deepEqual(res.team,[ally]);
 assert.deepEqual(E.initializeAvailableFoes(res.foes,12),res.foes,'summon/passive initializes only once');
}

// The release now awaits the server; preserve invalid-path/turn-count assertions against that resolver.
{
 const {fixture}=require('./beast-orb-turn.test.cjs');
 const {resolveOrbTurn}=require('../lib/beast-game/match3/resolve-turn.ts');
 const M=require('../lib/beast-game/match3/index.ts');
 for(const wins of [0,7])for(const length of [0,1,2,3,4,8])for(const gap of [false,true]){
  if(gap&&length!==3)continue;
  const p=fixture();p.wins=wins;p.path=Array.from({length},(_,i)=>i<7?{r:0,c:i}:{r:1,c:6});
  if(gap)p.path[1]={r:0,c:4};for(const c of p.path)p.board[c.r][c.c]='FIRE';
  const r=resolveOrbTurn(p);
  assert.equal(r.res.valid,length>=3&&!gap);
  assert.equal(r.counter.hits.length,length>0?1:0);
  if(length>=3&&!gap)assert.equal(r.res.attackAllowed,length>=M.progressionStage(wins).minChain);
 }
 console.log('PASS server turn: empty drag no counter, invalid nonempty drag one counter, per-stage attack gate unchanged');
}