const assert=require('node:assert/strict');
const guest=require('./guest-orb-fixture.cjs');
const C=require('../lib/beast-game/match3/comeback.ts');
const campaign=require('../lib/beast-game/match3/hard-campaign.ts');
const cards=require('../lib/beast-game/registry.ts').playableCards().filter(c=>c.form==='YOUNG').slice(0,5);
const repoModule=require('../lib/beast-game/cultivation-repository.ts');
const orb=require('../lib/beast-game/cultivation-orb.ts');
function losing(){return {team:cards.map((c,i)=>({id:c.id,name:c.name,thumbnail:'',element:c.element,hp:i?0:1,maxHp:1,attack:0,energy:0})),foes:cards.map((c,i)=>({id:c.id,name:c.name,thumbnail:'',element:c.element,hp:i?0:1000,maxHp:1000,attack:1000,cd:1,attackEnergy:75})),board:Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>['SPACE','AIR','WATER','FIRE','EARTH'][(r+c)%5])),magic:Array.from({length:8},()=>Array(7).fill(0)),path:[0,1,2].map(c=>({r:0,c})),target:0,mode:'hard45',wins:0,seed:77,move:0,chosen:{},rule:'all-attack',attackBoost:1,comeback:C.initialComeback(0)};}
(async()=>{
 let snapshot={revision:'0',state:{cards:[],protectedIds:[]},pendingBattle:'test',receipts:[]};
 const repository={read:async owner=>{assert.equal(owner,'test-owner');return structuredClone(snapshot)},compareAndSwap:async(owner,revision,next)=>{if(snapshot.revision!==revision)return false;snapshot=structuredClone(next);return true}};
 repoModule.cultivationRepository=()=>repository;
 for(let i=0;i<2;i++){
  const input=losing();input.board[0].fill('FIRE',0,3);snapshot.orbRun={id:'test',version:0,seed:77,input};
  const ticket={owner:'test-owner',id:'test',wins:0};
  const [a,b]=await Promise.all([orb.resolveSharedOrbTurn(ticket,input,0),orb.resolveSharedOrbTurn(ticket,input,0)]);
  assert.deepEqual(a,b);assert.equal(a.outcome,'lose');assert.equal(snapshot.orbComeback.losses,i+1);assert.equal(snapshot.orbRun.version,1);
  assert.deepEqual(await orb.resolveSharedOrbTurn(ticket,input,0),a);assert.equal(snapshot.orbComeback.losses,i+1);
 }
 assert(C.initialComeback(0,snapshot.orbComeback).rescue);assert(snapshot.orbRun.input.team.every(c=>c.hp===0));
 let profile=campaign.newCampaign();
 for(let i=0;i<2;i++){
  const input=losing();input.board[0].fill('FIRE',0,3);const ticket={kind:'battle',id:'guest-'+i,version:0,seed:77,input,profile};
  const r=guest.resolveGuestOrb(ticket,guest.guestOrbInput(ticket,input));assert.equal(r.outcome,'lose');assert.equal(r.guestProfile.comebackRecord.losses,i+1);
  assert.deepEqual(guest.resolveGuestOrb(ticket,guest.guestOrbInput(ticket,input)),r,'same signed input deterministic');
  const ended=guest.openGuestOrb(r.guestBattleToken);assert.throws(()=>guest.resolveGuestOrb(ended,input),'terminal cannot count twice');profile=r.guestProfile;
 }
 assert(C.initialComeback(0,profile.comebackRecord).rescue);
 console.log('PASS self CAS test double: concurrent loss/replay once, persisted dead team; guest signed state: two losses, terminal rejection, third rescue. No production database writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
