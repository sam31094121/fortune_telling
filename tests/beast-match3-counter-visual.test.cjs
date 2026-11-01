const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => load(path.resolve(path.dirname(file), name + '.ts')), module, module.exports);
  return module.exports;
}
const root = path.resolve(__dirname, '..');
const { counterVisualPath } = load(path.join(root, 'lib/beast-game/match3/counter-visual.ts'));
const { ELEMENT_PALETTE } = load(path.join(root, 'lib/beast-game/element-palette.ts'));
for (const element of Object.keys(ELEMENT_PALETTE)) {
  for (const [x1,y1,x2,y2] of [[20,10,25,500],[300,10,10,500],[20,20,20,20]]) {
    const v = counterVisualPath('beast_g_xuanwu',element,x1,y1,x2,y2);
    assert.equal(v.color,ELEMENT_PALETTE[element]);
    assert(v.path.startsWith(`M ${x1} ${y1}`));
    assert(v.path.endsWith(`${x2} ${y2}`));
    assert(!v.path.includes('NaN'));
    const numbers=v.path.match(/-?\d+(?:\.\d+)?/g).map(Number);
    for(let i=0;i<numbers.length;i+=2) {
      assert(numbers[i]>=Math.min(x1,x2)-14 && numbers[i]<=Math.max(x1,x2)+14);
      assert(numbers[i+1]>=Math.min(y1,y2)-14 && numbers[i+1]<=Math.max(y1,y2)+14);
    }
  }
}
assert(counterVisualPath('beast_g_baihu','SPACE',0,0,100,100).lightning);
assert(!counterVisualPath('beast_g_baihu','FIRE',0,0,100,100).lightning);
assert(!counterVisualPath('beast_y01','SPACE',0,0,100,100).lightning);
const board=fs.readFileSync(path.join(root,'components/battlefield/Match3Board.tsx'),'utf8');
assert(board.includes('cp.foes.find(f => f.id === h.enemyId)'));
assert(board.includes('element: source.element'));
console.log('PASS counter visuals: five original colors, exact endpoints, bounded geometry, actual source ID, white-tiger visual only');
