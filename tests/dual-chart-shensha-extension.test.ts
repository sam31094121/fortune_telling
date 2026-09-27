import assert from 'node:assert/strict';
import { createBaziCore, BRANCHES, type Stem, type BaziProfessionalResult } from '../lib/bazi/engine';
import { buildDualChartShenSha } from '../lib/dual-chart-shensha';
import { getBaziTraditionalOutputGate } from '../lib/bazi-traditional-gate';
import { calculateDualChart } from '../lib/dual-chart';
import { buildShenShaIChing } from '../lib/shensha-iching';

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
// No gender supplied: 元辰 is withheld as BLOCKED_DATA, every other paper-chart item still appears.
assert.deepEqual(scoped.byPillar.hour.map(s=>s.name),['龍德','六厄','羊刃','桃花','外桃花']);
assert.deepEqual(scoped.byPillar.year.map(s=>s.name),['天德合','驛馬','隔角']);
assert.equal(scoped.coverage.find(s=>s.id==='taohua')?.status,'MATCHED');
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
// Reference-chart method (owner decision 2026-09-27): day-branch trine, all four pillars including the day itself.
let jiangxingCases=0;
for (const dayBranch of BRANCHES) for (const targetKey of ['year','month','hour'] as const) for (const candidate of BRANCHES) {
  const fixture=structuredClone(base);
  fixture.shenSha=[];
  const target=expectedJiangxing[dayBranch];
  fixture.pillars.day.earthlyBranch=dayBranch;
  for (const key of ['year','month','hour'] as const) {
    const pillar=fixture.pillars[key];
    if (pillar === 'UNKNOWN') throw new Error(`fixture requires known ${key}`);
    pillar.earthlyBranch=BRANCHES.find(branch=>branch!==target)!;
  }
  const targetPillar=fixture.pillars[targetKey];
  if (targetPillar === 'UNKNOWN') throw new Error(`fixture requires known ${targetKey}`);
  targetPillar.earthlyBranch=candidate;
  const result=buildDualChartShenSha(fixture,gate,'male');
  const hitKeys=(['year','month','day','hour'] as const).filter(k=>result.byPillar[k].some(s=>s.id==='jiangxing'));
  const expectedKeys=(['year','month','day','hour'] as const).filter(k=>(k===targetKey&&candidate===target)||(k==='day'&&dayBranch===target));
  assert.deepEqual(hitKeys,expectedKeys,`${dayBranch}/${targetKey}/${candidate}`);
  jiangxingCases++;
}
const blocked=buildDualChartShenSha(base,{...gate,coreReady:false});
// Reference-chart method: day branch advanced two places, inspected in year, month and hour.
const gejiaoPairs = { 子:'寅',丑:'卯',寅:'辰',卯:'巳',辰:'午',巳:'未',午:'申',未:'酉',申:'戌',酉:'亥',戌:'子',亥:'丑' };
let gejiaoCases=0;
for (const day of BRANCHES) for (const key of ['year','month','hour'] as const) for (const candidate of BRANCHES) {
  const fixture=structuredClone(base);
  fixture.shenSha=[];
  const target=gejiaoPairs[day] as typeof BRANCHES[number];
  fixture.pillars.day.earthlyBranch=day;
  for (const p of ['year','month','hour'] as const) {
    const model=fixture.pillars[p];
    if(model==='UNKNOWN') throw new Error('known pillars required');
    model.earthlyBranch=p===key?candidate:BRANCHES.find(b=>b!==target)!;
  }
  const output=buildDualChartShenSha(fixture,gate,'male');
  const matched=candidate===target;
  assert.equal(output.rules.gejiao.outputStatus,'READY');
  assert.deepEqual(output.coverage.find(s=>s.id==='gejiao')?.matchedPillars,matched?[key==='year'?'year':key]:[]);
  assert.equal(output.byPillar.day.some(s=>s.id==='gejiao'),false,'day is anchor, never target');
  gejiaoCases++;
}
assert.equal(blocked.raw.some(s=>s.id==='gejiao'),false);
assert.equal(blocked.raw.some(s=>s.id==='yangren'),false);
assert.ok(Object.values(blocked.byPillar).every(a=>a.length===0));
const invalidCore=structuredClone(base);
invalidCore.verification.readyForInterpretation=false;
const invalidOutput=buildDualChartShenSha(invalidCore,gate);
assert.ok(Object.values(invalidOutput.byPillar).every(a=>a.length===0),'caller gate must not override unverified core');
assert.ok(invalidOutput.coverage.filter(s=>s.status!=='UNSUPPORTED').every(s=>s.status==='BLOCKED_CORE'),'blocked core must not look like a miss');
const partial: BaziProfessionalResult=structuredClone(base);
partial.pillars.hour='UNKNOWN';
assert.equal(buildDualChartShenSha(partial,gate).coverage.find(s=>s.id==='waiTaohua')?.status,'BLOCKED_DATA','unknown hour cannot be a 外桃花 miss');
assert.equal(buildDualChartShenSha(partial,gate).raw.some(s=>s.evidence.startsWith('HOUR')),false);
assert.equal(buildDualChartShenSha(partial,gate).raw.some(s=>s.id==='yangren'&&s.evidence.startsWith('HOUR')),false);
const input={birthDate:'1974-06-28',birthTime:'18:00',gender:'male',calendarType:'solar',timezone:'Asia/Taipei'};
const actual=calculateDualChart(input);
assert.deepEqual(actual.core.pillars,base.pillars,'extension cannot change the four pillars');
assert.deepEqual(actual.core.shenSha,actual.bazi.professionalChart.shenSha);
// Golden: owner's paper chart 1974-06-28 18:00 male (甲寅／庚午／庚子／乙酉), 17 items pillar by pillar.
const paper={ year:['天德合','驛馬','隔角'], month:['金匱','五鬼','沐浴','日破'], day:['天狗','災煞','月破','將星'], hour:['龍德','六厄','元辰','羊刃','桃花','外桃花'] };
for (const key of ['year','month','day','hour'] as const) assert.deepEqual(actual.specialStars.byPillar[key].map(s=>s.name),paper[key],`paper chart ${key}`);
assert.equal(actual.specialStars.card.state,'received');
assert.ok(actual.specialStars.coverage.every(s=>['MATCHED','NOT_MATCHED'].includes(s.status)),'every rule evaluated for the paper chart');
// 《神煞易經》第④層：同一張盤起卦，每一個命中的神煞都逐項延伸，順序固定 八字→紫微→特星神煞→易經。
const ic=actual.specialStars.iching;
assert.equal(ic.state,'READY');
if(ic.state==='READY'){
  assert.deepEqual(ic.chain.map(c=>c.step),['八字','紫微','特星神煞','易經']);
  assert.equal(ic.items.length,17,'every shensha extends into the reading');
  for (const key of ['year','month','day','hour'] as const) {
    const label={year:'年柱',month:'月柱',day:'日柱',hour:'時柱'}[key];
    assert.deepEqual(ic.items.filter(i=>i.pillar===label).map(i=>i.name),paper[key],`reading keeps ${key} in the card order`);
  }
  assert.ok(ic.items.every(i=>i.derivation&&!i.derivation.includes('；')),'derivation is customer-readable');
  assert.ok(ic.reading.some(line=>line.includes(ic.hexagram.name)));
  assert.ok(!ic.reading.join('').match(/主(吉|凶)|大吉|大凶|必定/),'no unsourced good/bad verdicts');
  assert.equal(ic.credibility.status,'PENDING_POOL');
  assert.ok(!ic.credibility.line.includes('已通過交叉比對'),'unverified claim cannot sound verified');
  assert.deepEqual(calculateDualChart(input).specialStars.iching,ic,'same chart, same hexagram and reading');
}
// 八字紫微四柱不一致：停在核對關，不判定、不自動改任一套。
const mismatch=buildDualChartShenSha(base,gate,'male',{passed:false,mismatches:['日柱：八字庚子、紫微辛丑']});
assert.ok(Object.values(mismatch.byPillar).every(a=>a.length===0));
assert.ok(mismatch.card.notice?.includes('日柱：八字庚子、紫微辛丑'));
assert.ok(mismatch.coverage.every(s=>s.reason.includes('八字與紫微四柱不一致')));
const blockedIching=buildShenShaIChing({pillars:{year:'甲寅',month:'庚午',day:'庚子',hour:'乙酉'},pillarCheckPassed:false,card:mismatch.card,iching:{status:'UNAVAILABLE_BIRTH_TIME_REQUIRED',reason:'x'}});
assert.equal(blockedIching.state,'BLOCKED','no hexagram when bazi and ziwei disagree');
const lateZi=calculateDualChart({...input,birthTime:'23:30'});
// Same pillar check as 三合一 (runZiweiLayer + verifyFourPillars): late-zi keeps one consistent day pillar.
assert.equal(lateZi.specialStars.card.state,'received');
assert.equal(lateZi.core.pillars.day.ganZhi,'庚子');
assert.equal(actual.specialStars.coverage.find(s=>s.id==='yuanchen')?.status,'MATCHED');
assert.deepEqual(calculateDualChart(input).specialStars,actual.specialStars,'repeat result deterministic');
const changed=calculateDualChart({...input,birthTime:'15:30'});
assert.equal(changed.core.shenSha.some(s=>s.id==='yangren'),false,'different hour does not inherit a hardcoded hit');
assert.equal(base.shenSha instanceof Array&&base.shenSha.some(s=>s.id==='yangren'),false,'other cards retain original shared core');
console.log(`PASS paper chart 17/17 + bazi/ziwei pillar gate + ${cases} 羊刃 combinations + ${yuanchenCases} 元辰 combinations + ${jiangxingCases} 將星 combinations + ${gejiaoCases} 隔角 combinations + gates, missing data, scope, alternate hour, determinism and shared-core isolation`);
