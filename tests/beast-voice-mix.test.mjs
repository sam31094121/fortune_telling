import assert from 'node:assert/strict';
import {mixOriginalVoice} from '../scripts/beast-voice-mix.mjs';
const rate=48000,frequency=700,source=Buffer.alloc(Math.round(rate*0.59)*2);
for(let n=0;n<source.length/2;n++)source.writeInt16LE(Math.round(10000*Math.sin(n*2*Math.PI*frequency/rate)),n*2);
const wav=mixOriginalVoice(source);assert.equal(wav.length,44+6*rate*2);assert.equal(wav.readUInt32LE(24),rate);
let peak=0;for(let n=44;n<wav.length;n+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(n)));
assert.ok(peak<=Math.ceil(32767*.85));assert.ok(peak>0);
// A clean slice before any overlap keeps the source's crossing interval (pitch).
let crossings=0;for(let n=rate*.2;n<rate*.4;n++)if(wav.readInt16LE(44+(n-1)*2)<=0&&wav.readInt16LE(44+n*2)>0)crossings++;
assert.ok(Math.abs(crossings/.2-frequency)<=5,'Pitch must remain the source pitch');
assert.equal(wav.readInt16LE(wav.length-2),0,'Recovery ends cleanly');
assert.throws(()=>mixOriginalVoice(Buffer.alloc(rate)),/silent/);
assert.throws(()=>mixOriginalVoice(Buffer.alloc(10)),/at least/);
console.log('PASS: short original call remains its own pitch; exactly six seconds with bounded peak and fading recovery');
