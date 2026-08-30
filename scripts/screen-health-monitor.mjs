#!/usr/bin/env node

import { appendFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.cwd();
const PORT = Number(process.env.SCREEN_HEALTH_PORT || 8888);
const BASE_URL = process.env.SCREEN_HEALTH_BASE_URL || `http://localhost:${PORT}`;
const TIMEOUT_MS = Number(process.env.SCREEN_HEALTH_TIMEOUT_MS || 12000);
const WATCH_INTERVAL_MS = Number(process.env.SCREEN_HEALTH_INTERVAL_MS || 30000);
const STARTUP_TIMEOUT_MS = Number(process.env.SCREEN_HEALTH_STARTUP_TIMEOUT_MS || 65000);
const args = new Set(process.argv.slice(2));
const WATCH = args.has('--watch');
// Recovery must be explicitly requested. A routine check may never alter app
// functionality, content, cards, or customer data.
const AUTO_REPAIR = args.has('--recover-server');
const MOBILE_FIRST = args.has('--mobile-first');
const CLEAR_CACHE_DURING_REPAIR = args.has('--clear-cache');
const REPORT_DIR = path.join(PROJECT_ROOT, 'reports', 'screen-health');
const REPORT_FILE = path.join(REPORT_DIR, 'latest.json');
const LOG_FILE = path.join(REPORT_DIR, 'monitor.log');
const NEXT_OUT_LOG = path.join(PROJECT_ROOT, '.screen-health-next.out.log');
const NEXT_ERR_LOG = path.join(PROJECT_ROOT, '.screen-health-next.err.log');

const CARD_ROUTES = [
  { id: 'CARD_01', module: 'nameology', title: 'AI 姓名學', path: '/nameology' },
  { id: 'CARD_02', module: 'ziwei', title: '紫微斗數', path: '/insight' },
  { id: 'CARD_03', module: 'numerology', title: '易經論數字', path: '/numerology' },
  { id: 'CARD_04', module: 'soul_match', title: '靈魂配對', path: '/match' },
  { id: 'CARD_05', module: 'music', title: 'AI 專屬生命歌曲', path: '/music' },
  { id: 'CARD_06', module: 'bazi', title: 'AI 八字命盤', path: '/bazi' },
  { id: 'CARD_07', module: 'zodiac', title: 'AI 西洋星座', path: '/zodiac' },
  { id: 'CARD_08', module: 'tarot', title: 'AI 塔羅牌', path: '/tarot' },
  { id: 'CARD_09', module: 'growth_center', title: 'AI 個人成長中心', path: '/growth-center' },
];

const HEALTH_ROUTES = [
  { id: 'HOME', module: 'home', title: '首頁太極核心', path: '/' },
  { id: 'READY', module: 'ready', title: 'Next.js Ready', path: '/internal/health/ready' },
];

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureReportDir() {
  await mkdir(REPORT_DIR, { recursive: true });
}

async function log(message, type = 'INFO') {
  await ensureReportDir();
  const line = `[${nowIso()}] [${type}] ${message}`;
  console.log(line);
  await appendFile(LOG_FILE, `${line}\n`, 'utf8');
}

function routeUrl(routePath) {
  return `${BASE_URL}${routePath}`;
}

async function fetchRoute(routePath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(routeUrl(routePath), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': MOBILE_FIRST
          ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36 Tiandiren-Mobile-Health/1.0'
          : 'Tiandiren-Screen-Health-Monitor/1.0',
        ...(MOBILE_FIRST ? { 'Viewport-Width': '390', 'Sec-CH-UA-Mobile': '?1' } : {}),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      durationMs: Date.now() - startedAt,
      length: text.length,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      length: 0,
      error: error instanceof Error ? error.message : String(error),
      text: '',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function hasBrokenHtml(text) {
  return [
    'Application error',
    'Internal Server Error',
    'NEXT_HTTP_ERROR_FALLBACK',
    '__next_error__',
  ].some((marker) => text.includes(marker));
}

async function checkRoute(route) {
  const response = await fetchRoute(route.path);
  const minLength = route.path === '/internal/health/ready' ? 2 : 500;
  const pageLooksHealthy = response.ok && response.length >= minLength && !hasBrokenHtml(response.text);
  const status = pageLooksHealthy ? 'PASSED' : 'FAILED';
  return {
    ...route,
    status,
    httpStatus: response.status,
    durationMs: response.durationMs,
    htmlLength: response.length,
    error: response.error || null,
    issue: pageLooksHealthy
      ? null
      : response.error || `route ${route.path} returned status ${response.status} with ${response.length} bytes`,
  };
}

async function scanScreenHealth() {
  const startedAt = nowIso();
  const routes = [];

  for (const route of [...HEALTH_ROUTES, ...CARD_ROUTES]) {
    const result = await checkRoute(route);
    routes.push(result);
    await log(`${result.status} ${result.title} ${result.path} (${result.httpStatus}, ${result.durationMs}ms)`, result.status === 'PASSED' ? 'INFO' : 'WARN');
  }

  const failed = routes.filter((route) => route.status !== 'PASSED');
  return {
    ok: failed.length === 0,
    version: 'screen-health-monitor-v1',
    baseUrl: BASE_URL,
    port: PORT,
    startedAt,
    completedAt: nowIso(),
    mode: WATCH ? 'WATCH' : 'ONCE',
    scanProfile: MOBILE_FIRST ? 'MOBILE_FIRST' : 'STANDARD',
    autoRepair: AUTO_REPAIR,
    summary: {
      total: routes.length,
      passed: routes.length - failed.length,
      failed: failed.length,
      screenStatus: failed.length === 0 ? 'HEALTHY' : 'UNHEALTHY',
    },
    failedRoutes: failed.map((route) => ({
      id: route.id,
      title: route.title,
      path: route.path,
      issue: route.issue,
    })),
    routes,
  };
}

async function writeReport(report) {
  await ensureReportDir();
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function getPortPids() {
  const parsePids = (output) => output
    .split(/\r?\n/)
    .filter((line) => line.includes(`:${PORT}`) && /LISTENING/i.test(line))
    .map((line) => Number(line.trim().split(/\s+/).at(-1)))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-Command',
        `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`,
      ], { cwd: PROJECT_ROOT, windowsHide: true });

      const pids = stdout
        .split(/\r?\n/)
        .map((line) => Number(line.trim()))
        .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
      if (pids.length > 0) return [...new Set(pids)];
    } catch {
      // Fall through to netstat. Some Windows shells block Get-NetTCPConnection.
    }

    try {
      const { stdout } = await execFileAsync('netstat', ['-ano'], { cwd: PROJECT_ROOT, windowsHide: true });
      return [...new Set(parsePids(stdout))];
    } catch {
      return [];
    }
  }

  try {
    const { stdout } = await execFileAsync('sh', ['-c', `lsof -ti tcp:${PORT}`], { cwd: PROJECT_ROOT });
    return stdout
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  } catch {
    return [];
  }
}
async function stopPortProcesses() {
  const pids = await getPortPids();
  if (pids.length === 0) {
    await log(`No process is listening on port ${PORT}.`);
    return;
  }

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      await log(`Stopped process ${pid} on port ${PORT}.`, 'REPAIR');
    } catch (error) {
      await log(`Unable to stop process ${pid}: ${error.message}`, 'WARN');
    }
  }
}

