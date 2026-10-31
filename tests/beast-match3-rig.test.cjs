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


const {match3RigAttackers}=load('components/battlefield/Match3RigAttack.tsx');
for(const name of ['baihu','qinglong','zhuque','xuanwu']) {
 const id='beast_g_'+name;
 assert.equal(JSON.stringify(match3RigAttackers([{attackerId:id,amount:50}],10,0)),JSON.stringify([id]));
 for(const amount of [0,-1,NaN,Infinity])assert.equal(match3RigAttackers([{attackerId:id,amount}],10,0).length,0);
 for(const [before,after] of [[10,10],[0,0],[10,12],[NaN,0],[10,NaN]])assert.equal(match3RigAttackers([{attackerId:id,amount:50}],before,after).length,0);
 assert.equal(match3RigAttackers([{attackerId:id,amount:5},{attackerId:id,amount:5}],10,0).length,1);
}
assert.equal(match3RigAttackers([{attackerId:null,amount:10},{attackerId:'beast_y01',amount:10}],10,0).length,0);
const board=fs.readFileSync(path.join(root,'components/battlefield/Match3Board.tsx'),'utf8');
assert.equal((board.match(/showStrike\(/g)||[]).length,3,'Drag, skill and link all use actual damage result');
assert.match(board,/showStrike\(hits, foe, nf\[ti\]\)/);
assert.match(board,/showStrike\(\[\{ attackerId: u.id, amount: amt \}\], foe, damaged\[ti\]\)/);
assert.match(board,/showStrike\(cards.map/);
assert.match(board,/const rigEnabled = cfg.id === 'hard45' \|\| cfg.id === 'hard45b'/);
assert.match(board,/if \(!rigEnabled\) return/);
assert.match(board,/rigEnabled && <Match3RigAttack/);
assert.match(board,/style=\{rigEnabled \? undefined : \{ backgroundImage:/);
const overlay=fs.readFileSync(path.join(root,'components/battlefield/Match3RigAttack.tsx'),'utf8');
assert.match(overlay,/measureGeometry=\{measure\}/);
assert.match(overlay,/prefers-reduced-motion/);
assert.match(overlay,/ready && !reduced/);
assert.match(overlay,/seen.current !== key/);
assert.match(overlay,/accepted === strike\?.key/);
assert.match(overlay,/layerZIndex=\{51\}/);
assert.match(board,/current\?.key === next.key \? null : current/);
assert.match(board,/RIG_STRIKE_MS/);
assert.doesNotMatch(overlay,/damageFoe|resolveDrag|setTeam|setFoes|document.querySelector/);
console.log('PASS: four match3 guardians use recorded positive HP loss, scoped geometry and reduced-motion fallback; rules unchanged');
