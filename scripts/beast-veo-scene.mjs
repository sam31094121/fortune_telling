// One explicitly authorized alternative after subject-reference identity failures.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {prepare,beginRefinement,beginRequestedQuotaRetry,generate,referenceFor,withJobLock} from './beast-six-second-production.mjs';
import {mp4Seconds} from './check-beast-clips.mjs';
import {writeJsonAtomic as write} from './beast-production-io.mjs';
import { MUTUAL_BITE_VERSION, MUTUAL_BITE_TIMELINE, MUTUAL_BITE_ACTION } from './beast-mutual-bite-recipe.mjs';
const [id,opponentId,scene]=process.argv.slice(2);
const replacementIndex=process.argv.indexOf('--replacement-reason');
const replacementReason=replacementIndex>=0?process.argv[replacementIndex+1]:null;
const quotaRetryIndex=process.argv.indexOf('--requested-quota-retry');
const quotaRetryReason=quotaRetryIndex>=0?process.argv[quotaRetryIndex+1]:null;
if(quotaRetryIndex>=0&&!quotaRetryReason?.trim())throw new Error('Record the user-requested continuation reason');
if(!id||!opponentId||!scene)throw new Error('Usage: node scripts/beast-veo-scene.mjs PLAYER OPPONENT SCENE');
referenceFor(id);referenceFor(opponentId);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const ffmpeg=process.env.FFMPEG??path.resolve('.tmp/python-media/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
const voice=path.join('.tmp/beast-production',id,'voice/player-six-second-v2.wav');
if(!fs.existsSync(scene)||!fs.existsSync(ffmpeg)||!fs.existsSync(voice))throw new Error('Scene, player voice and FFmpeg required before submission');
await withJobLock(id,async()=>{
  const previous=prepare().find(job=>job.cardId===id);
  const unresolvedReplacement=previous?.state==='submission-uncertain'&&!previous.omniInteractionId&&replacementReason?.trim();
  const firstCandidate=previous?.state==='awaiting-generation'&&!(previous.attempt>0);
  if(previous?.state!=='needs-refinement'&&!unresolvedReplacement&&!firstCandidate&&!quotaRetryReason)throw new Error('Review the previous candidate, or explicitly record an authorized replacement of an unretrievable request');
  const reason='Use a composed scene as an actual Veo first-frame input, preserving both complete canonical designs. Separate-image and Omni-scene attempts changed proportions or bite placement. This uses the existing source scene and keeps strict identity and contact review.';
  const next=(previous.attempt??0)+1;
  const priorDirectory=previous.attempt===1?path.join('.tmp/beast-production',id):path.join('.tmp/beast-production',id,`attempt-${String(previous.attempt).padStart(2,'0')}`);
  const job=quotaRetryReason?beginRequestedQuotaRetry(previous,quotaRetryReason,{hasOperation:fs.existsSync(path.join(priorDirectory,'operation.json')),hasCandidate:fs.existsSync(path.join(priorDirectory,'candidate.mp4')),clearanceConfirmed:process.argv.includes('--quota-cleared')}):firstCandidate?{...previous,attempt:1,methodRevisionReason:'Use a reviewed composed first frame for this first candidate. Provider availability is determined by the actual response; stop on a refusal.'}:beginRefinement({...previous,state:'needs-refinement',attemptLimit:Math.max(previous.attemptLimit,next)},unresolvedReplacement?replacementReason:reason);
  if(unresolvedReplacement){
    Object.assign(job.history.at(-1),{state:previous.state,providerMessage:previous.providerMessage,originalOutcome:'unknown',requestManifest:`.tmp/beast-production/${id}/attempt-${String(previous.attempt).padStart(2,'0')}/request-manifest.json`});
    job.replacementReason=replacementReason;job.previousRequestOutcome='unknown; no claim about previous billing';
  }
  Object.assign(job,{provider:'veo-3.1-generate-preview',conditioning:'first-frame-scene',sourceSeconds:6,aspectRatio:'16:9',sceneReference:scene,sceneReferenceSha256:hash(scene),opponentId,opponentReference:referenceFor(opponentId),opponentReferenceSha256:hash(referenceFor(opponentId)),recipeVersion:'veo-6s-preserved-first-scene-v1',releaseStatus:'pending'});
  for(const key of ['omniInteractionId','preview','previewDurationSeconds','audioOverride','nativeCandidateSha256','actualNativeDuration','providerReturnedAt','providerMessage','providerStatus','referenceArtwork','referenceArtworkSha256'])delete job[key];
  Object.assign(job,{contractVersion:MUTUAL_BITE_VERSION,timeline:MUTUAL_BITE_TIMELINE,recipeVersion:'veo-first-frame-mutual-bite-v2',voiceCandidate:voice,voiceCandidateSha256:hash(voice)});
  delete job.quota;
  job.prompt=`Animate exactly the supplied scene, preserving both creatures' original detailed faces, proportions, ornaments, jewels, limb count and tails. The RIGHT creature (${job.name}) is the protagonist, the LEFT creature is the opponent. Both stay inside the frame. Their shoulder heights are matched for safe visible non-gory biting. The opponent only counter-attacks after the player's first bite. ${MUTUAL_BITE_ACTION}`;
  const file=`reports/beast-production/${id}.json`;
  write(file,job);
  await generate(id);
  const result=JSON.parse(fs.readFileSync(file,'utf8'));
  if(result.state!=='candidate-ready'){
    console.error(result.state==='quota-blocked'
      ? 'Veo quota rejection preserved; no candidate produced and no automatic resubmission.'
      : `Veo state ${result.state}; preserve saved request records and inspect before any resubmission.`);
    process.exitCode=1;
    return;
  }
  const dir=result.attempt===1?path.join('.tmp/beast-production',id):path.join('.tmp/beast-production',id,`attempt-${String(result.attempt).padStart(2,'0')}`);
  const candidate=path.join(dir,'candidate.mp4'),native=path.join(dir,'candidate-native.mp4');
  if(Math.abs(mp4Seconds(candidate)-6)>.05)throw new Error('Native duration mismatch; no retiming or approval');
  fs.copyFileSync(candidate,native);
  execFileSync(ffmpeg,['-v','error','-y','-i',native,'-i',voice,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','160k','-t','6','-movflags','+faststart',candidate],{windowsHide:true});
  result.nativeCandidateSha256=hash(native);result.candidateSha256=hash(candidate);
  result.audioOverride={source:`public/audio/beast-voices/${id}.mp3`,sixSecondCandidateSha256:hash(voice),nativeAudioRemoved:true,reviewStatus:'unreviewed'};
  write(file,result);prepare();
  console.log(`${id}: exact first-scene six-second candidate retained with player's own audio; review required`);
});
