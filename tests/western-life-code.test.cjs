const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.tmp/western-life-code-build');
execFileSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), 'lib/western-life-code/engine.ts', '--outDir', output, '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--resolveJsonModule', '--esModuleInterop', '--skipLibCheck'], { cwd: root, stdio: 'inherit' });
const { calculateLifeCode, reduceNumber } = require(path.join(output, 'lib/western-life-code/engine.js'));
const calculate = (birthDate, extra = {}) => calculateLifeCode({ birthDate, targetDate: '2026-02-03', ...extra });
const get = (result, id) => result.cards.find(c => c.id === id);
let checks = 0;
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
const a = calculate('1993-07-24');
equal(a.exploration.chapters.flatMap(chapter => chapter.cards.map(card => card.id)).sort(), a.cards.map(card => card.id).sort());
for (const chapter of a.exploration.chapters) {
  for (const item of chapter.cards) { equal(item.final_value, get(a, item.id).final_value); equal(item.steps, get(a, item.id).steps); }
}
equal(a.exploration.chapters[0].cards[0].station, '第 1 站 / 共 9 站');
equal(a.exploration.answer.primary.display,get(a,'lifePath').display);
const customer74=calculate('1974-06-28').exploration.answer.customerSummary;
equal(customer74.absent,[3,5]); equal(customer74.maximum,1); equal(customer74.zeroCount,1);
equal(customer74.counts.reduce((n,c)=>n+c.count,0)+customer74.zeroCount,8);
equal(a.exploration.answer.customerSummary.abundant,[9]);
equal(a.exploration.answer.customerSummary.maximum,2);
assert.notEqual(a.exploration.answer.customerSummary.conclusion,customer74.conclusion); checks++;
assert.notEqual(calculate('1993-07-24',{name:'JOHN'}).exploration.answer.customerSummary.nameLine,calculate('1993-07-24',{name:'MARY'}).exploration.answer.customerSummary.nameLine); checks++;
assert(calculate('1983-11-22').exploration.answer.customerSummary.birthCountRule.includes('不是Phillips'));checks++;
equal(a.exploration.answer.groups.flatMap(group=>group.cards.map(card=>card.id)).sort(),a.cards.map(card=>card.id).sort());
for(const item of a.exploration.answer.groups.flatMap(group=>group.cards)){equal(item.display,get(a,item.id).display);equal(item.result_id,get(a,item.id).result_id);}
for (const birthDate of ['1993-07-24','1998-10-15','1983-11-22','2000-01-01','1974-06-28']) {
  const walkthroughResult=calculate(birthDate,{name:'John Michael Smith'});
  for (const item of walkthroughResult.cards) {
    if(item.status!=='PASSED'){ equal(item.walkthrough,[]); continue; }
    equal(item.walkthrough.at(-1).result,item.display);
    for(const frame of item.walkthrough){
      if(frame.kind==='sum') equal(frame.tokens.map(Number).reduce((a,b)=>a+b,0),Number(frame.result));
      if(frame.kind==='difference') equal(Number(frame.tokens[0])-Number(frame.tokens[1]),Number(frame.result));
    }
  }
}
equal(get(a,'lifePath').walkthrough.filter(f=>f.title.includes('保留')).map(f=>f.result),['22']);
equal(get(calculate('2000-01-01'),'challenges').walkthrough.filter(f=>f.kind==='difference').map(f=>f.result),['0','1','1','1']);
equal(get(calculate('1974-06-28'),'birthday').walkthrough.at(-1).result,'28');
equal(get(a, 'lifePath').intermediate_values.map(t => t.sequence), [[7], [24,6], [1993,22], [35,8]]);
equal(get(a, 'lifePath').final_value, 8);
equal(get(a, 'challenges').final_value, [1,2,1,3]);
equal(get(a, 'pinnacles').final_value, [4,1,5,11]);
equal(get(a, 'periods').final_value, [7,6,22]);
const b = calculate('1998-10-15');
equal(get(b, 'lifePath').intermediate_values.map(t => t.sequence), [[10,1], [15,6], [1998,27,9], [16,7]]);
equal(get(b, 'debt').final_value, [16]);
equal(get(calculate('1983-11-22'), 'lifePath').intermediate_values.map(t => t.sequence), [[11], [22], [1983,21,3], [36,9]]);
equal(get(calculate('1993-07-24'), 'debt').final_value, []);
equal(get(calculate('2000-01-01'), 'challenges').final_value, [0,1,1,1]);
equal(get(calculate('1990-11-28'), 'attitude').intermediate_values[0].sequence, [39,12,3]);
equal(reduceNumber(33, false).sequence, [33,6]);
equal(reduceNumber(33, true).sequence, [33]);
for (const date of ['2026-02-30','1900-02-29','2023-02-29','2024-13-01','2024-00-01','2024-01-00','1974/06/28','63-06-28','0000-01-01']) {
 assert.throws(() => calculate(date)); checks++;
}
assert.doesNotThrow(() => calculate('2000-02-29')); checks++;
assert.doesNotThrow(() => calculate('2024-02-29')); checks++;
assert.throws(() => calculate('1993-07-24', {calendarType:'lunar'})); checks++;
assert.throws(() => calculate('1993-07-24', {school:'PHILLIPS'})); checks++;
assert.throws(() => calculate('1993-07-24', {targetDate:'2026-02-30'})); checks++;
assert.throws(() => calculate('1993-07-24', {name:123})); checks++;
const named = calculate('1993-07-24', {name:'John Michael Smith'});
equal(named.input.originalName, 'John Michael Smith');
equal(get(named,'expression').intermediate_values.map(t=>t.sequence), [[20,2],[33],[24,6],[41,5]]);
equal(get(named,'soul').final_value, 3);
equal(get(named,'personality').final_value, 2);
equal(get(named,'maturity').final_value, 4);
equal(named.nameLetters[1].letters.map(l=>l.value), [4,9,3,8,1,5,3]);
for (const name of ['王小明','José Smith','Anne-Marie']) { equal(get(calculate('1993-07-24',{name}),'expression').final_value,null); }
const withY = calculate('1993-07-24',{name:'MARY'});
equal(get(withY,'expression').final_value,3); equal(get(withY,'soul').status,'UNVERIFIED'); equal(get(withY,'personality').status,'UNVERIFIED');
equal(get(calculate('1993-07-24',{name:'BCDF'}),'soul').status,'UNVERIFIED');
const forecast=calculate('1990-05-15');
equal(['year','month','day'].map(id=>get(forecast,id).final_value),[3,5,8]);
equal(get(forecast,'year').intermediate_values[0].sequence,[2046,12,3]);
equal(get(calculate('1990-05-15',{targetDate:'2027-01-01'}),'year').final_value,4);
equal(get(a,'phillipsGrid').status,'UNVERIFIED');
equal(get(a,'phillipsGrid').final_value,null);
equal(calculate('1993-07-24'),a);
for (const date of ['1974-06-28','1993-11-22','2000-01-01']) {
  const traced = calculate(date);
  const ordered=get(traced,'lifePath');
  assert(ordered.walkthrough[0].title.startsWith('出生年')); checks++;
  equal(ordered.walkthrough[0].progress.before,[]);
  equal(ordered.walkthrough.at(-1).progress.before,[2,0,1].map(i=>({label:['月','日','年'][i],value:String(ordered.intermediate_values[i].final)})));
  assert(ordered.walkthrough[0].pace.take>=2010); checks++;
  for (const id of ['lifePath','birthday','attitude','challenges','pinnacles','periods']) {
    for (const frame of get(traced,id).walkthrough) {
      if (!frame.origin) continue;
      equal(frame.origin.birthday.join(''),date);
      equal(frame.origin.slots.map(slots=>slots.map(slot=>frame.origin.values[slot]).join('')),frame.tokens);
    }
  }
}
const registry=require(path.join(output,'docs/技能戰鬥檔案/西方生命密碼/來源登記.json'));
const source=registry.sources.find(s=>s.id==='DECOZ-HOW');
const expectedMeanings=['開創與自主','協調與合作','表達與創造','建構與秩序','自由與探索','照顧與責任','求知與洞察','管理與承擔','關懷與大局'];
const covered=new Map();
for(const year of [1980,1990]) for(const month of ['01','09']) for(let day=1;day<=28;day++) {
  const date=`${year}-${month}-${String(day).padStart(2,'0')}`;
  const result=calculate(date), number=get(result,'lifePath').final_value;
  if(number>9) continue;
  const reading=result.exploration.answer.primaryReading;
  equal(reading.status,'AVAILABLE');
  equal(reading.content.title,`${number} · ${expectedMeanings[number-1]}`);
  equal(reading.content.source.id,`DECOZ-LIFE-${number}`);
  equal(reading.content.sections.map(s=>s.id),['strength','challenge','action']);
  assert(reading.content.evidence.includes(date));checks++;
  covered.set(number,reading.content);
}
equal(covered.size,9);
for(const field of ['meaning','declaration']) equal(new Set([...covered.values()].map(r=>r[field])).size,9);
for(let i=0;i<3;i++) equal(new Set([...covered.values()].map(r=>r.sections[i].text)).size,9);
const one=calculate('1974-06-28').exploration.answer.primaryReading;
equal(one.content.title,'1 · 開創與自主');
equal(one,calculate('1974-06-28').exploration.answer.primaryReading);
equal(one.content.meaning,covered.get(1).meaning);
assert.notEqual(one.content.evidence,covered.get(1).evidence);checks++;
const namedOne=calculate('1974-06-28',{name:'曾威諺',targetDate:'2026-10-28'}).exploration.answer.primaryReading.content.asuraTimeline;
equal(namedOne.status,'AVAILABLE');
equal(namedOne.minimumAge,18);
equal(namedOne.statusMessage,'');
equal(namedOne.subjectName,'曾威諺');
equal(namedOne.age,52);
equal(namedOne.birthdayPassedThisYear,true);
equal(namedOne.isStageTransitionPending,false);
equal(namedOne.stageKey,'sovereign');
assert(namedOne.openingCallout.startsWith('曾威諺。你現年 52 歲'));checks++;
equal(namedOne.cards.map(c=>c.id),['past','present','future']);
assert.notEqual(namedOne.cards[1].text,calculate('2001-06-26',{targetDate:'2026-10-28'}).exploration.answer.primaryReading.content.asuraTimeline.cards[1].text);checks++;
for(const [birthDate,targetDate,expectedAge,passed] of [
  ['2009-10-29','2026-10-28',16,false],
  ['2009-10-28','2026-10-28',17,true],
  ['2008-10-29','2026-10-28',17,false],
  ['2010-05-01','2035-05-01',25,true],
  ['1993-07-24','2010-07-23',16,false],
]) {
  const withheld=calculate(birthDate,{targetDate}).exploration.answer.primaryReading.content.asuraTimeline;
  equal(withheld.status,'WITHHELD');
  equal(withheld.minimumAge,18);
  equal(withheld.age,expectedAge);
  equal(withheld.birthdayPassedThisYear,passed);
  equal(withheld.isStageTransitionPending,false);
  equal(withheld.stageKey,null);
  equal(withheld.stageLabel,'');
  equal(withheld.nextStageLabel,'');
  equal(withheld.openingCallout,'');
  equal(withheld.cards,[]);
  assert(withheld.statusMessage.includes('實歲滿 18 歲')); checks++;
  assert(withheld.subjectBadge.includes(passed?'今年生日已過':'今年生日未到')); checks++;
}
for(const [birthDate,expectedAge,passed,pending,stage,nextStage] of [
  ['2008-10-28',18,true,false,'vanguard','33–48 歲 · 中場扛局期'],
  ['1993-10-29',32,false,true,'vanguard','33–48 歲 · 中場扛局期'],
  ['1993-10-28',33,true,false,'commander','49 歲以上 · 統帥定局期'],
  ['1977-10-29',48,false,true,'commander','49 歲以上 · 統帥定局期'],
  ['1977-10-28',49,true,false,'sovereign','統帥定局與傳承收官期'],
]) {
  const tl=calculate(birthDate,{targetDate:'2026-10-28'}).exploration.answer.primaryReading.content.asuraTimeline;
  equal(tl.status,'AVAILABLE');
  equal(tl.minimumAge,18);
  equal(tl.age,expectedAge); equal(tl.birthdayPassedThisYear,passed); equal(tl.isStageTransitionPending,pending);
  equal(tl.stageKey,stage); equal(tl.nextStageLabel,nextStage);
  assert(tl.subjectBadge.includes(passed?'今年生日已過':'今年生日未到')); checks++;
  assert(tl.cards[0].text.includes(`這 ${expectedAge} 年走來的路。`)); checks++;
  assert(tl.cards[1].text.includes(`你今年實歲 ${expectedAge} 歲。`)); checks++;
  assert(tl.cards[2].text.includes(`從實歲 ${expectedAge} 歲往後看。`)); checks++;
  assert(tl.cards[2].title.includes(nextStage)); checks++;
  assert(tl.cards[2].yearDirection.length>0); checks++;
  if(pending){ assert(tl.cards[1].yearDirection.includes('今年生日未到，實歲仍停在')); checks++; }
}
for(const [date,number] of [['1990-01-09',11],['1980-09-04',22],['2009-11-11',33]]) {
  const result=calculate(date);
  equal(get(result,'lifePath').final_value,number);
  equal(result.exploration.answer.primaryReading.content,null);
  equal(result.exploration.answer.primaryReading.status,'UNAVAILABLE');
  assert(result.exploration.answer.primaryReading.statusMessage.includes(String(number)));checks++;
}
const meaningSource=registry.sources.find(s=>s.id==='DECOZ-LIFE-1');
for(const status of ['UNVERIFIED','CONFLICT']) {
  meaningSource.status=status;
  const result=calculate('1974-06-28');
  equal(get(result,'lifePath').final_value,1);
  equal(result.exploration.answer.primaryReading.content,null);
  equal(result.exploration.answer.primaryReading.status,'UNAVAILABLE');
}
meaningSource.status='LOCATED';
source.status='CONFLICT';
equal(calculate('1974-06-28').exploration.answer.primaryReading.content,null);
equal(get(calculate('1993-07-24'),'lifePath').walkthrough,[]);
equal(get(calculate('1993-07-24'),'lifePath').status,'CONFLICT');
equal(get(calculate('1993-07-24'),'lifePath').final_value,null);
source.status='UNVERIFIED'; equal(get(calculate('1993-07-24'),'lifePath').final_value,null); source.status='LOCATED';
const client=fs.readFileSync(path.join(root,'components/nine-grid/WesternLifeCode.tsx'),'utf8');
assert(!client.includes('calculateLifeCode(')); assert(client.includes("import type {")); checks+=2;
console.log(`PASS: ${checks} checks — independent formulas, full traces, dates, names/Y, source conflicts and display-only client`);
