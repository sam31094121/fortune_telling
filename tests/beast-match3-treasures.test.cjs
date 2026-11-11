const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const Module=require('node:module'),path=require('node:path'),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve(__dirname,'..',id.slice(2)):id,...args)};
const M=require('../lib/beast-game/match3/index.ts'),T=require('../lib/beast-game/match3/treasures.ts'),E=require('../lib/beast-game/elements.ts');
const {resolveOrbTurn}=require('../lib/beast-game/match3/resolve-turn.ts');
const pool=require('../lib/beast-game/registry.ts').playableCards();
const team=E.ELEMENTS.map(element=>{const c=pool.find(c=>c.element===element&&c.form==='ADULT');return {id:c.id,name:c.name,thumbnail:'',element,hp:100000,maxHp:100000,attack:100,energy:0,cd:1}});
const board=M.generateBoard(M.seededRng(1),8,7,true),magic=M.emptyMagic(board);
const input={board,magic,path:[],team,foes:team.map(x=>({...x,attackEnergy:75})),mode:'hard45',wins:0,target:0,seed:1001,move:0,chosen:{},rule:'all-attack',attackBoost:1,actionId:'test'};
let book=T.emptyTreasureBook();
for(let i=0;i<5;i++){
 const path=Array.from({length:4},(_,r)=>({r,c:0}));path.forEach(p=>{board[p.r][p.c]=E.ELEMENTS[i];magic[p.r][p.c]=7});
 const req={...input,path,actionId:'grant'+i,treasures:book};
 const result=resolveOrbTurn(req);assert(result.res.valid);assert.equal(result.treasure.earned.element,E.ELEMENTS[i]);book=result.treasure.book;
 assert.equal(T.grantTreasure({...req,treasures:book},result.res).earned,null);
 assert.equal(T.grantTreasure({...req,path:path.slice(0,3)},result.res).earned,null);
 assert.equal(T.grantTreasure({...req,magic:M.emptyMagic(board)},result.res).earned,null);
 assert.equal(T.grantTreasure({...req,path:[path[0],path[2],path[1],...path.slice(3)]},result.res).earned,null);
}
assert.deepEqual(Object.values(book.counts),[1,1,1,1,1]);
for(const element of E.ELEMENTS){
 const request={...input,treasures:book,actionId:element};const before=JSON.stringify(request);const r=T.resolveTreasureUse(request,element);
 assert.equal(JSON.stringify(request),before,'pure');assert.equal(r.book.counts[element],0);assert.deepEqual(r.team,team);
 assert.equal(r.effect.hits.length,element==='AIR'?3:1);
 const multipliers=element==='AIR'?[.45,.45,.45]:[element==='FIRE'?2:element==='SPACE'?1:.8];
 assert.equal(r.effect.damage,multipliers.reduce((a,m)=>a+Math.round(100*m*E.elementMultiplier(element,'SPACE')),0));
 assert.equal(r.foes[0].attackEnergy,element==='WATER'?50:75);assert.equal(r.guardScale,element==='EARTH'?.5:1);
 assert.deepEqual(r.foes.slice(1).map(f=>f.attackEnergy),[75,75,75,75]);
 assert.throws(()=>T.resolveTreasureUse({...request,treasures:r.book},element));
 assert.throws(()=>T.resolveTreasureUse({...request,treasures:T.emptyTreasureBook()},element));
}
let r=T.resolveTreasureUse({...input,treasures:book,foes:input.foes.map((f,i)=>i?f:{...f,skillRuntime:{shield:101}})},'SPACE');assert.equal(r.effect.shieldBroken,51);assert.equal(r.effect.hits[0].shieldAbsorbed,50);
r=T.resolveTreasureUse({...input,treasures:book,foes:input.foes.map(f=>({...f,attackEnergy:0}))},'WATER');assert.equal(r.effect.energyAfter,0);
r=T.resolveTreasureUse({...input,treasures:book,team:team.map((f,i)=>i?f:{...f,hp:0,attack:100000})},'FIRE');assert(r.effect.damage<1000,'dead fighter excluded');
const b=M.generateBoard(M.seededRng(2),8,7,true);b[7].fill('FIRE',0,3);
const normal={...input,board:b,magic:M.emptyMagic(b),path:[0,1,2].map(c=>({r:7,c})),team:team.map(f=>({...f,attack:0})),foes:input.foes.map(f=>({...f,attack:100})),treasureGuard:.5};
const guarded=resolveOrbTurn(normal),plain=resolveOrbTurn({...normal,treasureGuard:1});assert(guarded.counter.hits.length);assert.equal(guarded.nextTreasureGuard,1);assert(guarded.counter.hits[0].actualDamage<=plain.counter.hits[0].actualDamage/2+1);
assert.equal(resolveOrbTurn({...normal,foes:normal.foes.map(f=>({...f,attackEnergy:0}))}).nextTreasureGuard,.5);

