import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {GoogleGenAI} from '@google/genai';
import {prepare, beginRefinement, referenceFor, withJobLock} from './beast-six-second-production.mjs';
import {writeJsonAtomic as write} from './beast-production-io.mjs';
import {awaitOmniResponse,saveOmniCandidate} from './beast-omni-result.mjs';

import { MUTUAL_BITE_VERSION, MUTUAL_BITE_TIMELINE, MUTUAL_BITE_ACTION } from './beast-mutual-bite-recipe.mjs';
import { recordProviderError } from './beast-provider-error.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const id=process.argv[2], opponentId=process.argv[3];
if(!id||!opponentId) throw new Error('Usage: node scripts/beast-omni-production.mjs PLAYER OPPONENT [--edit "specific correction"]');
referenceFor(id);referenceFor(opponentId);
const editIndex=process.argv.indexOf('--edit');
const correction=editIndex>=0?process.argv[editIndex+1]:null;
const detailIndex=process.argv.indexOf('--player-detail');
const detailReference=detailIndex>=0?process.argv[detailIndex+1]:null;
const sceneIndex=process.argv.indexOf('--scene-reference');
let sceneReference=sceneIndex>=0?process.argv[sceneIndex+1]:null;
if(sceneIndex<0&&!correction){
  const staged=path.join('.tmp/beast-production',id,'staging/paired-source-v1.png');
  const provenanceFile=path.join('.tmp/beast-production',id,'staging/provenance.json');
  if(fs.existsSync(staged)&&fs.existsSync(provenanceFile)){
    const provenance=read(provenanceFile);
    if(provenance.acceptedForAnimationCandidate===true&&provenance.playerId===id&&provenance.opponentId===opponentId&&provenance.canonicalPlayerSha256===hash(referenceFor(id))&&provenance.canonicalOpponentSha256===hash(referenceFor(opponentId))&&provenance.sha256===hash(staged))sceneReference=staged;
  }
}
if(sceneIndex>=0&&(!sceneReference||!fs.existsSync(sceneReference)))throw new Error('Scene reference is missing');
if(sceneReference&&correction)throw new Error('Use a new scene reference or conversational edit, not both');
if(sceneReference&&detailReference)throw new Error('Forced image-to-video uses the composed scene only; additional canonical artwork remains a review input');
if(detailIndex>=0&&(!detailReference||!fs.existsSync(detailReference)))throw new Error('Player detail reference is missing');
if(editIndex>=0&&!correction?.trim())throw new Error('An edit needs a concrete correction');

