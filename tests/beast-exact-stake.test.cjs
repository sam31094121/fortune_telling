const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/beast-collection-ledger.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject});
const {reserveCard,settleCard}=exportsObject;
const card='beast_a01',other='beast_a02';
const initial={cards:[{id:'first',cardId:card,source:'GROWTH'},{id:'chosen',cardId:card,source:'DUEL_WIN'},{id:'other',cardId:other,source:'GROWTH'}],history:[],receipts:{}};
const reserved=reserveCard(initial,card,'match','now','chosen');
assert.equal(reserved.pending.entryId,'chosen');
const loss={verdict:'LOST',gainedCardId:null,forfeitedCardId:card,stakes:{player:card,opponent:other}};
const result=settleCard(reserved,'match',loss,'now');
assert.equal(result.collection.cards.length,2);
assert.ok(result.collection.cards.some(c=>c.id==='first'));
assert.ok(!result.collection.cards.some(c=>c.id==='chosen'));
assert.ok(settleCard(result.collection,'match',loss,'now').duplicate);
assert.throws(()=>reserveCard(initial,card,'m','now','missing'));
for(const verdict of ['WON','RETURNED']){
 const r=settleCard(reserveCard(initial,card,verdict,'now','chosen'),verdict,{verdict,gainedCardId:verdict==='WON'?other:null,forfeitedCardId:null,stakes:{player:card,opponent:other}},'now');
 assert.equal(r.collection.cards.length,verdict==='WON'?4:3);
 assert.ok(r.collection.cards.some(c=>c.id==='chosen'));
}
console.log('PASS: 精準沒收指定實例、同名副本保留、重播不重扣、勝利加一、平手不變');
const empty={cards:[],history:[],receipts:{}};
const pack=exportsObject.grantStarterPack(empty,'receipt-28','now');
assert.equal(pack.cards.length,28);
assert.equal(new Set(pack.cards.map(c=>c.cardId)).size,28);
assert.ok(pack.cards.every(c=>/^beast_y\d\d$/.test(c.cardId)));
const reservedPack=reserveCard(pack,'beast_y01','loss','now',pack.cards[0].id);
const lostPack=settleCard(reservedPack,'loss',{verdict:'LOST',gainedCardId:null,forfeitedCardId:'beast_y01',stakes:{player:'beast_y01',opponent:other}},'now').collection;
assert.equal(exportsObject.grantStarterPack(exportsObject.migrateCollection(lostPack),'receipt-28','later').cards.length,27);
console.log('PASS: 完整28種幼子、首次只發一次、重載後不補回被沒收幼子');
const {reserveOwnedStakes}=exportsObject;
const inventory={cards:Array.from({length:7},(_,i)=>({id:'copy'+i,cardId:card,source:'GROWTH'})),history:[],receipts:{}};
const ids=inventory.cards.slice(1,6).map(c=>c.id);
for(const invalid of [[],[...ids,'copy6'],[...ids.slice(1),'copy2'],[...ids.slice(1),'beast_y28']])assert.throws(()=>reserveOwnedStakes(inventory,invalid,'batch','now'));
assert.throws(()=>reserveOwnedStakes(empty,ids,'batch','now'));
for(const verdict of ['WON','LOST','RETURNED']){
 const r=reserveOwnedStakes(inventory,ids,'batch'+verdict,'now');
 const outcome={verdict,stakes:{player:card,opponent:other},gainedCardId:verdict==='WON'?other:null,forfeitedCardId:verdict==='LOST'?card:null,selectedEntries:r.pending.entries,forfeitedEntryIds:verdict==='LOST'?ids:[]};
 const settled=settleCard(r,r.pending.id,outcome,'now');
 assert.equal(settled.collection.cards.length,verdict==='WON'?8:verdict==='LOST'?2:7);
 assert.ok(settled.collection.cards.some(c=>c.id==='copy0'));
 assert.ok(settled.collection.cards.some(c=>c.id==='copy6'));
 assert.ok(settleCard(settled.collection,r.pending.id,outcome,'now').duplicate);
 assert.throws(()=>settleCard(r,r.pending.id,{...outcome,selectedEntries:[...outcome.selectedEntries].reverse()},'now'));
 assert.throws(()=>settleCard({...r,cards:r.cards.filter(c=>c.id!==ids[0])},r.pending.id,outcome,'now'));
}
const savedPack=exportsObject.migrateCollection(pack);
assert.equal(reserveOwnedStakes(savedPack,savedPack.cards.slice(0,5).map(c=>c.id),'pack','now').pending.entries.length,5);
console.log('PASS: 五張真實收藏限定、排除試用牌、同名副本精準扣五、勝加一、平手保留、重播去重、入庫幼子可押');
for(let count=1;count<=5;count++)for(const verdict of ['WON','LOST','RETURNED']){
 const chosen=ids.slice(0,count),matchId=`variable-${count}-${verdict}`;
 const reserved=reserveOwnedStakes(inventory,chosen,matchId,'now');
 const outcome={verdict,stakes:{player:card,opponent:other},gainedCardId:verdict==='WON'?other:null,forfeitedCardId:verdict==='LOST'?card:null,selectedEntries:reserved.pending.entries,forfeitedEntryIds:verdict==='LOST'?chosen:[]};
 const result=settleCard(reserved,matchId,outcome,'now');
 assert.equal(result.collection.cards.length,7+(verdict==='WON'?1:verdict==='LOST'?-count:0));
 assert.ok(result.collection.cards.some(c=>c.id==='copy0'));
 assert.ok(settleCard(result.collection,matchId,outcome,'now').duplicate);
 assert.throws(()=>settleCard(reserved,matchId,{...outcome,selectedEntries:[]},'now'));
}
console.log('PASS: 1～5 張各自勝／敗／平手15種結算，張數精準、其他副本保留、重播去重');
