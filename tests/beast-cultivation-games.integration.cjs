// Explicit opt-in integration test. Uses a random isolated owner and deletes only that owner.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), ts = require('typescript');
require('./helpers/server-only-runtime.cjs');
const Module = require('node:module'), resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest); };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
process.loadEnvFile('.env.local');
const { createClient } = require('@supabase/supabase-js');
const { SupabaseCultivationRepository } = require('../lib/beast-game/cultivation-repository.ts');
const { transactCultivation } = require('../lib/beast-game/cultivation-transaction.ts');
const api = require('../app/api/beast-game/cultivation/route.ts');


const orb=require('../lib/beast-game/cultivation-orb.ts'),games=require('../lib/beast-game/cultivation-games.ts');
const campaign=require('../lib/beast-game/match3/hard-campaign.ts'),drag=require('../lib/beast-game/match3/drag.ts');
const battle=require('../lib/beast-game/interactive.ts'),cardCampaign=require('../lib/beast-game/card-campaign.ts');
const battleApi=require('../app/api/beast-game/battlefield/route.ts'),orbApi=require('../app/api/beast-game/orb-turn/route.ts');
function findChain(b,magic,colors){for(let r=0;r<b.length;r++)for(let c=0;c<b[0].length;c++){if(!colors.includes(b[r][c]))continue;const search=p=>{if(p.length>=4)return p;const a=p[p.length-1];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const n={r:a.r+dr,c:a.c+dc};if(drag.canExtend(b,p,n,true,magic,true)){const found=search([...p,n]);if(found)return found;}}};const found=search([{r,c}]);if(found)return found;}return null;}
(async()=>{
 if(process.env.BEAST_CULTIVATION_STORAGE_TEST!=='1')throw Error('Explicit isolated storage opt-in required');
 const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const key=crypto.randomBytes(32).toString('hex'),owner=crypto.createHash('sha256').update(key).digest('hex'),repo=new SupabaseCultivationRepository(client);
 const ids=['beast_g_qinglong','beast_a01','beast_a02','beast_a03','beast_a04'],cards=ids.map((cardId,i)=>({id:'qa:'+i,cardId,bonus:'9'.repeat(400)}));
 const post=async(route,body)=>{const response=await route.POST(new Request('http://localhost:8888/api/beast-game/test',{method:'POST',headers:{'x-beast-wallet':key},body:JSON.stringify(body)}));return {status:response.status,...await response.json()};};
 let created=false;
 try{
  await repo.create(owner,{revision:'0',state:{cards,protectedIds:cards.map(c=>c.id)},pendingBattle:null,receipts:[],orbLedger:{wins:0,rewards:[],receipts:[]}});created=true;
  const p={...campaign.chooseCampaignHero(campaign.newCampaign(),'beast_g_qinglong'),teamIds:ids,ownedEntries:Object.fromEntries(cards.map(c=>[c.cardId,c.id]))};
  const start=await orb.beginSharedOrb(owner,p,'test-orb',17,'hard45');assert.equal(start.initial.team[0].attackExact.length,401);
  const replayStart=await orb.beginSharedOrb(owner,p,'test-orb',18,'hard45');assert.deepEqual(JSON.parse(JSON.stringify(start.initial)),replayStart.initial);
  const diverted=await orb.beginSharedOrb(owner,p,'other-orb',19,'hard45');
  assert.equal(diverted.battleId,start.battleId,'a new begin during a held orb battle resumes the original fight');
  assert.deepEqual(JSON.parse(JSON.stringify(diverted.initial)),JSON.parse(JSON.stringify(start.initial)));
  await assert.rejects(transactCultivation(repo,owner,'during-battle',(await repo.read(owner)).revision,{type:'MAIN_TEAM',ids:cards.map(c=>c.id)}));
  let finished=false,turns=0,lastBody;
  while(!finished&&turns<90){
   const current=await repo.read(owner),run=current.orbRun,s=run.input;
   const target=s.foes.findIndex(f=>f.hp>0),colors=s.team.filter(t=>t.hp>0).map(t=>t.element);
   const chain=findChain(s.board,s.magic,colors)||findChain(s.board,s.magic,['SPACE','AIR','WATER','FIRE','EARTH']);assert(chain);
   // Malicious health/attack are deliberately ignored; only chosen gesture is authoritative input.
   const body={...s,team:s.team.map(t=>({...t,hp:t.maxHp})),foes:s.foes.map(f=>({...f,hp:0})),path:chain,target,actionId:'gesture:'+turns,sharedBattleToken:start.token,sharedVersion:run.version};
   const parallel=turns===0?await Promise.all([post(orbApi,body),post(orbApi,body)]):[await post(orbApi,body)];const r=parallel[0];if(parallel[1])assert.deepEqual(r,parallel[1]);assert.equal(r.status,200,JSON.stringify(r));
   if(turns===0){const duplicate=await post(orbApi,body);assert.deepEqual(r,duplicate);assert.equal((await repo.read(owner)).orbRun.version,1);const bad=await post(orbApi,{...body,target:(target+1)%5});assert.equal(bad.status,400);assert.equal((await repo.read(owner)).orbLedger.wins,0,'fabricated client zero HP did not win');}
   if(turns===0){const saved=await repo.read(owner),resume=await post(api,{type:'ORB_RESUME',battleId:start.battleId});assert.equal(resume.status,200);assert.deepEqual(resume.initial,saved.orbRun.input);assert.equal(resume.version,1);assert.deepEqual(await repo.read(owner),saved);}
   finished=(await repo.read(owner)).orbLedger.wins===1;turns++;lastBody=body;
  }
  assert(finished,'real server battle reached victory');
  const beforeResume=await repo.read(owner),resumed=await post(api,{type:'ORB_RESUME',battleId:start.battleId});
  assert.equal(resumed.status,200);assert.deepEqual(resumed.initial,beforeResume.orbRun.input);assert.equal(resumed.version,beforeResume.orbRun.version);
  assert.deepEqual(await repo.read(owner),beforeResume,'resume is read-only, including won battle rewards');
  assert.equal((await post(api,{type:'ORB_RESUME',battleId:'orb:other'})).status,400);
  await assert.rejects(orb.resumeSharedOrb('f'.repeat(64),start.battleId),'another owner cannot resume');
  assert.equal(resumed.totalDamage,beforeResume.orbRun.totalDamage);assert.equal(resumed.lastDamage,beforeResume.orbRun.lastDamage);
  if(process.env.ORB_RECOVERY_ONLY==='1'){console.log('PASS actual Supabase orb recovery: exact board/magic/HP/energy/counters/turn and damage totals; active and won states; no mutation or duplicate grant; wrong battle/owner refused.');return;}
  let saved=await repo.read(owner);assert.equal(saved.state.cards.length,6);assert.equal(saved.pendingBattle,null);assert.equal(saved.orbLedger.receipts.length,1);
  const finalReplay=await post(orbApi,lastBody);assert.equal(finalReplay.status,200);assert.equal((await repo.read(owner)).state.cards.length,6);
  const dealt=await post(battleApi,{type:'DEAL',campaign:true,selectedEntries:cards.map(({id,cardId})=>({id,cardId}))});assert.equal(dealt.status,200,JSON.stringify(dealt));
  const {openTableTicket}=require('../lib/beast-game/battle-session.ts');const table=openTableTicket(dealt.tableToken);
  let reply=await post(battleApi,{type:'START',tableToken:dealt.tableToken,playerTeam:ids,opponentTeam:table.opponentTeam,stakeCardId:ids[0],stakeCount:1,stakeEntryIds:[cards[0].id]});assert.equal(reply.status,200,JSON.stringify(reply));
  let steps=0;while(reply.match.status!=='FINISHED'&&steps++<120){const action=reply.legal.find(a=>a.type==='ATTACK')??reply.legal[0];reply=await post(battleApi,{type:'ACTION',token:reply.token,action});assert.equal(reply.status,200,JSON.stringify(reply));}
  assert.equal(reply.match.status,'FINISHED');assert.equal(reply.match.winner,'player');assert(reply.reward.proof);const count=(await repo.read(owner)).state.cards.length;assert(count>6);
  const repeated=await post(battleApi,{type:'RESUME',token:reply.token});assert.equal(repeated.status,200);assert.equal((await repo.read(owner)).state.cards.length,count);
  await games.creditSharedShards(owner,reply.reward.proof);const shards=(await repo.read(owner)).shards.shards;await games.creditSharedShards(owner,reply.reward.proof);assert.equal((await repo.read(owner)).shards.shards,shards);
  const stale=await orb.sharedOrbProfile(owner,{...p,ownedEntries:{...p.ownedEntries,beast_a01:'gone'}});assert.equal(stale.teamIds.length,0,'missing selected copy returns repickable profile');
  await games.grantSharedStarter(owner,'fixture-receipt');const afterStarter=(await repo.read(owner)).state.cards.length;await games.grantSharedStarter(owner,'different');assert.equal((await repo.read(owner)).state.cards.length,afterStarter);
  await assert.rejects(games.settleCultivationCards(owner,reply.sharedMatchId,{...reply.outcome,verdict:'LOST'}),/不同的結算/);
  await games.importExistingGrants(owner,{cards:[],history:[]},{modules:['number']});
  let growth=await repo.read(owner);await transactCultivation(repo,owner,'consume-growth',growth.revision,{type:'FUSE',choices:[{targetId:'growth:beast_a01',materialId:'growth:beast_y01'},{targetId:cards[0].id,materialId:'growth:beast_a01'}]});
  const afterGrowth=(await repo.read(owner)).state.cards.length;await games.importExistingGrants(owner,{cards:[],history:[]},{modules:['number']});assert.equal((await repo.read(owner)).state.cards.length,afterGrowth,'consumed fixed growth entitlement never regrants');
  const beforeGrants=await repo.read(owner);await games.importExistingGrants(owner,{cards:[{id:'starter:fake:1',cardId:'beast_y01'},{id:'shard:ADULT:999',cardId:'beast_a01'}],history:[],starterPack:'fake'});assert.equal((await repo.read(owner)).state.cards.length,beforeGrants.state.cards.length);
  console.log('PASS actual Supabase + API: huge-value orb victory in '+turns+' turns; authoritative HP; stale/concurrent/retry controls; atomic single reward; card victory in '+steps+' actions, reward/replay/shards dedupe; starter once; forged local grants rejected; stale copies repickable.');
 }finally{if(created){const removed=await client.from('beast_cultivation_accounts').delete().eq('owner_hash',owner).select('owner_hash');assert.ifError(removed.error);assert.equal(removed.data.length,1);console.log('PASS isolated games account removed');}}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
