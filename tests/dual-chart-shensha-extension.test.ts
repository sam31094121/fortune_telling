import assert from 'node:assert/strict';
import { createBaziCore, BRANCHES, type Stem, type BaziProfessionalResult } from '../lib/bazi/engine';
import { buildDualChartShenSha } from '../lib/dual-chart-shensha';
import { getBaziTraditionalOutputGate } from '../lib/bazi-traditional-gate';
import { calculateDualChart } from '../lib/dual-chart';

// Independent transcription: 1937 printed p72, PDF103; 1938 PDF80–81.
const expected: Record<Stem, string> = { 甲:'卯',乙:'辰',丙:'午',丁:'未',戊:'午',己:'未',庚:'酉',辛:'戌',壬:'子',癸:'丑' };
const expectedJiangxing: Record<string,string> = { 子:'子',丑:'酉',寅:'午',卯:'卯',辰:'子',巳:'酉',午:'午',未:'卯',申:'子',酉:'酉',戌:'午',亥:'卯' };
const base = createBaziCore({ birthDate:'1974-06-28', birthTime:'18:00', birthTimeKnown:true, gender:'male' });
const gate = getBaziTraditionalOutputGate(true);
let cases = 0;
for (const [stem,target] of Object.entries(expected)) for(const branch of BRANCHES) for(const key of ['year','month','day','hour'] as const) {
  const fixture = structuredClone(base);
  fixture.shenSha=[];
  fixture.dayMaster.stem=stem as Stem;
  // Synthetic rule-only fixtures: isolate exactly one target pillar.
  for (const p of ['year','month','day','hour'] as const) {
    const model=fixture.pillars[p];
    if(model!=='UNKNOWN') model.earthlyBranch=BRANCHES.find(b=>b!==target)!;
  }
  const model=fixture.pillars[key];
  if(model!=='UNKNOWN') model.earthlyBranch=branch;
  const result=buildDualChartShenSha(fixture,gate);
  const matches=result.raw.filter(s=>s.id==='yangren');
  assert.equal(matches.length,key!=='day'&&branch===target?1:0,`${stem}/${key}/${branch}`);
  if(matches.length) assert.equal(matches[0].evidence,`${key.toUpperCase()} 支${branch}`);
  cases++;
}
const snapshot=JSON.stringify(base);
const scoped=buildDualChartShenSha(base,gate);
assert.equal(JSON.stringify(base),snapshot,'shared input is never mutated');
assert.equal(scoped.rules.yangren.outputStatus,'READY');
assert.equal(scoped.rules.tianyi.outputStatus,'READY');
assert.equal(scoped.rules.wenchang.outputStatus,'READY');
assert.deepEqual(scoped.byPillar.hour.map(s=>s.name),['羊刃']);
assert.deepEqual(scoped.byPillar.year.map(s=>s.name),['驛馬']);
assert.equal(scoped.coverage.find(s=>s.id==='taohua')?.status,'NOT_MATCHED');
assert.equal(scoped.coverage.some(s=>!['MATCHED','NOT_MATCHED','BLOCKED_DATA'].includes(s.status)),false,'adopted scope contains no reference-only gaps');
assert.equal(scoped.coverage.find(s=>s.id==='yuanchen')?.status,'BLOCKED_DATA','missing gender is not a miss');

