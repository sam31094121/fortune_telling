const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.paths = module.paths;
  const nativeRequire = mod.require.bind(mod);
  mod.require = function(id) {
    if (id.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (id === './elementOrbPalette') return load('components/bazi/customer/elementOrbPalette.ts');
    if (id === './SharedElementSealPaper') return load('components/bazi/customer/SharedElementSealPaper.tsx');
    if (id === './ElementOrbVisual') return load('components/bazi/customer/ElementOrbVisual.tsx');
    if (id === './ElementTreasureOrb') return load('components/bazi/customer/ElementTreasureOrb.tsx');
    if (id === '@/components/bazi/customer/ElementTreasureOrb') return load('components/bazi/customer/ElementTreasureOrb.tsx');
    if (id === '@/components/bazi/customer/elementOrbPalette') return load('components/bazi/customer/elementOrbPalette.ts');
    if (id === '@/components/bazi/customer/ElementOrbVisual') return load('components/bazi/customer/ElementOrbVisual.tsx');
    if (id === '@/lib/five-element-orb-map') return load('lib/five-element-orb-map.ts');
    return nativeRequire(id);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return mod.exports;
}
const { ElementTreasureOrb } = load('components/bazi/customer/ElementTreasureOrb.tsx');
const { ORB_MATERIAL } = load('components/bazi/customer/elementOrbPalette.ts');
const colors = new Set();
for (const element of ['空', '風', '水', '火', '地']) {
  colors.add(ORB_MATERIAL[element].light);
  const render = (released, burning = false) => renderToStaticMarkup(React.createElement(ElementTreasureOrb, { element, released, burning, animating: burning }));
  const sealed = render(false);
  assert.ok(sealed.includes('data-state="sealed"'));
  assert.ok(sealed.includes('data-seal-resource="shared-vector-1080p-plus"'));
  assert.ok(sealed.includes(`--orb-glow:${ORB_MATERIAL[element].light}`));
  const rgb = ORB_MATERIAL[element].light.slice(1).match(/.{2}/g).map(v => parseInt(v, 16)).join(', ');
  assert.ok(sealed.includes(`--orb-glow-rgb:${rgb}`));
  assert.ok(!/<(?:canvas|button|a)\b/.test(sealed));
  const opening = render(true, true);
  assert.ok(opening.includes('data-state="opening"'));
  assert.ok(opening.includes('space-seal-paper--burning'));
  assert.equal((opening.match(/<i>/g) || []).length, 7);
  const released = render(true);
  assert.ok(released.includes('data-state="released"'));
  assert.ok(!released.includes('data-seal-resource'));
  console.log(`PASS ${element}: own palette, shared seal, ash, stable released state, no canvas or interaction`);
}
assert.equal(colors.size, 5);
console.log('PASS five distinct core palettes');
const { WaterTreasureOrb } = load('components/bazi/customer/WaterTreasureOrb.tsx');
for (const displayProfile of ['default', 'mobile-reward', 'home-soft']) {
  for (const variant of ['crystal', 'caustic', 'luminous']) {
    const render = (released, animating) => renderToStaticMarkup(React.createElement(WaterTreasureOrb, {
      element: '火', released, animating, burnSealOnRelease: true, variant, displayProfile,
    }));
    assert.ok(render(false, false).includes('data-state="sealed"'));
    assert.ok(render(true, true).includes('data-state="opening"'));
    const complete = render(true, false);
    assert.ok(complete.includes('data-state="released"'));
    assert.ok(!complete.includes('space-seal-paper'));
    assert.ok(!complete.includes('<canvas'));
  }
}
console.log('PASS legacy profiles/variants share material and finish without a permanent burning seal');
const staticOrb = renderToStaticMarkup(React.createElement(ElementTreasureOrb, { element: '水', released: true, animated: false }));
assert.ok(staticOrb.includes('data-animated="false"'));
console.log('PASS static battle display preserves the no-animation contract');
const ElementOrbDisplay = load('components/battlefield/ElementOrbDisplay.tsx').default;
for (const [battle, product] of [['SPACE', '空'], ['AIR', '風'], ['WATER', '水'], ['FIRE', '火'], ['EARTH', '地']]) {
  const markup = renderToStaticMarkup(React.createElement(ElementOrbDisplay, { element: battle, size: 'small', animated: false }));
  assert.ok(markup.includes(`data-element-treasure-orb="${product}"`));
  assert.ok(markup.includes(`--orb-glow:${ORB_MATERIAL[product].light}`));
  assert.ok(markup.includes('data-state="released"'));
  assert.ok(markup.includes('data-animated="false"'));
  assert.ok(!markup.includes('space-seal-paper'));
}
console.log('PASS five battle elements map to shared material without introducing seals or actions');