async function waitForPortToRelease() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if ((await getPortPids()).length === 0) return true;
    await sleep(500);
  }
  return false;
}

async function clearNextCache() {
  const nextCache = path.resolve(PROJECT_ROOT, '.next');
  const projectRootWithSep = `${path.resolve(PROJECT_ROOT)}${path.sep}`;

  if (!nextCache.startsWith(projectRootWithSep)) {
    throw new Error(`refusing to clear Next.js artifacts outside project root: ${nextCache}`);
  }

  if (existsSync(nextCache)) {
    await rm(nextCache, { recursive: true, force: true });
    await log('Cleared .next build artifacts.', 'REPAIR');
  }
}

function startDevServer() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const commandArgs = process.platform === 'win32' ? ['/c', 'npm.cmd', 'run', 'dev'] : ['run', 'dev'];
  const child = spawn(command, commandArgs, {
    cwd: PROJECT_ROOT,
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
  });
  child.unref();
  return child.pid;
}
async function waitForHealthyHome() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const home = await checkRoute(HEALTH_ROUTES[0]);
    if (home.status === 'PASSED') return true;
    await sleep(2500);
  }
  return false;
}

async function waitForAllRoutesHealthy() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const report = await scanScreenHealth();
    if (report.ok) return true;
    await sleep(2500);
  }
  return false;
}

async function repairScreenHealth(reason) {
  await log(`Screen health recovery started: ${reason}`, 'REPAIR');
  await stopPortProcesses();
  if (!(await waitForPortToRelease())) {
    throw new Error(`port ${PORT} is still in use; skipped cache cleanup to protect the active service`);
  }
  if (CLEAR_CACHE_DURING_REPAIR) {
    await clearNextCache();
  }
  const pid = startDevServer();
  await log(`Started Next.js dev server on port ${PORT} (PID ${pid}).`, 'REPAIR');

  if (!(await waitForHealthyHome())) {
    throw new Error(`port ${PORT} did not become healthy after recovery`);
  }

  await log(`Port ${PORT} recovered and homepage is reachable.`, 'SUCCESS');
}

async function runOnce() {
  await log(`Screen health scan started (${MOBILE_FIRST ? 'mobile-first' : 'standard'} profile).`);
  let report = await scanScreenHealth();

  if (!report.ok && AUTO_REPAIR) {
    const reason = report.failedRoutes.map((route) => `${route.title} ${route.path}`).join(', ');
    await writeReport({ ...report, recoveryStatus: 'REPAIRING' });
    await repairScreenHealth(reason);
    report = await scanScreenHealth();
    report.recoveryStatus = report.ok ? 'RECOVERED' : 'RECHECK_FAILED';
  } else {
    report.recoveryStatus = report.ok ? 'NOT_NEEDED' : 'DISABLED';
  }

  await writeReport(report);
  await log(`Screen health result: ${report.summary.screenStatus} (${report.summary.passed}/${report.summary.total})`, report.ok ? 'SUCCESS' : 'ERROR');
  return report;
}

async function main() {
  do {
    const report = await runOnce();
    if (!WATCH) {
      process.exitCode = report.ok ? 0 : 1;
      return;
    }
    await sleep(WATCH_INTERVAL_MS);
  } while (true);
}

main().catch(async (error) => {
  await log(`Screen health monitor crashed: ${error.message}`, 'ERROR');
  process.exitCode = 1;
});
