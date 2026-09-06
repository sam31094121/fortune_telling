import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Windows readers/antivirus may briefly deny replacement. Retry only the local rename. */
export function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temporary=`${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  const wait=new Int32Array(new SharedArrayBuffer(4));
  for(let attempt=0;attempt<9;attempt++){
    try {fs.renameSync(temporary,file);return;}
    catch(error){
      if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt===8)throw error;
      Atomics.wait(wait,0,0,Math.min(25*2**attempt,250));
    }
  }
}
