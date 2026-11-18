const assert=require('node:assert/strict');
require('./guest-orb-fixture.cjs');
const C=require('../lib/beast-game/cultivation.ts'),R=require('../lib/beast-game/cultivation-rules.ts'),T=require('../lib/beast-game/cultivation-transaction.ts'),V=require('../lib/beast-game/cultivation-view.ts'),B=require('../lib/beast-game/cultivation-batch.ts');
const cards=require('../lib/beast-game/registry.ts').playableCards();
const {ELEMENT_GENERATES}=require('../lib/beast-game/elements.ts');
// Archived v3 receipts remain replayable. Production v4 is tested separately.
assert.equal(R.activeFoodChainRule(),'v4');R.activeFoodChainRule=()=> 'v3';
let pairs=0;
for(const target of cards.filter(c=>c.form!=='YOUNG'))for(const material of cards){
 const state={cards:[{id:'t',cardId:target.id,bonus:'100000',fed:0},{id:'m',cardId:material.id,bonus:'0'}],protectedIds:[]};
 const before=JSON.stringify(state),result=C.fuseCultivation(state,[{targetId:'t',materialId:'m'}],{rule:'v3'}),change=result.changes[0];
 const base=Math.max(1,Math.floor(material.stats.attack/10)),affinity=target.element===material.element||ELEMENT_GENERATES[material.element]===target.element;
 assert.equal(change.addedBonus,String(affinity?Math.ceil(base*1.5):base));assert.equal(change.fedAfter,1);assert.equal(result.state.cards.length,1);assert.equal(change.capBonus,undefined);assert.equal(change.rule,'v3');assert.equal(JSON.stringify(state),before);pairs++;
}
const copy=(id,cardId,fed=0)=>({id,cardId,bonus:'0',fed});
const snap=(fed=0)=>({revision:'0',pendingBattle:null,receipts:[],state:{cards:[copy('t','beast_g_qinglong',fed),...Array.from({length:1000},(_,i)=>copy('m'+i,'beast_y01'))],protectedIds:[]}});
for(const [fed,stars] of [[499,3],[500,4],[999,4],[1000,5]])assert.equal(R.starProgress('GUARDIAN',fed).stars,stars);
for(const [fed,stars] of [[249,3],[250,4],[499,4],[500,5]])assert.equal(R.starProgress('ADULT',fed).stars,stars);
const source=snap(),choices=source.state.cards.slice(1).map(c=>({targetId:'t',materialId:c.id}));
const result=T.fuseSnapshot(source,choices),summary=B.summarizeCultivationChanges(result.changes);
assert.equal(summary.count,1000);assert.equal(summary.starsBefore.fed,0);assert.equal(summary.starsAfter.fed,1000);assert.equal(summary.starsAfter.stars,5);assert.equal(summary.atBonusCap,false);assert.equal(result.state.cards.length,1);assert(BigInt(result.state.cards[0].bonus)>100n);
assert.throws(()=>T.fuseSnapshot(snap(1),choices),/五星封頂/);assert.equal(source.state.cards.length,1001);
assert.throws(()=>T.fuseSnapshot(source,[{targetId:'t',materialId:'t'}]),/不存在/);
const view=V.cultivationView(source);assert.equal(view.foodChainRule,'v3');assert.equal(view.cards[0].atBonusCap,false);assert.equal(view.cards[0].bonusCap,undefined);assert.equal(view.cards[1].materialTargetCardIds.length,32);
assert.equal(B.batchLimits(source,'t').max,1000);
const receipt={operationId:'v3',command:JSON.stringify({type:'FUSE',choices}),revision:'1',changes:result.changes,rule:'v3'};
assert.deepEqual(T.replayCultivationReceipt(source,receipt).changes,result.changes);
// Current v3 protections and read-only entry computation.
const protectedState={cards:[copy('t','beast_g_qinglong'),copy('m','beast_y01'),copy('p2','beast_a02'),copy('p3','beast_a03'),copy('p4','beast_a04'),copy('extra','beast_y08')],protectedIds:['t','m','p2','p3','p4']};
assert.throws(()=>C.fuseCultivation(protectedState,[{targetId:'t',materialId:'m'}],{rule:'v3'}),/鎖定/);
assert.throws(()=>C.fuseCultivation({...protectedState,protectedIds:[],cards:protectedState.cards.slice(0,5)},[{targetId:'t',materialId:'m'}],{rule:'v3'}),/至少須保留五/);
assert.throws(()=>C.fuseCultivation({cards:[copy('t','beast_y01'),copy('m','beast_y02')],protectedIds:[]},[{targetId:'t',materialId:'m'}],{rule:'v3'}),/本體或四大/);
const entry=require('../lib/beast-game/four-beasts-view.ts'),entryBefore=JSON.stringify(source),start=performance.now();
const entryView=entry.fourBeastsView(source),entryMs=performance.now()-start;
assert.equal(entryView.enhanceableCount,1000);assert.equal(entryView.materials.find(m=>m.copyId==='m0').tier,'CULTIVATION');assert.equal(JSON.stringify(source),entryBefore);
assert.equal(entry.fourBeastsView({...source,pendingBattle:'orb:test'}).enhanceableCount,0);
assert.equal(entry.fourBeastsView(snap(1000)).enhanceableCount,0);
console.log('Current v3 1001-copy read-only entry:',Math.round(entryMs),'ms');
// Immutable storage double exercises the real transaction and HTTP handlers without customer writes.
const crypto=require('node:crypto'),key=crypto.randomBytes(32).toString('hex'),owner=crypto.createHash('sha256').update(key).digest('hex');
let saved=snap(998),writes=0;
const repo={read:async o=>{assert.equal(o,owner);return structuredClone(saved)},compareAndSwap:async(o,rev,next)=>{if(saved.revision!==rev)return false;saved=structuredClone(next);writes++;return true}};
require('../lib/beast-game/cultivation-repository.ts').cultivationRepository=()=>repo;
const api=require('../app/api/beast-game/cultivation/route.ts');
const post=async body=>{const r=await api.POST(new Request('http://localhost/api/beast-game/cultivation',{method:'POST',headers:{'x-beast-wallet':key},body:JSON.stringify(body)}));return {status:r.status,...await r.json()}};
(async()=>{
 const pair=choices.slice(0,2),command={type:'FUSE',revision:'0',operationId:'batch-v3',choices:pair,summaryOnly:true};
 const preview=await post({...command,type:'PREVIEW'});assert.equal(preview.status,200);assert.equal(preview.summary.count,2);assert.equal(preview.summary.starsAfter.stars,5);assert.equal(writes,0);
 const [a,b]=await Promise.all([post(command),post(command)]);assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(a.receipt,b.receipt);assert.equal(writes,1);assert.equal(saved.receipts[0].rule,'v3');assert.equal(saved.state.cards.length,999);
 assert.equal((await post(command)).status,200);assert.equal(writes,1);
 assert.equal((await post({...command,choices:choices.slice(2,4)})).status,400);
 saved={...snap(),pendingBattle:'orb:held'};const held=await post({...command,operationId:'held'});assert.equal(held.status,400);assert.equal(saved.state.cards.length,1001);
 console.log('PASS archived v3: '+pairs+' material/target pairs, element direction/rounding, no attack cap, 500/1000 star thresholds, 1000-card atomic batch, replay, preview, concurrent/repeated API single deduction, battle lock');
})().catch(e=>{console.error(e);process.exitCode=1});
