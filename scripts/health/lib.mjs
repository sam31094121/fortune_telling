// 健康檢查共用的純函式：色彩對比、CLS 視窗、米其林分數、鎖檔、硬碟防護、報告。
// 這裡不碰任何產品程式；色彩函式會以原始碼字串注入瀏覽器，所以必須自給自足（不可引用外部變數）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

export function parseColor(s) {
  const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(String(s || ''));
  if (!m) return null;
  let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { r: +m[1], g: +m[2], b: +m[3], a };
}

export function blendOver(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  const ch = (k) => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
  return { r: ch('r'), g: ch('g'), b: ch('b'), a };
}

export function relLuminance(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

export function contrastRatio(fg, bg) {
  const a = relLuminance(fg), b = relLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function isLargeText(px, weight) {
  return px >= 24 || (px >= 18.66 && Number(weight) >= 700);
}

// web-vitals 的 CLS：hadRecentInput 不算；以「間隔 <1s 且總長 ≤5s」的 session window 取最大值。
export function clsFromEntries(entries) {
  let max = 0, cur = 0, first = -1, last = -1, total = 0;
  for (const e of entries.filter((x) => !x.hadRecentInput).sort((x, y) => x.t - y.t)) {
    total += e.value;
    if (first >= 0 && e.t - last < 1000 && e.t - first < 5000) { cur += e.value; last = e.t; }
    else { cur = e.value; first = e.t; last = e.t; }
    if (cur > max) max = cur;
  }
  return { cls: round(max, 4), total: round(total, 4) };
}

export function round(n, d = 1) { const p = 10 ** d; return Math.round(n * p) / p; }

// 每個 check 的狀態：PASS=1、WARN=0.5、FAIL=0、SKIP 不計入分母。
const W = { PASS: 1, WARN: 0.5, FAIL: 0 };
export const CHECK_GROUPS = {
  quality: ['cls', 'tap', 'font', 'contrast', 'overflow'],
  stability: ['errors', 'load', 'earlySwipe', 'beadSize', 'homeCards'],
  service: ['lcp', 'visibleError'],
};

export function michelin(rows, targets, groups = CHECK_GROUPS) {
  const out = {};
  for (const [group, keys] of Object.entries(groups)) {
    let num = 0, den = 0;
    for (const r of rows) for (const k of keys) {
      const st = r.checks?.[k]?.status;
      if (st && st in W) { num += W[st]; den += 1; }
    }
    out[group] = { score: den ? round((10 * num) / den, 1) : null, passedWeight: num, checks: den, target: targets[group] };
    out[group].meetsTarget = out[group].score !== null && out[group].score >= targets[group];
  }
  return out;
}

export function overallStatus(checks) {
  const s = Object.values(checks || {}).map((c) => c.status);
  if (s.includes('FAIL')) return 'FAIL';
  if (s.includes('WARN')) return 'WARN';
  if (s.length && s.every((x) => x === 'SKIP')) return 'SKIP';
  return 'PASS';
}

// ---- 鎖檔：同一台機器同時只能有一個健康檢查在跑 ----
export function lockPath() {
  return process.env.HC_LOCK_FILE || path.join(os.tmpdir(), 'mingli-health-check.lock');
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

export function acquireLock(meta = {}, { file = lockPath(), staleMs = 2 * 3600e3, now = Date.now() } = {}) {
  const body = JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: new Date(now).toISOString(), ...meta });
  for (let i = 0; i < 2; i++) {
    try { fs.writeFileSync(file, body, { flag: 'wx' }); return { ok: true, file }; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let held = null;
      try { held = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { held = null; }
      const age = held?.startedAt ? now - Date.parse(held.startedAt) : Infinity;
      const stale = !held || (held.host === os.hostname() && !pidAlive(held.pid)) || age > staleMs;
      if (!stale) return { ok: false, file, heldBy: held };
      try { fs.unlinkSync(file); } catch {}
    }
  }
  return { ok: false, file, heldBy: null };
}

export function releaseLock(file = lockPath()) {
  try {
    const held = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (held.pid === process.pid && held.host === os.hostname()) fs.unlinkSync(file);
  } catch {}
}

// ---- 硬碟防護 ----
export function freeGb(dir) {
  const s = fs.statfsSync(dir);
  return round((s.bavail * s.bsize) / 1024 ** 3, 2);
}

export function diskGuard(dir, minGb) {
  const free = freeGb(dir);
  return { ok: free >= minGb, freeGb: free, minGb, dir };
}

// 只清自己的輸出：資料夾內必須有 .hc-run 標記才會被刪。
export function pruneOwnRuns(root, keep) {
  if (!fs.existsSync(root)) return [];
  const dirs = fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, '.hc-run')))
    .map((d) => d.name).sort();
  const removed = dirs.slice(0, Math.max(0, dirs.length - keep));
  for (const d of removed) fs.rmSync(path.join(root, d), { recursive: true, force: true });
  return removed;
}

export async function pickPort(from = 3400, to = 3499, reserved = []) {
  for (let p = from; p <= to; p++) {
    if (reserved.includes(p)) continue;
    const free = await new Promise((res) => {
      const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true)));
      s.listen(p, '127.0.0.1');
    });
    if (free) return p;
  }
  throw new Error(`no free port in ${from}-${to}`);
}

