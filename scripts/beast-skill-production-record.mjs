import fs from 'node:fs';
import crypto from 'node:crypto';
import {mp4Seconds} from './check-beast-clips.mjs';
import {MUTUAL_BITE_VERSION,MUTUAL_BITE_TIMELINE} from './beast-mutual-bite-recipe.mjs';

export const SKILL_REVIEW_PARTS=['identity','opponentIdentity','head','body','limbs','mouth','teethOrBeak','eyes','clawsOrHooves','tail','contact','reciprocalBite','playerVoice','continuity','mobilePlayback'];
const defaultFiles={
  exists:file=>fs.existsSync(file),
  json:file=>JSON.parse(fs.readFileSync(file,'utf8')),
  hash:file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  seconds:mp4Seconds,
};

/** Register review assets without granting release approval or exposing provider credentials. */
export function skillProductionRecord(job,files=defaultFiles){
  const id=job.cardId;
  if(!/^beast_(?:[ay]\d{2}|g_(?:qinglong|baihu|zhuque|xuanwu))$/.test(id))throw new Error('Unknown beast id');
  const voiceCandidate=`.tmp/beast-production/${id}/voice/player-six-second-v2.wav`;
  const voiceReport=`.tmp/beast-production/${id}/voice/provenance-v2.json`;
  const voice=files.exists(voiceReport)?files.json(voiceReport):null;
  const source=`public/audio/beast-voices/${id}.mp3`;
  if(voice&&(voice.cardId!==id||voice.source!==source||voice.sourceSha256!==files.hash(source)||!files.exists(voiceCandidate)||voice.outputSha256!==files.hash(voiceCandidate)))throw new Error(`Voice provenance mismatch: ${id}`);
  let sourceScene=null;
  if(job.preparationReport){
    const report=`reports/beast-production/${id}-preparation.json`;
    if(job.preparationReport!==report)throw new Error(`Preparation path mismatch: ${id}`);
    const prep=files.json(report);
    if(prep.scene){
      const provenanceReport=`.tmp/beast-production/${id}/staging/provenance.json`,provenance=files.json(provenanceReport);
      const imagePrompts=prep.imagePrompts??[prep.imagePrompt];
      if(!Array.isArray(imagePrompts)||!imagePrompts.length||imagePrompts[0]!==prep.imagePrompt||imagePrompts.some(prompt=>typeof prompt!=='string'||!prompt.trim()))throw new Error(`Source-scene provenance mismatch: ${id}`);
      if(prep.cardId!==id||prep.scene!==job.sceneReference||prep.sceneSha256!==job.sceneReferenceSha256||!files.exists(prep.scene)||files.hash(prep.scene)!==prep.sceneSha256||provenance.sha256!==prep.sceneSha256||provenance.playerId!==id||provenance.opponentId!==job.opponentId||provenance.canonicalPlayerSha256!==job.referenceSha256||provenance.canonicalOpponentSha256!==job.opponentReferenceSha256||provenance.acceptedForAnimationCandidate!==true||!prep.imagePrompt?.trim()||JSON.stringify(provenance.prompts)!==JSON.stringify(imagePrompts))throw new Error(`Source-scene provenance mismatch: ${id}`);
      sourceScene={status:'prepared-for-animation',workspaceFile:prep.scene,sha256:prep.sceneSha256,opponentId:job.opponentId,preparationReport:report,provenanceReport,review:prep.sceneReview,access:'local-source-image-only'};
    }
  }
  const candidates=[job,...(job.history??[]).toReversed()].filter(item=>item.candidateSha256&&item.preview&&Number.isInteger(item.attempt)&&item.attempt>0);
  let candidate=null,review={status:'awaiting-candidate',visualReport:null,failedParts:[],outstandingChecks:SKILL_REVIEW_PARTS,correctionsToModel:null};
  for(const item of candidates){
    const version=String(item.attempt).padStart(2,'0');
    const preview=`reports/beast-production/previews/${id}-attempt-${version}.mp4`;
    const directory=item.provider==='gemini-omni-1.1-flash'||item.attempt>1?`.tmp/beast-production/${id}/attempt-${version}`:`.tmp/beast-production/${id}`;
    const native=`${directory}/candidate.mp4`;
    if(item.preview!==preview||!files.exists(preview)||!files.exists(native))continue;
    if(files.hash(native)!==item.candidateSha256)throw new Error(`Candidate hash mismatch: ${id} v${item.attempt}`);
    const seconds=files.seconds(preview);
    if(!Number.isFinite(seconds)||Math.abs(seconds-6)>.05)throw new Error(`Candidate is not six seconds: ${id}`);
    const visualPath=`reports/beast-production/cross-checks/${id}-attempt-${version}.json`;
    const recordedVisual=files.exists(visualPath)?files.json(visualPath):null;
    const visual=recordedVisual?.candidateSha256===item.candidateSha256&&recordedVisual?.referenceSha256===job.referenceSha256?recordedVisual:null;
    const merged={...item.automaticReview?.checks,...visual?.checks};
    candidate={status:'available-for-review',attempt:item.attempt,contractVersion:item.contractVersion??'single-bite-legacy',opponentId:item.opponentId??null,workspaceFile:preview,candidateSha256:item.candidateSha256,previewSha256:files.hash(preview),durationSeconds:seconds,access:'local-review-only'};
    review={status:visual?'initial-visual-screening-recorded':'awaiting-independent-review',visualReport:visual?visualPath:null,modelReport:files.exists(`${directory}/model-review.json`)?`${directory}/model-review.json`:null,
      failedParts:Object.entries(merged).filter(([,c])=>c.status==='fail').map(([part,c])=>({part,evidence:c.evidence??''})),
      outstandingChecks:SKILL_REVIEW_PARTS.filter(part=>!['pass','not-applicable'].includes(visual?.checks?.[part]?.status)),
      correctionsToModel:visual?.correctionsToModel??null,fullAudiovisualAcceptance:'pending'};
    break;
  }
  return {
    version:MUTUAL_BITE_VERSION,registrationStatus:'registered',state:job.state,
    canonicalReference:'/'+job.reference.replace(/^public\//,''),referenceSha256:job.referenceSha256,
    jobReport:`reports/beast-production/${id}.json`,latestAttempt:job.attempt??0,
    voiceCandidate,voiceReview:'awaiting-audiovisual-review',
    voice:voice?{source:'/'+source.replace(/^public\//,''),sourceSha256:voice.sourceSha256,candidateSha256:voice.outputSha256,provenanceReport:voiceReport,durationSeconds:voice.durationSeconds,technicalCheck:voice.technicalCheck,reviewStatus:voice.status}:null,
    timeline:MUTUAL_BITE_TIMELINE,requiredChecks:SKILL_REVIEW_PARTS,
    candidateContractVersion:candidate?.contractVersion??job.contractVersion??'single-bite-legacy',
    perspective:'player',opponentVoice:false,candidate,review,...(sourceScene?{sourceScene}:{}),
    blocker:job.state==='quota-blocked'&&job.quota?{scope:job.quota.scope,observedAt:job.quota.observedAt,retryAt:job.quota.retryAt??null}:null,
  };
}
