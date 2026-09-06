// Synchronize the production recipe, not approval. No pending movie is published here.
import fs from 'node:fs';
import { prepare } from './beast-six-second-production.mjs';
import { MUTUAL_BITE_VERSION } from './beast-mutual-bite-recipe.mjs';
import { writeJsonAtomic } from './beast-production-io.mjs';
import { skillProductionRecord } from './beast-skill-production-record.mjs';
const jobs = prepare();
const edits = [];
const registrations=[];
function edit(file, change) {
  const before = fs.existsSync(file)?fs.readFileSync(file, 'utf8'):null;
  const value = before===null?{}:JSON.parse(before); change(value);
  edits.push({file,before,after:JSON.stringify(value,null,2)+'\n'});
}
for (const job of jobs) {
  const production=skillProductionRecord(job);
  registrations.push({position:registrations.length+1,cardId:job.cardId,name:job.name,skillId:'skill_charge',skillFile:`/skill-battle-archive/cards/${job.cardId}/skill_charge.json`,state:job.state,latestAttempt:production.latestAttempt,candidate:production.candidate,visualReview:production.review.status,visualReport:production.review.visualReport,voiceCandidateRegistered:Boolean(production.voice),blocker:production.blocker,...(production.sourceScene?{sourceScene:production.sourceScene}:{})});
  const dir=`public/skill-battle-archive/cards/${job.cardId}`;
  for(const file of [`${dir}/skills.json`,`${dir}/skill_charge.json`]) edit(file, value=>{
    const charge=value.skills ? value.skills.find(s=>s.skillId==='skill_charge') : value;
    if(!charge || charge.skillId!=='skill_charge') throw new Error(`Missing charge: ${file}`);
    charge.durationMs=6000;
    charge.production=production;
  });
}
edit('public/skill-battle-archive/index.json', value=>{
  const charge=value.skillCatalog.skills.find(s=>s.id==='skill_charge');
  charge.durationMs=6000;
  charge.desc='玩家先咬、對手反咬、玩家再次命中與收勢；六秒聲畫須符合雙方本體及玩家原聲';
  charge.readyRequires=['approved review with evidence and hashes','matching player and opponent','decodable six-second MP4 and WebM'];
  value.production={version:MUTUAL_BITE_VERSION,registrationCatalog:'/skill-battle-archive/production-catalog.json',registeredSkills:registrations.length,candidateMovies:registrations.filter(r=>r.candidate).length,missingMovies:registrations.filter(r=>!r.candidate).length,jobIndex:'reports/beast-production/index.json',audioReview:'reports/beast-production/audio-summary-mutual.json',releaseAudit:'reports/beast-production/release-summary.json',approvedMovies:jobs.filter(j=>j.state==='approved').length};
});
edit('public/skill-battle-archive/production-catalog.json',value=>Object.assign(value,{title:'六十隻神獸戰鬥技能製作登錄',version:MUTUAL_BITE_VERSION,durationMs:6000,perspective:'player',opponentVoice:false,registeredSkills:registrations.length,candidateMovies:registrations.filter(r=>r.candidate).length,missingMovies:registrations.filter(r=>!r.candidate).length,voiceCandidates:registrations.filter(r=>r.voiceCandidateRegistered).length,scope:'Skill registration and local review assets; this catalog does not grant battle playback approval.',cards:registrations}));
// Refuse to replace changes arriving during planning.
for(const {file,before} of edits) if((fs.existsSync(file)?fs.readFileSync(file,'utf8'):null)!==before) throw new Error(`Concurrent edit: ${file}`);
let changed=0;
for(const {file,before,after} of edits) if(before?.replace(/\r\n/g,'\n')!==after) {
  writeJsonAtomic(file,JSON.parse(after)); changed++;
}
console.log(`Synchronized ${jobs.length} beast recipes (${changed} files); no movie approval or live publication performed.`);
