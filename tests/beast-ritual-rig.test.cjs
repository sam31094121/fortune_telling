const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const cache = new Map();

// Render the real presentation components. Effects do not run or write inventory.
function load(relative) {
  let file = path.resolve(root, relative);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index');
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const customRequire = id => {
    if (id.endsWith('.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (id === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children); };
    if (id === 'next/dynamic') return () => () => null;
    return id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
  };
  vm.runInNewContext(source, { module: mod, exports: mod.exports, require: customRequire, console, process, setTimeout, clearTimeout, AbortController, structuredClone, crypto: require('node:crypto').webcrypto }, { filename: file });
  return mod.exports;
}

// The medium ritual must use the recorded action, never an invented alternating strike.
const { ritualRigForBeat } = load('components/BeastDuelRitual.tsx');
const recorded = (side, damage, playerId = 'beast_g_baihu') => ({ playerId, actions: [{ side, damage }] });
assert.equal(ritualRigForBeat('beast_g_baihu', recorded('PLAYER', 12), 0)?.cardId, 'beast_g_baihu');
for (const value of [0, -1, NaN, Infinity]) assert.equal(ritualRigForBeat('beast_g_baihu', recorded('PLAYER', value), 0), null);
assert.equal(ritualRigForBeat('beast_g_baihu', recorded('OPPONENT', 12), 0), null);
assert.equal(ritualRigForBeat('beast_g_baihu', undefined, 0), null);
assert.equal(ritualRigForBeat('beast_g_baihu', { playerId: 'beast_g_baihu', actions: [] }, 0), null);
assert.equal(ritualRigForBeat('beast_g_baihu', recorded('PLAYER', 12, 'beast_g_qinglong'), 0), null);
assert.equal(ritualRigForBeat('beast_y21', recorded('PLAYER', 12, 'beast_y21'), 0), null);
const reviewPage = fs.readFileSync(path.join(root, 'app/beast-game/ritual-review/page.tsx'), 'utf8');
assert.match(reviewPage, /process\.env\.NODE_ENV !== 'development'\) notFound\(\)/);
assert.match(reviewPage, /playSeries\(/);
assert.doesNotMatch(reviewPage, /localStorage|claimReward|settleStake|saveCollection/);
console.log('PASS: medium rig requires matching real player damage; zero damage, opponent and missing records do not animate; review is development-only');
const {playSeries}=load('lib/beast-game/series.ts');
const {playableCards}=load('lib/beast-game/registry.ts');
const supports=playableCards().filter(c=>c.form!=='GUARDIAN').sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id)).slice(0,2).map(c=>c.id);
for(const id of ['baihu','qinglong','zhuque','xuanwu']){
 const card='beast_g_'+id;
 const result=playSeries([card,...supports],['beast_g_baihu',...supports],29);
 const before=JSON.stringify(result);
 const pair=result.pairs[0];
 const actions=pair.actions;
 const beats=[actions[0],actions.find(a=>a.fusion&&a.side==='PLAYER')??actions[Math.round((actions.length-1)/3)],actions.find(a=>a.fusion&&a.side==='OPPONENT')??actions[Math.round(2*(actions.length-1)/3)],actions[actions.length-1]];
 beats.forEach((a,b)=>{const rig=ritualRigForBeat(card,pair,b);if(a.side!=='PLAYER'||a.damage<=0)assert.equal(rig,null);});
 assert.equal(JSON.stringify(result),before);
 console.log(card,beats.map(a=>a.side+':'+a.damage).join(', '));
}

(async()=>{
const initialEnv=process.env.NODE_ENV;
try {
 process.env.NODE_ENV='development';
 const api=load('app/beast-game/combat-review/actions.ts');
 for(const difficulty of ['EASY','HARD']) {
 const initial=await api.startCombatReview('baihu',difficulty);
 assert.equal(initial.match.difficulty??'EASY',difficulty);
 assert.equal(Boolean(initial.match.opponent.boss),difficulty==='HARD');
 const next=await api.stepCombatReview(initial.id,initial.match.revision,{type:'ATTACK'});
 assert.equal(next.match.revision,1);
 await assert.rejects(()=>api.stepCombatReview(initial.id,0,{type:'ATTACK'}),/請等/);
 }
 process.env.NODE_ENV='production';
 await assert.rejects(()=>api.startCombatReview('baihu','HARD'),/僅供本機/);
 await assert.rejects(()=>api.stepCombatReview('anything',0),/僅供本機/);
 console.log('PASS: isolated real EASY/HARD sessions, HARD boss, stale-revision rejection and production rejection');
} finally {if(initialEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=initialEnv;}
})().catch(e=>{console.error(e);process.exitCode=1});
