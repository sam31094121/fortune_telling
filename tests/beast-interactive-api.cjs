const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {chooseAI}=require('../.beast-game-build/lib/beast-game/interactive');
const base=process.env.SCREEN_HEALTH_BASE_URL||'http://localhost:8888';
(async()=>{
 let cookie='',data;
 async function get(){const r=await fetch(base+'/api/beast-game/turns');cookie=r.headers.get('set-cookie').split(';')[0];data=await r.json();assert(data.ok);}
 async function post(type,extra={},requestId=randomUUID(),revision=data.account.revision){const r=await fetch(base+'/api/beast-game/turns',{method:'POST',headers:{'Content-Type':'application/json',cookie,origin:base},body:JSON.stringify({type,requestId,revision,...extra}),signal:AbortSignal.timeout(15000)});const d=await r.json();return {status:r.status,data:d};}
 await get();assert.equal(data.cards.length,60);assert.equal(data.account.owned.length,3);
 const unknown=data.cards.find(c=>!data.account.owned.includes(c.id)).id;
 assert.equal((await post('START',{lineup:[unknown,...data.account.owned.slice(0,2)]})).status,400);
 assert.equal((await post('START',{lineup:Array(3).fill(data.account.owned[0])})).status,400);
 const token=randomUUID(),rev=data.account.revision;
 const first=await post('SUMMON',{},token,rev);assert(first.data.ok);data=first.data;
 assert.deepEqual((await post('SUMMON',{},token,rev)).data.account,data.account,'retry never awards twice');
 assert.equal((await post('SUMMON')).status,400,'daily limit is server-side');
 assert.equal((await post('LEAVE',{},randomUUID(),rev)).status,400,'stale revision rejected');
 const young=data.cards.find(c=>c.evolution&&!data.account.owned.includes(c.evolution));
 data=(await post('IMPORT',{legacyIds:[young.id]})).data;assert(data.ok);
 assert.equal((await post('IMPORT',{legacyIds:[]})).status,400,'legacy import is one time');
 const own=[young.id,...data.account.owned.filter(id=>id!==young.id).slice(0,2)];
 for(let match=0;match<3;match++){
  data=(await post('START',{lineup:own})).data;assert(data.ok);
  let actions=0;
  while(data.account.match.status==='PLAYING'){
   const choice=chooseAI(data.account.match,'player');
   data=(await post('ACTION',{action:choice})).data;assert(data.ok,JSON.stringify(data));assert(++actions<170);
  }
  const xp=data.account.experience[own[0]];assert(xp>=match+1);
  assert.equal((await post('ACTION',{action:{type:'ATTACK'}})).status,400);
  data=(await post('LEAVE')).data;
 }
 data=(await post('EVOLVE',{cardId:young.id})).data;assert(data.ok);
 assert(data.account.owned.includes(young.id)&&data.account.owned.includes(young.evolution),'evolution preserves both independent cards');
 assert.equal((await post('EVOLVE',{cardId:young.id})).status,400,'cannot claim the same evolution twice');
 const second=await fetch(base+'/api/beast-game/turns');const another=await second.json();assert(another.ok);assert.equal(another.account.revision,0,'another cookie cannot see test account');
 console.log('API passed: ownership, duplicates, idempotency, daily summon, revision conflict, 3 full matches, growth, separate sessions. Synthetic account only.');
})().catch(e=>{console.error(e);process.exit(1)});
