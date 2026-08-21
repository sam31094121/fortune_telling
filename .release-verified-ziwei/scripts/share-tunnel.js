const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT || 8888);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const HEALTH_PATH = '/internal/health/ready';
const TUNNEL_TIMEOUT_MS = Number(process.env.SHARE_TUNNEL_TIMEOUT_MS || 45_000);
const LAN_ONLY = process.env.SHARE_TUNNEL_LAN_ONLY === '1' || process.argv.includes('--lan-only');

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

function checkHttp(hostname, routePath = HEALTH_PATH, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname,
        port: PORT,
        path: routePath,
        timeout: timeoutMs,
        headers: {
          'Cache-Control': 'no-cache',
          'User-Agent': 'TDH-Mobile-Share-Healthcheck/1.0',
        },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 400);
      },
    );

    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', () => resolve(false));
  });
}

async function waitForReady(hostname = '127.0.0.1', attempts = 40) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await checkHttp(hostname)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function startDevServer() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmCommand, ['run', 'dev'], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

function printMobileUrls(lanAddresses) {
  console.log('\n======================================================');
  console.log('Mobile preview URLs');
  console.log(`Local: http://localhost:${PORT}/`);

  if (lanAddresses.length) {
    for (const address of lanAddresses) {
      console.log(`Same Wi-Fi phone: http://${address}:${PORT}/`);
    }
  } else {
    console.log('Same Wi-Fi phone: no LAN IPv4 address detected.');
  }

  console.log('======================================================');
  console.log('For a phone on the same Wi-Fi, use the Same Wi-Fi URL first.');
  console.log('For LINE/Facebook external sharing, wait for the HTTPS tunnel URL.');
}

function printFallback(lanAddresses) {
  console.log('\n======================================================');
  console.log('HTTPS tunnel was not created, but the local server is healthy.');
  if (lanAddresses.length) {
    console.log('Use one of these same Wi-Fi phone URLs:');
    for (const address of lanAddresses) {
      console.log(`http://${address}:${PORT}/`);
    }
  }
  console.log('If the phone still hangs, confirm both devices use the same Wi-Fi and allow Node.js / port 8888 in Windows Firewall.');
  console.log('======================================================');
}

function startLocalTunnel(lanAddresses) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', `npx --yes localtunnel --port ${PORT} --local-host 127.0.0.1`]
      : ['--yes', 'localtunnel', '--port', String(PORT), '--local-host', '127.0.0.1'];
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      windowsHide: true,
      shell: false,
    });

    let resolved = false;
    const finish = (ok) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve({ ok, child });
    };

    const timer = setTimeout(() => {
      console.warn(`\nTunnel did not become ready within ${Math.round(TUNNEL_TIMEOUT_MS / 1000)} seconds.`);
      child.kill();
      printFallback(lanAddresses);
      finish(false);
    }, TUNNEL_TIMEOUT_MS);

    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log(output);
      const match = output.match(/https:\/\/\S+/);
      if (match) {
        console.log('\n======================================================');
        console.log('Public share URL is ready');
        console.log(match[0]);
        console.log('======================================================');
        console.log('Keep this terminal open. Closing it will stop the public URL.');
        finish(true);
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.warn(`[localtunnel] ${output}`);
    });

    child.on('error', (error) => {
      console.warn(`[localtunnel] start failed: ${error.message}`);
      printFallback(lanAddresses);
      finish(false);
    });

    child.on('close', (code) => {
      if (!resolved) {
        console.warn(`[localtunnel] exited with code ${code}`);
        printFallback(lanAddresses);
        finish(false);
      }
    });
  });
}

async function main() {
  console.log('Checking mobile share service...');

  let ready = await checkHttp('127.0.0.1');
  if (!ready) {
    console.log(`localhost:${PORT} is not ready. Starting Next.js in the background...`);
    const pid = startDevServer();
    console.log(`Next.js background PID: ${pid}`);
    ready = await waitForReady('127.0.0.1');
  }

  if (!ready) {
    throw new Error(`localhost:${PORT} did not pass health check. Fix the dev server first.`);
  }

  const lanAddresses = getLanAddresses();
  printMobileUrls(lanAddresses);

  for (const address of lanAddresses) {
    const lanHealthReady = await checkHttp(address, HEALTH_PATH);
    const lanPageReady = lanHealthReady ? await checkHttp(address, '/', 10_000) : false;
    console.log(`LAN check ${address}:${PORT}: ${lanPageReady ? 'ok' : lanHealthReady ? 'health ok / page pending' : 'failed'}`);
  }

  if (LAN_ONLY) {
    console.log('\nLAN-only mode complete. No HTTPS tunnel was started.');
    return;
  }

  console.log('\nCreating HTTPS tunnel for LINE/Facebook sharing...');
  const tunnel = await startLocalTunnel(lanAddresses);
  if (!tunnel.ok) return;

  process.on('SIGINT', () => {
    tunnel.child.kill();
    process.exit(0);
  });

  setInterval(() => {}, 1000);
}

main().catch((error) => {
  console.error(`Share service failed: ${error.message}`);
  process.exitCode = 1;
});