// 雙命盤四柱「神煞」列實際畫面檢查（非阻斷，只產生 WARNING）
// 做法：用 tsc 編譯真正的 lib/dual-chart.ts（含真正的 lib/bazi-traditional-gate.ts 與來源登記），
// 以固定命例跑 calculateDualChart，再用伺服器端渲染真正的 app/dual-chart/BaziChart.tsx 的 PillarGrid，
// 逐格檢查神煞列。任何一格只顯示「尚待核對／暫未提供／資料待補」或空白／佔位符號，即列為 WARNING。
// 輸出最後一行為 `SHENSHA_DISPLAY_JSON:{...}` 供健檢程式解析。
// 結束碼：0＝無警告；3＝有警告；1＝檢查本身無法執行。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const OUT_DIR = path.join(root, '.dual-chart-shensha-display-build');
const SAMPLES = [
  { name: '固定命例一', birthDate: '1990-01-01', birthTime: '11:30', gender: 'male' },
  { name: '固定命例二', birthDate: '1974-07-02', birthTime: '04:00', gender: 'female' },
  { name: '固定命例三', birthDate: '2001-10-15', birthTime: '21:10', gender: 'male' },
];
const PENDING_MARKERS = ['尚待核對', '暫未提供', '資料待補'];
const PLACEHOLDER_ONLY = /^[\s\-—－–_.。…?？/／]*$|^(N\/A|n\/a|TBD|null|undefined)$/;

function buildDualChart() {
  const tsc = require.resolve('typescript/bin/tsc', { paths: [root] });
  execFileSync(process.execPath, [tsc, 'lib/dual-chart.ts', '--outDir', OUT_DIR, '--rootDir', '.',
    '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--resolveJsonModule',
    '--esModuleInterop', '--types', 'node', '--skipLibCheck'], { cwd: root, stdio: 'pipe', windowsHide: true });
  return require(path.join(OUT_DIR, 'lib', 'dual-chart.js'));
}

function loadPillarGrid() {
  const ts = require('typescript');
  const target = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'app/dual-chart/BaziChart.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module: target, exports: target.exports, require(id) {
    if (id.endsWith('.module.css')) return {};
    if (id === './ElementRing') return () => null;
    return require(require.resolve(id, { paths: [root] }));
  } }, { filename: 'app/dual-chart/BaziChart.tsx' });
  return target.exports.PillarGrid;
}

const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function inspectShenShaRow(html) {
  const rows = html.split(/<tr\b/).slice(1).map((chunk) => `<tr${chunk.split('</tr>')[0]}</tr>`);
  const row = rows.find((r) => /<th[^>]*scope="row"[^>]*>\s*神煞\s*<\/th>/.test(r));
  if (!row) return { found: false, cells: [], warnings: ['畫面沒有神煞列'] };
  const labels = ['時柱', '日柱', '月柱', '年柱'];
  const tds = [...row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
  const cells = tds.map((m, i) => {
    const span = /colspan="4"/i.test(m[1]);
    const text = stripTags(m[2]);
    return { pillar: span ? '四柱合併' : labels[i] ?? `第${i + 1}格`, text };
  });
  const warnings = [];
  for (const cell of cells) {
    const marker = PENDING_MARKERS.find((word) => cell.text.includes(word));
    if (marker) warnings.push(`${cell.pillar}只顯示「${marker}」：${cell.text}`);
    else if (PLACEHOLDER_ONLY.test(cell.text)) warnings.push(`${cell.pillar}只有佔位內容：「${cell.text}」`);
  }
  if (!cells.length) warnings.push('神煞列沒有任何格子');
  return { found: true, cells, warnings };
}

function checkShenShaDisplay() {
  const React = require(require.resolve('react', { paths: [root] }));
  const { renderToStaticMarkup } = require(require.resolve('react-dom/server', { paths: [root] }));
  const { calculateDualChart } = buildDualChart();
  const PillarGrid = loadPillarGrid();
  const samples = SAMPLES.map((sample) => {
    const result = calculateDualChart({ ...sample, calendarType: 'solar', timezone: 'Asia/Taipei' });
    const gate = result.bazi.professionalChart.traditionalInterpretationGate;
    const html = renderToStaticMarkup(React.createElement(PillarGrid, { result }));
    const inspected = inspectShenShaRow(html);
    const rules = gate && gate.shenShaRules
      ? Object.fromEntries(Object.entries(gate.shenShaRules).map(([id, rule]) => [id, rule.ready ? 'READY' : rule.status]))
      : {};
    return { sample: `${sample.name} ${sample.birthDate} ${sample.birthTime}`, rules, ...inspected };
  });
  const warnings = samples.flatMap((s) => s.warnings.map((w) => `${s.sample}：${w}`));
  return { ok: warnings.length === 0, method: 'SSR PillarGrid with real calculateDualChart + real gate', samples, warnings };
}

module.exports = { checkShenShaDisplay, inspectShenShaRow };

if (require.main === module) {
  let report;
  try {
    report = checkShenShaDisplay();
  } catch (error) {
    const detail = error && error.stderr ? String(error.stderr).slice(0, 1500) : (error && error.message) || String(error);
    console.log(`ERROR: 神煞畫面檢查無法執行：${detail}`);
    console.log(`SHENSHA_DISPLAY_JSON:${JSON.stringify({ ok: false, error: detail, warnings: [`檢查無法執行：${detail.slice(0, 300)}`] })}`);
    process.exitCode = 1;
    return;
  }
  for (const s of report.samples) {
    console.log(`${s.warnings.length ? 'WARNING' : 'OK'}: ${s.sample} 規則=${JSON.stringify(s.rules)}`);
    for (const cell of s.cells) console.log(`  ${cell.pillar}：${cell.text || '（空白）'}`);
    for (const w of s.warnings) console.log(`  WARNING: ${w}`);
  }
  console.log(`SUMMARY: ${report.samples.length} 個命例，神煞列警告 ${report.warnings.length} 項（非阻斷）`);
  console.log(`SHENSHA_DISPLAY_JSON:${JSON.stringify({ ok: report.ok, warnings: report.warnings })}`);
  process.exitCode = report.ok ? 0 : 3;
}
