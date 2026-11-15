const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {canExtend}=require('../.beast-game-build/lib/beast-game/match3/drag.js');
const source=ts.transpileModule(fs.readFileSync('components/battlefield/useDragChain.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function setup(board){let updates=0;const effects=[],listeners=new Map();const released=[],cjsModule={exports:{}};
const host={addEventListener:(name,handler)=>listeners.set(name,handler),removeEventListener:name=>listeners.delete(name),querySelectorAll:()=>cells.flat(),contains:()=>true,getBoundingClientRect:()=>({left:0,top:0}),setPointerCapture:()=>{}};
const cells=board.map((row,r)=>row.map((_,c)=>({dataset:{r:String(r),c:String(c)},getBoundingClientRect:()=>({left:c*10,top:r*10,width:10,height:10}),closest(){return this;}})));
vm.runInNewContext(source,{module:cjsModule,exports:cjsModule.exports,require:n=>n==='react'?{useEffect:f=>effects.push(f),useCallback:f=>f,useRef:v=>({current:v}),useState:v=>[v,()=>updates++]}:n==='react/jsx-runtime'?{}:{canExtend},window:{addEventListener(){},removeEventListener(){}},document:{elementFromPoint:(x,y)=>cells[Math.floor(y/10)]?.[Math.floor(x/10)]??null}});
const hook=cjsModule.exports.useDragChain(board,true,p=>released.push(p),true,board.map(r=>r.map(()=>0)),true);hook.ref.current=host;const cleanups=effects.map(f=>f());assert.equal(hook.handlers.onPointerMove,undefined,'native input is not replayed by a second React listener');
const point=([r,c])=>({clientX:c*10+5,clientY:r*10+5});
return {released,updates:()=>updates,down:p=>hook.handlers.onPointerDown({...point(p),pointerType:'touch',pointerId:1,preventDefault(){}}),move:(points,coalesced=true)=>listeners.get('pointermove')({...point(points.at(-1)),...(coalesced?{getCoalescedEvents:()=>points.map(point)}:{})}),dispose:()=>{cleanups.forEach(f=>f?.());assert.equal(listeners.size,0);},up:hook.handlers.onPointerUp,cancel:hook.handlers.onPointerCancel};}
let h=setup([Array(5).fill('FIRE')]);h.down([0,0]);const before=h.updates();h.move([[0,1],[0,2],[0,3],[0,4]]);assert.equal(h.updates()-before,2,'one React publication per native batch');h.up();h.up();assert.deepEqual(JSON.parse(JSON.stringify(h.released)),[[{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:0,c:3},{r:0,c:4}]]);
h=setup([Array(5).fill('FIRE')]);h.down([0,0]);h.move([[0,4]]);h.up();assert.equal(h.released[0].length,1,'missing intermediate samples never invent a path');
h=setup([['FIRE','WATER','FIRE']]);h.down([0,0]);h.move([[0,1],[0,2]]);h.up();assert.equal(h.released[0].length,1,'wrong colour and jumping still rejected');
h=setup([Array(3).fill('FIRE')]);h.down([0,0]);h.move([[0,1],[0,2],[0,1]]);h.up();assert.deepEqual(JSON.parse(JSON.stringify(h.released[0])),[{r:0,c:0},{r:0,c:1}]);
h=setup([Array(2).fill('FIRE'),Array(2).fill('FIRE')]);h.down([0,0]);h.move([[1,1],[0,1],[1,0]]);h.up();assert.equal(h.released[0].length,3,'crossed diagonal rejected');
h=setup([Array(2).fill('FIRE')]);h.down([0,0]);h.move([[0,1]],false);h.up();assert.equal(h.released[0].length,2,'browsers without coalesced API remain supported');h.down([0,0]);h.cancel();h.up();assert.equal(h.released.length,1,'cancel never submits');
h.dispose();
console.log('PASS real drag hook: coalesced points, one render publication, no invented jumps, colour, backtrack, crossing, fallback and cancellation');