// All 25 roles: same-element slots never duplicate, strength grows, swaps preserve saved stock.
for(const element of E.ELEMENTS){
 const same=pool.filter(c=>c.element===element).slice(0,5).map(c=>({...team[0],id:c.id,name:c.name,element}));
 assert.equal(same.length,5);let earned=T.emptyTreasureBook();
 for(let i=0;i<5;i++){
 const path=Array.from({length:i+4},(_,r)=>({r,c:0}));path.forEach(p=>{board[p.r][p.c]=element;magic[p.r][p.c]=7});
 const res=M.resolveDrag(board,path,M.seededRng(1001),magic,50,true,true,7);
 const g=T.grantTreasure({...input,team:same,path,actionId:'five-'+element+i,treasures:earned},res);assert.equal(g.earned.variant,i);earned=g.book;
 assert.equal(Object.values(earned.counts).reduce((a,b)=>a+b,0)+Object.values(earned.variants??{}).reduce((a,b)=>a+b,0),i+1);
 }
 const slots=T.treasureCatalog(earned,same);assert.equal(new Set(slots.map(x=>x.role)).size,5);assert.equal(new Set(slots.map(x=>x.name)).size,5);assert(slots.every(x=>x.element===element&&x.count===1));
 let last=-1;for(let variant=0;variant<5;variant++){const result=T.resolveTreasureUse({...input,team:same,treasures:earned,actionId:'tier'+variant},element,variant);assert(result.effect.damage>last,'tier damage increases on same unshielded target');last=result.effect.damage;assert.equal(result.effect.variant,variant);assert.equal(T.treasureCount(result.book,element,variant),0);assert.equal(result.effect.ownerId,same[variant].id);}
 const mixed=[...same.slice(0,2),...team.filter(x=>x.element!==element).slice(0,3)];const before=JSON.stringify(earned),two=T.treasureCatalog(earned,mixed);assert.deepEqual(two.filter(x=>x.element===element).map(x=>x.variant),[0,1]);assert.equal(JSON.stringify(earned),before);
 assert.throws(()=>T.resolveTreasureUse({...input,team:mixed,treasures:earned},element,2));
 assert.throws(()=>T.resolveTreasureUse({...input,team:same.map((x,i)=>i===1?{...x,hp:0}:x),treasures:earned},element,1));
}
assert.throws(()=>T.validateTreasureBook({...book,variants:{'WATER:5':1}}));
assert.throws(()=>T.validateTreasureBook({...book,variants:{'WATER:1':-1}}));
console.log('PASS: all 25 distinct roles, all five homogeneous teams, ascending tier damage, two matching members, unavailable/dead rejection, legacy stock retained');

