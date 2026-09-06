import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mixOriginalVoice, VOICE_SEGMENTS } from './beast-voice-mix.mjs';

const ffmpeg = process.env.FFMPEG ?? path.resolve('.tmp/python-media/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
if (!fs.existsSync(ffmpeg)) throw new Error('Set FFMPEG to an existing executable');
const manifest = JSON.parse(fs.readFileSync('public/audio/beast-voices/manifest.json', 'utf8'));
// Every layer derives from this player's registered voice; no opponent track.
const mutual = process.argv.includes('--mutual');
const graph = [
  '[0:a]aresample=48000,asplit=4[b][r][i][t]',
  '[b]atrim=0:1,asetpts=PTS-STARTPTS,atempo=0.5,lowpass=f=1400,volume=0.35,afade=t=in:d=0.15,afade=t=out:st=1.7:d=0.3,apad,atrim=duration=2[build]',
  '[r]atrim=0:2.2,asetpts=PTS-STARTPTS,atempo=0.815,afade=t=in:d=0.2,afade=t=out:st=2.4:d=0.3,apad,atrim=duration=2.7,adelay=1800:all=1[rush]',
  '[i]atrim=0.3:0.5,asetpts=PTS-STARTPTS,volume=0.65,afade=t=in:d=0.015,afade=t=out:st=0.12:d=0.08,adelay=4000:all=1[bite]',
  '[t]atrim=1:2,asetpts=PTS-STARTPTS,atempo=0.556,volume=0.5,afade=t=in:d=0.08,afade=t=out:st=0.1:d=1.7,apad,atrim=duration=1.8,adelay=4200:all=1[tail]',
  '[build][rush][bite][tail]amix=inputs=4:normalize=0:duration=longest,alimiter=limit=0.85:level=0:latency=1,apad,atrim=duration=6[out]',
].join(';');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const ids = process.argv[2] === '--all' ? Object.keys(manifest.cards) : [process.argv[2]];
if (process.argv[2] === '--all' && ids.length !== 60) throw new Error('Expected exactly sixty registered voices');
const rows = [];
const startedAt = new Date().toISOString();
for (const id of ids) {
  if (!/^beast_(?:[ay]\d{2}|g_(?:qinglong|zhuque|baihu|xuanwu))$/.test(id ?? '')) throw new Error('Supply a beast card ID or --all');
  const card = manifest.cards[id];
  if (!card) throw new Error('Unknown voice');
  const source = `public/audio/beast-voices/${id}.mp3`;
  const dir = path.resolve('.tmp/beast-production', id, 'voice');
  fs.mkdirSync(dir, { recursive: true });
  const wav = path.join(dir, mutual ? 'player-six-second-v2.wav' : 'player-six-second.wav');
  if(mutual){
    const sourcePcm=execFileSync(ffmpeg,['-v','error','-i',source,'-ac','1','-ar','48000','-f','s16le','-'],{windowsHide:true,timeout:30000,maxBuffer:2*1024*1024});
    fs.writeFileSync(wav,mixOriginalVoice(sourcePcm));
  } else execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', source, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', '-y', wav], { windowsHide: true, timeout:30000 });
  // Decode to PCM to measure sample count, peak and energy instead of trusting metadata.
  const pcm = execFileSync(ffmpeg, ['-v', 'error', '-i', wav, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
  const samples = pcm.length / 2;
  let peak = 0, energy = 0;
  for (let i = 0; i < samples; i++) { const value = pcm.readInt16LE(i * 2); peak = Math.max(peak, Math.abs(value)); energy += value * value; }
  if (samples !== 288000 || peak === 0 || peak >= 32767) throw new Error(`${id}: incorrect duration, silence or clipping`);
  const review = { cardId: id, name: card.name, durationSeconds: samples / 48000, peakDbfs: +(20 * Math.log10(peak / 32768)).toFixed(2), rmsDbfs: +(20 * Math.log10(Math.sqrt(energy / samples) / 32768)).toFixed(2), source, sourceSha256: hash(source), outputSha256: hash(wav), originalRecording: manifest.sources[card.source], recipe: graph, status: 'awaiting-audiovisual-review', technicalCheck: 'passed', createdAt: new Date().toISOString() };
  review.contractVersion=mutual?'six-second-mutual-bite-v2':'six-second-v1';
  if(mutual)review.recipe={implementation:'sample-aligned canonical PCM gain/cut mix; short calls repeat with 60ms gaps and 5ms edge fades, never stretched',sampleRate:48000,segments:VOICE_SEGMENTS};
  review.voiceProcessing=mutual?'Original pitch, timing and spectrum retained; only cuts, gain and fades. No opponent vocal layer.':'Legacy build/rush/bite/tail mix';
  fs.writeFileSync(path.join(dir, mutual ? 'provenance-v2.json' : 'provenance.json'), JSON.stringify(review, null, 2) + '\n');
  rows.push(review);
  console.log(`${rows.length}/${ids.length} ${id}: 6.000s, decoded, peak ${review.peakDbfs}dBFS; listening and synchronization pending`);
}
if (process.argv[2] === '--all') {
  fs.mkdirSync('reports/beast-production', { recursive: true });
  fs.writeFileSync(mutual?'reports/beast-production/audio-summary-mutual.json':'reports/beast-production/audio-summary.json', JSON.stringify({ startedAt, completedAt: new Date().toISOString(), count: rows.length, technicalPassed: rows.length, audiovisualApproved: 0, rows }, null, 2) + '\n');
}
