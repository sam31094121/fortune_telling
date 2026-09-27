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
const EXPECTED_RULE_IDS = ['tianyi', 'wenchang', 'taohua', 'yima', 'huagai', 'yangren', 'yuanchen', 'jiangxing', 'gejiao',
  // 2026-09-27 依參考命盤補齊（業主定案）：
  'tiande', 'yuede', 'tiandehe', 'longde', 'tiangou', 'jinkui', 'wugui', 'zaisha', 'liue', 'yuepo', 'ripo', 'muyu', 'waiTaohua'];
// Product expansion requested on 2026-09-27. This is independent of what the
// current engine happens to return; a transport pass must not imply full delivery.
const REQUESTED_RULES = {
  waiTaohua: '外桃花', tiandehe: '天德合', longde: '龍德', liue: '六厄',
  tiangou: '天狗', zaisha: '災煞', yuepo: '月破', jinkui: '金匱',
  wugui: '五鬼', muyu: '沐浴（神煞）', ripo: '日破',
};

function inspectRequestedShenShaScope(result) {
  const rules = result.specialStars?.rules ?? {};
  const coverage = result.specialStars?.coverage ?? [];
  return Object.entries(REQUESTED_RULES).flatMap(([id, name]) => {
    const entries = coverage.filter(item => item.id === id);
    return rules[id]?.ready === true && rules[id]?.outputStatus === 'READY' && entries.length === 1
      && ['MATCHED', 'NOT_MATCHED'].includes(entries[0].status)
      ? [] : [`新增需求「${name}」尚未完成來源、運算及輸出接入；不是本命未命中`];
  });
}

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

function inspectShenShaCard(result, html) {
  const warnings = [];
  if (!html.includes('aria-label="特星神煞"') || !html.includes('data-shensha-card-state="received"')) warnings.push('神煞卡缺失或資料未完整');
  const blocks = [...html.matchAll(/<div[^>]*data-shensha-column="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g)];
  if (blocks.length !== 4) warnings.push('神煞卡缺少四柱');
  ['year', 'month', 'day', 'hour'].forEach((key, i) => {
    const block = blocks[i];
    const names = [...(block?.[2] ?? '').matchAll(/<li[^>]*data-shensha-result="([^"]+)"[^>]*>([^<]*)<\/li>/g)].map(m => `${m[1]}:${m[2]}`).sort();
    const expected = (result.specialStars?.byPillar?.[key] ?? []).map(item => `${item.id}:${item.name}`).sort();
    if (block?.[1] !== key || JSON.stringify(names) !== JSON.stringify(expected)) warnings.push(`神煞卡 ${key} 漏顯、增項、重複或錯柱`);
  });
  if (/本次未出現|各項判定|data-shensha-rule=/.test(html)) warnings.push('結果卡不應重複列出判定或未命中清單');
  warnings.push(...inspectShenShaCoverage(result));
  if (/<(?:details|summary)\b/.test(html)) warnings.push('神煞卡原有內容不應折疊');
  return warnings;
}

function inspectShenShaPlacement(html) {
  const warnings = [];
  const tables = html.match(/<table\b[^>]*aria-label="八字四柱時日月年主表"[^>]*>[\s\S]*?<\/table>/g) ?? [];
  if (tables.length !== 1) return ['神煞須位於唯一的原四柱主表內'];
  const rows = [...tables[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(match => match[0]);
  const stageIndex = rows.findIndex(row => row.includes('>十二運</th>'));
  const starRows = rows.filter(row => row.includes('>特星神煞</th>'));
  if (starRows.length !== 1 || stageIndex < 0 || rows[stageIndex + 1] !== starRows[0]) warnings.push('神煞須在四柱十二運下方且只顯示一列');
  if (/<(?:details|summary)\b/.test(tables[0])) warnings.push('四柱下方神煞不應折疊');
  return warnings;
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
    // Compare visible names, not substring presence: e.g. 外桃花 must not satisfy 桃花.
    // Source links are supplementary text, not a second shensha result.
    const names = [...m[2].matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)]
      .map(match => stripTags(match[1].replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, '')));
    return { pillar: span ? '四柱合併' : labels[i] ?? `第${i + 1}格`, text, names };
  });
  const warnings = [];
  for (const cell of cells) {
    const marker = PENDING_MARKERS.find((word) => cell.text.includes(word));
    if (marker) warnings.push(`${cell.pillar}只顯示「${marker}」：${cell.text}`);
  }
  if (cells.length !== 4) warnings.push(`神煞列應有四柱，實際 ${cells.length} 格`);
  return { found: true, cells, warnings };
}

