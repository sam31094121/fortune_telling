export const VOICE_SEGMENTS = [
  {phase:'build',at:0,from:0,seconds:1.8,gain:0.24,fadeIn:0.15,fadeOut:0.3},
  {phase:'rush',at:1.8,from:0,seconds:1.4,gain:0.8,fadeIn:0.12,fadeOut:0.25},
  {phase:'first-bite',at:2.5,from:0.3,seconds:0.25,gain:0.6,fadeIn:0.015,fadeOut:0.08},
  {phase:'finisher',at:3.4,from:0,seconds:0.8,gain:0.85,fadeIn:0.06,fadeOut:0.2},
  {phase:'recovery',at:4.2,from:0.2,seconds:1.8,gain:0.4,fadeIn:0.08,fadeOut:1.7},
];
/** Sample-aligned cuts and gain only: no pitch/time change, synthetic roar or opponent track. */
export function mixOriginalVoice(pcm, rate=48000){
  const samples=rate*6,out=new Float64Array(samples);
  if(pcm.length<rate*0.2)throw new Error('Canonical voice must contain at least 0.1 seconds');
  for(const segment of VOICE_SEGMENTS){
    const start=Math.round(segment.at*rate),from=Math.min(Math.round(segment.from*rate),Math.max(0,pcm.length/2-Math.round(rate*0.2))),length=Math.round(segment.seconds*rate);
    const available=pcm.length/2-from,repeat=available<length,period=available+Math.round(rate*0.06);
    for(let n=0;n<length&&start+n<samples;n++){
      const offset=repeat?n%period:n;if(offset>=available)continue;
      const envelope=Math.min(1,n/(segment.fadeIn*rate),(length-1-n)/(segment.fadeOut*rate));
      const edge=repeat?Math.min(1,offset/(rate*0.005),(available-1-offset)/(rate*0.005)):1;
      out[start+n]+=pcm.readInt16LE((from+offset)*2)*segment.gain*Math.max(0,envelope)*Math.max(0,edge);
    }
  }
  let peak=0;for(const value of out)peak=Math.max(peak,Math.abs(value));
  if(!peak)throw new Error('Canonical voice is silent');
  const scale=0.85*32767/peak,wav=Buffer.alloc(44+samples*2);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);
  for(let n=0;n<samples;n++)wav.writeInt16LE(Math.round(out[n]*scale),44+n*2);
  return wav;
}
