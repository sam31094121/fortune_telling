const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Render the real component with only CSS module names stubbed, no browser state.
const filename = path.resolve('app/dual-chart/ElementRing.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const componentModule = new Module(filename, module);
componentModule.filename = filename;
componentModule.paths = Module._nodeModulePaths(path.dirname(filename));
const originalRequire = componentModule.require.bind(componentModule);
componentModule.require = name => name.endsWith('.module.css') ? new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) }) : originalRequire(name);
componentModule._compile(compiled, filename);
const Ring = componentModule.exports.default;
for (const percentages of [{ 木: 20.8, 火: 27.5, 土: 22, 金: 29.7, 水: 0 }, { 木: 0.1, 火: 0, 土: 0, 金: 0, 水: 99.9 }, { 木: 100, 火: 0, 土: 0, 金: 0, 水: 0 }]) {
  const html = renderToStaticMarkup(React.createElement(Ring, { percentages }));
  assert.equal((html.match(/data-element=/g) || []).length, Object.values(percentages).filter(x => x > 0).length);
  assert.equal((html.match(/<pattern /g) || []).length, 5);
  assert.ok(!/NaN|Infinity/.test(html));
  for (const [element, value] of Object.entries(percentages)) {
    assert.equal(html.includes(`data-element="${element}"`), value > 0);
    assert.ok(html.includes(`${element} ${value}%`));
  }
  for (const texture of ['斜線', '點紋', '方格', '橫線', '直線']) assert.ok(html.includes(texture));
  const mono = renderToStaticMarkup(React.createElement(Ring, { percentages, monochrome: true }));
  // SVG descendants are deep-cloned by html-to-image: fills must be attributes,
  // not dependent on an ancestor CSS variable that disappears in the PDF.
  assert.equal((mono.match(/fill="url\(#/g) || []).length, Object.values(percentages).filter(x => x > 0).length + 5);
  assert.equal((html.match(/fill="url\(#/g) || []).length, 0);
}
console.log('PASS: ring keeps real proportions, zero sectors absent, tiny/full sectors valid, five matching texture legends.');