// Independent Tai Jin v6 transcription: year branch + gender determines one hour branch.
let yuanchenCases=0;
for (const [yearIndex,yearBranch] of BRANCHES.entries()) for (const gender of ['male','female'] as const) for (const hourBranch of BRANCHES) {
  const fixture=structuredClone(base);
  fixture.shenSha=[];
  if(typeof fixture.pillars.hour==='string') throw new Error('fixture requires known hour');
  fixture.pillars.year.earthlyBranch=yearBranch;
  fixture.pillars.hour.earthlyBranch=hourBranch;
  const yangYear=yearIndex%2===0;
  const advance=(yangYear&&gender==='male')||(!yangYear&&gender==='female')?7:5;
  const target=BRANCHES[(yearIndex+advance)%12];
  const result=buildDualChartShenSha(fixture,gate,gender);
  const hits=result.raw.filter(s=>s.id==='yuanchen');
  assert.equal(hits.length,hourBranch===target?1:0,`${yearBranch}/${gender}/${hourBranch}`);
  assert.equal(result.byPillar.year.some(s=>s.id==='yuanchen'),false,'year is anchor, not target');
  assert.equal(result.byPillar.month.some(s=>s.id==='yuanchen'),false,'month is outside selected scope');
  assert.equal(result.byPillar.day.some(s=>s.id==='yuanchen'),false,'day is outside selected scope');
  if(hits.length) assert.equal(hits[0].evidence,`HOUR 支${hourBranch}`);
  yuanchenCases++;
}
let jiangxingCases=0;
for (const dayBranch of BRANCHES) for (const targetKey of ['year','month','day','hour'] as const) for (const candidate of BRANCHES) {
  const fixture=structuredClone(base);
  fixture.shenSha=[];
  const anchorBranch=targetKey==='day'?candidate:dayBranch;
  const target=expectedJiangxing[anchorBranch];
  fixture.pillars.day.earthlyBranch=anchorBranch;
  for (const key of ['year','month','hour'] as const) {
    const pillar=fixture.pillars[key];
    if (pillar === 'UNKNOWN') throw new Error(`fixture requires known ${key}`);
    pillar.earthlyBranch=BRANCHES.find(branch=>branch!==target)!;
  }
  const targetPillar=fixture.pillars[targetKey];
  if (targetPillar === 'UNKNOWN') throw new Error(`fixture requires known ${targetKey}`);
  if(targetKey!=='day') targetPillar.earthlyBranch=candidate;
  const result=buildDualChartShenSha(fixture,gate,'male');
  const hits=result.raw.filter(s=>s.id==='jiangxing');
  assert.equal(hits.length,targetKey!=='day'&&candidate===target?1:0,`${dayBranch}/${targetKey}/${candidate}`);
  assert.equal(result.byPillar.day.some(s=>s.id==='jiangxing'),false,'day is anchor, never target');
  jiangxingCases++;
}
const blocked=buildDualChartShenSha(base,{...gate,coreReady:false});
assert.equal(blocked.raw.some(s=>s.id==='yangren'),false);
assert.ok(Object.values(blocked.byPillar).every(a=>a.length===0));
const invalidCore=structuredClone(base);
invalidCore.verification.readyForInterpretation=false;
const invalidOutput=buildDualChartShenSha(invalidCore,gate);
assert.ok(Object.values(invalidOutput.byPillar).every(a=>a.length===0),'caller gate must not override unverified core');
assert.ok(invalidOutput.coverage.filter(s=>s.status!=='UNSUPPORTED').every(s=>s.status==='BLOCKED_CORE'),'blocked core must not look like a miss');
const partial: BaziProfessionalResult=structuredClone(base);
partial.pillars.hour='UNKNOWN';
assert.equal(buildDualChartShenSha(partial,gate).raw.some(s=>s.id==='yangren'&&s.evidence.startsWith('HOUR')),false);
const input={birthDate:'1974-06-28',birthTime:'18:00',gender:'male',calendarType:'solar',timezone:'Asia/Taipei'};
const actual=calculateDualChart(input);
assert.deepEqual(actual.core.pillars,base.pillars,'extension cannot change the four pillars');
assert.deepEqual(actual.core.shenSha,actual.bazi.professionalChart.shenSha);
assert.deepEqual(actual.specialStars.byPillar.hour.map(s=>s.name),['羊刃','元辰']);
assert.equal(actual.specialStars.coverage.find(s=>s.id==='yuanchen')?.status,'MATCHED');
assert.deepEqual(calculateDualChart(input).specialStars,actual.specialStars,'repeat result deterministic');
const changed=calculateDualChart({...input,birthTime:'15:30'});
assert.equal(changed.core.shenSha.some(s=>s.id==='yangren'),false,'different hour does not inherit a hardcoded hit');
assert.equal(base.shenSha instanceof Array&&base.shenSha.some(s=>s.id==='yangren'),false,'other cards retain original shared core');
console.log(`PASS ${cases} 羊刃 combinations + ${yuanchenCases} 元辰 combinations + ${jiangxingCases} 將星 combinations + gates, missing data, scope, photo, alternate hour, determinism and shared-core isolation`);
