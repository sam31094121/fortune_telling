const assert=require('node:assert/strict'),fs=require('node:fs');
require('./guest-orb-fixture.cjs');
const R=require('../lib/beast-game/cultivation-rules.ts'),B=require('../lib/beast-game/cultivation-balance.ts'),T=require('../lib/beast-game/cultivation-transaction.ts'),V=require('../lib/beast-game/cultivation-view.ts');
const I=require('../lib/beast-game/interactive.ts'),registry=require('../lib/beast-game/registry.ts');
assert.equal(R.activeFoodChainRule(),'v4');
const copy=(id,cardId,fed=0,bonus='0')=>({id,cardId,fed,bonus});
const snapshot=(cards)=>({revision:'0',receipts:[],pendingBattle:null,state:{cards,protectedIds:[]}});
const report={targets:0,starChecks:0,duels:0,openingKills:0,opponentActions:0,playerWins:0,opponentWins:0,draws:0};
for(const card of registry.playableCards().filter(c=>c.form!=='YOUNG')){
 const thresholds=R.starThresholds(R.STAR_CAP_FEEDS[card.form]);
 let normal=0,affinity=0;
 for(let n=0;n<thresholds[4];n++){
  normal+=B.feedPower(card.form,n,false);affinity+=B.feedPower(card.form,n,true);
  if(thresholds.includes(n+1)){const star=thresholds.indexOf(n+1)+1;assert.equal(normal,star*2000);assert.equal(affinity,star*3000);report.starChecks++;}
 }
 assert.equal(normal,10000);assert.equal(affinity,15000);report.targets++;
 const old=snapshot([copy('t',card.id,thresholds[4],'9000000000000')]),before=JSON.stringify(old);
 const projected=B.balancedSnapshot(old);assert.equal(JSON.stringify(old),before);assert.equal(projected.state.cards[0].legacyBonus,'9000000000000');assert.equal(projected.state.cards[0].bonus,String(Math.floor(card.stats.attack*.5)));
 // Actual engine turns: all registered opponents, fixed seeds, strongest affinity growth.
 for(const [index,foe] of registry.playableCards().entries()){const seed=index+1;
  let match=I.newMatch([card.id],[foe.id],seed,{difficulty:'HARD'});
  match.player.team[0].attack+=Number(B.proportionalBonus(match.player.team[0].attack,15000));
  const first=I.advance(match,{type:'ATTACK'},{type:'ATTACK'});
  report.openingKills+=Number(first.opponent.team[0].defeated);assert(first.opponent.team[0].hp>0,'five stars alone must not one-hit a fresh enemy');
  assert(first.log.some(l=>l.side==='opponent'&&l.action==='ATTACK'),'opponent gets an actual turn');report.opponentActions++;
  match=first;for(let round=0;round<60&&match.status!=='FINISHED';round++)match=I.advance(match,{type:'ATTACK'});
  report.duels++;if(match.winner==='player')report.playerWins++;else if(match.winner==='opponent')report.opponentWins++;else report.draws++;
 }
}
const cards=[copy('t','beast_g_qinglong'),...Array.from({length:1000},(_,n)=>copy('m'+n,'beast_y01'))],source=snapshot(cards),choices=cards.slice(1).map(c=>({targetId:'t',materialId:c.id}));
const start=performance.now(),result=T.fuseSnapshot(source,choices);report.batchMs=Math.round(performance.now()-start);
assert.equal(result.state.cards.length,1);assert.equal(result.state.cards[0].fed,1000);assert.equal(result.state.cards[0].bonus,'55');assert.equal(result.state.cards[0].powerUnits,15000);
const summary=require('../lib/beast-game/cultivation-batch.ts').summarizeCultivationChanges(result.changes);
assert.equal(summary.afterOrbAttack,'129');assert.equal(summary.afterBattleAttack,'75');assert.equal(summary.addedBonus,'55');assert.equal(summary.starsAfter.stars,5);
let split=source;for(let i=0;i<1000;i+=100){const r=T.fuseSnapshot(split,choices.slice(i,i+100));split={...split,state:r.state};}assert.deepEqual(split.state,result.state,'batch partition cannot alter growth');
const receipt={operationId:'new',command:JSON.stringify({type:'FUSE',choices}),revision:'1',changes:result.changes,rule:'v4'};
assert.deepEqual(T.replayCultivationReceipt(source,receipt).changes,result.changes);
const v=V.cultivationView({...source,state:result.state,receipts:[receipt]});assert.equal(v.cards[0].orbAttack,'129');assert.equal(v.cards[0].battleAttack,'75');
const rawLegacy={...source,state:{cards:[copy('t','beast_g_qinglong',1000,'5000')],protectedIds:[]},receipts:[{...receipt,rule:'v3',changes:result.changes.map(c=>({...c,rule:'v3',powerBefore:undefined,powerAfter:undefined}))}]};
assert.equal(V.cultivationView(rawLegacy).cards[0].orbAttack,'129');assert.equal(rawLegacy.state.cards[0].bonus,'5000');
// Verify actual new combat holds use the same displayed bonus; existing battles remain immutable.
let stored={...source,state:result.state};
require('../lib/beast-game/cultivation-repository.ts').cultivationRepository=()=>({read:async()=>structuredClone(stored),compareAndSwap:async(_,rev,next)=>{if(stored.revision!==rev)return false;stored=structuredClone(next);return true;}});
(async()=>{const games=require('../lib/beast-game/cultivation-games.ts');const hold=await games.holdCultivationBattle('test','card:balanced','card',[{id:'t',cardId:'beast_g_qinglong'}]);assert.equal(hold.bonuses.t,'32');assert.equal(stored.state.cards[0].bonus,'55');
 const resumed=await games.holdCultivationBattle('test','card:balanced','card',[{id:'t',cardId:'beast_g_qinglong'}]);assert.deepEqual(hold,resumed);
 const campaign=require('../lib/beast-game/match3/hard-campaign.ts'),orb=require('../lib/beast-game/cultivation-orb.ts'),treasures=require('../lib/beast-game/match3/treasures.ts');
 const ids=['beast_g_qinglong','beast_a01','beast_a02','beast_a03','beast_a04'];
 stored={...snapshot(ids.map((id,i)=>({...copy('orb'+i,id,R.STAR_CAP_FEEDS[registry.getCard(id).form]),powerUnits:15000}))),orbTreasures:treasures.emptyTreasureBook(),orbLedger:{wins:0,rewards:[],receipts:[]}};
 const profile={...campaign.chooseCampaignHero(campaign.newCampaign(),'beast_g_qinglong'),teamIds:ids,ownedEntries:Object.fromEntries(stored.state.cards.map(c=>[c.cardId,c.id]))};
 const startOrb=await orb.beginSharedOrb('test',profile,'balanced-orb',17,'hard45');assert.equal(startOrb.initial.team[0].attack,129);assert.equal(startOrb.profile.shared.stats.beast_g_qinglong.attack,129);
 const foeBefore=JSON.stringify(startOrb.initial.foes);
 const normalProfile={...startOrb.profile,shared:{...startOrb.profile.shared,stats:Object.fromEntries(ids.map(id=>[id,{baseAttack:registry.getCard(id).stats.attack,attack:registry.getCard(id).stats.attack,bonus:0}]))}};
 assert.equal(JSON.stringify(require('../lib/beast-game/cultivation-orb-state.ts').initialSharedOrb(normalProfile,17,'hard45').foes),foeBefore,'cultivation does not increase enemy values');
 const drag=require('../lib/beast-game/match3/drag.ts'),resolve=require('../lib/beast-game/match3/resolve-turn.ts').resolveOrbTurn;
 function chain(b,magic){for(let r=0;r<b.length;r++)for(let c=0;c<b[0].length;c++){const search=p=>{if(p.length>=4)return p;const last=p[p.length-1];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const n={r:last.r+dr,c:last.c+dc};if(drag.canExtend(b,p,n,true,magic,true)){const found=search([...p,n]);if(found)return found;}}};const found=search([{r,c}]);if(found)return found;}return null;}
 let turn=startOrb.initial;report.orbTurns=0;report.orbCounterHits=0;
 for(let n=0;n<8;n++){const path=chain(turn.board,turn.magic);assert(path);const out=resolve({...turn,path,actionId:'balance-'+n,target:turn.foes.findIndex(f=>f.hp>0)});assert(out.res.valid);report.orbTurns++;report.orbCounterHits+=out.counter.hits.length;if(n===0)assert(out.counter.foes.some(f=>f.hp>0),'first gesture does not erase the enemy team');if(out.counter.team.every(c=>c.hp<=0)||out.counter.foes.every(c=>c.hp<=0))break;turn={...turn,board:out.res.board,magic:out.res.magic,team:out.counter.team,foes:out.counter.foes,move:turn.move+1,attackBoost:out.nextBoost,treasureGuard:out.nextTreasureGuard,comeback:out.comeback,treasures:out.treasure.book};}
 assert(report.orbCounterHits>0,'actual orb enemy counters must occur');
 report.orbAttack=startOrb.initial.team[0].attack;report.orbOpponentUnchanged=true;
 stored=structuredClone(source);const api=require('../app/api/beast-game/cultivation/route.ts'),key='a'.repeat(64);
 const post=async body=>{const r=await api.POST(new Request('http://localhost/api/beast-game/cultivation',{method:'POST',headers:{'x-beast-wallet':key},body:JSON.stringify(body)}));return {status:r.status,...await r.json()};};
 const command={type:'FUSE',revision:'0',operationId:'v4-concurrent',choices,summaryOnly:true,bonus:'999999',rule:'v3'};
 const beforeApi=JSON.stringify(stored);assert.equal((await post({...command,type:'PREVIEW'})).status,200);assert.equal(JSON.stringify(stored),beforeApi);
 const responses=await Promise.all([post(command),post(command)]);assert(responses.every(r=>r.status===200));assert.equal(stored.receipts.length,1);assert.equal(stored.receipts[0].rule,'v4');assert.equal(stored.state.cards[0].bonus,'55');assert.equal(stored.state.cards[0].fed,1000);
 assert.equal((await post(command)).status,200);assert.equal(stored.receipts.length,1);assert.equal((await post({...command,choices:choices.slice(0,1)})).status,400);
 report.concurrentV4SingleDeduction=true;report.clientCannotChooseLegacyRule=true;
 fs.mkdirSync('reports/five-star-balance-2026-11-18',{recursive:true});fs.writeFileSync('reports/five-star-balance-2026-11-18/balance.json',JSON.stringify(report,null,2));console.log('PASS five-star proportional balance',JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
