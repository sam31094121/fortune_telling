const assert = require('node:assert/strict');
const fs = require('node:fs');
const postcss = require('postcss');

const css = postcss.parse(fs.readFileSync('app/dual-chart/dual-chart.module.css', 'utf8'));
const selectors = [
  '.page .reportScroll', '.page .reportScroll *',
  '.page .ziweiScroll', '.page .ziweiScroll *',
  '.printPreview .results', '.printPreview .results *',
];
for (const selector of selectors) {
  let found = false;
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls('touch-action', declaration => {
      assert.equal(declaration.value, 'pan-x pan-y pinch-zoom', selector);
      assert.equal(declaration.important, true, 'Must override global important pan-y on links/sections/buttons');
      assert.equal(rule.parent.name, 'media');
      assert.equal(rule.parent.params, 'screen', 'Never change the printed canvas');
      found = true;
    });
  });
  assert(found, `Missing touch permission on ${selector}`);
}
for (const selector of ['.reportScroll', '.ziweiScroll', '.printPreview .results']) {
  let scrollable = false;
  css.walkRules(rule => {
    if (rule.selectors.includes(selector)) rule.walkDecls('overflow-x', d => { if (d.value === 'auto') scrollable = true; });
  });
  assert(scrollable, `${selector} must remain a local horizontal scroller`);
}
console.log('PASS: chart and interactive descendants permit native horizontal/vertical/pinch gestures; print geometry unchanged');