await withJobLock(id,async()=>{
  const previous=prepare().find(j=>j.cardId===id);
  const rejectedBeforeGeneration=previous?.state==='provider-rejected'&&previous.providerStatus===400;
  if(!previous||!['needs-refinement','awaiting-generation'].includes(previous.state)&&!rejectedBeforeGeneration)throw new Error('Existing candidate must be reviewed before another paid request');
  if(correction&&!previous.omniInteractionId)throw new Error('No stored Omni interaction to edit');
  const opponentReference=referenceFor(opponentId);
  const rationale=correction||(sceneReference?'Animate a precomposed scene that preserves both original designs; previous separate-subject generation simplified armor, mane and tail. Keep canonical identity checks unchanged.':'Newly verified Omni model supports subject references and local conversational edits. Preserve the source-facing direction and distinguish both canonical actors; previous Veo candidates failed identity.');
  const nextAttempt=(previous.attempt??0)+1;
  const job=previous.state==='needs-refinement'?beginRefinement({...previous,attemptLimit:Math.max(previous.attemptLimit,nextAttempt)},rationale):{...previous,attempt:nextAttempt,...(rejectedBeforeGeneration?{history:[...(previous.history??[]),{attempt:previous.attempt,state:previous.state,providerStatus:previous.providerStatus,providerMessage:previous.providerMessage,startedAt:previous.startedAt,providerReturnedAt:previous.providerReturnedAt}]}:{})};
  Object.assign(job,{provider:'gemini-omni-1.1-flash',methodRevisionReason:rationale,opponentId,opponentReference,opponentReferenceSha256:hash(opponentReference),conditioning:'omni-subject-reference',sourceSeconds:6,aspectRatio:'16:9',releaseStatus:'pending',purpose:'paired-skill-candidate'});
  for(const field of ['edit','referenceArtwork','referenceArtworkSha256','nativeCandidateSha256','audioOverride','preview','previewSha256','previewDurationSeconds','nextAction','providerStatus','providerMessage','providerReturnedAt','actualNativeDuration','sceneReference','sceneReferenceSha256','omniInteractionId','omniAcceptedAt']) delete job[field];
  if(sceneReference)Object.assign(job,{sceneReference,sceneReferenceSha256:hash(sceneReference),conditioning:'omni-first-last-scene'});
  const dir=path.resolve('.tmp/beast-production',id,`attempt-${String(job.attempt).padStart(2,'0')}`);
  if(fs.existsSync(dir))throw new Error('Attempt directory already exists; inspect it before resubmitting');
  fs.mkdirSync(dir,{recursive:true});
  const key=/^GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync('.env.local','utf8'))?.[1]?.trim();
  if(!key)throw new Error('Missing configured provider credential');
  const ffmpeg=process.env.FFMPEG??path.resolve('.tmp/python-media/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
  const voice=path.resolve('.tmp/beast-production',id,'voice/player-six-second-v2.wav');
  if(!fs.existsSync(ffmpeg)||!fs.existsSync(voice))throw new Error('Verified player voice and FFmpeg must exist before paid generation');
  const ai=new GoogleGenAI({apiKey:key});
  const image=async p=>({type:'image',mime_type:'image/png',data:(await sharp(p).png().toBuffer()).toString('base64')});
  const canonicalName=job.name;
  const detailNote=detailReference?` Image ${sceneReference?4:3} shows original high-resolution PLAYER ornament details; keep that creature detail and ignore its card border, lettering and background. Image ${sceneReference?2:1} remains the full-body identity authority.`:'';
  let prompt=`Image 1 is the protagonist ${canonicalName}; image 2 is its silent training opponent.${detailNote} Preserve both exact canonical designs in every frame, including faces, horns, jewelry, complex armor, tails and original limb counts. No invented features. Fixed full-body camera on a dark stone fighting stage, no HUD or text. ${correction??''} ${MUTUAL_BITE_ACTION}`;
  job.recipeVersion='omni-6s-no-hud-articulated-bite-v2';
  if(sceneReference){
    prompt=prompt.replace(`Image 1 is the protagonist ${canonicalName}; image 2 is its silent training opponent.`,`The existing right-side creature is the protagonist ${canonicalName}; the existing left-side creature is its silent training opponent.`);
    prompt=`[# Sources <FIRST_FRAME>@Image1 <LAST_FRAME>@Image1] Animate IMAGE 1 as the exact starting AND ending scene, preserving the rendered characters, original armor details, materials, lighting and stage throughout. Complete the bite and return naturally to the same original resting pose by 6 seconds. This is image-to-video animation of the existing scene, not recreation of it. Keep all appendages inside the frame with a little edge margin. The protagonist initiates the action; the opponent counter-bites only after the protagonist initiates. ${prompt}`;
    job.recipeVersion='omni-6s-explicit-first-last-scene-v4';
    job.methodRevisionReason+=' Explicit FIRST_FRAME/LAST_FRAME role binding and image_to_video task now replace ambiguous scene prompting, following the documented controls.';
  }
  Object.assign(job,{contractVersion:MUTUAL_BITE_VERSION,timeline:MUTUAL_BITE_TIMELINE,voiceCandidate:path.relative(process.cwd(),voice).replaceAll('\\','/'),voiceCandidateSha256:hash(voice)});
  job.recipeVersion=sceneReference?'omni-first-last-mutual-bite-v5':'omni-subject-mutual-bite-v3';
  delete job.quota;
  job.prompt=prompt;job.state='submission-uncertain';job.startedAt=new Date().toISOString();
  const jobFile=`reports/beast-production/${id}.json`;
  write(jobFile,job);
  write(path.join(dir,'request-manifest.json'),{model:job.provider,startedAt:job.startedAt,prompt,reference:job.reference,referenceSha256:hash(job.reference),opponentReference,opponentReferenceSha256:hash(opponentReference),detailReference,detailReferenceSha256:detailReference?hash(detailReference):null,sceneReference,sceneReferenceSha256:sceneReference?hash(sceneReference):null,previousInteractionId:correction?previous.omniInteractionId:null,requestedDuration:'6s',autoRetries:0});
  console.log(`${id} attempt ${job.attempt}: submitting ${job.provider}; exact actor references and player voice reserved`);
  let response;
  try {
    response=await ai.interactions.create({model:job.provider,input:[...(sceneReference?[await image(sceneReference)]:[await image(job.reference),await image(opponentReference)]),...(detailReference?[await image(detailReference)]:[]),{type:'text',text:prompt}],response_format:{type:'video',aspect_ratio:'16:9',duration:'6s',delivery:'inline'},...(sceneReference?{generation_config:{video_config:{task:'image_to_video'}}}:{}),store:true,background:true,stream:false,...(correction?{previous_interaction_id:previous.omniInteractionId}:{})},{timeout:120000,maxRetries:0});
    response=await awaitOmniResponse(ai,job,response);
  }catch(error){
    recordProviderError(job,error,key);write(jobFile,job);
    console.error(JSON.stringify({state:job.state,status:job.providerStatus,message:job.providerMessage}));process.exitCode=1;return;
  }
  saveOmniCandidate(job,response);
});
