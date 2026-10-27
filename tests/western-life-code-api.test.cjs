const assert = require('node:assert/strict');
const base = process.env.LIFE_CODE_TEST_URL || 'http://localhost:8888';
const post = body => fetch(base+'/api/western-life-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
(async()=>{
 const guide = await fetch(base+'/api/western-life-code');
 assert(guide.ok); assert.match(guide.headers.get('cache-control'),/no-store/);
 assert.match((await guide.json()).guidance.defaultTargetDate,/^\d{4}-\d{2}-\d{2}$/);
 for(const input of [{birthDate:'2026-02-30'},{birthDate:'1993-07-24',calendarType:'lunar'},{birthDate:'1993-07-24',school:'mixed'}]) {
  const r=await post(input); assert.equal(r.status,400); assert.equal((await r.json()).ok,false);
 }
 const malformed=await fetch(base+'/api/western-life-code',{method:'POST',body:'{'}); assert.equal(malformed.status,400);
 const timings=[];
 for(const [birthDate,expected] of [['1993-07-24',8],['1998-10-15',7],['1983-11-22',9],['1993-07-24',8]]){
  const start=performance.now();
  const r=await post({birthDate,targetDate:'2026-02-03',name:'John Michael Smith'});
  const data=await r.json(); timings.push(Math.round(performance.now()-start));
  assert(r.ok); assert.equal(data.result.input.birthDate,birthDate);
  const card=data.result.cards.find(c=>c.id==='lifePath'); assert.equal(card.final_value,expected);
  assert.equal(card.input_values.birthDate,birthDate); assert.equal(card.verification_status,'PASSED');
  assert(card.result_id && card.source_id && card.source_location && card.author);
  const reading=data.result.exploration.answer.primaryReading;
  assert.equal(reading.status,'AVAILABLE');
  assert.equal(reading.content.source.id,`DECOZ-LIFE-${expected}`);
  assert(reading.content.evidence.includes(birthDate));
  assert.equal(reading.content.sections.length,3);
 }
 const chinese=(await (await post({birthDate:'1993-07-24',name:'王小明'})).json()).result;
 assert.equal(chinese.cards.find(c=>c.id==='expression').final_value,null);
 assert.equal(chinese.cards.find(c=>c.id==='lifePath').final_value,8);
 console.log('PASS: live API, no-store, invalid dates/calendar/school/JSON, repeated customers, provenance, unsupported name isolation');
 console.log('Local warm request milliseconds:',timings.join(', '));
})().catch(e=>{console.error(e);process.exitCode=1});
