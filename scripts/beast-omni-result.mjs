import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeJsonAtomic as write} from './beast-production-io.mjs';
import {prepare} from './beast-six-second-production.mjs';
import {mp4Seconds} from './check-beast-clips.mjs';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export const omniVideo=response=>response.output_video??response.steps?.filter(step=>step.type==='model_output').flatMap(step=>step.content??[]).find(content=>content.type==='video');

export async function awaitOmniResponse(ai,job,response,{pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),persist=write}={}){
  if(!response.id)throw new Error('Provider did not return an interaction id');
  const file=`reports/beast-production/${job.cardId}.json`;
  job.omniInteractionId=response.id;job.omniAcceptedAt??=new Date().toISOString();job.state='generating';persist(file,job);
  console.log(`${job.cardId}: interaction id saved; following this existing request only`);
  const deadline=Date.now()+30*60*1000;
  while(!omniVideo(response)?.data&&!['completed','failed','cancelled'].includes(response.status)){
    if(Date.now()>deadline)throw new Error('Provider still pending; resume the saved interaction, do not create another request');
    await pause(5000);
    response=await ai.interactions.get(job.omniInteractionId,{include_input:false},{timeout:120000,maxRetries:2});
  }
  return response;
}

export function saveOmniCandidate(job,response){
  const id=job.cardId,dir=path.resolve('.tmp/beast-production',id,`attempt-${String(job.attempt).padStart(2,'0')}`),file=`reports/beast-production/${id}.json`;
  const ffmpeg=process.env.FFMPEG??path.resolve('.tmp/python-media/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
  const voice=job.voiceCandidate?path.resolve(job.voiceCandidate):path.resolve('.tmp/beast-production',id,'voice/player-six-second.wav');
  if(job.voiceCandidateSha256&&hash(voice)!==job.voiceCandidateSha256)throw new Error('Reserved player voice changed');
  fs.writeFileSync(path.join(dir,'interaction.json'),JSON.stringify(response));
  job.omniInteractionId=response.id;job.providerReturnedAt=new Date().toISOString();
  const output=omniVideo(response);
  if(!output?.data){job.state='provider-failed';write(file,job);throw new Error(`No inline video: status ${response.status}; saved interaction, no resubmission`);}
  const native=path.join(dir,'candidate-native.mp4'),bytes=Buffer.from(output.data,'base64');
  const expected=crypto.createHash('sha256').update(bytes).digest('hex');
  if(fs.existsSync(native)&&hash(native)!==expected)throw new Error('Provider result changed for the same interaction; preserve both versions for inspection');
  if(!fs.existsSync(native))fs.writeFileSync(native,bytes);
  job.nativeCandidateSha256=hash(native);job.actualNativeDuration=mp4Seconds(native);
  if(Math.abs(job.actualNativeDuration-6)>.05){job.state='needs-refinement';job.refinement='Provider output differs from six seconds; preserve raw result without retiming.';write(file,job);throw new Error(`Native output is ${job.actualNativeDuration}s`);}
  const candidate=path.join(dir,'candidate.mp4');
  if(fs.existsSync(candidate)&&job.candidateSha256&&hash(candidate)!==job.candidateSha256)throw new Error('Existing candidate changed');
  if(!fs.existsSync(candidate))execFileSync(ffmpeg,['-v','error','-i',native,'-i',voice,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','160k','-t','6','-movflags','+faststart',candidate],{windowsHide:true});
  execFileSync(ffmpeg,['-v','error','-xerror','-i',candidate,'-map','0:v:0','-map','0:a:0','-f','null','-'],{windowsHide:true});
  job.candidateSha256=hash(candidate);job.state='candidate-ready';job.finishedAt=new Date().toISOString();
  delete job.quota;
  job.audioOverride={source:`public/audio/beast-voices/${id}.mp3`,sixSecondCandidateSha256:hash(voice),nativeAudioRemoved:true,reviewStatus:'unreviewed'};
  write(file,job);prepare();
  console.log(`${id}: six-second candidate saved; anatomy, identity and audiovisual review still required`);
}
