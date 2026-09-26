import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const cache = new Map();
let externalCalls = 0;
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const compiledModule = { exports: {} }; cache.set(file, compiledModule);
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = (id) => {
    if (id === '@google/genai') return { Type: new Proxy({}, {get: (_, key) => key}), GoogleGenAI: class {constructor() { externalCalls++; throw Error('禁止外送'); }} };
    if (id === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (id.startsWith('@/') || id.startsWith('.')) {
      let target = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(file), id);
      if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
      if (!path.extname(target)) target += '.ts';
      return load(target);
    }
    return require(id);
  };
  vm.runInNewContext(code, {require: localRequire, module: compiledModule, exports: compiledModule.exports, console, process, setTimeout, clearTimeout, Response, fetch: () => {externalCalls++; throw Error('禁止外送');}}, {filename:file});
  return compiledModule.exports;
}
try {
  process.env.GEMINI_API_KEY = 'test-key-must-not-be-used';
  assert.equal(load('lib/teacher-provider.ts').googleGenerationKey(), undefined);
  const p = {palaceId:'LIFE',palaceName:'命宮',majorStars:[{id:'ziwei',name:'紫微',category:'MAJOR'}],supportingStars:[],maleficStars:[],transformations:[]};
  const context = {selectedPalace:p,threeHarmony:{harmonyA:p,harmonyB:p,opposite:p},timeContext:{annualYear:2026,currentAge:null,annualTheme:null,sceneMoment:'MORNING'},verified:true};
  const teachers = load('lib/ziwei-teacher/teachers.ts');
  for (const id of ['STRUCTURE_MASTER','LIFE_MASTER','NARRATIVE_MASTER']) {
    const result = await teachers.runTeacher(id,context);
    assert.equal(result.teacherId,id);
    assert.ok(result.evidenceRefs.some(s => s.startsWith('易經：')));
    assert.equal(JSON.stringify(result),JSON.stringify(await teachers.runTeacher(id,context)));
    const empty = {...context,selectedPalace:{...p,majorStars:[]}};
    assert.equal(await teachers.runTeacher(id,empty),load('lib/ziwei-teacher/types.ts').INSUFFICIENT_DATA);
  }
  for (const mode of ['google','horror']) {
    const {POST} = load(`app/api/bazi/${mode}-reading/route.ts`);
    const response = await POST({json:async()=>({dayMaster:'甲',structure:'正官格',shortName:'測試'})});
    const body = await response.json();
    assert.equal(response.status,409);
    assert.equal(body.code,'BAZI_TRADITIONAL_INTERPRETATION_BLOCKED');
    assert.ok(body.message.includes('基礎資料說明'));
    assert.equal(body.message.includes('已核對'), false, '未讀取本次命盤，不得聲稱本次資料已核對');
    assert.equal((await POST({json:async()=>({})})).status,409);
  }
  for (const id of ['HORROR','GHOST']) {
    const result = await load('lib/ziwei-teacher/entertainment.ts').runEntertainmentTeacher(id,context);
    assert.ok(result.disclaimer.includes('虛構'));
    assert.ok(result.narrative.length>50);
  }
  assert.equal(externalCalls,0);
  console.log('PASS 易經老師：三種紫微解讀與娛樂解讀維持；未驗證八字解讀由共同後端守門拒絕；Google 外送 0 次');
  console.log('ZIWEI_TEACHER_CONTRACT_PASSED=true; BAZI_ADVANCED_READING_AVAILABLE=false');
} catch(error) {
  console.error(error); console.log('AI_TEACHER_AVAILABLE=false'); process.exitCode=1;
}
