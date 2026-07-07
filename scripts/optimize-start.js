const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const port = 3000;

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

function isHomepageHealthy() {
  return new Promise((resolve) => {
    const request = http.get(
      { hostname: '127.0.0.1', port, path: '/', timeout: 2500, headers: { 'Cache-Control': 'no-cache' } },
      (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 400);
      },
    );
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

function openBrowser(url) {
  let command;
  let args;

  if (process.platform === 'win32') {
    command = 'cmd.exe';
    args = ['/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const opener = spawn(command, args, { detached: true, stdio: 'ignore' });
  opener.unref();
}

function showAddresses() {
  console.log(`\nLocal preview: http://localhost:${port}/`);
  const lanAddresses = getLanAddresses();
  if (lanAddresses.length === 0) {
    console.log('Mobile preview: no LAN IPv4 address detected.');
  } else {
    for (const address of lanAddresses) {
      console.log(`Mobile preview: http://${address}:${port}/`);
    }
    console.log('Use the mobile preview URL on a phone connected to the same Wi-Fi.');
  }
}

function quotePowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function startPreviewServer(nextBin, logPath) {
  const errorLogPath = logPath.replace(/\.log$/, '.error.log');

  if (process.platform === 'win32') {
    const childArgs = [nextBin, 'dev', '-H', '0.0.0.0', '-p', String(port)]
      .map(quotePowerShell)
      .join(', ');
    const command = [
      `$process = Start-Process -FilePath ${quotePowerShell(process.execPath)}`,
      `-ArgumentList @(${childArgs})`,
      `-WorkingDirectory ${quotePowerShell(projectRoot)}`,
      '-WindowStyle Hidden',
      `-RedirectStandardOutput ${quotePowerShell(logPath)}`,
      `-RedirectStandardError ${quotePowerShell(errorLogPath)}`,
      '-PassThru;',
      '$process.Id',
    ].join(' ');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
      cwd: projectRoot,
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || 'Unable to start Windows preview process.');
    }
    console.log(`[OPTIMIZER] Background process started (PID ${result.stdout.trim()}).`);
    return;
  }

  const logHandle = fs.openSync(logPath, 'a');
  const child = spawn(process.execPath, [nextBin, 'dev', '-H', '0.0.0.0', '-p', String(port)], {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'development' },
    detached: true,
    stdio: ['ignore', logHandle, logHandle],
  });
  child.unref();
  fs.closeSync(logHandle);
}

async function main() {
  console.log('[OPTIMIZER] Starting mobile/tablet visual optimizer...');

  if (await isHomepageHealthy()) {
    console.log(`[OPTIMIZER] Port ${port} already serves a healthy homepage.`);
    showAddresses();
    openBrowser(`http://localhost:${port}/`);
    return;
  }

  const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const logPath = path.join(projectRoot, '.codex-mobile-preview.log');
  startPreviewServer(nextBin, logPath);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await isHomepageHealthy()) {
      console.log(`[OPTIMIZER] Mobile preview is ready. Log: ${logPath}`);
      showAddresses();
      openBrowser(`http://localhost:${port}/`);
      return;
    }
  }

  throw new Error(`Preview did not become healthy. Check ${logPath}`);
}

const keepAlive = setInterval(() => {}, 1000);
main()
  .catch((error) => {
    console.error('[OPTIMIZER] Failed:', error);
    process.exitCode = 1;
  })
  .finally(() => clearInterval(keepAlive));
