// Source-level pure regression; no shared build output or browser is required.
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const old = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
let D, E, B, elements;
try {
  D = require('../lib/beast-game/match3/drag.ts');
  E = require('../lib/beast-game/match3/enemies.ts');
  B = require('../lib/beast-game/match3/board.ts');
  elements = require('../lib/beast-game/elements.ts');
} finally { if (old) require.extensions['.ts'] = old; else delete require.extensions['.ts']; }
let count = 0;
const test = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
const path = [{r:0,c:0},{r:0,c:1},{r:0,c:2}];
function fixture(seed = 1) {
  const board = B.generateBoard(B.seededRng(seed), 7, 7, true);
  board[0].splice(0, 3, 'AIR', 'FIRE', 'WATER');
  const magic = D.emptyMagic(board); magic[0].splice(0, 3, 7, 8, 9);
  return { board, magic };
}
test('fusion helper requires three physical finite shields', () => {
  const {magic}=fixture();
  assert(D.isShieldFusionPath(path,magic));
  assert(!D.isShieldFusionPath(path.slice(0,2),magic));
  for(const v of [0,6,NaN,Infinity]) { magic[0][0]=v; assert(!D.isShieldFusionPath(path,magic)); }
});
test('move search distinguishes defense from attack and continues through same-color shields', () => {
  const same=[['AIR','AIR','AIR']], shields=[[7,7,7]];
  assert(D.hasDragMove(same,false,3,shields));
  assert(D.hasDragMove(same,false,4,shields));
  assert(!D.hasDragMove(same,false,22,shields));
  assert(D.hasDragMove([['AIR','FIRE','WATER']],false,3,shields));
  assert(!D.hasDragMove([['AIR','FIRE','WATER']],false,4,shields));
  assert(D.hasDragMove([['AIR','AIR','AIR','AIR']],false,22,[[7,7,7,0]]));
  assert(!D.hasDragMove([['AIR','AIR','AIR','AIR']],false,23,[[7,7,7,0]]));
  assert(!D.hasDragMove([['AIR','FIRE','AIR','AIR']],false,4,[[7,7,7,0]]));
  const large=Array.from({length:7},()=>Array(7).fill('AIR'));
  const all=large.map(r=>r.map(()=>7));
  const start=performance.now();
  assert(D.hasDragMove(large,true,4,all));
  assert(!D.hasDragMove(large,true,344,all));
  assert(performance.now()-start<2000,'shield-only search must prune, not enumerate every path');
  assert(D.hasDragMove(large,true,3,all));
});
test('reshuffle fallback preserves cross-color shield-only defensive move', () => {
  const b=[['AIR','FIRE','WATER'],['FIRE','WATER','AIR'],['WATER','AIR','FIRE']];
  const m=b.map(r=>r.map(()=>7));
  const out=D.reshuffleKeepMagic(b,m,B.seededRng(27),false,25);
  assert.deepEqual(out.board,b); assert.deepEqual(out.magic,m);
  assert(D.hasDragMove(out.board,false,3,out.magic));
  assert(!D.hasDragMove(out.board,false,25,out.magic));
});
test('cross-color extension requires every cell to be a shield and hard shield mode', () => {
  const {board,magic} = fixture();
  assert(D.isValidPath(board,path,true,magic,true));
  assert(!D.isValidPath(board,path,true,magic));
  assert(!D.isValidPath(board,path,true));
  for (const value of [0, 6, NaN, Infinity]) {
    const m = magic.map(r=>r.slice()); m[0][1] = value;
    assert(!D.isValidPath(board,path,true,m,true));
  }
  // Once colors differ, a normal orb matching the first color is still forbidden.
  board[0][2] = 'AIR'; magic[0][2] = 0;
  assert(!D.canExtend(board,path.slice(0,2),path[2],true,magic,true));
});
test('physical minimum, adjacency, no revisits and no crossing remain enforced', () => {
  const {board,magic} = fixture();
  magic.forEach(r=>r.fill(7));
  for (const p of [path.slice(0,1), path.slice(0,2)]) {
    const out = D.resolveDrag(board,p,B.seededRng(1),magic,5,true,true);
    assert.equal(out.valid,false); assert.equal(out.shieldFusion,false);
  }
  assert(!D.isValidPath(board,[path[0],path[2]],true,magic,true));
  assert(!D.isValidPath(board,[path[0],path[1],path[0]],true,magic,true));
  const crossing=[{r:0,c:0},{r:1,c:1},{r:0,c:1},{r:1,c:0}];
  assert(!D.isValidPath(board,crossing,true,magic,true));
  assert(!D.isValidPath(board,[{r:0,c:0},{r:1,c:1},{r:2,c:2}],false,magic,true));
});
test('fusion clears all participating colors, preserves other shields and all cascades have zero attack', () => {
  let cascaded = false;
  for (let seed=1; seed<=24; seed++) {
    const {board,magic} = fixture(seed);
    board[6][6] = 'EARTH'; magic[6][6] = 11; // A different-color shield survives.
    const before=JSON.stringify({board,magic});
    const out=D.resolveDrag(board,path,B.seededRng(seed+100),magic,50,true,true,50);
    assert(out.valid && out.shieldFusion);
    assert.equal(out.attackAllowed,false); assert.equal(out.element,null);
    assert.equal(out.effectiveLength,24); assert.equal(out.chainLength,3);
    assert.equal(out.magicSpawn,null); assert.equal(out.skill5,false);
    assert.deepEqual(out.magicTriggered,[]);
    assert.deepEqual(out.steps[0].groups.map(g=>[g.element,g.size]),['AIR','FIRE','WATER'].map(e=>[e,board.flat().filter(v=>v===e).length]));
    const total=board.flat().filter(e=>['AIR','FIRE','WATER'].includes(e)).length;
    assert.equal(out.steps[0].clearedCells.length,total);
    assert.equal(out.steps[0].emptyCells.length,total);
    const empty=new Set(out.steps[0].emptyCells.map(p=>p.r*1000+p.c));
    out.steps[0].boardAfter.forEach((row,r)=>row.forEach((e,c)=>{if(!empty.has(r*1000+c))assert(['EARTH','SPACE'].includes(e))}));
    for (const step of out.steps) {
      assert.equal(step.attackAllowed,false);
      assert(step.groups.every(g=>g.power===0 && !g.skill5));
    }
    assert.equal(out.magic[6][6],11);assert.equal(out.board[6][6],'EARTH');
    assert.equal(JSON.stringify({board,magic}),before);
    cascaded ||= out.steps.some(s=>s.chain>1&&s.groups.length);
  }
  assert(cascaded,'must exercise a real follow-up cascade');
});
test('same-color three shields convert; one/two shields with ordinary same-color keep color clear', () => {
  for (let shields=1; shields<=3; shields++) {
    const {board,magic}=fixture(); board[0].splice(0,3,'AIR','AIR','AIR');
    magic[0].splice(0,3,...[0,1,2].map(i=>i<shields?7:0));
    const out=D.resolveDrag(board,path,B.seededRng(2),magic,1,true,true);
    assert.equal(out.shieldFusion,false);
    assert.equal(!!out.shieldConversion,shields===3);
    if(shields<3) {
      assert(out.attackAllowed);
      assert.equal(out.steps[0].groups[0].size,board.flat().filter(e=>e==='AIR').length);
      assert.equal(out.effectiveLength,shields*7+3-shields);
    }
  }
});
test('simple mode stays ordinary same-color damage, no fusion', () => {
  const {board,magic}=fixture(); board[0].splice(0,3,'AIR','AIR','AIR');
  const out=D.resolveDrag(board,path,B.seededRng(2),magic,1,false,false);
  assert(out.valid && out.attackAllowed); assert.equal(out.shieldFusion,false);
  assert.equal(out.steps[0].groups[0].size,3);
  assert.equal(out.steps[0].groups[0].power,24);
});
test('guard halves each of four joint counter hits after element multiplier, without persistence', () => {
  const team=[{id:'ally',element:'FIRE',hp:1000,energy:40}];
  const foes=['AIR','WATER','FIRE','EARTH'].map((element,i)=>({id:'foe'+i,element,hp:100,maxHp:100,attack:11,cd:1}));
  const before=JSON.stringify({team,foes});
  const guarded=E.counterPhase(team,foes,2,undefined,true);
  const raw=E.counterPhase(team,foes,2);
  assert.equal(guarded.hits.length,4);
  guarded.hits.forEach((h,i)=>assert.equal(h.damage,Math.round(11*elements.elementMultiplier(foes[i].element,'FIRE')*0.5)));
  assert.equal(guarded.team[0].hp,1000-guarded.hits.reduce((n,h)=>n+h.damage,0));
  assert.deepEqual(E.counterPhase(team,foes,2),raw);
  const single=E.counterPhase(team,foes,2,1,true);
  assert.equal(single.hits.length,1); assert.equal(single.hits[0].enemy,1);
  assert.equal(single.hits[0].damage,guarded.hits[1].damage);
  assert.equal(JSON.stringify({team,foes}),before);
});


