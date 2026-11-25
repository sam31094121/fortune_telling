// 健康檢查共用的純函式：色彩對比、CLS 視窗、米其林分數、涵蓋率、鎖檔、伺服器身分、建置衝突、硬碟防護、報告。
// 這裡不碰任何產品程式；色彩函式會以原始碼字串注入瀏覽器，所以必須自給自足（只能互相呼叫，不可引用其他外部變數）。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';

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

// 漸層背景：取出所有色標（computed style 已轉成 rgb/rgba）。含圖片或無法解析的色彩函式 → 不判定。
export function gradientStops(bgImage) {
  const s = String(bgImage || '');
  if (!s || s === 'none') return { ok: true, colors: [] };
  if (/url\(|image-set\(|element\(|cross-fade\(|paint\(/i.test(s)) return { ok: false, reason: 'image' };
  if (/\b(oklch|oklab|lab|lch|color|color-mix|hwb)\(/i.test(s)) return { ok: false, reason: 'color-fn' };
  const colors = (s.match(/rgba?\([^)]*\)/g) || []).map(parseColor).filter(Boolean);
  if (!colors.length) return { ok: false, reason: 'unparsed' };
  return { ok: true, colors };
}

// layers：由上到下，每層是一組可能顏色（純色 1 個、漸層＝各色標）。回傳文字對所有可能底色的對比範圍。
export function contrastRange(fg, layers, opaqueBottom) {
  let bases = opaqueBottom ? [opaqueBottom] : [{ r: 255, g: 255, b: 255, a: 1 }];
  for (let i = layers.length - 1; i >= 0; i--) {
    let next = [];
    for (const b of bases) for (const c of layers[i]) next.push(blendOver(c, b));
    if (next.length > 48) { const step = next.length / 48; next = Array.from({ length: 48 }, (_, k) => next[Math.floor(k * step)]); }
    bases = next.length ? next : bases;
  }
  const ratios = bases.map((b) => contrastRatio(blendOver(fg, b), b));
  return { min: Math.min(...ratios), max: Math.max(...ratios), n: ratios.length };
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

// ---- 分數：名稱對應實際量了什麼；缺業主定義中的項目就標「不完整」，不判定是否達標 ----
const W = { PASS: 1, WARN: 0.5, FAIL: 0 };
export const CHECK_GROUPS = {
  quality: ['cls', 'tap', 'font', 'contrast', 'overflow', 'images', 'beadSize'],
  stability: ['content', 'errors', 'load', 'earlySwipe', 'homeCards'],
  service: ['lcp', 'visibleError'],
};
// 業主米其林定義（品質：截圖＋CLS＋點擊＋寶珠不縮；穩定：tsc＋測試＋build＋90 FPS；服務：誠實文案＋清楚下一步）中，本工具量不到的部分。
export const GROUP_META = {
  quality: { name: '品質（頁面量測）', measures: 'CLS、點擊目標、字級、對比、溢出／裁切、破圖、寶珠大小', needChecks: ['beadSize'], alwaysMissing: [] },
  stability: { name: '穩定（頁面層）', measures: '頁面有內容、載入、console／網路錯誤、早滑、首頁順序', needGates: ['tsc', 'test', 'build'], alwaysMissing: ['真機 90 FPS'] },
  service: { name: '服務（技術代理）', measures: 'LCP 與頁面錯誤字樣', alwaysMissing: ['文案是否誠實、下一步是否清楚（需人工）'] },
};
export const PAGE_KEYS = ['content', 'cls', 'tap', 'font', 'contrast', 'overflow', 'images', 'errors', 'load', 'lcp', 'visibleError'];

function gateKind(name) {
  if (/^tsc$|typecheck/.test(name)) return 'tsc';
  if (/build/.test(name)) return 'build';
  if (/test/.test(name)) return 'test';
  return null;
}

export function michelin(rows, targets, groups = CHECK_GROUPS, { gatesRun = [], meta = GROUP_META } = {}) {
  const out = {};
  const passedGates = new Set(gatesRun.filter((g) => g.status === 'PASS').map((g) => gateKind(g.name)).filter(Boolean));
  let allNum = 0, allDen = 0;
  for (const [group, keys] of Object.entries(groups)) {
    let num = 0, den = 0, skipped = 0;
    const judgedKeys = new Set();
    for (const r of rows) for (const k of keys) {
      const st = r.checks?.[k]?.status;
      if (st && st in W) { num += W[st]; den += 1; judgedKeys.add(k); } else if (st === 'SKIP') skipped++;
    }
    const md = meta[group] || {};
    const missing = [...(md.alwaysMissing || [])];
    for (const k of md.needChecks || []) if (!judgedKeys.has(k)) missing.push(`${k}（本次未判定）`);
    for (const g of md.needGates || []) if (!passedGates.has(g)) missing.push(`${g}（未跑或未過）`);
    const score = den ? round((10 * num) / den, 1) : null;
    out[group] = { name: md.name || group, measures: md.measures || '', score, passedWeight: num, checks: den, skipped, coverage: den + skipped ? round(den / (den + skipped), 3) : null, target: targets[group], complete: missing.length === 0, missing };
    // 不完整時不宣稱達標／未達標（null），避免「穩定 10」被當成業主定義的穩定已過。
    out[group].meetsTarget = score === null || missing.length ? null : score >= targets[group];
    allNum += num; allDen += den;
  }
  out.overall = { name: '整體（所有已判定項目）', score: allDen ? round((10 * allNum) / allDen, 1) : null, checks: allDen };
  return out;
}

// 涵蓋率：每列頁面預期有 PAGE_KEYS；缺的（崩潰列）與 SKIP 都算「未判定」。
export function coverage(rows) {
  const per = {};
  let judged = 0, total = 0;
  const add = (k, st) => { per[k] ||= { judged: 0, total: 0, skipReasons: {} }; per[k].total++; total++; if (st && st in W) { per[k].judged++; judged++; } };
  for (const r of rows) {
    const keys = new Set([...(r.page === false ? [] : PAGE_KEYS), ...Object.keys(r.checks || {})]);
    for (const k of keys) {
      const c = r.checks?.[k];
      add(k, c?.status);
      if (c?.status === 'SKIP' || !c) { const why = (c?.summary || '缺少（瀏覽器崩潰等）').slice(0, 40); per[k].skipReasons[why] = (per[k].skipReasons[why] || 0) + 1; }
    }
  }
  for (const v of Object.values(per)) v.pct = v.total ? round(v.judged / v.total, 3) : null;
  return { judged, total, pct: total ? round(judged / total, 3) : null, perCheck: per };
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

export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

// 行程身分＝pid＋行程啟動時間，避免 PID 被重用時把別的行程當成鎖的主人。拿不到就回 null（退回只看 pid＋心跳）。
export function procStartToken(pid) {
  try {
    if (process.platform === 'linux') {
      const s = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      return 'lx:' + s.slice(s.lastIndexOf(')') + 2).split(' ')[19];
    }
    if (process.platform === 'win32') {
      const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${Number(pid)}).StartTime.ToFileTimeUtc()`], { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim();
      return /^\d+$/.test(out) ? 'win:' + out : null;
    }
    const out = execFileSync('ps', ['-o', 'lstart=', '-p', String(Number(pid))], { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out ? 'ps:' + out : null;
  } catch { return null; }
}

// 判斷鎖是否過期。heartbeatAgeMs = 鎖檔 mtime 距今（持有者每 30 秒更新一次）。
export function lockVerdict(held, heartbeatAgeMs, { host = os.hostname(), alive = pidAlive, procToken = procStartToken, staleMs = 10 * 60e3, hungMs = 3 * 3600e3 } = {}) {
  if (!held) return heartbeatAgeMs < 5000 ? { stale: false, reason: 'being-written' } : { stale: true, reason: 'corrupt' };
  if (held.host === host) {
    if (!alive(held.pid)) return { stale: true, reason: 'dead-pid' };
    if (held.procStart) {
      const now = procToken(held.pid);
      if (now && now !== held.procStart) return { stale: true, reason: 'pid-reused' };
      if (now) return heartbeatAgeMs > hungMs ? { stale: true, reason: 'hung' } : { stale: false, reason: 'held' };
    }
    return heartbeatAgeMs > staleMs ? { stale: true, reason: 'no-heartbeat' } : { stale: false, reason: 'held' };
  }
  return heartbeatAgeMs > staleMs ? { stale: true, reason: 'other-host-no-heartbeat' } : { stale: false, reason: 'held-other-host' };
}

const sleepSync = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch {} };
const readLock = (file) => { try { const raw = fs.readFileSync(file, 'utf8'); const st = fs.statSync(file); let held = null; try { held = JSON.parse(raw); } catch {} return { raw, held, ageMs: Date.now() - st.mtimeMs }; } catch { return null; } };

// 回收過期鎖：先用 wx 拿「回收互斥檔」（只有一個行程拿得到），在互斥中重新讀鎖、確認仍過期才刪；
// 刪鎖這條路只存在於互斥中，所以不會有人把別人剛建立的新鎖刪掉。建立新鎖一律用 wx（原子）。
export function acquireLock(meta = {}, { file = lockPath(), now = Date.now(), procToken = procStartToken, ...vopts } = {}) {
  const body = JSON.stringify({ pid: process.pid, host: os.hostname(), procStart: procToken(process.pid), startedAt: new Date(now).toISOString(), ...meta });
  const mx = file + '.reclaim';
  for (let i = 0; i < 40; i++) {
    try { fs.writeFileSync(file, body, { flag: 'wx' }); return { ok: true, file }; }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
    const cur = readLock(file);
    if (!cur) continue; // 剛被刪 → 再試 wx
    const v = lockVerdict(cur.held, cur.ageMs, { procToken, ...vopts });
    if (!v.stale) return { ok: false, file, heldBy: cur.held, reason: v.reason };
    try { fs.writeFileSync(mx, String(process.pid), { flag: 'wx' }); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - fs.statSync(mx).mtimeMs > 30000) fs.unlinkSync(mx); } catch {} // 回收者自己當掉留下的互斥檔
      sleepSync(25); continue;
    }
    try {
      const again = readLock(file);
      if (again) {
        const v2 = lockVerdict(again.held, again.ageMs, { procToken, ...vopts });
        if (!v2.stale) return { ok: false, file, heldBy: again.held, reason: v2.reason };
        fs.unlinkSync(file);
      }
    } finally { try { fs.unlinkSync(mx); } catch {} }
  }
  return { ok: false, file, heldBy: null, reason: 'contended' };
}

export function startLockHeartbeat(file = lockPath(), everyMs = 30000) {
  const t = setInterval(() => {
    try { const held = JSON.parse(fs.readFileSync(file, 'utf8')); if (held.pid === process.pid && held.host === os.hostname()) { const d = new Date(); fs.utimesSync(file, d, d); } } catch {}
  }, everyMs);
  t.unref?.();
  return () => clearInterval(t);
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

// ---- 報告保留：依「範圍」分組 ----
// 範圍＝目標（remote／local-start／local-existing）＋label（站名）＋頁面範圍（all／--only／--cards）＋寬度＋唯讀與否。
// 只量一頁／部分寬度的試跑和完整跑是不同組，互不擠掉；--compare auto 也只拿同一組。
export const DEFAULT_WIDTHS = [360, 390, 1280];
export function runScope(rep) {
  const pages = rep.scope?.pages ?? (rep.only?.length ? 'only:' + [...rep.only].sort().join(',') : rep.cardsFile ? 'cards:' + rep.cardsFile : 'all');
  const widths = [...(rep.widths || [])].map(Number).sort((a, b) => a - b);
  return { target: rep.target || '?', label: rep.label || null, pages, widths, readOnly: rep.readOnly !== false, subflows: rep.scope?.subflows ?? null };
}
export function scopeKey(rep) { const s = runScope(rep); return JSON.stringify([s.target, s.label, s.pages, s.widths, s.readOnly]); }
export function isFullScope(rep, defaultWidths = DEFAULT_WIDTHS) {
  const s = runScope(rep);
  return s.pages === 'all' && JSON.stringify(s.widths) === JSON.stringify([...defaultWidths].sort((a, b) => a - b));
}
const readReport = (dir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8')); } catch { return null; } };
// 舊報告（v2 之前）沒有 label 欄位：由資料夾名 <stamp>-<label> 補上
const withLabel = (rep, name) => (rep.label ? rep : { ...rep, label: name.replace(/^\d{8}T\d{6}-/, '') });

// 只清自己的輸出（資料夾內有 .hc-run 標記）：
//  1. 沒有 report.json 的（中斷／失敗留下的空資料夾），超過 emptyGraceMs 就清；
//  2. 其餘依範圍分組，每組留最新 keep 份；
//  3. 完整範圍（全部頁面＋預設三個寬度）每個目標＋label 最新一份永不自動刪；目前這次永不刪。
export function pruneOwnRuns(root, keep, { current = null, currentRep = null, emptyGraceMs = 120000, now = Date.now() } = {}) {
  if (!fs.existsSync(root)) return [];
  keep = Math.max(1, Number.isFinite(keep) ? keep : 5);
  const runs = fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, '.hc-run')))
    .map((d) => d.name).sort()
    .map((name) => { const dir = path.join(root, name); const rep = readReport(dir); return { name, dir, rep: rep && withLabel(rep, name) }; })
    .filter((r) => !current || path.resolve(r.dir) !== path.resolve(current));
  const removed = [];
  const rm = (r) => { fs.rmSync(r.dir, { recursive: true, force: true }); removed.push(r.name); };
  for (const r of runs.filter((x) => !x.rep)) {
    let age = Infinity; try { age = now - fs.statSync(r.dir).mtimeMs; } catch {}
    if (age >= emptyGraceMs) rm(r);
  }
  const groups = new Map();
  for (const r of runs.filter((x) => x.rep)) { const k = scopeKey(r.rep); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const protectedFull = new Set();
  const fullBySite = new Map();
  for (const r of runs.filter((x) => x.rep && isFullScope(x.rep))) fullBySite.set(`${r.rep.target}|${r.rep.label}`, r.name); // 名稱已排序 → 最後寫入的是最新
  for (const n of fullBySite.values()) protectedFull.add(n);
  // 目前這次（還沒寫 report.json）也算它那一組的一份
  const curKey = currentRep ? scopeKey(currentRep) : null;
  if (currentRep && isFullScope(currentRep)) { const k = `${currentRep.target}|${currentRep.label}`; const n = fullBySite.get(k); if (n) protectedFull.delete(n); }
  for (const [k, list] of groups) { const allow = k === curKey ? keep - 1 : keep; for (const r of list.slice(0, Math.max(0, list.length - allow))) if (!protectedFull.has(r.name)) rm(r); }
  return removed;
}

// --compare auto：同範圍、最新、有 report.json 的上一份
export function findBaseline(root, rep, { current = null } = {}) {
  if (!fs.existsSync(root)) return null;
  const k = scopeKey(rep);
  const names = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse();
  for (const name of names) {
    const dir = path.join(root, name);
    if (current && path.resolve(dir) === path.resolve(current)) continue;
    const prev = readReport(dir);
    if (prev && scopeKey(withLabel(prev, name)) === k) return path.join(dir, 'report.json');
  }
  return null;
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

// ---- 伺服器：自己起的行程＋監看輸出＋確認回應來自自己 ----
// 選埠到綁定之間別人可能搶到同一埠：那時自己的行程會 EADDRINUSE 退出，但 HTTP 仍有人回應。
// 所以「行程還活著」＋ identity(base) 兩個都成立才算就緒。
export function startServer(cmd, args, { cwd, env, port, timeoutMs = 120000, identity = null, logLines = 60, settleMs = 400 } = {}) {
  const child = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const tail = [];
  const push = (d) => { for (const line of String(d).split(/\r?\n/)) if (line.trim()) { tail.push(line.slice(0, 300)); if (tail.length > logLines) tail.shift(); } };
  child.stdout.on('data', push); child.stderr.on('data', push);
  const state = { exited: null };
  child.on('exit', (code, signal) => { state.exited = { code, signal, at: new Date().toISOString() }; });
  child.on('error', (e) => { state.exited = { code: null, signal: null, error: e.message, at: new Date().toISOString() }; });
  const base = `http://127.0.0.1:${port}`;
  const api = { child, base, pid: child.pid, logTail: () => tail.slice(), exited: () => state.exited, stop: () => { if (!state.exited) child.kill('SIGTERM'); } };
  const fail = (msg) => { api.stop(); const e = new Error(`${msg}；伺服器最後輸出：${tail.slice(-5).join(' ⏎ ') || '（無）'}`); e.logTail = tail.slice(); return e; };
  return (async () => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (state.exited) throw fail(`伺服器行程提早結束（code ${state.exited.code}${tail.some((l) => /EADDRINUSE/.test(l)) ? '，埠被別的行程占用' : ''}）`);
      let up = false;
      try { const r = await fetch(base + '/', { redirect: 'manual', signal: AbortSignal.timeout(5000) }); up = r.status < 500; } catch {}
      if (up) {
        await new Promise((r) => setTimeout(r, settleMs));
        if (state.exited) throw fail(`有回應但自己的行程已結束（code ${state.exited.code}）——回應來自別的伺服器`);
        if (identity && !(await identity(base).catch(() => false))) throw fail('回應的伺服器不是本工具啟動的那一個（身分核對失敗）');
        return api;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw fail(`伺服器 ${Math.round(timeoutMs / 1000)} 秒內沒有回應`);
  })();
}

// ---- 建置衝突：其他 next build、同 repo 的 next start/dev ----
export function listProcesses() {
  try {
    if (process.platform === 'linux') {
      const out = [];
      for (const d of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(d)) continue;
        try {
          const cmd = fs.readFileSync(`/proc/${d}/cmdline`, 'utf8').split('\0').filter(Boolean).join(' ');
          if (!cmd) continue;
          let cwd = null; try { cwd = fs.readlinkSync(`/proc/${d}/cwd`); } catch {}
          out.push({ pid: Number(d), cmd, cwd });
        } catch {}
      }
      return out;
    }
    if (process.platform === 'win32') {
      const json = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "next" } | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress'], { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim();
      const arr = json ? [].concat(JSON.parse(json)) : [];
      return arr.map((p) => ({ pid: p.ProcessId, cmd: p.CommandLine || '', cwd: null }));
    }
    return execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8', timeout: 5000 }).split('\n').map((l) => /^\s*(\d+)\s+(.*)$/.exec(l)).filter(Boolean).map((m) => ({ pid: Number(m[1]), cmd: m[2], cwd: null }));
  } catch { return null; }
}

const NEXT_BIN = /(?:node_modules[\\/](?:\.bin|next[\\/]dist[\\/]bin)[\\/]next(?:\.cmd|\.js)?["']?|(?:^|\s)(?:npx|exec|pnpm|yarn|bunx)\s+next|^next)\s+(build|start|dev)\b/;
export function findNextConflicts(procs, repo, selfPid = process.pid) {
  const norm = (p) => (p ? path.resolve(p).toLowerCase() : null);
  const r = norm(repo);
  const builds = [], sameRepoServers = [];
  for (const p of procs || []) {
    if (p.pid === selfPid) continue;
    const m = NEXT_BIN.exec(p.cmd || '');
    if (!m) continue;
    const kind = m[1];
    const inRepo = (p.cwd && norm(p.cwd) === r) || (r && String(p.cmd).toLowerCase().includes(r));
    if (kind === 'build') builds.push({ ...p, inRepo: !!inRepo });
    else if (inRepo) sameRepoServers.push({ ...p, kind });
  }
  return { builds, sameRepoServers };
}

// ---- 報告 ----
const ICON = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL', SKIP: 'SKIP' };

export function compareRuns(prev, cur) {
  const key = (r) => `${r.id}@${r.width}`;
  const before = new Map((prev?.rows || []).map((r) => [key(r), r]));
  const regressions = [], fixed = [], newFindings = [], coverageLost = [], newRows = [];
  for (const r of cur.rows) {
    const p = before.get(key(r));
    if (!p) { newRows.push(key(r)); continue; }
    for (const [k, c] of Object.entries(r.checks)) {
      const pc = p.checks?.[k]?.status;
      if (!pc || pc === 'SKIP') { if (c.status === 'FAIL' || c.status === 'WARN') newFindings.push(`${key(r)} ${k}: ${pc || '無'}→${c.status}`); continue; }
      if (c.status === 'SKIP') { coverageLost.push(`${key(r)} ${k}: ${pc}→SKIP`); continue; }
      if (pc === 'PASS' && c.status !== 'PASS') regressions.push(`${key(r)} ${k}: ${pc}→${c.status}`);
      if (pc !== 'PASS' && c.status === 'PASS') fixed.push(`${key(r)} ${k}: ${pc}→PASS`);
    }
  }
  const methodChanged = !!prev?.tool && prev.tool !== cur.tool;
  return { regressions, fixed, newFindings, coverageLost, newRows, methodChanged, prevTool: prev?.tool || null };
}

const pct = (x) => (x === null || x === undefined ? '—' : `${round(x * 100, 1)}%`);

export function renderMarkdown(rep) {
  const L = [];
  const widths = [...new Set(rep.rows.map((r) => r.width))];
  const sub = rep.subflows || [];
  L.push(`# 首頁 15 卡健康檢查 ${rep.startedAtLocal}`);
  L.push('');
  L.push(`- 目標：${rep.base}（${rep.target}）${rep.gitSha ? `，受測程式版本 ${rep.gitSha}` : '，受測版本未知（外部伺服器）'}${rep.deployIds?.length ? `；部署 ${rep.deployIds.join('、')}` : ''}`);
  L.push(`- 模式：${rep.readOnly ? '唯讀（非 GET 請求一律攔下）' : '可寫'}；寬度 ${widths.join('/')}；耗時 ${rep.elapsedSec}s；建置：${rep.build}；工具 ${rep.tool}`);
  for (const w of rep.warnings || []) L.push(`- **注意：${w}**`);
  const m = rep.michelin;
  L.push('');
  L.push('| 分數 | 本次 | 業主目標 | 已判定／略過 | 是否完整 |');
  L.push('|---|---|---|---|---|');
  for (const g of ['quality', 'stability', 'service']) {
    const x = m[g];
    L.push(`| ${x.name} | ${x.score ?? '—'} | ${x.target} | ${x.checks}／${x.skipped}（${pct(x.coverage)}） | ${x.complete ? (x.meetsTarget ? '完整・達標' : '完整・未達標') : '不完整，未含：' + x.missing.join('、')} |`);
  }
  if (m.overall) L.push(`| ${m.overall.name} | ${m.overall.score ?? '—'} | — | ${m.overall.checks} | — |`);
  L.push('');
  if (rep.coverage) {
    const cv = rep.coverage;
    L.push(`- 涵蓋率：${cv.judged}/${cv.total} 項已判定（${pct(cv.pct)}）${rep.contrastCoverage ? `；對比：${rep.contrastCoverage.checked}/${rep.contrastCoverage.checked + rep.contrastCoverage.unknown} 段文字已判定（${pct(rep.contrastCoverage.pct)}，其中漸層底 ${rep.contrastCoverage.gradient} 段）` : ''}`);
    const low = Object.entries(cv.perCheck).filter(([, v]) => v.pct !== null && v.pct < 1).map(([k, v]) => `${k} ${v.judged}/${v.total}（${Object.entries(v.skipReasons).map(([why, n]) => `${why}×${n}`).join('；')}）`);
    if (low.length) L.push(`- 未判定：${low.join('｜')}`);
  }
  if (rep.browserCrashes) L.push(`- 注意：測試瀏覽器崩潰 ${rep.browserCrashes} 次（機器負載 ${rep.host?.loadAvgAtEnd?.join('/')}）；崩潰兩次的頁面標 SKIP，未計分`);
  if (rep.compare) {
    const c = rep.compare;
    L.push(`- 與上次比較：退步 ${c.regressions.length}、修好 ${c.fixed.length}、新量到的問題（上次未判定）${c.newFindings?.length || 0}、這次變成未判定 ${c.coverageLost?.length || 0}、新頁 ${c.newRows?.length || 0}${c.methodChanged ? `；**量法已變更（${c.prevTool} → ${rep.tool}），分數差異多半來自量法，不代表網站退步**` : ''}`);
  }
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
  for (const s of sub) L.push(`| — | ${s.id} @${s.width} | ${widths.map((w) => (w === s.width ? `${s.checks.beadSize.status}：${s.checks.beadSize.summary}` : '')).join(' | ')} |`);
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
    const agg = new Map();
    for (const b of rep.blockedWrites) { const k = `${b.card}@${b.width} ${b.method} ${b.url}`; agg.set(k, (agg.get(k) || 0) + 1); }
    for (const [k, n] of [...agg].slice(0, 20)) L.push(`- ${k}${n > 1 ? ` ×${n}` : ''}`);
  }
  const c = rep.compare;
  if (c?.regressions.length) { L.push(''); L.push('## 退步'); c.regressions.forEach((x) => L.push(`- ${x}`)); }
  if (c?.fixed.length) { L.push(''); L.push('## 修好'); c.fixed.forEach((x) => L.push(`- ${x}`)); }
  if (c?.newFindings?.length) { L.push(''); L.push('## 新量到的問題（上次未判定或沒有這項）'); c.newFindings.slice(0, 40).forEach((x) => L.push(`- ${x}`)); if (c.newFindings.length > 40) L.push(`- …另 ${c.newFindings.length - 40} 項見 report.json`); }
  if (c?.coverageLost?.length) { L.push(''); L.push('## 這次變成未判定'); c.coverageLost.slice(0, 20).forEach((x) => L.push(`- ${x}`)); }
  L.push('');
  L.push('判定：PASS=1、WARN=0.5、FAIL=0、SKIP 不計；分數 = 10 × 加權通過數 ÷ 已判定數。分數標「不完整」時只代表本工具量到的部分，不能當成業主米其林定義已達標。原始數據見同目錄 report.json。');
  return L.join('\n') + '\n';
}