for(let seed=1;seed<=100;seed++){
 const b=M.generateBoard(M.seededRng(seed),8,7,true),m=M.emptyMagic(b),path=E.ELEMENTS.map((e,c)=>{b[7][c]=e;m[7][c]=7;return{r:7,c}});m[2][2]=42;
 const r=M.resolveDrag(b,path,M.seededRng(seed+900),m,50,true,true,7);
 const resolved=resolveOrbTurn({...input,board:b,magic:m,path,treasures:book,team:team.map(f=>({...f,hp:50000})),actionId:'five-color-'+seed});assert.equal(resolved.treasure.earned,null);assert.deepEqual(resolved.treasure.book,book);assert.equal(resolved.heals.length,0);assert.equal(resolved.guardScale,1);assert.equal(resolved.nextBoost,1);assert.equal(resolved.damage+resolved.startDamage+resolved.endDamage,0);assert.deepEqual(resolved.beforeCounter.team.map(f=>f.energy),team.map(f=>f.energy));
 assert(r.boardShieldUpgrade);assert.equal(r.steps.flatMap(st=>st.clearedCells??[]).length,5);assert.equal(r.magic.flat().filter(p=>p>=7).length,51);assert.equal(r.magic.flat().filter(p=>p===0).length,5);assert.equal(r.steps.flatMap(st=>st.falls??[]).filter(f=>f.fromRow<0).length,5);assert.equal(r.magic[3][2],42);
 for(let c=0;c<7;c++)for(let row=0;row<8;row++){if(c<5&&row===0)continue;const from=c<5?row-1:row;assert.equal(r.board[row][c],b[from][c]);assert.equal(r.magic[row][c],Math.max(7,m[from][c]));}
 const replay=require('../lib/beast-game/match3/replay.ts').buildOrbReplay(b,m,path,r,true);assert.deepEqual(replay.at(-1).boardAfter,r.board);assert.deepEqual(replay.at(-1).magicAfter,r.magic);
 assert.deepEqual(M.energyGains(r).map(x=>x.gain),[10,10,10,10,10]);
}
console.log('PASS: 100 five-colour upgrades consume only 5, preserve 51 coloured shields including high values, spawn only 5 normal beads, exact replay and charge');
const C=require('../lib/beast-game/match3/hard-campaign.ts'),S=require('../lib/beast-game/match3/hard-campaign-store.ts');
function storage(){let map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}}
global.window={localStorage:storage(),sessionStorage:storage()};let queue=Promise.resolve();Object.defineProperty(global,'navigator',{configurable:true,value:{locks:{request:(key,fn)=>{const p=queue.then(fn);queue=p.catch(()=>{});return p}}}});
(async()=>{
 const {POST}=require('../app/api/beast-game/orb-turn/route.ts');
 const post=p=>POST(new Request('http://localhost/api/beast-game/orb-turn',{method:'POST',body:JSON.stringify(p)}));
 for(const element of E.ELEMENTS){const req={...input,treasures:book,action:'treasure',treasureElement:element,actionId:'api-'+element};const response=await post(req);assert.equal(response.status,200);assert.deepEqual(await response.json(),T.resolveTreasureUse(req,element));}
 for(const element of E.ELEMENTS){const same=pool.filter(c=>c.element===element).slice(0,5).map(c=>({...team[0],id:c.id,element}));const stock={...book,variants:Object.fromEntries([1,2,3,4].map(v=>[element+':'+v,1]))};for(let variant=0;variant<5;variant++){const req={...input,team:same,treasures:stock,action:'treasure',treasureElement:element,treasureVariant:variant,actionId:'api-tier'+variant};const response=await post(req);assert.equal(response.status,200);assert.deepEqual(await response.json(),T.resolveTreasureUse(req,element,variant));}}
 const Backup=require('../lib/beast-game/match3/campaign-backup.ts');const extended={...book,variants:{'WATER:1':2,'FIRE:4':1}};assert.deepEqual(Backup.decodeCampaignBackup(Backup.encodeCampaignBackup({...C.newCampaign(),treasures:extended})).treasures,extended);
 for(const patch of [{treasureVariant:5},{treasureVariant:-1},{treasureVariant:1},{treasureElement:'UNKNOWN'},{treasures:T.emptyTreasureBook()},{treasureGuard:.1},{actionId:''},{mode:'medium'}]){assert.equal((await post({...input,treasures:book,action:'treasure',treasureElement:'FIRE',...patch})).status,400);}

 for(const owner of ['self','guest']){await S.selectCampaignHero(owner,C.campaignGuardianIds()[0]);const p=S.readCampaign(owner).profile;await S.saveCampaignTeam(owner,[p.heroId,...C.campaignAvailableIds(p).filter(id=>id!==p.heroId).slice(0,4)]);await S.transactTreasures(owner,async()=>({book,result:true}));assert.deepEqual(S.readCampaign(owner).profile.treasures,book);assert((await S.settleWin(owner,'victory',0)).saved);assert.deepEqual(S.readCampaign(owner).profile.treasures.counts,owner==='self'?book.counts:T.emptyTreasureBook().counts);}
 const before=JSON.stringify(S.readCampaign('self').profile);const set=window.localStorage.setItem;window.localStorage.setItem=()=>{throw Error('quota')};await assert.rejects(S.transactTreasures('self',async b=>({book:T.resolveTreasureUse({...input,treasures:b},'FIRE').book,result:true})));window.localStorage.setItem=set;assert.equal(JSON.stringify(S.readCampaign('self').profile),before);
 const both=await Promise.allSettled([1,2].map(i=>S.transactTreasures('self',async b=>({book:T.resolveTreasureUse({...input,actionId:'race'+i,treasures:b},'FIRE').book,result:true}))));assert.equal(both.filter(x=>x.status==='fulfilled').length,1);
 console.log('PASS: five grants, path/receipt validation, all five effects, no counter/charge, shield/overkill, guard use, own carry, guest expiry, failed save, concurrent consume');
})().catch(e=>{console.error(e);process.exitCode=1});