function inspectShenShaDelivery(result, inspected) {
  const warnings = [];
  const gate = result.bazi?.professionalChart?.traditionalInterpretationGate;
  const raw = result.specialStars?.raw;
  if (!Array.isArray(raw)) return ['後端原始神煞清單缺失，不能驗證是否漏顯'];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(raw, result.core?.shenSha) || !same(raw, result.bazi?.professionalChart?.shenSha)) {
    warnings.push('同一命盤的後端神煞清單在傳遞時不一致');
  }
  const keys = ['hour', 'day', 'month', 'year'];
  const expected = Object.fromEntries(keys.map(key => [key, []]));
  for (const item of raw) {
    const rule = gate?.shenShaRules?.[item.id];
    if (!gate?.coreReady || !rule?.ready || (rule.status !== 'VERIFIED' && rule.referenceMethod !== true) || rule.outputStatus !== 'READY') continue;
    const key = keys.find(p => item.evidence?.startsWith(p.toUpperCase() + ' '));
    if (!key) { warnings.push(`後端神煞 ${item.id} 缺少有效柱位`); continue; }
    if (!expected[key].some(hit => hit.id === item.id && hit.name === item.name)) expected[key].push(item);
  }
  const identity = items => items.map(item => `${item.id}:${item.name}`).sort();
  keys.forEach((key, index) => {
    const delivered = result.specialStars?.byPillar?.[key];
    if (!Array.isArray(delivered) || !same(identity(expected[key]), identity(delivered))) {
      warnings.push(`${key} 原始運算與逐柱回傳不一致（漏項、增項、重複或錯柱）`);
    }
    const names = expected[key].map(item => item.name).sort();
    if (!same(names, [...(inspected.cells[index]?.names ?? [])].sort())) {
      warnings.push(`${key} 後端命中與前端可見名稱不一致（漏顯、增項、重複或錯柱）`);
    }
  });
  for (const item of result.specialStars?.coverage ?? []) {
    const matched = keys.filter(key => expected[key].some(hit => hit.id === item.id));
    if (['MATCHED', 'NOT_MATCHED'].includes(item.status) &&
      (!same(matched, item.matchedPillars) || (item.status === 'MATCHED') !== Boolean(matched.length))) {
      warnings.push(`規則 ${item.id} 的命中狀態與實際運算不一致`);
    }
  }
  return warnings;
}

function checkShenShaDisplay() {
  const React = require(require.resolve('react', { paths: [root] }));
  const { renderToStaticMarkup } = require(require.resolve('react-dom/server', { paths: [root] }));
  const { calculateDualChart } = buildDualChart();
  const PillarGrid = loadPillarGrid();
  const { ShenShaCard } = require('../tests/helpers/load-shensha-ui.cjs')('app/dual-chart/BaziChart.tsx');
  const samples = SAMPLES.map((sample) => {
    const result = calculateDualChart({ ...sample, calendarType: 'solar', timezone: 'Asia/Taipei' });
    const gate = result.bazi.professionalChart.traditionalInterpretationGate;
    const html = renderToStaticMarkup(React.createElement(PillarGrid, { result }));
    const inspected = inspectShenShaRow(html);
    inspected.warnings.push(...inspectShenShaCoverage(result));
    inspected.warnings.push(...inspectShenShaDelivery(result, inspected));
    inspected.warnings.push(...inspectShenShaPlacement(html));
    inspected.warnings.push(...inspectShenShaCard(result, renderToStaticMarkup(React.createElement(ShenShaCard, { result }))));
    const pillarKeys = ['hour', 'day', 'month', 'year'];
    const expectedByPillar = Object.fromEntries(pillarKeys.map((key) => [
      key,
      (result.specialStars?.byPillar?.[key] ?? []).map((item) => item.name),
    ]));
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
    return { sample: `${sample.name} ${sample.birthDate} ${sample.birthTime}`, rules, expectedByPillar, scopeWarnings: inspectRequestedShenShaScope(result), ...inspected };
  });
  const deliveryWarnings = samples.flatMap((s) => s.warnings.map((w) => `${s.sample}：${w}`));
  const scopeWarnings = [...new Set(samples.flatMap(s => s.scopeWarnings))];
  const warnings = [...deliveryWarnings, ...scopeWarnings];
  return { ok: warnings.length === 0, deliveryOk: deliveryWarnings.length === 0, requestedScopeComplete: scopeWarnings.length === 0, method: 'SSR PillarGrid with real calculateDualChart + real gate; browser layout verified separately', samples, warnings, scopeWarnings };
}

module.exports = { checkShenShaDisplay, inspectShenShaRow, inspectShenShaCoverage, inspectShenShaDelivery, inspectShenShaPlacement, inspectShenShaCard, inspectRequestedShenShaScope };

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
  for (const warning of report.scopeWarnings) console.log(`INCOMPLETE: ${warning}`);
  console.log(`SUMMARY: ${report.samples.length} 個命例，神煞列失敗 ${report.warnings.length} 項（阻斷健康放行）`);
  console.log(`SHENSHA_DISPLAY_JSON:${JSON.stringify({ ok: report.ok, deliveryOk: report.deliveryOk, requestedScopeComplete: report.requestedScopeComplete, warnings: report.warnings })}`);
  process.exitCode = report.ok ? 0 : 3;
}
