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
sound.unlock();assert.equal(created.length,1);const ctx=created[0];assert.equal(ctx.resumes,1);assert.equal(ctx.gains[0].gain.value,.2);
assert.equal(ctx.filters.length,1);const filter=ctx.filters[0];
assert.equal(filter.type,'lowpass');assert.equal(filter.frequency.value,2200);assert.equal(filter.Q.value,.5);
assert.equal(ctx.gains[0].destination,filter);assert.equal(filter.destination,ctx.destination,'all cues pass through the low-Q filter');
const signatures=[];
for(const cue of ['clear','charge','impact','shield','fusion','counter','guard']) {
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
  assert(totalPeak*ctx.gains[0].gain.value<=.1,'conservative summed peak gain remains below 0.1');
  signatures.push(JSON.stringify(added.map(o=>[o.type,o.frequency.events,o.startAt,o.stops[0]])));
}
assert.equal(new Set(signatures).size,7,'each cue has distinct timing/pitch/timbre');
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
