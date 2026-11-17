// Disposable random account only; no customer account reads or schema changes.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..'),ts=require(path.join(root,'node_modules/typescript'));
const Module=require('module'),resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...rest){return resolve.call(this,name.startsWith('@/')?path.join(root,name.slice(2)):name,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
process.loadEnvFile(path.join(root,'.env.local'));
const {createClient}=require(path.join(root,'node_modules/@supabase/supabase-js'));
const campaign=require(path.join(root,'lib/beast-game/match3/hard-campaign.ts'));
const {playableCards}=require(path.join(root,'lib/beast-game/registry.ts'));
const key=crypto.randomBytes(32).toString('hex'),owner=crypto.createHash('sha256').update(key).digest('hex');
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),report={isolated:true,realDatabase:true,cases:[]};
const read=async()=>{const r=await db.from('beast_cultivation_accounts').select('snapshot').eq('owner_hash',owner).single();assert.ifError(r.error);return r.data.snapshot};
const post=async(endpoint,body)=>{const r=await fetch('http://localhost:8888/api/beast-game/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-beast-wallet':key},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});return {status:r.status,...await r.json()}};
(async()=>{let created=false;try{
let r=await db.from('beast_cultivation_accounts').insert({owner_hash:owner,revision:'0',snapshot:{revision:'0',state:{cards:[],protectedIds:[]},pendingBattle:null,receipts:[],orbLedger:{wins:0,rewards:[],receipts:[]}}});assert.ifError(r.error);created=true;
const ids=['beast_g_baihu',...playableCards().filter(c=>c.form==='YOUNG').slice(0,4).map(c=>c.id)];
const profile={...campaign.chooseCampaignHero(campaign.newCampaign(),'beast_g_baihu'),teamIds:ids};
const start=await post('cultivation',{type:'ORB_BEGIN',profile,operationId:'verdict-isolated',seed:71,mode:'hard45'});assert.equal(start.status,200);assert.equal(start.outcome,null);
const original=await read(),resume=await post('cultivation',{type:'ORB_RESUME',battleId:start.battleId});assert.equal(resume.status,200);assert.deepEqual(resume.initial,original.orbRun.input);assert.deepEqual(await read(),original);report.cases.push('active resume is exact and read-only');
// Synthetic last-hit setup in this disposable run only; real endpoint resolves and commits.
const fixture=structuredClone(original);fixture.orbRun.input.team=fixture.orbRun.input.team.map(c=>({...c,energy:100}));fixture.orbRun.input.foes=fixture.orbRun.input.foes.map((c,i)=>({...c,hp:i?0:1}));
r=await db.from('beast_cultivation_accounts').update({snapshot:fixture}).eq('owner_hash',owner).select('owner_hash');assert.ifError(r.error);assert.equal(r.data.length,1);
const input={...fixture.orbRun.input,sharedBattleToken:start.token,sharedVersion:0,path:[],action:'energy',attackerId:ids[0],eventId:'synthetic-final',actionId:'synthetic-final',target:0};
const win=await post('orb-turn',input);assert.equal(win.status,200);assert.equal(win.outcome,'win');assert(win.foes.every(c=>c.hp===0));const saved=await read();assert.equal(saved.orbLedger.wins,1);assert.equal(saved.state.cards.length,1);assert.equal(saved.orbLedger.receipts.length,1);assert.equal(saved.pendingBattle,null);report.cases.push('real final hit -> win -> atomic single reward');
const replay=await post('orb-turn',input);assert.deepEqual(replay,win);assert.deepEqual(await read(),saved);report.cases.push('lost-reply retry identical and no second reward');
const stale=await post('orb-turn',{...input,target:1});assert.equal(stale.status,400);assert.deepEqual(await read(),saved);report.cases.push('old version with changed intent rejected');
const restored=await post('cultivation',{type:'ORB_RESUME',battleId:start.battleId});assert.equal(restored.status,200);assert.equal(restored.outcome,'win');assert.deepEqual(restored.initial,saved.orbRun.input);assert.deepEqual(await read(),saved);report.cases.push('terminal resume retains player victory, board, HP and one reward');
const next=await post('cultivation',{type:'ORB_BEGIN',profile,operationId:'verdict-loss',seed:72,mode:'hard45'});assert.equal(next.status,200);
const losing=await read(),li=losing.orbRun.input;
li.team=li.team.map((c,i)=>({...c,hp:i?0:1}));li.foes=li.foes.map((c,i)=>({...c,hp:i?0:100,maxHp:Math.max(c.maxHp,100),attack:100,attackEnergy:75}));li.board[0].fill(li.team[0].element);
r=await db.from('beast_cultivation_accounts').update({snapshot:losing}).eq('owner_hash',owner).select('owner_hash');assert.ifError(r.error);assert.equal(r.data.length,1);
const loss=await post('orb-turn',{...li,path:[0,1,2].map(c=>({r:0,c})),sharedBattleToken:next.token,sharedVersion:0,target:0,actionId:'loss-turn'});assert.equal(loss.status,200);assert.equal(loss.outcome,'lose');
const lossSaved=await read(),lossResume=await post('cultivation',{type:'ORB_RESUME',battleId:next.battleId});assert.equal(lossResume.status,200);assert.equal(lossResume.outcome,'lose');assert.deepEqual(lossResume.initial,lossSaved.orbRun.input);assert.equal(lossSaved.state.cards.length,1);assert.equal(lossSaved.orbLedger.wins,1);report.cases.push('lethal counter -> loss -> reload still loss; no reward or level added');
report.passed=true;
}catch(e){report.error=e.stack;process.exitCode=1}finally{if(created){const r=await db.from('beast_cultivation_accounts').delete().eq('owner_hash',owner).select('owner_hash');assert.ifError(r.error);assert.equal(r.data.length,1);report.cleaned=true;}fs.writeFileSync(path.join(__dirname,'storage-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}})();
