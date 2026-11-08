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
    // Server boundary is exercised in Node; production guards remain real.
    if (id === 'server-only') return {};
    if (id === 'next/dynamic') return () => () => null;
    return id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
  };
  vm.runInNewContext(source, { module: mod, exports: mod.exports, require: customRequire, console, process, setTimeout, clearTimeout, AbortController, structuredClone, crypto: require('node:crypto').webcrypto }, { filename: file });
  return mod.exports;
}



const E=load('lib/beast-game/match3/enemies');
const M=load('lib/beast-game/match3');
const {resolveOrbTurn}=load('lib/beast-game/match3/resolve-turn');
const pool=load('lib/beast-game/registry').playableCards();
const colors=['AIR','SPACE','WATER','FIRE','EARTH'];
const team=colors.map(element=>{const c=pool.find(c=>c.element===element&&c.form==='ADULT');return {...E.makeFoe(c.id,element),name:c.name,thumbnail:'',hp:100000,maxHp:100000,attack:0,energy:0}});
let foes=team.map(u=>({...u,attack:1}));
for(let turn=0;turn<4;turn++){
 foes=E.chargeEnemyAttack(foes,1,'t'+turn);
 assert.equal(foes[0].attackEnergy,(turn+1)*25);
 assert.deepEqual(E.chargeEnemyAttack(foes,1,'t'+turn),foes,'same turn cannot double charge');
 const r=E.counterPhase(team,foes,1,turn,false,1,{turnId:'t'+turn,energyGate:true});
 assert.equal(r.hits.length,turn===3?1:0);
 if(turn===3){assert.equal(r.foes[r.hits[0].enemy].attackEnergy,0);assert.equal(r.foes.filter(f=>f.attackEnergy===100).length,4);assert.equal(E.counterPhase(team,r.foes,1,turn,false,1,{turnId:'t'+turn,energyGate:true}).hits.length,0)}
 foes=r.foes;
}
const dead=team.map(u=>({...u,hp:0}));assert(E.chargeEnemyAttack(dead,1,'d').every(f=>f.attackEnergy===0));
const board=Array.from({length:8},(_,r)=>Array.from({length:7},(_,c)=>colors[(r+c)%5]));
for(const color of colors){
 const b=board.map(r=>[...r]);b[0][0]=b[0][1]=b[0][2]=color;
 const input={board:b,magic:M.emptyMagic(b),path:[{r:0,c:0},{r:0,c:1},{r:0,c:2}],team,foes:team,mode:'hard45',wins:0,target:0,seed:123,move:0,chosen:{},rule:'all-attack',attackBoost:1};
 const r=resolveOrbTurn(input);assert(r.res.valid);assert(r.beforeCounter.foes.every(f=>f.attackEnergy===25));assert.equal(r.counter.hits.length,0);
 const bad=resolveOrbTurn({...input,path:[{r:0,c:0}]});assert(!bad.res.valid);assert(bad.counter.foes.every(f=>f.attackEnergy===0));assert.equal(bad.counter.hits.length,0);
 const empty=resolveOrbTurn({...input,path:[]});assert(empty.counter.foes.every(f=>f.attackEnergy===0));
}
const Indicator=load('components/battlefield/EnemyActionIndicator.tsx').default;
for(const energy of [0,25,50,75,100]){const html=renderToStaticMarkup(React.createElement(Indicator,{energy,down:false,ended:false,waiting:false,controlled:false,attacking:false,className:'energy'}));assert(html.includes('width:'+energy+'%'));assert(html.includes('aria-valuenow="'+energy+'"'));}
console.log('PASS enemy charge: four valid turns, all colours, invalid/empty turn, deduplication, actual attacker reset, dead enemies, displayed server values');

// Player energy remains proportional to real matched same-element beads.
for(const n of [3,4,6,10]){
 const gains=M.energyGains({steps:[{groups:[{element:'WATER',size:n}]}],skill5:false,element:'WATER',magicTriggered:[]});
 const charged=M.shareEnergy(team,gains,'all-attack',{});
 assert.equal(charged.find(u=>u.element==='WATER').energy,Math.min(100,n*10));
 assert(charged.filter(u=>u.element!=='WATER').every(u=>u.energy===0));
}
const cascadeGains=M.energyGains({steps:[{groups:[{element:'WATER',size:3}]},{groups:[{element:'WATER',size:4}]}],skill5:false,element:'WATER',magicTriggered:[]});
assert.equal(M.shareEnergy(team,cascadeGains,'all-attack',{}).find(u=>u.element==='WATER').energy,70);
const controlled={...team[0],attackEnergy:100,skillRuntime:{uses:{},initialized:{},lastEvents:{},shield:0,stunnedTurns:1,modifiers:[]}};
const held=E.counterPhase(team,[controlled],1,0,false,1,{turnId:'controlled',energyGate:true});
assert.equal(held.hits.length,0);assert.equal(held.foes[0].attackEnergy,100);assert.equal(held.foes[0].skillRuntime.stunnedTurns,0);
const guardian=pool.find(c=>c.id==='beast_g_xuanwu');
const reserved=[...team.slice(0,4),{...E.makeFoe(guardian.id,guardian.element)}];
assert.equal(E.chargeEnemyAttack(reserved,8,'reserve')[4].attackEnergy,0);
assert.equal(E.chargeEnemyAttack(reserved.map((f,i)=>i<4?{...f,hp:0}:f),8,'released')[4].attackEnergy,25);
console.log('PASS player 3/4/6/10 beads = 30/40/60/100, unrelated colours unchanged, cascade 70, controlled full charge retained, reserved guardian waits');

for(const single of [undefined,0]){let f=team.map(u=>({...u,cd:1}));for(let n=0;n<4;n++){f=E.chargeEnemyAttack(f,1,'joint'+n);const r=E.counterPhase(team,f,1,single,false,1,{turnId:'joint'+n,energyGate:true});assert(r.foes.every(u=>u.cd===1),'energy mode must not create negative legacy cooldown');assert.equal(r.hits.length,n===3?(single===undefined?5:1):0);f=r.foes;}}
console.log('PASS simultaneous charge preserves valid cooldown and attacks only at full');
