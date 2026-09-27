// 雙命盤四柱「神煞」列後端到前端閉環檢查（阻斷式健康檢查）
// 做法：用 tsc 編譯真正的 lib/dual-chart.ts（含真正的 lib/bazi-traditional-gate.ts 與來源登記），
// 以固定命例跑 calculateDualChart，再用伺服器端渲染真正的 app/dual-chart/BaziChart.tsx 的 PillarGrid，
// 逐格檢查神煞列。合法未命中的柱位依產品規格留空；待核、受限、資料缺漏或佔位內容一律判定失敗。
// 輸出最後一行為 `SHENSHA_DISPLAY_JSON:{...}` 供健檢程式解析。
// 結束碼：0＝無警告；3＝有警告；1＝檢查本身無法執行。
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const OUT_DIR = path.join(root, '.dual-chart-shensha-display-build');
const SAMPLES = [
  { name: '固定命例一', birthDate: '1990-01-01', birthTime: '11:30', gender: 'male' },
  { name: '固定命例二', birthDate: '1974-07-02', birthTime: '04:00', gender: 'female' },
  { name: '固定命例三', birthDate: '2001-10-15', birthTime: '21:10', gender: 'male' },
];
const PENDING_MARKERS = ['尚待核對', '暫未提供', '資料待補'];
// Independent baseline: removing an extension must not shrink both the result and its health criteria.
const EXPECTED_RULE_IDS = ['tianyi', 'wenchang', 'taohua', 'yima', 'huagai', 'yangren', 'yuanchen', 'jiangxing'];

function inspectShenShaCoverage(result) {
  const warnings = [];
  const coverage = result.specialStars?.coverage;
  const rules = result.bazi?.professionalChart?.traditionalInterpretationGate?.shenShaRules ?? {};
  if (!Array.isArray(coverage)) return ['後端特星神煞 coverage 缺失，不能當作未命中'];
  for (const id of EXPECTED_RULE_IDS) {
    const entries = coverage.filter(item => item.id === id);
    if (entries.length !== 1) warnings.push(`既定規則 ${id} 的 coverage 應有一項，實際 ${entries.length} 項`);
    if (!rules[id]) warnings.push(`既定規則 ${id} 的後端運算接點缺失`);
  }
  for (const key of ['hour', 'day', 'month', 'year']) {
    if (!Array.isArray(result.specialStars?.byPillar?.[key])) warnings.push(`後端 ${key} 神煞清單缺失，不能當作空命中`);
  }
  return warnings;
}

function buildDualChart() {
  const tsc = require.resolve('typescript/bin/tsc', { paths: [root] });
  execFileSync(process.execPath, [tsc, 'lib/dual-chart.ts', '--outDir', OUT_DIR, '--rootDir', '.',
    '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--resolveJsonModule',
    '--esModuleInterop', '--types', 'node', '--skipLibCheck'], { cwd: root, stdio: 'pipe', windowsHide: true });
  return require(path.join(OUT_DIR, 'lib', 'dual-chart.js'));
}

function loadPillarGrid() {
  // Resolve the same TS/source-evidence imports as the API/UI regression tests.
  return require('../tests/helpers/load-shensha-ui.cjs')('app/dual-chart/BaziChart.tsx').PillarGrid;
}

const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function inspectShenShaRow(html) {
  const rows = html.split(/<tr\b/).slice(1).map((chunk) => `<tr${chunk.split('</tr>')[0]}</tr>`);
  const row = rows.find((r) => /<th[^>]*scope="row"[^>]*>\s*(?:特星)?神煞\s*<\/th>/.test(r));
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
    inspected.warnings.push(...inspectShenShaCoverage(result));
    const pillarKeys = ['hour', 'day', 'month', 'year'];
    const expectedByPillar = Object.fromEntries(pillarKeys.map((key) => [
      key,
      (result.specialStars?.byPillar?.[key] ?? []).map((item) => item.name),
    ]));
    pillarKeys.forEach((key, index) => {
      const cell = inspected.cells[index];
      for (const name of expectedByPillar[key]) {
        if (!cell || !cell.text.includes(name)) inspected.warnings.push(`${key} 後端命中「${name}」，前端對應欄未顯示`);
      }
    });
    const coverage = result.specialStars?.coverage ?? [];
    const coverageById = new Map(coverage.map((item) => [item.id, item]));
    const incompleteCoverage = coverage.filter((item) => !['MATCHED', 'NOT_MATCHED'].includes(item.status));
    for (const item of incompleteCoverage) {
      inspected.warnings.push(`後端神煞「${item.name}」尚未完整放行（${item.status}）：${item.reason}`);
    }
    for (const [id, rule] of Object.entries(gate?.shenShaRules ?? {})) {
      if (rule.outputStatus === 'READY' && !coverageById.has(id)) inspected.warnings.push(`後端規則 ${id} 已放行，但 API coverage 缺項`);
    }
    const rules = gate && gate.shenShaRules
      ? Object.fromEntries(Object.entries(gate.shenShaRules).map(([id, rule]) => [id, rule.outputStatus ?? (rule.ready ? 'READY' : rule.status)]))
      : {};
    return { sample: `${sample.name} ${sample.birthDate} ${sample.birthTime}`, rules, expectedByPillar, ...inspected };
  });
  const warnings = samples.flatMap((s) => s.warnings.map((w) => `${s.sample}：${w}`));
  return { ok: warnings.length === 0, method: 'SSR PillarGrid with real calculateDualChart + real gate', samples, warnings };
}

module.exports = { checkShenShaDisplay, inspectShenShaRow, inspectShenShaCoverage };

if (require.main === module) {
  let report;
  try {
    report = checkShenShaDisplay();
  } catch (error) {
    const stderr = error && error.stderr ? String(error.stderr).trim() : '';
    const stdout = error && error.stdout ? String(error.stdout).trim() : '';
    const detail = (stderr || stdout || (error && error.message) || String(error)).slice(0, 1500);
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
  console.log(`SUMMARY: ${report.samples.length} 個命例，神煞列失敗 ${report.warnings.length} 項（阻斷健康放行）`);
  console.log(`SHENSHA_DISPLAY_JSON:${JSON.stringify({ ok: report.ok, warnings: report.warnings })}`);
  process.exitCode = report.ok ? 0 : 3;
}
