const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..');
const ts=require(path.join(root,'node_modules/typescript'));
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
const {fixture}=require(path.join(root,'tests/beast-orb-turn.test.cjs'));
const {resolveOrbTurn}=require(path.join(root,'lib/beast-game/match3/resolve-turn.ts'));
const {resolveCardAttackTurn}=require(path.join(root,'lib/beast-game/match3/card-attack.ts'));
const {playableCards}=require(path.join(root,'lib/beast-game/registry.ts'));
const result={cases:[],synthetic:true,realHttp:true,noWallet:true};
const summary=(team,foes)=>({team:team.map(x=>x.hp),foes:foes.map(x=>x.hp),ui:foes.every(x=>x.hp<=0)?'win':team.every(x=>x.hp<=0)?'lose':null,awardEligible:team.some(x=>x.hp>0)&&foes.every(x=>x.hp<=0)});
function base(){const p=fixture();p.board[0].fill(p.team[0].element);p.team=p.team.map((u,i)=>({...u,hp:i===0?1:0,maxHp:1,energy:100,attack:20}));p.foes=p.foes.map((u,i)=>({...u,hp:i===0?1:0,attackEnergy:75}));return p;}
async function test(name,p){const response=await fetch('http://localhost:8888/api/beast-game/orb-turn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});const r=await response.json();assert.equal(response.status,200,name+JSON.stringify(r));const local=p.action?resolveCardAttackTurn(p):resolveOrbTurn(p);assert.deepEqual(r,JSON.parse(JSON.stringify(local)),name+' running API equals current source');const end=r.counter??r;const e={name,input:p,response:r,before:summary(p.team,p.foes),after:summary(end.team,end.foes),beforeCounter:r.beforeCounter&&summary(r.beforeCounter.team,r.beforeCounter.foes),hits:r.counter?.hits,status:response.status,noStore:response.headers.get('cache-control')};result.cases.push(e);console.log(name,JSON.stringify(e.after));return e;}
(async()=>{
let p=base();await test('last_foe_lethal_drag',p);
p=base();p.team[0].attack=0;p.foes[0].hp=100;p.foes[0].attack=100;await test('surviving_foe_lethal_counter',p);
for(const action of ['energy','link']){p=base();p.path=[];p.action=action;p.eventId='verdict:'+action;p.actionId='verdict:'+action;if(action==='energy')p.attackerId=p.team[0].id;else{p.team[1].hp=1;p.linkIds=p.team.slice(0,2).map(x=>x.id);}await test('last_foe_'+action,p);}
p=base();p.wins=7;const guardian=playableCards().find(x=>x.form==='GUARDIAN'&&!p.foes.slice(0,4).some(f=>f.id===x.id));p.foes[4]={...p.foes[4],id:guardian.id,name:guardian.name,element:guardian.element,hp:100,maxHp:200,attack:100,attackEnergy:75};p.path=[0,1,2,3,4,5].map(c=>({r:0,c}));await test('last_escort_then_guardian',p);
// Reachable-state search: actual card identities and engine, low HP endgame snapshots; no fabricated outcome.
let samples=0,flips=0,both=0;for(const c of playableCards())for(const enemy of playableCards()){
 p=base();p.wins=10;p.team[0]={...p.team[0],id:c.id,name:c.name,element:c.element,attack:c.stats.attack};p.team=p.team.filter((x,i)=>i===0||x.id!==c.id);if(p.team.length!==5)continue;p.foes[0]={...p.foes[0],id:enemy.id,name:enemy.name,element:enemy.element,hp:Math.min(30,enemy.stats.hp),attack:enemy.stats.attack};if(new Set(p.foes.map(x=>x.id)).size!==5)continue;p.board[0].fill(c.element);p.path=[0,1,2,3,4,5].map(c=>({r:0,c}));const r=resolveOrbTurn(p),a=summary(r.beforeCounter.team,r.beforeCounter.foes),b=summary(r.counter.team,r.counter.foes);samples++;if(a.ui==='win'&&b.ui==='lose')flips++;if(b.team.every(x=>!x)&&b.foes.every(x=>!x))both++;
}result.search={samples,beforeCounterWinToFinalLose:flips,simultaneousZero:both};
result.zeroBoundary={note:'Injected all-zero state; not a naturally reached match',...summary(base().team.map(x=>({...x,hp:0})),base().foes.map(x=>({...x,hp:0})))};
fs.writeFileSync(path.join(__dirname,'api-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result.search));
})().catch(e=>{fs.writeFileSync(path.join(__dirname,'api-error.txt'),e.stack);console.error(e);process.exitCode=1});

