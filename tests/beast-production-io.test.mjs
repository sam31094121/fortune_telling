import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {writeJsonAtomic} from '../scripts/beast-production-io.mjs';
const directory=fs.mkdtempSync(path.resolve('.tmp/beast-io-test-'));
const file=path.join(directory,'job.json');
writeJsonAtomic(file,{state:'before-submission'});
const rename=fs.renameSync;
let denied=0;
try {
  fs.renameSync=(...args)=>{
    if(denied++<2){assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).state,'before-submission');throw Object.assign(new Error('Windows reader lock'),{code:'EPERM'});}
    return rename(...args);
  };
  writeJsonAtomic(file,{state:'candidate-ready'});
  assert.equal(denied,3);
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).state,'candidate-ready');
  fs.renameSync=()=>{throw Object.assign(new Error('Permanent disk failure'),{code:'EIO'});};
  assert.throws(()=>writeJsonAtomic(file,{state:'must-not-replace'}),{code:'EIO'});
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).state,'candidate-ready');
  const retained=fs.readdirSync(directory).filter(name=>name.endsWith('.tmp'));
  assert.equal(retained.length,1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory,retained[0]),'utf8')).state,'must-not-replace');
} finally {fs.renameSync=rename;}
console.log('PASS: transient Windows rename locks recover; permanent errors preserve original and recovery file without touching any generation API');
