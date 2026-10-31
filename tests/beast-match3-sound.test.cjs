const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('components/battlefield/match3Sound.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
class Param {
  value=0; events=[];
  setValueAtTime(...args){this.events.push(['set',...args]);}
  linearRampToValueAtTime(...args){this.events.push(['linear',...args]);}
  exponentialRampToValueAtTime(...args){this.events.push(['exp',...args]);}
  cancelAndHoldAtTime(...args){this.events.push(['hold',...args]);}
  cancelScheduledValues(...args){this.events.push(['cancel',...args]);}
}
class Gain { gain=new Param(); disconnected=false; connect(destination){this.destination=destination;} disconnect(){this.disconnected=true;} }
class Filter { frequency=new Param(); Q=new Param(); disconnected=false; connect(destination){this.destination=destination;} disconnect(){this.disconnected=true;} }
class Oscillator {
  frequency=new Param(); stops=[]; disconnected=false; onended=null;
  connect(destination){this.destination=destination;} start(at){this.startAt=at;} stop(at){this.stops.push(at);} disconnect(){this.disconnected=true;}
}
let created=[], resumeRuns=true;
class FakeAudio {
  currentTime=10; state='suspended'; destination={}; oscillators=[]; gains=[]; filters=[]; resumes=0; closes=0;
  constructor(){created.push(this);}
  createGain(){const g=new Gain();this.gains.push(g);return g;}
  createOscillator(){const o=new Oscillator();this.oscillators.push(o);return o;}
  createBiquadFilter(){const filter=new Filter();this.filters.push(filter);return filter;}
  resume(){this.resumes++;if(resumeRuns)this.state='running';return Promise.resolve();}
  close(){this.closes++;this.state='closed';return Promise.resolve();}
}
const load = window => {
  const exports={};vm.runInNewContext(source,{exports, ...(window===undefined?{}:{window})});
  return exports.createMatch3Sound();
};
const sound=load({AudioContext:FakeAudio});
sound.play('clear');assert.equal(created.length,0,'play must not create/resume audio');
sound.unlock();assert.equal(created.length,1);const ctx=created[0];assert.equal(ctx.resumes,1);assert.equal(ctx.gains[0].gain.value,1,'device media volume has no extra master attenuation');
assert.equal(ctx.filters.length,1);const filter=ctx.filters[0];
assert.equal(filter.type,'lowpass');assert.equal(filter.frequency.value,1400);assert.equal(filter.Q.value,.5);
assert.equal(ctx.gains[0].destination,filter);assert.equal(filter.destination,ctx.destination,'all cues pass through the low-Q filter');
const signatures=[];
for(const cue of ['drop','merge','clear','charge','impact','shield','fusion','counter','guard']) {
  const before=ctx.oscillators.length,gainsBefore=ctx.gains.length;sound.play(cue);const added=ctx.oscillators.slice(before);
  assert(added.length>=2,'layered cue');
  for(const o of added){assert(o.stops[0]-ctx.currentTime<=.9);assert(o.startAt>=ctx.currentTime);}
  for(const o of added) for(const event of o.frequency.events) assert(event[1]>0&&event[1]<=1320,'fundamental/sweep frequency stays in softened range');
  let totalPeak=0;
  for(const g of ctx.gains.slice(gainsBefore)) {
    const [onset,attack,release]=g.gain.events;
    assert.equal(onset[1],0);assert.equal(attack[0],'linear');
    assert(Math.abs(attack[2]-onset[2]-.022)<1e-8,'22ms attack avoids an abrupt onset');
    assert(attack[1]>0&&attack[1]<=.23);totalPeak+=attack[1];
    assert.equal(release[0],'exp');assert.equal(release[1],.0001);assert(release[2]>attack[2]);
  }
  assert(totalPeak*ctx.gains[0].gain.value<=.4,'summed source peaks retain headroom below digital clipping');
  if(cue==='merge'||cue==='drop'||cue==='clear'||cue==='charge') {
    assert(added.every(o=>o.type==='sine'),'frequent orb cues use smooth tones without triangle harmonics');
    assert(added.every(o=>o.frequency.events.every(e=>e[1]<=440)),'frequent orb cues exclude sharp high accents');
    assert(totalPeak*ctx.gains[0].gain.value<=.175,'frequent orb cues remain quieter than combat impacts');
  }
  const endingHz=o=>o.frequency.events.at(-1)[1];
  const tail=added.reduce((a,b)=>a.stops[0]>b.stops[0]?a:b);
  assert(endingHz(tail)<=330,'longest voice ends in a low register instead of a shrill tail');
  for(const o of added) if(o.frequency.events[0][1]>=880) {
    assert(o.stops[0]-o.startAt<=.131,'bright accents finish early');
    assert(o.destination.gain.events[1][1]<=.1,'bright accents remain quiet');
  }
  signatures.push(JSON.stringify(added.map(o=>[o.type,o.frequency.events,o.startAt,o.stops[0]])));
}
assert.equal(new Set(signatures).size,9,'each cue has distinct timing/pitch/timbre');
sound.play('fusion');const last=ctx.oscillators.slice(-4);assert(last.some(o=>o.startAt>ctx.currentTime),'fixture includes future sources');
ctx.currentTime+=.025;sound.setMuted(true);
const active=last[0];assert.equal(active.disconnected,false,'active source stays connected for short release');
assert.deepEqual(active.destination.gain.events.slice(-2),[['hold',ctx.currentTime],['linear',0,ctx.currentTime+.009]]);
assert.equal(active.stops.at(-1),ctx.currentTime+.01);
const releaseEvents=active.destination.gain.events.length;sound.stop();sound.setMuted(true);
assert.equal(active.destination.gain.events.length,releaseEvents,'repeated stop cannot restart or raise the release');
for(const o of last.slice(1)){assert.equal(o.stops.at(-1),undefined,'future source cancelled immediately');assert(o.disconnected);assert(o.destination.disconnected);}
active.onended();assert(active.disconnected);assert(active.destination.disconnected,'onended releases both nodes');
const count=ctx.oscillators.length;sound.play('impact');assert.equal(ctx.oscillators.length,count);
sound.setMuted(false);assert.equal(ctx.oscillators.length,count,'unmute never replays a queued cue');sound.play('guard');
const guard=ctx.oscillators.slice(-2);sound.stop();assert(guard.every(o=>o.disconnected));
sound.play('guard');const replaced=ctx.oscillators.slice(-2);ctx.currentTime+=.03;
// Older AudioParam implementation: capture the current value before cancellation.
replaced[0].destination.gain.cancelAndHoldAtTime=undefined;replaced[0].destination.gain.value=.04;
sound.play('clear');
assert.deepEqual(replaced[0].destination.gain.events.slice(-3),[['cancel',ctx.currentTime],['set',.04,ctx.currentTime],['linear',0,ctx.currentTime+.009]]);
for(const o of replaced){assert.equal(o.stops.at(-1),ctx.currentTime+.01);assert.equal(o.disconnected,false);o.onended();assert(o.destination.disconnected);}
ctx.state='interrupted';sound.unlock();assert.equal(ctx.resumes,2,'unlock retries interrupted audio without queuing');
sound.play('shield');sound.dispose();assert.equal(ctx.closes,1);assert(ctx.gains.every(g=>g.disconnected));
assert(filter.disconnected);
sound.unlock();sound.play('fusion');sound.dispose();assert.equal(created.length,1);assert.equal(ctx.closes,1);
resumeRuns=false;const suspended=load({AudioContext:FakeAudio});suspended.unlock();const pending=created.at(-1);assert.equal(pending.resumes,1);suspended.play('clear');assert.equal(pending.oscillators.length,0);pending.state='running';assert.equal(pending.oscillators.length,0,'resume does not flush old cue');suspended.dispose();
for(const browser of [undefined,{}, {AudioContext:class{constructor(){throw Error('blocked')}}}]) {
  const quiet=load(browser);assert.doesNotThrow(()=>{quiet.unlock();quiet.play('clear');quiet.setMuted(true);quiet.stop();quiet.dispose();});
}
console.log('PASS match3 sound gesture unlock, distinct bounded cues, mute/stop/dispose and silent unavailable API');

// Falling beads never interrupt the semantic combat cue, never queue late sounds.
const landing=load({AudioContext:FakeAudio});resumeRuns=true;landing.unlock();const fallCtx=created.at(-1);
for(const cue of ['guard','impact','fusion']) {
  landing.play(cue);const voices=fallCtx.oscillators.slice(),stopCounts=voices.map(o=>o.stops.length);
  for(let i=0;i<10;i++)landing.play('drop');
  assert.equal(fallCtx.oscillators.length,voices.length,'drop cannot cut off '+cue);
  assert.deepEqual(voices.map(o=>o.stops.length),stopCounts,'rejected drops do not stop combat audio');
  fallCtx.currentTime+=1;
}
let prior=fallCtx.oscillators.length;landing.play('drop');assert.equal(fallCtx.oscillators.length-prior,2);
const falling=fallCtx.oscillators.slice(-2);assert(falling.every(o=>o.type==='sine'));
assert.deepEqual(falling.map(o=>o.frequency.events[0][1]),[196,294]);
assert.deepEqual(falling.map(o=>o.frequency.events.at(-1)[1]),[147,196]);
assert(falling.every(o=>o.stops[0]-o.startAt<=.211));
for(let i=0;i<100;i++)landing.play('drop');assert.equal(fallCtx.oscillators.length,prior+2);
fallCtx.currentTime+=.119;landing.play('drop');assert.equal(fallCtx.oscillators.length,prior+2);
fallCtx.currentTime+=.002;landing.play('drop');assert.equal(fallCtx.oscillators.length,prior+4);
const interrupted=fallCtx.oscillators.slice(-2);fallCtx.currentTime+=.03;landing.play('impact');
assert(interrupted.every(o=>o.stops.at(-1)<=fallCtx.currentTime+.011),'impact preempts drop');
landing.setMuted(true);prior=fallCtx.oscillators.length;landing.play('drop');landing.setMuted(false);
assert.equal(fallCtx.oscillators.length,prior,'unmute has no queued drops');landing.play('drop');assert.equal(fallCtx.oscillators.length,prior+2,'mute resets obsolete priority');
landing.stop();prior=fallCtx.oscillators.length;landing.play('drop');assert.equal(fallCtx.oscillators.length,prior+2,'explicit stop resets throttle');
landing.dispose();prior=fallCtx.oscillators.length;landing.play('drop');assert.equal(fallCtx.oscillators.length,prior);
assert(fallCtx.gains.every(g=>g.disconnected));console.log('PASS soft landing, combat priority, 120ms throttle and cleanup');

const merging=load({AudioContext:FakeAudio});merging.unlock();const mergeCtx=created.at(-1);
for(const cue of ['impact','shield','fusion','guard']){
 merging.play(cue);const prior=mergeCtx.oscillators.length,stops=mergeCtx.oscillators.map(o=>o.stops.length);
 merging.play('merge');assert.equal(mergeCtx.oscillators.length,prior);assert.deepEqual(mergeCtx.oscillators.map(o=>o.stops.length),stops);
 mergeCtx.currentTime+=1;
}
merging.play('drop');const dropVoices=mergeCtx.oscillators.slice(-2);mergeCtx.currentTime+=.04;
let n=mergeCtx.oscillators.length;merging.play('merge');assert.equal(mergeCtx.oscillators.length,n+2,'merge takes over drop immediately');
assert(dropVoices.every(o=>o.stops.at(-1)<=mergeCtx.currentTime+.011));
const mergeVoices=mergeCtx.oscillators.slice(-2);assert(mergeVoices.every(o=>o.type==='sine'));assert.deepEqual(mergeVoices.map(o=>o.frequency.events[0][1]),[247,165]);assert.deepEqual(mergeVoices.map(o=>o.frequency.events.at(-1)[1]),[165,123]);
n=mergeCtx.oscillators.length;for(let i=0;i<100;i++){merging.play('drop');merging.play('merge')}assert.equal(mergeCtx.oscillators.length,n);
mergeCtx.currentTime+=.179;merging.play('merge');assert.equal(mergeCtx.oscillators.length,n);
mergeCtx.currentTime+=.002;merging.play('merge');assert.equal(mergeCtx.oscillators.length,n+2);
mergeCtx.currentTime+=.2;merging.play('drop');assert.equal(mergeCtx.oscillators.length,n+2,'drop cannot truncate merge tail');
mergeCtx.currentTime+=.15;merging.play('drop');assert.equal(mergeCtx.oscillators.length,n+4);
merging.play('merge');n=mergeCtx.oscillators.length;merging.play('impact');assert.equal(mergeCtx.oscillators.length,n+2,'combat takes over merging');
merging.setMuted(true);merging.play('merge');merging.setMuted(false);n=mergeCtx.oscillators.length;merging.play('merge');assert.equal(mergeCtx.oscillators.length,n+2,'mute resets merge timing');
merging.stop();n=mergeCtx.oscillators.length;merging.play('drop');assert.equal(mergeCtx.oscillators.length,n+2);merging.dispose();n=mergeCtx.oscillators.length;merging.play('merge');assert.equal(mergeCtx.oscillators.length,n);assert(mergeCtx.gains.every(g=>g.disconnected));
console.log('PASS rounded merge, drop takeover, critical priority, 180ms throttle and cleanup');