test('five elements convert only unconsumed same-color beads, conserve high power and use path attack only', () => {
  for(const element of ['AIR','FIRE','WATER','SPACE','EARTH']) for(const length of [3,4,5]) {
    const board=B.generateBoard(B.seededRng(73),8,7,true),magic=D.emptyMagic(board);
    const route=Array.from({length},(_,c)=>({r:0,c}));board[0].splice(0,length,...route.map(()=>element));magic[0].splice(0,length,...route.map((_,i)=>7+i));
    board[6][5]=element;magic[6][5]=4;board[7][6]=element;magic[7][6]=13;
    const before=JSON.stringify({board,magic});const out=D.resolveDrag(board,route,B.seededRng(41),magic,1,true,true,8),first=out.steps[0];
    assert(out.valid&&out.attackAllowed&&!out.shieldFusion);assert.equal(out.element,element);assert.equal(out.shieldConversion.element,element);
    assert(D.isShieldConversionPath(board,route,magic));assert.equal(D.dragIntent(route,magic,8,true,board),'attack');
    assert.equal(first.groups[0].size,length);assert.deepEqual(first.clearedCells,route);assert.equal(first.groups[0].power,route.reduce((n,p)=>n+magic[p.r][p.c],0));
    assert.equal(out.magicTriggered.length,length,'conversion targets do not deal damage or trigger stored powers');assert.equal(out.magicSpawn,null);assert.equal(out.skill5,false);
    let newCount=0;board.forEach((row,r)=>row.forEach((e,c)=>{if(route.some(p=>p.r===r&&p.c===c))return;const dest=first.falls.find(f=>f.fromRow===r&&f.c===c)||{r,c};assert.equal(first.boardAfter[dest.r][dest.c],e);assert.equal(first.magicAfter[dest.r][dest.c],e===element?Math.max(7,magic[r][c]):magic[r][c]);if(e===element&&magic[r][c]<7)newCount++}));
    assert.equal(first.rewards.length,newCount);assert(first.rewards.every(r=>r.element===element&&r.power===7));assert.deepEqual(out.shieldConversion.cells,first.rewards.map(({r,c})=>({r,c})));
    assert.equal(JSON.stringify({board,magic}),before,'input immutable');
    const complete=D.resolveDrag(board,route,B.seededRng(41),magic,50,true,true,8);let retained=complete.steps[0].rewards.map(r=>({...r}));
    for(const step of complete.steps.slice(1)){for(const reward of retained){assert(!step.clearedCells.some(p=>p.r===reward.r&&p.c===reward.c),'converted shield cannot auto-clear');const fall=step.falls.find(f=>f.fromRow===reward.r&&f.c===reward.c);if(fall)reward.r=fall.r;assert.equal(step.magicAfter[reward.r][reward.c],7)}}
  }
});
test('mixed shields remain defense and legacy previews without board stay compatible',()=>{
  const {board,magic}=fixture();assert(!D.isShieldConversionPath(board,path,magic));assert.equal(D.dragIntent(path,magic,8,true,board),'defend');assert.equal(D.dragIntent(path,magic,8,true),'defend');
  const out=D.resolveDrag(board,path,B.seededRng(5),magic,5,true,true,8);assert(out.shieldFusion&&!out.attackAllowed);assert.equal(out.shieldConversion,undefined);
});

console.log(`shield-fusion: ${count} groups passed`);
