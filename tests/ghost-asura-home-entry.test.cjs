const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./helpers/load-iching-shensha-ui.cjs');
const cache = new Map();
const Entry = load('components/GhostAsuraHomeEntry.tsx', 'zh-Hant', cache).default;
const render = () => renderToStaticMarkup(React.createElement(Entry));
const html = render();
assert.equal(html, render(), 'Homepage demonstration remains stable across renders');
assert.match(html, /href="\/ghost-asura"/);
assert.match(html, /aria-label="鬼魅阿修羅｜開啟阿修羅秘卷"/);
assert.match(html, /<h2[^>]*>鬼魅阿修羅<\/h2>/);
assert.doesNotMatch(html, /命魂戰局|<button/);
assert.match(html, /印記示意：/);
assert.match(html, /印記示意：五陰纏影/, 'Keep the accepted homepage example unchanged');
assert.deepEqual([...cache.keys()].filter(file => /[/\\]lib[/\\].*asura/i.test(file)), [],
  'The new homepage entry must not load a legacy Asura registry');
assert.equal([...html.matchAll(/<a\b/g)].length, 1, 'One entry link, no nested controls');
const css = fs.readFileSync('components/GhostAsuraHomeEntry.module.css', 'utf8');
assert.doesNotMatch(css, /:global\((?:body|html|:root)\)/);
assert.match(css, /min-height:\s*44px/);
const brandCss = fs.readFileSync('components/AsuraBrandTitle.module.css', 'utf8');
assert.match(brandCss, /@font-face/);
assert.match(brandCss, /font-display:\s*swap/);
assert.match(brandCss, /yuji-boku-brand\.woff2/);
assert.equal(fs.readFileSync('public/fonts/asura-brand/yuji-boku-brand.woff2').subarray(0, 4).toString(), 'wOF2');
assert.match(fs.readFileSync('public/fonts/asura-brand/OFL.txt', 'utf8'), /SIL OPEN FONT LICENSE/);
for (const file of ['components/GhostAsuraHomeEntry.tsx', 'app/ghost-asura/GhostAsuraPageClient.tsx']) {
  assert.match(fs.readFileSync(file, 'utf8'), /className=\{brandStyles\.brush\} data-asura-brand-title/);
}
console.log('PASS: homepage title/accessibility/destination agree, stable example, single link, locally scoped entry style');
