// Source-level pure regression; no shared build output or browser is required.
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const old = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);

const {runRefillPlayback}=require('../lib/beast-game/match3/refill-runner.ts');
const {refillPresentation,refillDisplaySteps,REFILL_TIMING}=require('../lib/beast-game/match3/refill-presentation.ts');
function clock(){let now=0,visible=true,id=0;const frames=new Map(),listeners=new Set();return {frame:cb=>{frames.set(++id,cb);return id},cancel:i=>frames.delete(i),visible:()=>visible,onVisibility:cb=>{listeners.add(cb);return()=>listeners.delete(cb)},step:ms=>{now+=ms;const calls=[...frames.values()];frames.clear();calls.forEach(cb=>cb(now))},hide:v=>{visible=!v;listeners.forEach(cb=>cb())},now:()=>now,pending:()=>frames.size,listeners:()=>listeners.size};}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
const pump=async(c,n=1,ms=20)=>{for(let i=0;i<n;i++){await flush();c.step(ms);await flush()}};
(async()=>{
 const marked=clock(),marks=[],markStop=new AbortController();let markDone=false;
 const marking=runRefillPlayback([{clearAt:0,fallAt:100,endAt:300,matchMs:600},{clearAt:300,fallAt:400,endAt:600,matchMs:600}],{clock:marked,signal:markStop.signal,commit:async(phase,i)=>{marks.push({phase,i,t:marked.now()})},complete:()=>markDone=true});
 for(let i=0;i<15;i++)await pump(marked);
 assert.deepEqual(marks.map(m=>m.phase),['match'],'whole group is held before removal');
 marked.hide(true);await pump(marked,10,1000);assert.equal(marks.length,1);marked.hide(false);
 for(let i=0;i<150&&!markDone;i++)await pump(marked);await marking;
 assert.deepEqual(marks.map(m=>m.phase),['match','clear','fall','match','clear','fall']);
 assert(marks[4].t-marks[3].t>=600,'each next group has its own readable hold');
 assert(marks[3].t-marks[2].t>=200,'next match cannot appear before all falls land');
 assert.equal(marked.pending(),0);assert.equal(marked.listeners(),0);

 const c=clock(),signal=new AbortController(),seen=[],sounds=[],paused=[];let ack,completed=0;
 const run=runRefillPlayback([{clearAt:0,fallAt:100,endAt:300},{clearAt:300,fallAt:400,endAt:600}],{clock:c,signal:signal.signal,commit:(phase,i)=>{seen.push(phase+i);if(phase==='clear'&&i===0)return new Promise(r=>ack=r);return Promise.resolve()},cues:()=>[{at:20,kind:'drop'},{at:180,kind:'merge'}],cue:k=>sounds.push(k),pause:p=>paused.push(p),complete:()=>completed++});
 await pump(c,10);assert.deepEqual(seen,['clear0']);assert.equal(completed,0,'uncommitted DOM cannot advance');ack();await pump(c,7);assert(seen.includes('fall0'));c.hide(true);const before=[...seen];await pump(c,10,1000);assert.deepEqual(seen,before);assert.equal(completed,0);c.hide(false);await pump(c,1,1000);assert(!seen.includes('clear1'),'background elapsed cannot skip fall');await pump(c,50);await run;assert.equal(completed,1);assert.deepEqual(seen,['clear0','fall0','clear1','fall1']);assert(paused.includes(true));assert.equal(c.listeners(),0);assert.equal(c.pending(),0);
 const stalled=clock(),stallAbort=new AbortController();let phase='',settled=false;const lateSounds=[],visibleProgress=[];const stallRun=runRefillPlayback([{clearAt:0,fallAt:100,endAt:300}],{clock:stalled,signal:stallAbort.signal,commit:async p=>{phase=p},advance:t=>{if(phase==='fall')visibleProgress.push(t)},cues:()=>[{at:100,kind:'drop'},{at:180,kind:'merge'}],cue:k=>lateSounds.push(k),complete:()=>settled=true});for(let i=0;i<30&&phase!=='fall';i++)await pump(stalled);assert.equal(phase,'fall');await pump(stalled);await pump(stalled,1,650);assert(settled,'visible wall time must settle the elapsed phase without slow-motion replay');assert.deepEqual(lateSounds,[],'stall does not replay missed cues');await pump(stalled,20);await stallRun;assert(settled);assert.deepEqual(lateSounds,[],'missed landing cues are discarded rather than replayed');assert.equal(visibleProgress.at(-1),200,'long-frame progress stops at phase end');

 // Fixed-duration motion must consume the same visible time at different RAF rates.
 for(const fps of [60,30,15]){const rate=clock();let phase='',start=null,end=null;const run=runRefillPlayback([{clearAt:0,fallAt:100,endAt:1100}],{clock:rate,signal:new AbortController().signal,commit:async p=>{phase=p},advance:t=>{if(phase==='fall'&&start===null)start=rate.now()},complete:()=>end=rate.now()});for(let n=0;n<300&&end===null;n++)await pump(rate,1,1000/fps);await run;assert(end-start>=1000-1e-7&&end-start<=1000+1000/fps+1e-7, 'fps '+fps+' must preserve duration within one rendered frame');assert.equal(rate.pending(),0);assert.equal(rate.listeners(),0);}
 // Repeated completion/cancellation must not accumulate RAF or visibility subscribers.
 const repeated=clock();for(let n=0;n<200;n++){const stop=new AbortController();let done=false;const run=runRefillPlayback([{clearAt:0,fallAt:10,endAt:30}],{clock:repeated,signal:stop.signal,commit:async()=>{},complete:()=>done=true}).catch(e=>e.name);await pump(repeated,4);if(n%2)stop.abort();for(let i=0;i<10&&!done&&!stop.signal.aborted;i++)await pump(repeated);await run;assert.equal(repeated.pending(),0);assert.equal(repeated.listeners(),0);}
 const blocked=clock(),abort=new AbortController();let finished=false,commits=0;const waiting=runRefillPlayback([{clearAt:0,fallAt:10,endAt:20}],{clock:blocked,signal:abort.signal,commit:()=>{commits++;return new Promise(()=>{})},complete:()=>finished=true}).catch(e=>e.name);await pump(blocked,4);assert.equal(commits,1);abort.abort();assert.equal(await waiting,'AbortError');assert(!finished);assert.equal(blocked.listeners(),0);assert.equal(blocked.pending(),0);
 const hidden=clock();hidden.hide(true);const stop=new AbortController();let intro=false;const hiddenRun=runRefillPlayback([],{clock:hidden,signal:stop.signal,intro:async()=>{intro=true},commit:async()=>{},complete:()=>{throw Error('cancelled completion')}}).catch(e=>e.name);await pump(hidden,4);assert(!intro);stop.abort();assert.equal(await hiddenRun,'AbortError');assert.equal(hidden.listeners(),0);
 const motion=refillPresentation([{falls:[{r:7,c:0,fromRow:-1},{r:4,c:1,fromRow:1},{r:6,c:2,fromRow:2},{r:1,c:3,fromRow:-1}]}]).frames[0].motions;const old=motion.filter(m=>m.fromRow>=0),fresh=motion.filter(m=>m.fromRow<0);assert(Math.min(...fresh.map(m=>m.delayMs))>=Math.max(...old.map(m=>m.delayMs+m.durationMs))-1e-7,'survivors settle before new beads enter');assert(fresh[1].delayMs>fresh[0].delayMs);assert.equal(refillPresentation(Array.from({length:50},()=>({falls:motion}))).durationMs,refillPresentation([{falls:motion}]).durationMs*50);
 const common=refillPresentation(Array.from({length:4},()=>({falls:Array.from({length:40},(_,i)=>({r:Math.floor(i/7),c:i%7,fromRow:-1}))})));assert.equal(common.durationMs,common.frames[0].endAt*4);// 2026-11-11 業主要求更快：起點由「整盤串聯每顆差 20ms」改為「同欄由下往上依序、欄與欄只差一個單位」。
  // 規則不變：每顆起點唯一、同欄內由下往上依序補入；每一段連鎖都保持同樣的節奏（不因連鎖數壓縮）。
  for(const f of common.frames){
    assert.equal(new Set(f.motions.map(m=>m.delayMs)).size,f.motions.length,'every orb keeps its own start in every cascade');
    const byColumn=new Map();for(const m of f.motions){if(!byColumn.has(m.c))byColumn.set(m.c,[]);byColumn.get(m.c).push(m);}
    for(const list of byColumn.values()){list.sort((a,b)=>b.r-a.r);for(let i=1;i<list.length;i++)assert.equal(list[i].delayMs-list[i-1].delayMs,7*REFILL_TIMING.rippleUnitMs,'inside a column orbs enter bottom-up, one ripple step apart');}
  }
  assert.deepEqual(common.frames[0].motions,common.frames[3].motions,'all cascades preserve the same cadence');
 const M=require('../lib/beast-game/match3/index.ts'),board=M.generateDragBoard(M.seededRng(1),8,7,true,8),route=[{r:2,c:0},{r:3,c:1},{r:3,c:2}];const result=M.resolveDrag(board,route,M.seededRng(1001),M.emptyMagic(board),50,true,true,8),snapshot=JSON.stringify(result);assert(result.reshuffled);const display=refillDisplaySteps(result),terminal=display.at(-1);assert.equal(display.length,result.steps.length+7);assert.deepEqual(terminal.boardAfter,result.board);assert.deepEqual(terminal.magicAfter,result.magic);assert.equal(terminal.clearedCells.length,8);assert.equal(terminal.falls.length,8);assert(terminal.falls.every(f=>f.fromRow<0));assert.equal(terminal.groups.length,0);assert.equal(terminal.rewards.length,0);assert.equal(JSON.stringify(result),snapshot,'presentation never mutates core result');const shuffleMotion=refillPresentation(display).frames.at(-1);assert.equal(new Set(shuffleMotion.motions.map(m=>m.delayMs)).size,8);assert.equal(refillPresentation(display).durationMs,display.reduce((sum,step)=>sum+refillPresentation([step]).durationMs,0));assert(refillPresentation(display,true).frames.at(-1).motions.every(m=>m.durationMs===0&&m.delayMs===0));
 console.log('PASS committed sequential phases, hidden pause, FPS-independent duration, dropped late cues, 200-cycle cleanup, abort pending commit cleanup, survivor-before-spawn, bounded planner');
})().catch(e=>{console.error(e);process.exitCode=1});
