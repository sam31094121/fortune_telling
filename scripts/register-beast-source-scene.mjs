// Register an inspected source image and action packet; never submit or approve a video.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {referenceFor,withJobLock} from './beast-six-second-production.mjs';
import {MUTUAL_BITE_VERSION,MUTUAL_BITE_TIMELINE,MUTUAL_BITE_ACTION} from './beast-mutual-bite-recipe.mjs';
import {writeJsonAtomic as write} from './beast-production-io.mjs';
const [id,source,review]=process.argv.slice(2);
referenceFor(id);
if(!source||!review?.trim())throw new Error('Usage: ID SOURCE_IMAGE "observed source-scene review"');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
await withJobLock(id,async()=>{
 const report=`reports/beast-production/${id}-preparation.json`,record=read(report);
 const jobFile=`reports/beast-production/${id}.json`,job=read(jobFile);
 if(job.attempt||job.state!=='awaiting-generation')throw new Error('This initial-source registration requires an unsubmitted beast');
 if(record.cardId!==id||record.playerReference!==referenceFor(id)||!record.imagePrompt?.trim())throw new Error('A saved exact prompt and canonical player reference are required');
 const promptsUsed=record.imagePrompts??[record.imagePrompt];
 if(!Array.isArray(promptsUsed)||promptsUsed[0]!==record.imagePrompt||promptsUsed.some(prompt=>typeof prompt!=='string'||!prompt.trim()))throw new Error('Every original and refinement prompt must be saved before registration');
 const opponentId='beast_a02',opponentReference=referenceFor(opponentId);
 if(record.opponentReference!==opponentReference||job.referenceSha256!==hash(record.playerReference))throw new Error('Canonical source mismatch');
 const sceneDir=`.tmp/beast-production/${id}/staging`,file=`${sceneDir}/paired-source-v1.png`;
 fs.mkdirSync(sceneDir,{recursive:true});
 if(fs.existsSync(file)&&hash(file)!==hash(source))throw new Error('Existing source differs; preserve it and explicitly prepare a new version');
 if(!fs.existsSync(file))fs.copyFileSync(source,file);
 const sceneSha256=hash(file),provenanceReport=`${sceneDir}/provenance.json`;
 const at=new Date().toISOString();
 write(provenanceReport,{tool:record.imageTool,playerId:id,opponentId,canonicalPlayer:record.playerReference,canonicalPlayerSha256:hash(record.playerReference),canonicalOpponent:opponentReference,canonicalOpponentSha256:hash(opponentReference),file,sha256:sceneSha256,source:path.resolve(source).replaceAll('\\','/'),prompts:promptsUsed,review,acceptedForAnimationCandidate:true,recordedAt:at});
 Object.assign(record,{status:'source-scene-ready-awaiting-video',scene:file,sceneSha256,sceneReview:review,sceneRecordedAt:at,provenanceReport,videoProduced:false,videoSubmitted:false,
  animationPrompt:`Animate the supplied full-body scene with the RIGHT ${job.name} as player and the LEFT ${opponentId} as silent training opponent. Preserve the exact original wings, chest ornament, mane, limb/hoof shapes and tail. Keep planted support during preparation and preserve the player's natural mouth rather than adding predator fangs. ${MUTUAL_BITE_ACTION}`,
  timeline:MUTUAL_BITE_TIMELINE,voiceCandidateSha256:hash(record.voiceCandidate),nextAction:'Verify video-provider availability, then submit the saved scene and player voice for a six-second candidate; retain exact source and review requirements.'});
 write(report,record);
 Object.assign(job,{preparationReport:report,contractVersion:MUTUAL_BITE_VERSION,timeline:MUTUAL_BITE_TIMELINE,opponentId,opponentReference,opponentReferenceSha256:hash(opponentReference),sceneReference:file,sceneReferenceSha256:sceneSha256,voiceCandidate:record.voiceCandidate,voiceCandidateSha256:record.voiceCandidateSha256,prompt:record.animationPrompt});
 write(jobFile,job);
 const promptFile='reports/beast-production/staging-prompt-set.json',prompts=read(promptFile);
 const existing=prompts.artifacts.find(item=>item.cardId===id&&item.file===file);
 if(existing&&JSON.stringify(existing.prompts)!==JSON.stringify(promptsUsed))throw new Error('Stored prompt differs; preserve and inspect its history');
 if(!existing){prompts.artifacts.push({cardId:id,file,source:path.resolve(source).replaceAll('\\','/'),prompts:promptsUsed,review});write(promptFile,prompts);}
 console.log({cardId:id,sourceScene:file,preparationReport:report,videoSubmitted:false,videoProduced:false});
});
