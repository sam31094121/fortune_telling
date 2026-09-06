/** Classify a returned error without retrying a paid request. */
export function recordProviderError(job,error,secret='',at=new Date().toISOString()){
  const message=String(error.message??error).replaceAll(secret||'\u0000','[REDACTED]').slice(0,3000);
  const status=Number(error.status??error.code)||null;
  Object.assign(job,{providerStatus:status,providerMessage:message,providerReturnedAt:at});
  if(status===429){
    const retry=/retry in\s+(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?/i.exec(message);
    const seconds=retry?Number(retry[1]??0)*3600+Number(retry[2]??0)*60+Number(retry[3]??0):0;
    job.state='quota-blocked';
    job.quota={observedAt:at,scope:/monthly spending cap|monthly spend cap/i.test(message)?'monthly-spend':/per_day|per_model_per_day/i.test(message)?'daily':'unspecified',retryAt:seconds>0?new Date(Date.parse(at)+Math.ceil(seconds)*1000).toISOString():null,resumeExisting:Boolean(job.omniInteractionId)};
  }else job.state=job.omniInteractionId?'retrieval-paused':status&&status<500?'provider-rejected':'submission-uncertain';
  return job;
}
