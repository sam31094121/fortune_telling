#!/usr/bin/env node

/**
 * Port 8888 guardian.
 *
 * Keeps the local Next.js preview reachable on desktop and phone without
 * hammering the app. It checks one route per interval, restarts only the
 * process listening on port 8888 when needed, and clears the Next.js cache
 * when the server appears stuck.
 */

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.GUARDIAN_PORT || 8888);
const HOST = '0.0.0.0';
const CHECK_INTERVAL_MS = Number(process.env.GUARDIAN_INTERVAL_MS || 15000);
const CHECK_TIMEOUT_MS = Number(process.env.GUARDIAN_TIMEOUT_MS || 5000);
const FAILURE_THRESHOLD = Number(process.env.GUARDIAN_FAILURE_THRESHOLD || 3);
const HEALTH_PATHS = ['/', '/music', '/match', '/insight'];
const LOG_FILE = path.join(PROJECT_ROOT, '.guardian-log.txt');
const NEXT_OUT_LOG = path.join(PROJECT_ROOT, '.guardian-next.out.log');
const NEXT_ERR_LOG = path.join(PROJECT_ROOT, '.guardian-next.err.log');

class HomepageGuardian {
  constructor() {
    this.failureCount = 0;
    this.routeIndex = 0;
    this.recovering = false;
  }

  log(message, type = 'INFO') {
    const line = `[${new Date().toISOString()}] [${type}] ${message}`;
    console.log(line);

    try {
      fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
    } catch (error) {
      console.error(`[GUARDIAN] Unable to write log: ${error.message}`);
    }
  }

  getLanAddresses() {
    return Object.values(os.networkInterfaces())
      .flat()
      .filter(Boolean)
      .filter((item) => item.family === 'IPv4' && !item.internal)
      .map((item) => item.address);
  }

  showAddresses() {
    this.log(`Local preview: http://localhost:${PORT}/`);

    const addresses = this.getLanAddresses();
    if (addresses.length === 0) {
      this.log('Mobile preview: no LAN IPv4 address detected.');
      return;
    }

    for (const address of addresses) {
      this.log(`Mobile preview: http://${address}:${PORT}/`);
    }
  }

  checkRoute(routePath) {
    return new Promise((resolve) => {
      const request = http.request(
        {
          hostname: '127.0.0.1',
          port: PORT,
          path: routePath,
          method: 'HEAD',
          timeout: CHECK_TIMEOUT_MS,
          headers: { 'Cache-Control': 'no-cache' },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode >= 200 && response.statusCode < 400);
        },
      );

      request.on('timeout', () => request.destroy(new Error('Health check timeout')));
      request.on('error', () => resolve(false));
      request.end();
    });
  }

  async checkNextRoute() {
    const routePath = HEALTH_PATHS[this.routeIndex % HEALTH_PATHS.length];
    this.routeIndex += 1;

    const healthy = await this.checkRoute(routePath);
    this.log(`${routePath} health check: ${healthy ? 'ok' : 'failed'}`, healthy ? 'INFO' : 'WARN');
    return healthy;
  }

  getPortPids() {
    if (process.platform === 'win32') {
      try {
        const output = execFileSync(
          'powershell.exe',
          [
            '-NoProfile',
            '-Command',
            `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`,
          ],
          { cwd: PROJECT_ROOT, encoding: 'utf8', windowsHide: true },
        );

        return output
          .split(/\r?\n/)
          .map((line) => Number(line.trim()))
          .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
      } catch {
        return [];
      }
    }

    try {
      const output = execFileSync('sh', ['-c', `lsof -ti tcp:${PORT}`], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      });

      return output
        .split(/\r?\n/)
        .map((line) => Number(line.trim()))
        .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
    } catch {
      return [];
    }
  }

  stopPortProcesses() {
    const pids = this.getPortPids();
    if (pids.length === 0) {
      this.log(`No process is listening on port ${PORT}.`);
      return;
    }

    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM');
        this.log(`Stopped process ${pid} on port ${PORT}.`);
      } catch (error) {
        this.log(`Unable to stop process ${pid}: ${error.message}`, 'WARN');
      }
    }
  }

  clearNextCache() {
    const cachePath = path.join(PROJECT_ROOT, '.next', 'cache');

    try {
      fs.rmSync(cachePath, { recursive: true, force: true });
      this.log('Cleared .next/cache.');
    } catch (error) {
      this.log(`Unable to clear .next/cache: ${error.message}`, 'WARN');
    }
  }

  startDevServer() {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCommand, ['run', 'dev'], {
      cwd: PROJECT_ROOT,
      detached: true,
      windowsHide: true,
      stdio: [
        'ignore',
        fs.openSync(NEXT_OUT_LOG, 'a'),
        fs.openSync(NEXT_ERR_LOG, 'a'),
      ],
    });

    child.unref();
    this.log(`Started Next.js dev server on ${HOST}:${PORT} (PID ${child.pid}).`);
  }

  async waitUntilHealthy(maxAttempts = 24) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));

      if (await this.checkRoute('/')) {
        this.log(`Port ${PORT} is healthy after ${attempt} check(s).`, 'SUCCESS');
        return true;
      }
    }

    this.log(`Port ${PORT} did not become healthy after recovery.`, 'ERROR');
    return false;
  }

  async recover() {
    if (this.recovering) return;

    this.recovering = true;
    this.log(`Starting automatic recovery for port ${PORT}.`, 'CRITICAL');

    try {
      this.stopPortProcesses();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      this.clearNextCache();
      this.startDevServer();

      if (await this.waitUntilHealthy()) {
        this.failureCount = 0;
        this.showAddresses();
      }
    } finally {
      this.recovering = false;
    }
  }

  async start() {
    this.log('='.repeat(60));
    this.log('Port 8888 guardian started.');
    this.log(`Interval: ${CHECK_INTERVAL_MS}ms`);
    this.log(`Failure threshold: ${FAILURE_THRESHOLD}`);
    this.log(`Routes: ${HEALTH_PATHS.join(', ')}`);
    this.log('='.repeat(60));
    this.showAddresses();

    setInterval(async () => {
      if (this.recovering) return;

      const healthy = await this.checkNextRoute();
      if (healthy) {
        this.failureCount = 0;
        return;
      }

      this.failureCount += 1;
      this.log(`Health check failed (${this.failureCount}/${FAILURE_THRESHOLD}).`, 'WARN');

      if (this.failureCount >= FAILURE_THRESHOLD) {
        await this.recover();
      }
    }, CHECK_INTERVAL_MS);
  }
}

const guardian = new HomepageGuardian();
guardian.start().catch((error) => {
  guardian.log(`Guardian crashed: ${error.message}`, 'ERROR');
  process.exitCode = 1;
});
