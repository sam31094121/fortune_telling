const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const load = require('./helpers/load-iching-shensha-ui.cjs');

// Check the actual fused component forwards the print option without changing data.
const Fused = load('app/dual-chart/BaziIChingShenShaCard.tsx').default;
const result = Object.freeze({});
for (const monochrome of [undefined, false, true]) {
  const tree = Fused({ result, monochrome });
  const chart = React.Children.toArray(tree.props.children).find(child => child.props?.hideShenShaCard);
  assert.equal(chart.props.monochrome, monochrome ?? false);
  assert.equal(chart.props.result, result);
}

// Run the real export function; mock only raster capture and the PDF dependency.
let captured = [], pdf;
class Pdf {
  constructor() { this.pages = 1; this.images = []; pdf = this; }
  setProperties(value) { this.metadata = value; }
  addPage() { this.pages += 1; }
  addImage(canvas) { this.images.push(canvas); }
  getNumberOfPages() { return this.pages; }
  output(type) { assert.equal(type, 'blob'); return new Blob(['test-pdf']); }
}
const target = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/dual-chart/export-pdf.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports: target.exports, module: target, document: { fonts: { ready: Promise.resolve() } },
  require(id) {
    if (id === 'jspdf') return { jsPDF: Pdf };
    if (id === 'html-to-image') return { toCanvas: async (page, options) => {
      captured.push({ page, options }); return { width: 2480, height: 3508 };
    } };
    throw new Error(`Unexpected dependency ${id}`);
  },
});
const root = pages => ({ querySelectorAll(selector) { assert.equal(selector, ':scope > article'); return pages; } });
const page = (name, height = 1122.52) => ({ name, getBoundingClientRect: () => ({ width: 793.70, height }) });
(async () => {
  for (const names of [['bazi-with-shensha'], ['ziwei'], ['bazi-with-shensha', 'ziwei']]) {
    for (const monochrome of [false, true]) {
      captured = [];
      const pages = names.map(name => page(name));
      const output = await target.exports.createDualChartPdf(root(pages), monochrome);
      assert.equal(output.pageCount, names.length, 'Reported page count comes from the finished PDF');
      assert(output.blob instanceof Blob);
      assert.deepEqual(captured.map(item => item.page), pages, 'Export each selected DOM page once, including Ziwei-only');
      assert.equal(pdf.images.length, names.length);
      assert(pdf.metadata.title.includes(`（${names.length}張）`));
      assert(captured.every(item => item.options.backgroundColor === (monochrome ? '#ffffff' : '#fffefb')));
    }
  }
  await assert.rejects(() => target.exports.createDualChartPdf(root([])), /請至少選擇/);
  captured = [];
  await assert.rejects(() => target.exports.createDualChartPdf(root([page('too-tall', 1200)])), /超出 A4/);
  assert.equal(captured.length, 0, 'Never rasterize/crop an oversized page');
  console.log('PASS: fused monochrome forwarding, 1/2 actual PDF pages, Ziwei-only selection, empty/oversize guards');
})().catch(error => { console.error(error); process.exitCode = 1; });
