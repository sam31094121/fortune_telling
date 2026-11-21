// 寶石捷連線「存活鎖」：不管玩家用哪一種武器／出手方式，只要我方還有任何一張卡的 HP 大於零，
// 後端就絕不能判玩家輸；要判輸，必須全員 HP 剛好為 0。每一種武器各有一組門檻案例。
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require('./helpers/server-only-runtime.cjs');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
const Module=require('node:module'),path=require('node:path'),resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('@/')?path.resolve(__dirname,'..',id.slice(2)):id,...args)};
const M=require('../lib/beast-game/match3/index.ts'),T=require('../lib/beast-game/match3/treasures.ts'),E=require('../lib/beast-game/elements.ts');
const {resolveOrbTurn}=require('../lib/beast-game/match3/resolve-turn.ts');
const {resolveCardAttackTurn}=require('../lib/beast-game/match3/card-attack.ts');
const {orbOutcome}=require('../lib/beast-game/match3/battle-outcome.ts');
const pool=require('../lib/beast-game/registry.ts').playableCards();

const BIG=100000;
const fullTeam=E.ELEMENTS.map(element=>{const c=pool.find(c=>c.element===element&&c.form==='ADULT');return {id:c.id,name:c.name,thumbnail:'',element,hp:BIG,maxHp:BIG,attack:100,energy:100,cd:1}});
const board=M.generateBoard(M.seededRng(1),8,7,true),magic=M.emptyMagic(board);
const base={board,magic,path:[],team:fullTeam,foes:fullTeam.map(x=>({...x,attackEnergy:0})),mode:'hard45',wins:0,target:0,seed:1001,move:0,chosen:{},rule:'all-attack',attackBoost:1};

// 先用真實連線取得五種寶器，後面每種寶器各自用一次。
let book=T.emptyTreasureBook();
for(let i=0;i<5;i++){
  const p=board.map(r=>r.slice()),m=magic.map(r=>r.slice());
  const path=Array.from({length:4},(_,r)=>({r,c:0}));path.forEach(q=>{p[q.r][q.c]=E.ELEMENTS[i];m[q.r][q.c]=7});
  const r=resolveOrbTurn({...base,board:p,magic:m,path,actionId:'grant'+i,treasures:book});
  assert(r.res.valid);book=r.treasure.book;
}
assert.deepEqual(Object.values(book.counts),[1,1,1,1,1],'五種寶器都已取得');

// 存活鎖的共同檢查：判輸 ⇔ 我方全員 HP 剛好為 0；只要有任何一張卡 HP>0，絕不能是 lose。
let checked=0,legitLoses=0;
function lock(label,outcome,teamAfter,foesAfter){
  const alive=teamAfter.some(u=>u.hp>0);
  if(alive)assert.notEqual(outcome,'lose',`${label}：我方仍有存活卡（HP>0），不得判輸`);
  if(outcome==='lose'){assert(teamAfter.every(u=>u.hp===0),`${label}：判輸必須全員 HP===0`);legitLoses++;}
  assert.equal(outcome,orbOutcome(teamAfter,foesAfter),`${label}：結果必須等於後端唯一判定函式`);
  checked++;
}
// 只讓指定位置活著（HP=1），其餘歸零；敵方生命極大，不可能被這一擊打光。
const only=(alive,hp=1)=>fullTeam.map((u,i)=>({...u,hp:alive.includes(i)?hp:0}));
const hugeFoes=fullTeam.map(x=>({...x,hp:BIG*1000,maxHp:BIG*1000,attackEnergy:0}));

// 武器 1～5：五種元素寶器（風空水火地各一），只剩該元素的神獸 1 HP 時使用。
for(let i=0;i<5;i++){
  const element=E.ELEMENTS[i],team=only([i]);
  const r=T.resolveTreasureUse({...base,team,foes:hugeFoes,treasures:book,actionId:'use-'+element},element);
  assert.equal(r.outcome,null,`寶器${element}：我方還活著、敵方也活著，戰鬥必須繼續`);
  lock('寶器'+element,r.outcome,r.team,r.foes);
}
// 武器 6：能量技（單卡滿能量出手），每個位置各一次。
for(let i=0;i<5;i++){
  const team=only([i]).map(u=>({...u,energy:100}));
  const r=resolveCardAttackTurn({...base,team,foes:hugeFoes,action:'energy',attackerId:team[i].id,actionId:'e'+i,eventId:'e'+i});
  assert.equal(r.outcome,null,`能量技位置${i}：必須繼續`);
  lock('能量技'+i,r.outcome,r.team,r.foes);
}
// 武器 7：連線攻擊（兩張以上卡合擊）；兩張各 1 HP。
for(let i=0;i<5;i++){
  const j=(i+1)%5,team=only([i,j]).map(u=>({...u,energy:100}));
  const r=resolveCardAttackTurn({...base,team,foes:hugeFoes,action:'link',linkIds:[team[i].id,team[j].id],actionId:'l'+i,eventId:'l'+i});
  assert.equal(r.outcome,null,`連線攻擊${i}：必須繼續`);
  lock('連線攻擊'+i,r.outcome,r.team,r.foes);
}
// 武器 8：拖曳寶珠連線，敵方蓄滿且攻擊力極大（反擊必定打到人）。
const lethalFoes=fullTeam.map(x=>({...x,hp:BIG*1000,maxHp:BIG*1000,attack:BIG*10,attackEnergy:100}));
for(let i=0;i<5;i++){
  const p=board.map(r=>r.slice()),m=magic.map(r=>r.slice());
  const path=[0,1,2].map(c=>({r:0,c}));path.forEach(q=>{p[q.r][q.c]=E.ELEMENTS[i]});
  // (a) 還有另一張高血量的卡：被反擊也不可能全滅 → 不得判輸。
  const withBuddy=fullTeam.map((u,k)=>({...u,hp:k===i?1:k===(i+1)%5?BIG:0}));
  const a=resolveOrbTurn({...base,board:p,magic:m,path,team:withBuddy,foes:lethalFoes,actionId:'d'+i,eventId:'d'+i});
  lock('連線(有夥伴)'+i,a.outcome,a.counter.team,a.counter.foes);
  // (b) 只剩一張 1 HP：反擊若真的把最後一張打到 0，才可以判輸（合法判輸），否則必須繼續。
  const lone=resolveOrbTurn({...base,board:p,magic:m,path,team:only([i]),foes:lethalFoes,actionId:'x'+i,eventId:'x'+i});
  lock('連線(單卡)'+i,lone.outcome,lone.counter.team,lone.counter.foes);
}
// 判輸函式本身的邊界：任何正 HP（含小於 1）都不得判輸。
for(const hp of [Number.MIN_VALUE,0.01,0.5,1,BIG])for(let size=1;size<=5;size++)for(let slot=0;slot<size;slot++){
  const t=Array.from({length:size},(_,k)=>({hp:k===slot?hp:0}));
  assert.notEqual(orbOutcome(t,[{hp:1}]),'lose');
  assert.notEqual(orbOutcome([{hp:1}],t),'win');
}
// 兩邊對稱：敵方只要還有一隻活著，也不能判玩家贏。
assert.equal(orbOutcome([{hp:1}],[{hp:1},{hp:0}]),null);
assert(checked>=5+5+5+10,'每種武器都必須實際被檢查：'+checked);
console.log(`PASS weapon life lock: ${checked} outcomes across 5 treasures, energy skill, link attack, drag turns; ${legitLoses} legitimate all-zero defeats; living HP never loses`);
