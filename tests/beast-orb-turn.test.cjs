const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
const {resolveOrbTurn}=require('../lib/beast-game/match3/resolve-turn.ts');
const {playableCards}=require('../lib/beast-game/registry.ts');
const {ELEMENTS}=require('../lib/beast-game/elements.ts');
const cards=ELEMENTS.map(e=>playableCards().find(c=>c.element===e));
const fixture=()=>({board:Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>ELEMENTS[(r+c)%5])),magic:Array.from({length:8},()=>Array(7).fill(0)),path:[{r:0,c:0},{r:0,c:1},{r:0,c:2}],team:cards.map(c=>({id:c.id,name:c.name,thumbnail:c.art.thumbnail,element:c.element,hp:50,maxHp:100,attack:20,energy:0})),foes:cards.map(c=>({id:c.id,name:c.name,thumbnail:c.art.thumbnail,element:c.element,hp:100,maxHp:200,attack:8,cd:1})),mode:'hard45',wins:0,target:0,seed:100,move:0,chosen:{},rule:'tap-lead',attackBoost:1});
for(const n of [1,2,3]){
 const p=fixture();p.board[0].fill('WATER');p.path=p.path.slice(0,n);const original=JSON.stringify(p);const r=resolveOrbTurn(p);
 assert.equal(r.res.valid,n>=3);assert.equal(r.counter.hits.length,1);assert.equal(JSON.stringify(p),original);assert.deepEqual(r,resolveOrbTurn(p));
 if(n<3)assert.equal(r.heals.length,0);
}
console.log('PASS short gestures still counter once, no healing, deterministic replay, immutable snapshots');
for(const [colors,kind] of [[['WATER','WATER','WATER'],'same'],[['AIR','WATER','AIR'],'mixed'],[['AIR','WATER','FIRE'],'three'],[['AIR','WATER','FIRE','SPACE'],'four']]){
 const p=fixture();p.path=colors.map((e,c)=>{p.board[0][c]=e;p.magic[0][c]=7;return {r:0,c}});const r=resolveOrbTurn(p);assert.equal(r.shield.kind,kind);assert(r.counter.team.every(f=>f.hp<=f.maxHp));
}
{
 const p=fixture();p.path=ELEMENTS.map((e,c)=>{p.board[0][c]=e;p.magic[0][c]=7;return {r:0,c}});const r=resolveOrbTurn(p);
 assert.equal(r.shield.kind,'five');assert.equal(r.guardScale,.3);assert.equal(r.nextBoost,1.5);assert.equal(r.damage,0);
 assert(r.heals.every(h=>h.reason==='shield'&&h.actual===15));
 const q={...p,board:r.res.board,magic:r.res.magic,team:r.counter.team,foes:r.counter.foes,attackBoost:r.nextBoost};
 q.board=q.board.map(r=>r.slice());q.magic=q.magic.map(r=>r.slice());q.board[0].fill('WATER');q.magic[0].fill(0);q.path=[0,1,2].map(c=>({r:0,c}));
 const after=resolveOrbTurn(q);assert.equal(after.nextBoost,1);assert(after.damage>0);
}
console.log('PASS shield tiers, five-color defense/heal, one-use next attack boost');
for (const element of ELEMENTS) {
 const p=fixture(); p.board[0].fill(element); p.path=[0,1,2].map(c=>({r:0,c})); p.magic[0].fill(7);
 const r=resolveOrbTurn(p);
 const guardian=playableCards().find(c=>c.form==='GUARDIAN' && c.element===element);
 assert.equal(r.summon?.guardianId,guardian?.id);
 if(r.summon) assert(r.actualHits.some(h=>h.attackerId===r.summon.sourceId && h.amount>0));
 assert.equal(r.shieldGoals.reduce((s,g)=>s+g.count,0),r.res.magic.flat().filter(v=>v>=7).length);
 assert.equal(r.healingSummary.reduce((s,h)=>s+h.actual,0),r.heals.reduce((s,h)=>s+h.actual,0));
 p.team=p.team.map(f=>f.element===element?{...f,hp:0}:f);
 assert.equal(resolveOrbTurn(p).summon,null,'no fake guardian attack when element actor is down');
}
console.log('PASS same-color summons match actual eligible damage and existing four guardians; earth retains its own element');
module.exports={fixture};
