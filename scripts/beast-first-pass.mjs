// Sequential paid production authorized by the user. Candidates never become live assets here.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mp4Seconds} from './check-beast-clips.mjs';
import {writeJsonAtomic as write} from './beast-production-io.mjs';

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report='reports/beast-production/first-pass.json';
const index=read('public/skill-battle-archive/index.json');
const ids=index.cards.map(c=>c.poolId);
if(ids.length!==60||new Set(ids).size!==60)throw new Error('Expected exactly sixty distinct beasts');
const offset=Number(process.argv[2]??1)-1;
if(!Number.isInteger(offset)||offset<0||offset>=60)throw new Error('Start position must be 1–60');
const ffmpeg=process.env.FFMPEG??path.resolve('.tmp/python-media/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
if(!fs.existsSync(ffmpeg))throw new Error('FFmpeg unavailable');
const dirFor=j=>j.provider==='gemini-omni-1.1-flash'||(j.attempt??1)>1?path.join('.tmp/beast-production',j.cardId,`attempt-${String(j.attempt??1).padStart(2,'0')}`):path.join('.tmp/beast-production',j.cardId);
const status=fs.existsSync(report)?read(report):{startedAt:new Date().toISOString(),rows:[]};
Object.assign(status,{state:'running',pid:process.pid,total:60,resumedAt:new Date().toISOString(),startPosition:offset+1,approvalRule:'Every file is a candidate until anatomy, both identities, audio and mobile playback have independent evidence.'});
const lock='.tmp/beast-production/first-pass.lock';
const lockFd=fs.openSync(lock,'wx');fs.writeFileSync(lockFd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));
let currentId;
async function run(command,args,logFile){
  const log=fs.openSync(logFile,'a');
  try{return await new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd:root,windowsHide:true,stdio:['ignore',log,log]});p.on('error',reject);p.on('exit',code=>resolve(code??1));});}
  finally{fs.closeSync(log);}
}
try{
 for(let n=offset;n<ids.length;n++){
  const id=ids[n];currentId=id;
  const jobFile=`reports/beast-production/${id}.json`;
  let job=read(jobFile);
  const logfile=path.join('.tmp/beast-production',`${id}-first-pass.log`);
  status.current={position:n+1,cardId:id,phase:'prepare',at:new Date().toISOString()};write(report,status);
  if(job.state==='quota-blocked'&&job.quota?.scope==='monthly-spend'&&!process.argv.includes('--quota-cleared'))throw new Error('Project monthly spending cap requires an external billing change; do not retry automatically');
  if(['generating','quota-blocked','retrieval-paused'].includes(job.state)&&job.omniInteractionId){
    status.current.phase='resuming';write(report,status);
    if(await run(process.execPath,['scripts/beast-omni-resume.mjs',id],logfile))throw new Error(`Resume stopped for ${id}; keep the existing interaction id`);
    job=read(jobFile);
  }
  if(job.state==='quota-blocked'&&!job.omniInteractionId&&process.argv.includes('--quota-cleared')){
    if(job.providerStatus!==429)throw new Error('Only a known quota rejection can be restarted after quota clearance');
    job.history=[...(job.history??[]),{attempt:job.attempt,state:job.state,provider:job.provider,providerStatus:job.providerStatus,providerMessage:job.providerMessage,startedAt:job.startedAt,providerReturnedAt:job.providerReturnedAt}];
    job.state='awaiting-generation';job.quotaClearedExternallyAt=new Date().toISOString();write(jobFile,job);
  }
  if(job.state==='awaiting-generation'){
    status.current.phase='generating';write(report,status);
    console.log(`${n+1}/60 ${id}: GENERATING`);
    const opponent=id==='beast_a02'?'beast_a01':'beast_a02';
    if(await run(process.execPath,['scripts/beast-omni-production.mjs',id,opponent],logfile))throw new Error(`Generation stopped for ${id}; inspect ${logfile}. No automatic resubmission.`);
    job=read(jobFile);
  }
  const dir=dirFor(job),candidate=path.join(dir,'candidate.mp4');
  if(!fs.existsSync(candidate)||!['candidate-ready','needs-refinement','awaiting-cross-check','approved'].includes(job.state))throw new Error(`${id}: no reviewable candidate (state ${job.state})`);
  status.current.phase='decoding';write(report,status);
  if(Math.abs(mp4Seconds(candidate)-6)>.05)throw new Error(`${id}: wrong duration`);
  if(await run(ffmpeg,['-v','error','-xerror','-i',candidate,'-map','0:v:0','-map','0:a:0','-f','null','-'],logfile))throw new Error(`${id}: decoding failed`);
  const preview=`reports/beast-production/previews/${id}-attempt-${String(job.attempt??1).padStart(2,'0')}.mp4`;
  if(!fs.existsSync(preview)&&await run(ffmpeg,['-v','error','-i',candidate,'-vf','scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-t','6','-movflags','+faststart',preview],logfile))throw new Error(`${id}: preview conversion failed`);
  const sheet=path.join(dir,'contact-sheet.jpg');
  if(!fs.existsSync(sheet)&&await run(ffmpeg,['-v','error','-i',candidate,'-vf','fps=2,scale=384:-1,tile=4x3','-frames:v','1',sheet],logfile))throw new Error(`${id}: contact sheet failed`);
  if(job.state==='candidate-ready'){
    status.current.phase='reviewing';write(report,status);console.log(`${n+1}/60 ${id}: REVIEWING`);
    if(await run(process.execPath,['scripts/beast-six-second-production.mjs','--review',id],logfile))throw new Error(`${id}: review failed; preserved candidate, no automatic resubmission`);
    job=read(jobFile);
  }
  job.preview=preview;write(jobFile,job);
  const row={position:n+1,cardId:id,name:job.name,state:job.state,attempt:job.attempt??1,preview,candidateSha256:hash(candidate),previewSha256:hash(preview),durationSeconds:mp4Seconds(preview),completedAt:new Date().toISOString(),failedParts:Object.entries(job.automaticReview?.checks??{}).filter(([,v])=>v.status==='fail').map(([k])=>k)};
  status.rows=status.rows.filter(r=>r.cardId!==id);status.rows.push(row);status.rows.sort((a,b)=>a.position-b.position);
  status.candidatesProduced=status.rows.length;status.needsRefinement=status.rows.filter(r=>r.state==='needs-refinement').map(r=>r.cardId);
  status.updatedAt=new Date().toISOString();write(report,status);
  console.log(`${n+1}/60 ${id}: ${job.state}; six-second candidate retained`);
 }
 status.pendingIds=ids.filter(id=>!status.rows.some(row=>row.cardId===id));
 status.state=status.pendingIds.length?'first-pass-incomplete':'first-pass-complete';status.completedAt=new Date().toISOString();status.current=null;write(report,status);
 console.log(`Requested sequence finished. ${status.rows.length}/60 candidates; ${status.pendingIds.length} still unresolved. Candidates require cross-check and refinements.`);
}catch(error){status.state='paused-on-error';status.current={...status.current,cardId:currentId,error:error.message};status.updatedAt=new Date().toISOString();write(report,status);console.error(error.message);process.exitCode=1;}
finally{fs.closeSync(lockFd);fs.unlinkSync(lock);}
