import fs from 'node:fs';
import {GoogleGenAI} from '@google/genai';
import {referenceFor,withJobLock} from './beast-six-second-production.mjs';
import {awaitOmniResponse,saveOmniCandidate} from './beast-omni-result.mjs';
import {recordProviderError} from './beast-provider-error.mjs';
import {writeJsonAtomic as write} from './beast-production-io.mjs';
const id=process.argv[2];referenceFor(id);
await withJobLock(id,async()=>{
  const job=JSON.parse(fs.readFileSync(`reports/beast-production/${id}.json`,'utf8'));
  if(!job.omniInteractionId||!['generating','submission-uncertain','quota-blocked','retrieval-paused'].includes(job.state))throw new Error('Resume needs an existing interaction id and unfinished job; never submit from this command');
  if(job.quota?.retryAt&&Date.now()<Date.parse(job.quota.retryAt))throw new Error('Wait for the recorded quota retry time; keep the existing interaction id');
  const key=/^GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync('.env.local','utf8'))?.[1]?.trim();
  if(!key)throw new Error('Provider credential unavailable');
  const ai=new GoogleGenAI({apiKey:key});
  let response;
  try{
    response=await ai.interactions.get(job.omniInteractionId,{include_input:false},{timeout:120000,maxRetries:2});
    response=await awaitOmniResponse(ai,job,response);
  }catch(error){recordProviderError(job,error,key);write(`reports/beast-production/${id}.json`,job);throw new Error(job.providerMessage);}
  saveOmniCandidate(job,response);
});
