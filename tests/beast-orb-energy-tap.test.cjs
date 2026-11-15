const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
const body = source.slice(source.indexOf('  const tapAlly ='), source.indexOf('  // Stored-energy attacks'));
const js = ts.transpileModule(body + '\n globalThis.tap = tapAlly;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
// 72e01822 起手機拿掉連線按鈕列（Match3Board 的 mobileActionless 常數）：從原始碼讀出真值，不寫死。
const actionlessMatch = source.match(/const mobileActionless = (true|false);/);
assert(actionlessMatch, 'Match3Board must declare mobileActionless');
const LINK_TEST_LOW = 49;
const MOBILE_ACTIONLESS = actionlessMatch[1] === 'true';
function scenario(overrides={}) {
 const calls=[];
 const unit={id:'dragon',element:'AIR',hp:100,energy:100,name:'青龍'};
 const ctx={rigEnabled:true,over:false,busy:false,linkMode:false,link:[],team:[unit],chosen:{},ENERGY_MAX:100,LINK_ENERGY_COST:50,LINK_MIN_CARDS:2,MATCH3_ORB_LABEL:{AIR:'風'},fighterCanAct:u=>!u.controlled,unleash:u=>calls.push(['attack',u.id]),setLink:v=>calls.push(['link',v]),setLog:()=>{},setAttackCaption:()=>{},setChosen:()=>calls.push(['lead']),chooseLead:()=>({}),mobileActionless:MOBILE_ACTIONLESS,fireLinkWithRef:{current:(ids,how)=>calls.push(['fire',ids,how])},...overrides};
 vm.runInNewContext(js,ctx);return {ctx,unit,calls};
}
let s=scenario();s.ctx.tap(s.unit);assert.deepEqual(s.calls,[['attack','dragon']]);
s=scenario({linkMode:true});s.ctx.tap(s.unit);assert.equal(s.calls[0][0],'link');assert(!s.calls.some(c=>c[0]==='attack'));
for(const flags of [{busy:true},{over:'win'}]) {s=scenario(flags);s.ctx.tap(s.unit);assert.equal(s.calls.length,0);}
s=scenario();s.ctx.tap({...s.unit,hp:0});assert.equal(s.calls.length,0);
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b)); // vm 內外陣列不同 realm，用 JSON 比對
if (MOBILE_ACTIONLESS) {
 // 能量 ≥ 連線門檻但未滿：開始一條連線（不直接攻擊）；已有連線時點第二張就自動發動。
 s=scenario();s.ctx.tap({...s.unit,energy:99});same(s.calls,[['link',['dragon']]]);
 s=scenario({link:['tiger'],team:[{id:'tiger',element:'METAL',hp:100,energy:60},{id:'dragon',element:'AIR',hp:100,energy:60,name:'青龍'}]});s.ctx.tap({id:'dragon',element:'AIR',hp:100,energy:60,name:'青龍'});
 same(s.calls,[['link',['tiger','dragon']],['fire',['tiger','dragon'],'tap']]);
 // 受控的卡不能開始連線，也不能攻擊，只會改選主攻。
 s=scenario();s.ctx.tap({...s.unit,energy:99,controlled:true});same(s.calls,[['lead']]);
 // 低於連線門檻：改選主攻。
 s=scenario();s.ctx.tap({...s.unit,energy:LINK_TEST_LOW});same(s.calls,[['lead']]);
} else { s=scenario();s.ctx.tap({...s.unit,energy:99});assert.equal(s.calls[0][0],'lead'); }
console.log('PASS actual card tap: full energy dispatch, link-mode precedence, busy/result/down blocking, below-full selection');
