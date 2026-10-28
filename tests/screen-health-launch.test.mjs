import assert from 'node:assert/strict';
import { readFileSync, openSync, closeSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

// Exercise the actual launcher with a separate port and build directory.
// Never stop or overwrite the customer's running 8888 service.
const root = process.cwd();
const probe = net.createServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const output = path.join(root, '.tmp', 'health-launch-test');
mkdirSync(output, { recursive: true });
const source = readFileSync(path.join(root, 'scripts/screen-health-monitor.mjs'), 'utf8');
const body = source.slice(source.indexOf('function startDevServer()'), source.indexOf('async function waitForHealthyHome()'));
let child;
let launchError;
const launch = new Function('process', 'path', 'spawn', 'openSync', 'closeSync', 'PROJECT_ROOT', 'PORT', 'NEXT_OUT_LOG', 'NEXT_ERR_LOG', 'log', `${body}; return startDevServer;`)(
  process, path,
  (command, args, options) => {
    child = spawn(command, args, { ...options, env: { ...process.env, NEXT_DIST_DIR: '.tmp/health-launch-test/build' } });
    return child;
  },
  openSync, closeSync, root, port, path.join(output, 'out.log'), path.join(output, 'err.log'),
  async message => { launchError = message; },
);
const connects = () => new Promise(resolve => {
  const socket = net.connect({ host: '127.0.0.1', port });
  const finish = result => { socket.destroy(); resolve(result); };
  socket.once('connect', () => finish(true));
  socket.once('error', () => finish(false));
  socket.setTimeout(500, () => finish(false));
});
try {
  const pid = launch();
  assert.equal(pid, child.pid);
  const deadline = Date.now() + 20000;
  let ready = false;
  while (Date.now() < deadline && child.exitCode === null && !launchError) {
    if (await connects()) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, launchError || `Launcher failed: ${readFileSync(path.join(output, 'err.log'), 'utf8')}`);
  console.log('PASS: real detached Next launcher listens on isolated test port; live service untouched');
} finally {
  if (child && child.exitCode === null) {
    // Only the child created by this test is signalled. Next owns its worker.
    child.kill('SIGTERM');
  }
}
