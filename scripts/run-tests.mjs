#!/usr/bin/env node
// npm test：一次跑專案在「乾淨 checkout、不開 dev server、不開瀏覽器」就能跑的全部測試。
//   1. Jest（npm run test:jest）
//   2. 健康檢查工具自己的測試（npm run test:health-toolkit）
//   3. package.json 其餘所有 test:* 腳本，扣掉下面 ENV_ONLY 列的（需要伺服器、瀏覽器、密鑰或 .env.local）
//   注意：素材類測試要完整 checkout（public 圖檔、音效、reports/taiji-lock）；稀疏 checkout 會因缺檔失敗
// KNOWN_FAILING：主線上本來就失敗、這次沒修的測試。照樣執行、照樣印出失敗原因，不算進 exit code，
//   但最後一行會寫 known=<數量>，健康檢查的 test gate 看到 known>0 會判 WARN（不是 PASS）。
//   已知失敗的測試若變成通過，會提示從清單移除。
// 選項：--jobs N（預設 3；環境變數 TEST_JOBS）、--only a,b（只跑指定腳本）、--list（只列出、不執行）
// 2026-11-25 建立；清單分類依據：盒子乾淨 checkout 實跑 130 支 test:* 腳本＋MSI 完整 checkout 複跑的結果。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 需要外部環境才跑得起來，不屬於 npm test（另外用各自的 npm run 腳本跑）
export const ENV_ONLY = {
  'test:ziwei-form-fill': '要開 dev server（localhost:8888）＋瀏覽器',
  'test:e2e-asura': 'e2e，要伺服器＋瀏覽器',
  'test:pre-push-e2e': 'e2e，要伺服器＋瀏覽器',
  'test:asura-live': '要 Edge 瀏覽器（ghost-asura-nature-page）',
  'test:beast-mobile': '要 playwright',
  'test:beast-production-preview': '要 playwright＋預覽網址',
  'test:beast-drop-render-stability': '要 Edge 瀏覽器',
  'test:beast-layout-stability': '要 Edge 瀏覽器',
  'test:beast-match3-replay': '要 Edge 瀏覽器',
  'test:star-beast-entry-api': '要執行中的伺服器（fetch）',
  'test:beast-party-size': '要執行中的伺服器（fetch）',
  'test:iching-shensha-live-api': '要 .env.local 與線上 API',
  'test:beast-orb-authority': '要寶珠戰局簽章密鑰（環境變數）',
  'test:beast-match3-treasures': '要寶珠戰局簽章密鑰（環境變數）',
};

// 主線（6f4588e2 以前）就失敗、這次沒修；照跑、照印，但不擋 exit code
export const KNOWN_FAILING = {
  'test:mobile-zoom-pan': 'dual-chart.module.css「手機字體再加大一階」之後有 11 處寫死 px 字級（後來加的規則）；要改成隨字體大小設定放大，會改變「大／特大」時的畫面，待業主決定',
  'test:battle-reward': '測試比對 API 原始碼字串（battleRewardFor(match, …)），程式已改寫、字串對不上，待確認新寫法是否等價',
  'test:iching-sources': 'docs/技能戰鬥檔案/八字/年度單一神煞來源查核.md 沒有登記來源（命理資料，不由工具代填）',
  'test:taiji-lock': 'lib/taiji24-sound-engine.ts、components/UnifiedTaijiCore.tsx 在主線（e27b6a81 等）改過，reports/taiji-lock 基準指紋沒跟著更新；太極是保護檔，要不要重設基準待業主決定',
  'test:red-luan-audit': '腳本的 tsc 少了 --resolveJsonModule，編譯就失敗',
};

const ALWAYS_FIRST = ['test:jest', 'test:health-toolkit'];

function parseArgs(argv) {
  const a = { jobs: Number(process.env.TEST_JOBS) || 3, only: null, list: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--jobs') a.jobs = Math.max(1, Number(argv[++i]) || 1);
    else if (argv[i] === '--only') a.only = String(argv[++i] || '').split(',').filter(Boolean);
    else if (argv[i] === '--list') a.list = true;
  }
  return a;
}