// ---- 報告 ----
const ICON = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL', SKIP: 'SKIP' };

export function compareRuns(prev, cur) {
  const key = (r) => `${r.id}@${r.width}`;
  const before = new Map((prev?.rows || []).map((r) => [key(r), r]));
  const regressions = [], fixed = [];
  for (const r of cur.rows) {
    const p = before.get(key(r));
    if (!p) continue;
    for (const [k, c] of Object.entries(r.checks)) {
      const pc = p.checks?.[k]?.status;
      if (!pc || pc === 'SKIP' || c.status === 'SKIP') continue;
      if (pc === 'PASS' && c.status !== 'PASS') regressions.push(`${key(r)} ${k}: ${pc}→${c.status}`);
      if (pc !== 'PASS' && c.status === 'PASS') fixed.push(`${key(r)} ${k}: ${pc}→PASS`);
    }
  }
  return { regressions, fixed };
}

export function renderMarkdown(rep) {
  const L = [];
  const widths = [...new Set(rep.rows.map((r) => r.width))];
  const sub = rep.subflows || [];
  L.push(`# 首頁 15 卡健康檢查 ${rep.startedAtLocal}`);
  L.push('');
  L.push(`- 目標：${rep.base}（${rep.target}）${rep.gitSha ? `，受測程式版本 ${rep.gitSha}` : '，受測版本未知（外部伺服器）'}`);
  L.push(`- 模式：${rep.readOnly ? '唯讀（非 GET 請求一律攔下）' : '可寫'}；寬度 ${widths.join('/')}；耗時 ${rep.elapsedSec}s；建置：${rep.build}`);
  const m = rep.michelin;
  L.push(`- 米其林（由本次數據計算）：品質 ${m.quality.score ?? '—'}／${m.quality.target}、穩定 ${m.stability.score ?? '—'}／${m.stability.target}、服務 ${m.service.score ?? '—'}／${m.service.target}（服務分只用 LCP 與可見錯誤代表，不含真人體驗）`);
  if (rep.browserCrashes) L.push(`- 注意：測試瀏覽器崩潰 ${rep.browserCrashes} 次（機器負載 ${rep.host?.loadAvgAtEnd?.join('/')}）；崩潰兩次的頁面標 SKIP，未計分`);
  if (rep.compare) L.push(`- 與上次比較：退步 ${rep.compare.regressions.length}、修好 ${rep.compare.fixed.length}`);
  L.push('');
  L.push(`| # | 卡片 | ${widths.join(' | ')} |`);
  L.push(`|---|---|${widths.map(() => '---').join('|')}|`);
  const ids = [...new Set(rep.rows.map((r) => r.id))];
  for (const id of ids) {
    const rs = rep.rows.filter((r) => r.id === id);
    const cells = widths.map((w) => {
      const r = rs.find((x) => x.width === w);
      if (!r) return '—';
      const bad = Object.entries(r.checks).filter(([, c]) => c.status === 'FAIL' || c.status === 'WARN').map(([k, c]) => `${k}${c.status === 'WARN' ? '?' : ''}`);
      return `${ICON[r.status]}${bad.length ? ' ' + bad.join(',') : ''}`;
    });
    L.push(`| ${rs[0].n} | ${rs[0].name} | ${cells.join(' | ')} |`);
  }
  for (const s of sub) L.push(`| — | ${s.id} @${s.width} | ${s.checks.beadSize.status}：${s.checks.beadSize.summary} |`);
  if (rep.gates?.length) L.push('', '閘門：' + rep.gates.map((g) => `${g.name} ${g.status} ${Math.round(g.ms / 1000)}s`).join('、'));
  L.push('');
  L.push('## 失敗明細（每項最多 3 筆樣本）');
  for (const r of rep.rows) {
    for (const [k, c] of Object.entries(r.checks)) {
      if (c.status !== 'FAIL') continue;
      L.push(`- ${r.n}.${r.name} @${r.width} **${k}**：${c.summary}${c.samples?.length ? ' — ' + c.samples.slice(0, 3).map((s) => (typeof s === 'string' ? s : JSON.stringify(s))).join('；') : ''}`);
    }
  }
  if (rep.blockedWrites?.length) {
    L.push('');
    L.push('## 進頁時就送出的寫入請求（唯讀模式已攔下）');
    for (const b of rep.blockedWrites.slice(0, 20)) L.push(`- ${b.card}@${b.width} ${b.method} ${b.url}`);
  }
  if (rep.compare?.regressions.length) { L.push(''); L.push('## 退步'); rep.compare.regressions.forEach((x) => L.push(`- ${x}`)); }
  if (rep.compare?.fixed.length) { L.push(''); L.push('## 修好'); rep.compare.fixed.forEach((x) => L.push(`- ${x}`)); }
  L.push('');
  L.push('判定：PASS=1、WARN=0.5、FAIL=0、SKIP 不計；分數 = 10 × 加權通過數 ÷ 檢查數。原始數據見同目錄 report.json。');
  return L.join('\n') + '\n';
}
