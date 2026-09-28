import assert from 'node:assert/strict';
import { createBaziCore, BRANCHES, type Stem, type BaziProfessionalResult } from '../lib/bazi/engine';
import { buildDualChartShenSha } from '../lib/dual-chart-shensha';
import { getBaziTraditionalOutputGate } from '../lib/bazi-traditional-gate';
import { calculateDualChart } from '../lib/dual-chart';
import { buildShenShaIChing } from '../lib/shensha-iching';
import { SHENSHA_SENSE_PICKS } from '../lib/shensha-char-imagery';
import { SHENSHA_TEACHER_READINGS, PILLAR_PALACE } from '../lib/shensha-teacher-readings';
import { SHENSHA_ONION } from '../lib/shensha-onion';
import { SHENSHA_COMBO_RULES, findShenShaCombos } from '../lib/shensha-combos';
import { DUAL_SHENSHA_RULES } from '../lib/dual-chart-shensha';
import fs from 'node:fs';

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
// 2026-09-27 擴充五神煞：獨立抄寫查表（不從實作匯入），逐日干／日柱驗證。
const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const;
const expJinyu:Record<string,string>={甲:'辰',乙:'巳',丙:'未',丁:'申',戊:'未',己:'申',庚:'戌',辛:'亥',壬:'丑',癸:'寅'};
const expXuetang:Record<string,string>={甲:'亥',乙:'午',丙:'寅',丁:'酉',戊:'寅',己:'酉',庚:'巳',辛:'子',壬:'申',癸:'卯'};
const expHongyan:Record<string,string>={甲:'午',乙:'午',丙:'寅',丁:'未',戊:'辰',己:'辰',庚:'戌',辛:'酉',壬:'子',癸:'申'};
// 六十甲子逐旬抄寫旬空：甲子旬戌亥、甲戌旬申酉、甲申旬午未、甲午旬辰巳、甲辰旬寅卯、甲寅旬子丑。
const xunKongByHead:Record<string,string>={子:'戌亥',戌:'申酉',申:'午未',午:'辰巳',辰:'寅卯',寅:'子丑'};
let expansionCases=0;
for (let i=0;i<60;i++) {
  const stem=STEMS[i%10]; const branch=BRANCHES[i%12]; const head=BRANCHES[(i-(i%10)+120)%12];
  const kong=xunKongByHead[head];
  for (const probe of BRANCHES) {
    const fixture=structuredClone(base); fixture.shenSha=[];
    fixture.dayMaster.stem=stem as Stem;
    const day=fixture.pillars.day; day.heavenlyStem=stem as Stem; day.earthlyBranch=branch; day.ganZhi=stem+branch;
    for (const key of ['year','month','hour'] as const) { const p=fixture.pillars[key]; if(p==='UNKNOWN') throw new Error('known'); p.earthlyBranch=probe; }
    const out=buildDualChartShenSha(fixture,gate,'male');
    const at=(id:string)=>(['year','month','day','hour'] as const).filter(k=>out.byPillar[k].some(s=>s.id===id));
    const all=(target:string)=>(['year','month','day','hour'] as const).filter(k=>(k==='day'?branch:probe)===target);
    assert.deepEqual(at('jinyu'),all(expJinyu[stem]),`金輿 ${stem}${branch}/${probe}`);
    assert.deepEqual(at('xuetang'),all(expXuetang[stem]),`學堂 ${stem}${branch}/${probe}`);
    assert.deepEqual(at('hongyan'),all(expHongyan[stem]),`紅艷 ${stem}${branch}/${probe}`);
    assert.deepEqual(at('kongwang'),kong.includes(probe)?['year','month','hour']:[],`空亡 ${stem}${branch}/${probe}`);
    assert.deepEqual(at('kuigang'),['庚辰','庚戌','壬辰','戊戌'].includes(stem+branch)?['day']:[],`魁罡 ${stem}${branch}`);
    expansionCases++;
  }
}
// 第二批：祿神（日干，四柱）、孤辰寡宿／劫煞（年支，查月日時）、天醫（月支前一位，查年日時）。獨立抄表。
const expLu:Record<string,string>={甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'};
const expGuGua:Record<string,[string,string]>={亥:['寅','戌'],子:['寅','戌'],丑:['寅','戌'],寅:['巳','丑'],卯:['巳','丑'],辰:['巳','丑'],巳:['申','辰'],午:['申','辰'],未:['申','辰'],申:['亥','未'],酉:['亥','未'],戌:['亥','未']};
const expJie:Record<string,string>={申:'巳',子:'巳',辰:'巳',寅:'亥',午:'亥',戌:'亥',巳:'寅',酉:'寅',丑:'寅',亥:'申',卯:'申',未:'申'};
const expDoctor:Record<string,string>={子:'亥',丑:'子',寅:'丑',卯:'寅',辰:'卯',巳:'辰',午:'巳',未:'午',申:'未',酉:'申',戌:'酉',亥:'戌'};
let batch2Cases=0;
for (const stem of STEMS) for (const yb of BRANCHES) for (const probe of BRANCHES) {
  const fixture=structuredClone(base); fixture.shenSha=[];
  fixture.dayMaster.stem=stem as Stem; fixture.pillars.day.heavenlyStem=stem as Stem;
  const y=fixture.pillars.year; const m=fixture.pillars.month; const h=fixture.pillars.hour;
  if(h==='UNKNOWN') throw new Error('known hour required');
  y.earthlyBranch=yb; m.earthlyBranch=probe; fixture.pillars.day.earthlyBranch=probe; h.earthlyBranch=probe;
  const out=buildDualChartShenSha(fixture,gate,'male');
  const at=(id:string)=>(['year','month','day','hour'] as const).filter(k=>out.byPillar[k].some(s=>s.id===id));
  const branchOf=(k:string)=>k==='year'?yb:probe;
  const where=(target:string,keys:readonly string[])=>(['year','month','day','hour'] as const).filter(k=>keys.includes(k)&&branchOf(k)===target);
  const rest=['month','day','hour'];
  assert.deepEqual(at('lushen'),where(expLu[stem],['year','month','day','hour']),`祿神 ${stem}/${yb}/${probe}`);
  assert.deepEqual(at('guchen'),where(expGuGua[yb][0],rest),`孤辰 ${yb}/${probe}`);
  assert.deepEqual(at('guasu'),where(expGuGua[yb][1],rest),`寡宿 ${yb}/${probe}`);
  assert.deepEqual(at('jiesha'),where(expJie[yb],rest),`劫煞 ${yb}/${probe}`);
  assert.deepEqual(at('tianyiDoctor'),where(expDoctor[probe],['year','day','hour']),`天醫 月${probe}/年${yb}`);
  batch2Cases++;
}
// 第三批：獨立抄表。國印／天廚／流霞（日干，四柱）、亡神（年支三合，查月日時）、
// 天赦／四廢（季節＋日柱）、陰陽差錯／孤鸞／十惡大敗（日柱）、三奇（相連三柱天干依序）。
const expGuoyin:Record<string,string>={甲:'戌',乙:'亥',丙:'丑',丁:'寅',戊:'丑',己:'寅',庚:'辰',辛:'巳',壬:'未',癸:'申'};
const expTianchu:Record<string,string>={甲:'巳',乙:'午',丙:'巳',丁:'午',戊:'申',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯'};
const expLiuxia:Record<string,string>={甲:'酉',乙:'戌',丙:'未',丁:'申',戊:'巳',己:'午',庚:'辰',辛:'卯',壬:'亥',癸:'寅'};
const expWangshen:Record<string,string>={申:'亥',子:'亥',辰:'亥',寅:'巳',午:'巳',戌:'巳',巳:'申',酉:'申',丑:'申',亥:'寅',卯:'寅',未:'寅'};
const seasonOf=(b:string)=>'寅卯辰'.includes(b)?'春':'巳午未'.includes(b)?'夏':'申酉戌'.includes(b)?'秋':'冬';
const expTianshe:Record<string,string>={春:'戊寅',夏:'甲午',秋:'戊申',冬:'甲子'};
const expSifei:Record<string,string[]>={春:['庚申','辛酉'],夏:['壬子','癸亥'],秋:['甲寅','乙卯'],冬:['丙午','丁巳']};
const expYinyang=['丙子','丁丑','戊寅','辛卯','壬辰','癸巳','丙午','丁未','戊申','辛酉','壬戌','癸亥'];
const expGuluan=['乙巳','丁巳','辛亥','戊申','甲寅','壬子','丙午','戊午'];
const expShie=['甲辰','乙巳','丙申','丁亥','戊戌','己丑','庚辰','辛巳','壬申','癸亥'];
let batch3Cases=0;
for (let i=0;i<60;i++) for (const mb of BRANCHES) {
  const stem=STEMS[i%10]; const branch=BRANCHES[i%12]; const gz=stem+branch;
  const fixture=structuredClone(base); fixture.shenSha=[];
  fixture.dayMaster.stem=stem as Stem;
  const d=fixture.pillars.day; d.heavenlyStem=stem as Stem; d.earthlyBranch=branch; d.ganZhi=gz;
  const h=fixture.pillars.hour; if(h==='UNKNOWN') throw new Error('known hour required');
  fixture.pillars.year.earthlyBranch=mb; fixture.pillars.month.earthlyBranch=mb; h.earthlyBranch=mb;
  // 年月時干設成不構成三奇的組合，三奇另外測。
  fixture.pillars.year.heavenlyStem='癸'; fixture.pillars.month.heavenlyStem='癸'; h.heavenlyStem='癸';
  const out=buildDualChartShenSha(fixture,gate,'male');
  const at=(id:string)=>(['year','month','day','hour'] as const).filter(k=>out.byPillar[k].some(s=>s.id===id));
  const all=(target:string)=>(['year','month','day','hour'] as const).filter(k=>(k==='day'?branch:mb)===target);
  assert.deepEqual(at('guoyin'),all(expGuoyin[stem]),`國印 ${gz}/${mb}`);
  assert.deepEqual(at('tianchu'),all(expTianchu[stem]),`天廚 ${gz}/${mb}`);
  assert.deepEqual(at('liuxia'),all(expLiuxia[stem]),`流霞 ${gz}/${mb}`);
  assert.deepEqual(at('wangshen'),(['month','day','hour'] as const).filter(k=>(k==='day'?branch:mb)===expWangshen[mb]),`亡神 年${mb}/${gz}`);
  assert.deepEqual(at('tianshe'),expTianshe[seasonOf(mb)]===gz?['day']:[],`天赦 ${seasonOf(mb)}/${gz}`);
  assert.deepEqual(at('sifei'),expSifei[seasonOf(mb)].includes(gz)?['day']:[],`四廢 ${seasonOf(mb)}/${gz}`);
  assert.deepEqual(at('yinyangChacuo'),expYinyang.includes(gz)?['day']:[],`陰陽差錯 ${gz}`);
  assert.deepEqual(at('guluan'),expGuluan.includes(gz)?['day']:[],`孤鸞 ${gz}`);
  assert.deepEqual(at('shieDabai'),expShie.includes(gz)?['day']:[],`十惡大敗 ${gz}`);
  assert.deepEqual(at('sanqi'),[],'no 三奇 when stems are 癸…');
  batch3Cases++;
}
// 第四批：獨立抄表。月德合（月支三合→天干之合，四柱天干）、飛刃（羊刃之沖，查年月時）、
// 金神（日柱或時柱乙丑己巳癸酉）、八專／九醜／六秀（日柱）。
const expYuedehe:Record<string,string>={寅:'辛',午:'辛',戌:'辛',申:'丁',子:'丁',辰:'丁',亥:'己',卯:'己',未:'己',巳:'乙',酉:'乙',丑:'乙'};
const expFeiren:Record<string,string>={甲:'酉',乙:'戌',丙:'子',丁:'丑',戊:'子',己:'丑',庚:'卯',辛:'辰',壬:'午',癸:'未'};
const expBazhuan=['甲寅','乙卯','丁未','戊戌','己未','庚申','辛酉','癸丑'];
const expJiuchou=['戊子','戊午','壬子','壬午','乙卯','乙酉','己卯','己酉','辛卯','辛酉'];
const expLiuxiu=['丙午','丁未','戊子','戊午','己丑','己未'];
let batch4Cases=0;
for (let i=0;i<60;i++) for (const mb of BRANCHES) for (const ys of ['甲','丁','辛'] as const) {
  const stem=STEMS[i%10]; const branch=BRANCHES[i%12]; const gz=stem+branch;
  const f=structuredClone(base); f.shenSha=[]; f.dayMaster.stem=stem as Stem;
  const d=f.pillars.day; d.heavenlyStem=stem as Stem; d.earthlyBranch=branch; d.ganZhi=gz;
  const hh=f.pillars.hour; if(hh==='UNKNOWN') throw new Error('known hour required');
  f.pillars.year.earthlyBranch=mb; f.pillars.month.earthlyBranch=mb; hh.earthlyBranch=mb;
  f.pillars.year.heavenlyStem=ys as Stem; f.pillars.month.heavenlyStem='癸'; hh.heavenlyStem='癸'; hh.ganZhi='癸'+mb;
  const out=buildDualChartShenSha(f,gate,'male');
  const at=(id:string)=>(['year','month','day','hour'] as const).filter(k=>out.byPillar[k].some(s=>s.id===id));
  const stemOf=(k:string)=>k==='year'?ys:k==='day'?stem:'癸';
  assert.deepEqual(at('yuedehe'),(['year','month','day','hour'] as const).filter(k=>stemOf(k)===expYuedehe[mb]),`月德合 月${mb}/${ys}${gz}`);
  assert.deepEqual(at('feiren'),(['year','month','hour'] as const).filter(()=>mb===expFeiren[stem]),`飛刃 ${stem}/${mb}`);
  assert.deepEqual(at('jinshen'),[...(['乙丑','己巳','癸酉'].includes(gz)?['day']:[]),...(['乙丑','己巳','癸酉'].includes('癸'+mb)?['hour']:[])],`金神 ${gz}/癸${mb}`);
  assert.deepEqual(at('bazhuan'),expBazhuan.includes(gz)?['day']:[],`八專 ${gz}`);
  assert.deepEqual(at('jiuchou'),expJiuchou.includes(gz)?['day']:[],`九醜 ${gz}`);
  assert.deepEqual(at('liuxiu'),expLiuxiu.includes(gz)?['day']:[],`六秀 ${gz}`);
  batch4Cases++;
}
// 第五批：歲神（年支順數）喪門＋2、白虎＋8、披麻＋9、病符＋11，查月日時。逐年支抄寫目標：
const expSui:Record<string,Record<string,string>>={
  sangmen:{子:'寅',丑:'卯',寅:'辰',卯:'巳',辰:'午',巳:'未',午:'申',未:'酉',申:'戌',酉:'亥',戌:'子',亥:'丑'},
  baihu:{子:'申',丑:'酉',寅:'戌',卯:'亥',辰:'子',巳:'丑',午:'寅',未:'卯',申:'辰',酉:'巳',戌:'午',亥:'未'},
  pima:{子:'酉',丑:'戌',寅:'亥',卯:'子',辰:'丑',巳:'寅',午:'卯',未:'辰',申:'巳',酉:'午',戌:'未',亥:'申'},
  bingfu:{子:'亥',丑:'子',寅:'丑',卯:'寅',辰:'卯',巳:'辰',午:'巳',未:'午',申:'未',酉:'申',戌:'酉',亥:'戌'},
};
let batch5Cases=0;
for (const yb of BRANCHES) for (const probe of BRANCHES) {
  const f=structuredClone(base); f.shenSha=[];
  const hh=f.pillars.hour; if(hh==='UNKNOWN') throw new Error('known hour required');
  f.pillars.year.earthlyBranch=yb; f.pillars.month.earthlyBranch=probe; f.pillars.day.earthlyBranch=probe; hh.earthlyBranch=probe;
  const out=buildDualChartShenSha(f,gate,'male');
  for (const id of Object.keys(expSui)) {
    const got=(['year','month','day','hour'] as const).filter(k=>out.byPillar[k].some(s=>s.id===id));
    assert.deepEqual(got,probe===expSui[id][yb]?['month','day','hour']:[],`${id} 年${yb}/${probe}`);
  }
  batch5Cases++;
}
// 第六批：獨立抄表。歲破（年支沖，查月日時）、月空（月支三合→天干，四柱）、截路空亡（日干，只查時）、
// 天轉地轉（季節＋日柱）、十靈／日德／日貴（日柱）。
const expYuekong:Record<string,string>={寅:'壬',午:'壬',戌:'壬',申:'丙',子:'丙',辰:'丙',亥:'庚',卯:'庚',未:'庚',巳:'甲',酉:'甲',丑:'甲'};
const expJielu:Record<string,string>={甲:'申酉',己:'申酉',乙:'午未',庚:'午未',丙:'辰巳',辛:'辰巳',丁:'寅卯',壬:'寅卯',戊:'子丑',癸:'子丑'};
const expTianzhuan:Record<string,string>={春:'乙卯',夏:'丙午',秋:'辛酉',冬:'壬子'};
const expDizhuan:Record<string,string>={春:'辛卯',夏:'戊午',秋:'癸酉',冬:'丙子'};
const expShiling=['甲辰','乙亥','丙辰','丁酉','戊午','庚戌','庚寅','辛亥','壬寅','癸未'];
const expRide=['甲寅','丙辰','戊辰','庚辰','壬戌'];
const expRigui=['丁酉','丁亥','癸巳','癸卯'];
let batch6Cases=0;
for (let i=0;i<60;i++) for (const mb of BRANCHES) {
  const stem=STEMS[i%10]; const branch=BRANCHES[i%12]; const gz=stem+branch;
  const f=structuredClone(base); f.shenSha=[]; f.dayMaster.stem=stem as Stem;
  const d=f.pillars.day; d.heavenlyStem=stem as Stem; d.earthlyBranch=branch; d.ganZhi=gz;
  const hh=f.pillars.hour; if(hh==='UNKNOWN') throw new Error('known hour required');
  f.pillars.year.earthlyBranch=mb; f.pillars.month.earthlyBranch=mb; hh.earthlyBranch=mb;
  f.pillars.year.heavenlyStem='己'; f.pillars.month.heavenlyStem='己'; hh.heavenlyStem='己';
  const out=buildDualChartShenSha(f,gate,'male');
  const at=(id:string)=>(['year','month','day','hour'] as const).filter(k=>out.byPillar[k].some(s=>s.id===id));
  const clash=BRANCHES[(BRANCHES.indexOf(mb)+6)%12];
  assert.deepEqual(at('suipo'),(['month','day','hour'] as const).filter(k=>(k==='day'?branch:mb)===clash),`歲破 年${mb}/${gz}`);
  assert.deepEqual(at('yuekong'),(['year','month','day','hour'] as const).filter(k=>(k==='day'?stem:'己')===expYuekong[mb]),`月空 月${mb}/${gz}`);
  assert.deepEqual(at('jielu'),expJielu[stem].includes(mb)?['hour']:[],`截路空亡 ${stem}/時${mb}`);
  assert.deepEqual(at('tianzhuan'),expTianzhuan[seasonOf(mb)]===gz?['day']:[],`天轉 ${gz}`);
  assert.deepEqual(at('dizhuan'),expDizhuan[seasonOf(mb)]===gz?['day']:[],`地轉 ${gz}`);
  assert.deepEqual(at('shiling'),expShiling.includes(gz)?['day']:[],`十靈 ${gz}`);
  assert.deepEqual(at('ride'),expRide.includes(gz)?['day']:[],`日德 ${gz}`);
  assert.deepEqual(at('rigui'),expRigui.includes(gz)?['day']:[],`日貴 ${gz}`);
  batch6Cases++;
}
// 三奇：依序才算，順序顛倒不算。
const sanqiCase=(y:string,m:string,d:string,hs:string)=>{ const f=structuredClone(base); f.shenSha=[]; f.pillars.year.heavenlyStem=y as Stem; f.pillars.month.heavenlyStem=m as Stem; f.pillars.day.heavenlyStem=d as Stem; f.dayMaster.stem=d as Stem; const hh=f.pillars.hour; if(hh==='UNKNOWN') throw new Error('x'); hh.heavenlyStem=hs as Stem; const o=buildDualChartShenSha(f,gate,'male'); return (['year','month','day','hour'] as const).filter(k=>o.byPillar[k].some(s=>s.id==='sanqi')); };
assert.deepEqual(sanqiCase('甲','戊','庚','癸'),['year','month','day'],'天上三奇 年月日');
assert.deepEqual(sanqiCase('癸','乙','丙','丁'),['month','day','hour'],'地下三奇 月日時');
assert.deepEqual(sanqiCase('壬','癸','辛','甲'),['year','month','day'],'人中三奇 年月日');
assert.deepEqual(sanqiCase('庚','戊','甲','癸'),[],'reversed order is not 三奇');
assert.deepEqual(sanqiCase('甲','戊','癸','庚'),[],'non-adjacent is not 三奇');
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
  // 銜接句依柱變化：同一柱共用一句，不同柱不同句。
  const linkOf=(p:string)=>ic.items.find(i=>i.pillar===p)!.teacher!.text;
  assert.ok(linkOf('年柱').includes('第一印象')&&linkOf('時柱').includes('晚景')&&!linkOf('時柱').includes('最容易在這一面感受到它'));
  assert.ok(!ic.reading.join('').match(/主(吉|凶)|大吉|大凶|必定/),'no unsourced good/bad verdicts');
  assert.equal(ic.credibility.status,'PENDING_POOL');
  assert.ok(!ic.credibility.line.includes('已通過交叉比對'),'unverified claim cannot sound verified');
  assert.deepEqual(calculateDualChart(input).specialStars.iching,ic,'same chart, same hexagram and reading');
  // 字的意境：每一個神煞都有；字義必須是字庫原文（CC BY-ND 禁止改作），且附出處。
  const dictionary=new Map((JSON.parse(fs.readFileSync('data/dictionaries/nameology/characters.json','utf8')) as {normalizedCharacter:string;meanings:string[];element:string}[]).map(e=>[e.normalizedCharacter,e]));
  const snapshot=JSON.parse(fs.readFileSync('data/shensha-char-imagery.json','utf8'));
  for (const [char,entry] of Object.entries(snapshot.entries) as [string,{meanings:string[];element:string}][]) {
    assert.deepEqual(entry.meanings,dictionary.get(char)?.meanings,`snapshot ${char} equals the nameology dictionary`);
    assert.equal(entry.element,dictionary.get(char)?.element);
    assert.ok(char in SHENSHA_SENSE_PICKS,`${char} has an explicit sense pick (or null)`);
  }
  for (const item of ic.items) {
    assert.equal(item.imagery.chars.map(c=>c.char).join(''),item.name,`${item.name} imagery covers every character`);
    for (const c of item.imagery.chars) if (c.sense) assert.ok(dictionary.get(c.char)!.meanings.some(m=>m.includes(c.sense!)),`${c.char} sense is verbatim dictionary text`);
  }
  assert.ok(ic.imageryAttribution.includes('CC BY-ND'),'dictionary attribution is shown');
  // 導師解盤：每一個神煞都有本派話術（本意→意境→柱位→落地），不嚇人、不下定論。
  for (const [id,name] of DUAL_SHENSHA_RULES) {
    const t=SHENSHA_TEACHER_READINGS[id];
    assert.ok(t&&t.essence&&t.imagery&&t.action&&t.theme,`${name} has a complete teacher reading`);
    assert.ok(!Object.values(t).join('').match(/必定|一定會|註定|大凶|血光|死/),`${name} reading avoids fatalistic words`);
  }
  for (const item of ic.items) {
    assert.ok(item.teacher,`${item.name} carries a teacher reading`);
    assert.ok(item.teacher!.text.includes(`落在${item.pillar}`),`${item.name} reading names its pillar`);
    assert.ok(!item.teacher!.text.includes(PILLAR_PALACE[item.pillar]),`${item.name} reading no longer repeats the palace line`);
  }
  const wai=ic.items.find(i=>i.id==='waiTaohua')!;
  assert.ok(wai.teacher!.text.includes('異性緣')&&wai.teacher!.text.includes('貴人'),'外桃花 reads as 人緣／異性緣／貴人 (owner example)');
  assert.ok(ic.summary.includes('福氣')&&ic.summary.includes('動能')&&ic.summary.includes('提醒')&&ic.summary.includes(ic.hexagram.name),'summary gives the whole-chart outline in one paragraph');
  assert.deepEqual(ic.highlights.map(h=>h.title),['你的底氣','推你往前的力量','要多留一分心'],'three highlights in fixed order');
  assert.ok(ic.highlights.every(h=>h.names.length>0&&h.names.every(n=>h.text.includes(n))));
  assert.ok(ic.reading.length<=5,'overview paragraphs are condensed');
  assert.ok(ic.focusLine?.startsWith('神煞最集中在時柱')&&ic.focusLine.includes('晚景'),'focus line reads the most concentrated pillar');
  for (const g of ic.groups) { assert.equal(g.palace,`${PILLAR_PALACE[g.pillar]}。`,`${g.pillar} palace is told once in the group`); assert.equal(g.items.length,g.count); }
  assert.equal(ic.groups.find(g=>g.pillar==='時柱')?.toneLine,'福氣 2　動能 2　提醒 2','hour group tone counts (龍德外桃花／羊刃桃花／六厄元辰)');
  // 常用神煞總覽融入：本派解盤原則＋傳統三分類（只標總覽有列的）。
  assert.ok(ic.reading.some(l=>l.includes('形容詞')&&l.includes('五行生剋')&&l.includes('十神')),'principle: shensha are adjectives; five elements and ten gods decide');
  assert.equal(ic.items.find(i=>i.id==='yangren')?.tradition,'傳統分類：凶煞惡星');
  assert.equal(ic.items.find(i=>i.id==='taohua')?.tradition,'傳統分類：動態中性');
  assert.equal(ic.items.find(i=>i.id==='taohua')?.teacher?.tone,'動能','桃花 follows the overview: dynamic, not purely blessing');
  assert.equal(ic.items.find(i=>i.id==='longde')?.tradition,null,'shensha absent from the overview get no guessed class');
  // 整盤合看：紙本命盤手算應成立的組合（不多不少）。
  assert.deepEqual(ic.combos.map(c=>c.id+(c.pillar?'@'+c.pillar:'')),['charm-trio','de-softens@年柱','de-softens@時柱','outer-waves'],'paper chart combos match the hand-derived set');
  assert.ok(ic.reading.some(l=>l.startsWith('整盤合看')),'combo overview joins the teacher reading');
  // 遠方的緣分一定要有驛馬；沒有驛馬只有桃花類，不成立。
  assert.deepEqual(findShenShaCombos([{id:'taohua',name:'桃花',pillar:'時柱'},{id:'waiTaohua',name:'外桃花',pillar:'時柱'}]).filter(c=>c.id==='distant-romance'),[]);
  assert.equal(findShenShaCombos([{id:'yima',name:'驛馬',pillar:'年柱'},{id:'taohua',name:'桃花',pillar:'年柱'}]).filter(c=>c.id==='distant-romance').length,1);
  // 德星化煞必須同柱有提醒類。
  assert.deepEqual(findShenShaCombos([{id:'tiande',name:'天德',pillar:'年柱',tone:'福氣'},{id:'lushen',name:'祿神',pillar:'年柱',tone:'福氣'}]).filter(c=>c.id==='de-softens'),[]);
  for (const rule of SHENSHA_COMBO_RULES) {
    const text=rule.text(['甲','乙'],'年柱');
    assert.ok(!text.match(/必定|一定會|註定|大凶|血光|死|病/),`combo ${rule.id} avoids fatalistic words`);
    assert.ok(rule.members.every(id=>DUAL_SHENSHA_RULES.some(([rid])=>rid===id)),`combo ${rule.id} only uses computed shensha`);
  }
  // 鬼魅老師（茅山道士話術分身）：同一張盤、同一個卦，說法落差大，但界線不變。
  const gh=actual.specialStars.ghost;
  assert.equal(gh.state,'READY');
  if(gh.state==='READY'){
    assert.deepEqual(gh.decoding.map(d=>d.label),['磁場','詭異','因果'],'ghost decoding follows the three-part standard');
    const ghostLines=gh.groups.flatMap(g=>g.lines);
    assert.equal(ghostLines.length,17,'every shensha gets a ghost line');
    assert.ok(ghostLines.every(l=>l.text.includes(l.name)));
    assert.equal(new Set(ghostLines.map(l=>l.text)).size,ghostLines.length,'no two ghost lines read the same');
    assert.ok(!ghostLines.some(l=>/「你[^」]*，你/.test(l.text)&&/「你(舞台|同一件事)/.test(l.text)),'no doubled 你 in the voiced secret');
    assert.ok(ghostLines.every(l=>l.text.includes('門外的聲音替你說出來')),'each ghost line voices that shensha\'s own hidden heart');
    for (const tone of ['福氣','動能','提醒']) { const opens=ghostLines.filter(l=>l.tone===tone).map(l=>l.text.split('門外的聲音')[0].replace(/「[^」]+」|[年月日時]柱/g,'')); if(opens.length>=2) assert.ok(new Set(opens).size>1,`${tone} ghost openings rotate`); }
    assert.equal(gh.formations.length,ic.combos.length,'every combo becomes a formation');
    assert.equal(new Set(gh.formations.map(f=>f.title)).size,gh.formations.length,'formation titles are unique (pillar in the name)');
    assert.ok(gh.closing.includes(ic.hexagram.name));
    assert.ok(gh.disclaimer.includes('不作驅邪')&&gh.disclaimer.includes('自我反思'));
    const ghostAll=[gh.opening,...gh.decoding.map(d=>d.text),...ghostLines.map(l=>l.text),...gh.formations.map(f=>f.text),gh.closing].join('');
    assert.ok(!ghostAll.match(/必定|一定會|註定|大凶|血光|死|附身|符咒費|法事/),'ghost voice keeps the no-fear boundary');
    assert.ok(!ghostAll.includes(ic.summary)&&!ghostAll.includes(ic.items[0].teacher!.text),'ghost voice is a different telling, not a copy of the I Ching teacher');
  }
  // 洋蔥心理學：殼→心→禮物；名詞只掛已登記 A 級文獻，出處由登記表讀出；不診斷。
  const reg=JSON.parse(fs.readFileSync('docs/技能戰鬥檔案/易經/來源登記.json','utf8'));
  const onionClaim=reg.claims.find((c:{claim_id:string})=>c.claim_id==='C-SHENSHA-ONION');
  assert.ok(onionClaim,'onion psychology is registered');
  for (const [id,name] of DUAL_SHENSHA_RULES) {
    const entry=SHENSHA_ONION[id];
    assert.ok(entry&&entry.shell&&entry.heart&&entry.gift,`${name} has shell, heart and gift`);
    assert.ok(!Object.values(entry).map(v=>typeof v==='string'?v:JSON.stringify(v)).join('').match(/症|疾患|障礙|診斷|病/),`${name} onion never diagnoses`);
    if (entry.term) {
      const source=reg.sources.find((s:{source_id:string})=>s.source_id===entry.term!.sourceId);
      assert.ok(source&&source.trust==='A',`${name} term cites a registered A-level source`);
      assert.ok(onionClaim.cross_references.includes(entry.term.sourceId),`${name} source is listed in C-SHENSHA-ONION`);
      assert.notEqual(entry.term.sourceId,'S-BAUMEISTER-1998','contested ego-depletion is never used');
    }
  }
  for (const item of ic.items) {
    assert.deepEqual(item.onion?.layers.map(l=>l.layer),['殼','心','禮物'],`${item.name} onion peels three layers`);
    if (SHENSHA_ONION[item.id].term) assert.ok(item.onion!.term?.citation.includes(reg.sources.find((s:{source_id:string})=>s.source_id===SHENSHA_ONION[item.id].term!.sourceId).author),`${item.name} citation is read from the registry`);
  }
  assert.equal(ic.onionCredibility.status,onionClaim.status,'onion credibility equals the gate');
  if (ic.onionCredibility.status!=='VERIFIED') assert.ok(!ic.onionCredibility.line.includes('已通過交叉比對'));
  assert.ok(!ic.items.map(i=>i.imagery.line).join('').match(/主(吉|凶)|大吉|大凶|必定/),'imagery adds no verdicts');
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
console.log(`PASS paper chart 17/17 + bazi/ziwei pillar gate + ${batch6Cases} 歲破／月空／截路空亡／天轉／地轉／十靈／日德／日貴 combinations + ${batch5Cases} 喪門／白虎／披麻／病符 combinations + ${batch4Cases} 月德合／飛刃／金神／八專／九醜／六秀 combinations + ${batch3Cases} 國印／天廚／流霞／亡神／天赦／四廢／陰陽差錯／孤鸞／十惡大敗 combinations + 5 三奇 order cases + ${batch2Cases} 祿神／孤辰／寡宿／劫煞／天醫 combinations + ${expansionCases} 魁罡／空亡／金輿／學堂／紅艷 combinations + ${cases} 羊刃 combinations + ${yuanchenCases} 元辰 combinations + ${jiangxingCases} 將星 combinations + ${gejiaoCases} 隔角 combinations + gates, missing data, scope, alternate hour, determinism and shared-core isolation`);
