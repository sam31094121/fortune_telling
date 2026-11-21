const assert = require('node:assert/strict');
require('./guest-orb-fixture.cjs');
const { orbOutcome } = require('../lib/beast-game/match3/battle-outcome.ts');
const { foeAvailable } = require('../lib/beast-game/match3/enemies.ts');
const { playableCards } = require('../lib/beast-game/registry.ts');
for (let size = 1; size <= 5; size++) for (let slot = 0; slot < size; slot++) {
  for (const hp of [Number.MIN_VALUE, 0.01, 1, 10000000]) {
    const living = Array.from({length:size},(_,i)=>({hp:i===slot?hp:0}));
    assert.equal(orbOutcome(living,[{hp:10000000}]),null,'any positive life forbids defeat, for every permitted party size and slot');
  }
  assert.equal(orbOutcome(Array.from({length:size},()=>({hp:0})),[{hp:1}]),'lose','all members must reach zero before defeat');
}
for (let slot = 0; slot < 5; slot++) {
  const last = Array.from({ length: 5 }, (_, i) => ({ hp: i === slot ? 1 : 0 }));
  const dominant = Array.from({ length: 5 }, () => ({ hp: 10000000 }));
  assert.equal(orbOutcome(last, dominant), null, 'one player HP is never a predicted defeat');
  assert.equal(orbOutcome(dominant, last), null, 'one opponent HP is never a predicted defeat');
  assert.equal(orbOutcome(last, [{ hp: 0 }]), 'win');
  assert.equal(orbOutcome([{ hp: 0 }], last), 'lose');
}
for (const hp of [NaN, Infinity, -1, undefined, null, '0']) {
  assert.equal(orbOutcome([{ hp }], [{ hp: 1 }]), 'unavailable');
  assert.equal(orbOutcome([{ hp: 1 }], [{ hp }]), 'unavailable');
}
assert.equal(orbOutcome([{ hp: 0 }], [{ hp: 0 }]), 'unavailable');
assert.equal(orbOutcome([], [{ hp: 1 }]), 'unavailable');
const guardian = playableCards().find(c => c.form === 'GUARDIAN');
const foes = Array.from({ length: 5 }, (_, i) => ({ id: i === 4 ? guardian.id : 'escort-' + i, hp: i === 0 || i === 4 ? 1 : 0 }));
assert.equal(foeAvailable(foes, 4, 8), false);
assert.equal(orbOutcome([{ hp: 1 }], foes), null, 'waiting reserve is part of the complete team');
foes[0].hp = 0;
assert.equal(foeAvailable(foes, 4, 8), true);
assert.equal(orbOutcome([{ hp: 1 }], foes), null, 'reserve entering is not victory');
console.log('PASS terminal facts: both sides 1 HP in every slot, overwhelming disadvantage, real elimination, invalid life, double elimination and guardian reserve');

(async () => {
  const guest = require('./guest-orb-fixture.cjs');
  const campaign = require('../lib/beast-game/match3/hard-campaign.ts');
  const repo = require('../lib/beast-game/cultivation-repository.ts');
  const shared = require('../lib/beast-game/cultivation-orb.ts');
  const { releaseCultivationBattle } = require('../lib/beast-game/cultivation-games.ts');
  const cards = playableCards().filter(c => c.form === 'YOUNG').slice(0, 5);
  const units = cards.map((c, i) => ({ id:c.id, name:c.name, element:c.element, hp:i ? 0 : 1, maxHp:10000000, attack:0, energy:100, cd:3 }));
  const input = { team:structuredClone(units), foes:structuredClone(units), board:Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>['SPACE','AIR','WATER','FIRE','EARTH'][(r+c)%5])), magic:Array.from({length:8},()=>Array(7).fill(0)), path:[], target:0, mode:'hard45', wins:0, seed:71, move:1000000, chosen:{}, rule:'tap-lead', attackBoost:1, action:'energy', attackerId:units[0].id };
  const ticket = {kind:'battle',id:'long-live',version:0,seed:71,input,profile:campaign.newCampaign()};
  const result = guest.resolveGuestOrb(ticket, guest.guestOrbInput(ticket,input));
  assert.equal(result.outcome,null);assert.equal(result.team[0].hp,1);assert.equal(result.foes[0].hp,1);
  assert.equal(result.guestProfile.receipts.length,0);
  assert.deepEqual(guest.resolveGuestOrb(ticket,guest.guestOrbInput(ticket,input)),result);
  let snapshot = {revision:'0',state:{cards:[],protectedIds:[]},pendingBattle:'long-live',receipts:[],orbRun:{id:'long-live',version:0,seed:71,input}};
  repo.cultivationRepository = () => ({read:async()=>structuredClone(snapshot),compareAndSwap:async(owner,revision,next)=>{if(snapshot.revision!==revision)return false;snapshot=structuredClone(next);return true;}});
  const t={owner:'terminal-test',id:'long-live',wins:0};
  const [a,b]=await Promise.all([shared.resolveSharedOrbTurn(t,input,0),shared.resolveSharedOrbTurn(t,input,0)]);
  assert.deepEqual(a,b);assert.equal(a.outcome,null);assert.equal(snapshot.orbRun.version,1);
  assert.equal(orbOutcome(snapshot.orbRun.input.team,snapshot.orbRun.input.foes),a.outcome);
  await assert.rejects(shared.resolveSharedOrbTurn(t,{...input,target:1},0));
  const before=structuredClone(snapshot);
  await releaseCultivationBattle(t.owner,t.id);
  assert.equal(snapshot.pendingBattle,null);
  assert.deepEqual(snapshot.state,before.state);assert.deepEqual(snapshot.orbLedger,before.orbLedger);
  assert.deepEqual(snapshot.orbComeback,before.orbComeback);assert.deepEqual(snapshot.orbRun,before.orbRun);
  console.log('PASS million-turn 1 HP guest/shared actions continue, signed replay, CAS duplicate/stale command, exit releases without defeat or reward; no customer database writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
