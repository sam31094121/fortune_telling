const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
const body = source.slice(source.indexOf('  const tapAlly ='), source.indexOf('  // Stored-energy attacks'));
const js = ts.transpileModule(body + '\n globalThis.tap = tapAlly;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function scenario(overrides={}) {
 const calls=[];
 const unit={id:'dragon',element:'AIR',hp:100,energy:100,name:'青龍'};
 const ctx={rigEnabled:true,over:false,busy:false,linkMode:false,link:[],team:[unit],chosen:{},ENERGY_MAX:100,LINK_ENERGY_COST:50,LINK_MIN_CARDS:2,MATCH3_ORB_LABEL:{AIR:'風'},fighterCanAct:u=>!u.controlled,unleash:u=>calls.push(['attack',u.id]),setLink:v=>calls.push(['link',v]),setLog:()=>{},setChosen:()=>calls.push(['lead']),chooseLead:()=>({}),...overrides};
 vm.runInNewContext(js,ctx);return {ctx,unit,calls};
}
let s=scenario();s.ctx.tap(s.unit);assert.deepEqual(s.calls,[['attack','dragon']]);
s=scenario({linkMode:true});s.ctx.tap(s.unit);assert.equal(s.calls[0][0],'link');assert(!s.calls.some(c=>c[0]==='attack'));
for(const flags of [{busy:true},{over:'win'}]) {s=scenario(flags);s.ctx.tap(s.unit);assert.equal(s.calls.length,0);}
s=scenario();s.ctx.tap({...s.unit,hp:0});assert.equal(s.calls.length,0);
s=scenario();s.ctx.tap({...s.unit,energy:99});assert.equal(s.calls[0][0],'lead');
console.log('PASS actual card tap: full energy dispatch, link-mode precedence, busy/result/down blocking, below-full selection');