export function planTests(scripts) {
  const names = Object.keys(scripts).filter((k) => /^test:/.test(k));
  const run = [...ALWAYS_FIRST.filter((k) => scripts[k]), ...names.filter((k) => !ALWAYS_FIRST.includes(k) && !ENV_ONLY[k])];
  const envOnly = names.filter((k) => ENV_ONLY[k]);
  return { run, envOnly };
}

function runScript(name) {
  return new Promise((done) => {
    const t = Date.now();
    const win = process.platform === 'win32';
    const p = spawn(win ? 'npm.cmd' : 'npm', ['run', '-s', name], { cwd: ROOT, shell: win, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let out = '';
    const add = (d) => { out += d; if (out.length > 4e5) out = out.slice(-2e5); };
    p.stdout.on('data', add); p.stderr.on('data', add);
    const timer = setTimeout(() => { try { p.kill(); } catch {} }, 5 * 60e3);
    p.on('error', (e) => { clearTimeout(timer); done({ name, code: null, out: out + e.message, ms: Date.now() - t }); });
    p.on('exit', (code, sig) => { clearTimeout(timer); done({ name, code: sig ? `signal ${sig}` : code, out, ms: Date.now() - t }); });
  });
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {};
  let { run, envOnly } = planTests(scripts);
  if (a.only) run = run.filter((k) => a.only.includes(k));
  if (a.list) { console.log(run.join('\n')); console.log(`\n# 不在 npm test（要外部環境）：${envOnly.length}`); for (const k of envOnly) console.log(`#   ${k}：${ENV_ONLY[k]}`); return; }
  console.log(`npm test：${run.length} 組測試（並行 ${a.jobs}）；要外部環境、不在此跑的 ${envOnly.length} 組見 scripts/run-tests.mjs ENV_ONLY`);
  const queue = [...run]; const results = [];
  const worker = async () => { while (queue.length) { const n = queue.shift(); const r = await runScript(n); results.push(r); const ok = r.code === 0; const known = KNOWN_FAILING[n]; console.log(`${ok ? (known ? 'PASS?' : 'PASS ') : known ? 'KNOWN' : 'FAIL '} ${n} (${(r.ms / 1000).toFixed(1)}s)`); } };
  // Jest 與工具測試先單獨跑（較吃資源），其餘並行
  for (const n of ALWAYS_FIRST.filter((k) => run.includes(k))) { queue.splice(queue.indexOf(n), 1); const r = await runScript(n); results.push(r); console.log(`${r.code === 0 ? 'PASS ' : 'FAIL '} ${n} (${(r.ms / 1000).toFixed(1)}s)`); }
  await Promise.all(Array.from({ length: a.jobs }, worker));
  const fail = results.filter((r) => r.code !== 0 && !KNOWN_FAILING[r.name]);
  const known = results.filter((r) => r.code !== 0 && KNOWN_FAILING[r.name]);
  const fixed = results.filter((r) => r.code === 0 && KNOWN_FAILING[r.name]);
  const tail = (s) => s.trim().split('\n').filter((l) => !/^\s+at /.test(l)).slice(-12).join('\n');
  for (const r of fail) console.log(`\n── FAIL ${r.name}（exit ${r.code}）\n${tail(r.out)}`);
  for (const r of known) console.log(`\n── 已知失敗 ${r.name}：${KNOWN_FAILING[r.name]}\n${tail(r.out).split('\n').slice(-3).join('\n')}`);
  for (const r of fixed) console.log(`\n── ${r.name} 列在已知失敗但這次通過了，請從 KNOWN_FAILING 移除`);
  const pass = results.length - fail.length - known.length;
  console.log(`\nnpm-test-summary: pass=${pass} fail=${fail.length} known=${known.length} env-only=${envOnly.length} total=${results.length}`);
  process.exitCode = fail.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
