// 2026-11-26 寶石捷連線健康檢查：起手按在珠間空隙／盤面內距不再整筆被吃掉；演出結束前先按住起點、沒離開那一格，解鎖後一動就從那一格連。
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {canExtend}=require('../.beast-game-build/lib/beast-game/match3/drag.js');
const source=ts.transpileModule(fs.readFileSync('components/battlefield/useDragChain.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const P=14,S=10; // 格寬 10、間距 4（盤面比例縮小）
function setup(board0){
  const refs=[];let ri=0,first=true;const effects=[],listeners=new Map(),released=[],m={exports:{}};
  const react={useEffect:f=>{if(first)effects.push(f);},useCallback:f=>f,useRef:v=>{const i=ri++;return refs[i]??=({current:v});},useState:v=>[v,()=>{}],useSyncExternalStore:(s,g)=>g()};
  vm.runInNewContext(source,{module:m,exports:m.exports,require:n=>n==='react'?react:n==='react/jsx-runtime'?{}:{canExtend},window:{addEventListener(){},removeEventListener(){}}});
  let board=board0,hook;
  const cells=()=>board.flatMap((row,r)=>row.map((_,c)=>({dataset:{r:String(r),c:String(c)},offsetWidth:S,offsetHeight:S,getBoundingClientRect:()=>({left:c*P,top:r*P,width:S,height:S})})));
  const host={addEventListener:(n,h)=>listeners.set(n,h),removeEventListener:n=>listeners.delete(n),querySelectorAll:()=>cells(),getBoundingClientRect:()=>({left:0,top:0}),setPointerCapture:()=>{}};
  const render=(enabled,b=board)=>{board=b;ri=0;hook=m.exports.useDragChain(board,enabled,p=>released.push(JSON.parse(JSON.stringify(p))),false,board.map(r=>r.map(()=>0)),false);hook.ref.current=host;if(first){effects.forEach(f=>f());first=false;}};
  const at=([r,c])=>({clientX:c*P+S/2,clientY:r*P+S/2});
  return {released,render,
    downXY:(x,y)=>hook.handlers.onPointerDown({clientX:x,clientY:y,pointerType:'touch',pointerId:1,button:0,preventDefault(){}}),
    down:p=>hook.handlers.onPointerDown({...at(p),pointerType:'touch',pointerId:1,button:0,preventDefault(){}}),
    move:p=>listeners.get('pointermove')({...at(p),pointerId:1}),up:()=>hook.handlers.onPointerUp()};
}
const row=[Array(5).fill('FIRE')];
// 1) 起手在兩格之間的 4px 空隙（x=12：第 0 格右緣 10、第 1 格左緣 14）→ 吸附最近格，整筆照算
let h=setup(row);h.render(true);h.downXY(12,5);h.move([0,2]);h.move([0,3]);h.up();
assert.deepEqual(h.released,[[{r:0,c:1},{r:0,c:2},{r:0,c:3}]],'gap start is not dropped; starts from the same-colour neighbour of the first orb entered');
// 2) 起手在盤面內距（左邊 -5px）→ 吸附第 0 格
h=setup(row);h.render(true);h.downXY(-5,5);h.move([0,1]);h.move([0,2]);h.up();assert.deepEqual(h.released[0],[{r:0,c:0},{r:0,c:1},{r:0,c:2}],'padding start snaps to edge cell');
// 3) 離盤面超過 8px 不吸附
h=setup(row);h.render(true);h.downXY(-20,5);h.move([0,1]);h.move([0,2]);h.up();assert.equal(h.released.length,0,'far outside stays ignored');
// 3b) 空隙只按不動 → 什麼都不送（不會誤送一顆被反擊）
h=setup(row);h.render(true);h.downXY(12,5);h.up();assert.equal(h.released.length,0,'gap tap sends nothing');
// 3c) 空隙兩側不同色：手指先進到右邊那顆 → 從那顆起手，不會猜成左邊異色
h=setup([['WATER','FIRE','FIRE','FIRE','FIRE']]);h.render(true);h.downXY(12,5);h.move([0,1]);h.move([0,2]);h.move([0,3]);h.up();assert.deepEqual(h.released,[[{r:0,c:1},{r:0,c:2},{r:0,c:3}]],'enters right orb first');
// 3d) 空隙起手、往遠離異色鄰格方向走：只接同色候選
h=setup([['FIRE','WATER','FIRE','FIRE','FIRE']]);h.render(true);h.downXY(26,5);h.move([0,3]);h.move([0,4]);h.up();assert.deepEqual(h.released,[[{r:0,c:2},{r:0,c:3},{r:0,c:4}]],'same-colour candidate only');
// 4) 途中仍用碰撞圓：空隙不會被當成格子
h=setup(row);h.render(true);h.down([0,0]);h.up();assert.deepEqual(h.released[0],[{r:0,c:0}]);
// 9) 一般情況不變：解鎖狀態正常拖
h=setup(row);h.render(true);h.down([0,1]);h.move([0,2]);h.move([0,3]);h.up();assert.deepEqual(h.released[0],[{r:0,c:1},{r:0,c:2},{r:0,c:3}]);
console.log('PASS drag start tolerance: gap/padding start ≤8px decided on first orb entered (no guess, tap sends nothing), far ignored, normal drag unchanged');
