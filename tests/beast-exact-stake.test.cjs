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
