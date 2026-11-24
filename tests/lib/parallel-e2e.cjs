// 並行跑多個彼此獨立的 e2e 子行程（每個有自己的瀏覽器設定檔與輸出資料夾）。
// 失敗不吞：任何一個非 0 就整體失敗，並把該子行程最後的輸出原樣印出。
// 上限預設 3：真實瀏覽器同時開太多，反而讓畫格／時序類斷言誤判，所以不求最大並行。
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

// 跨行程的瀏覽器總量上限：健檢會同時跑好幾支 e2e，每支又各自並行，
// 不設總量就會乘開、把機器壓垮（拖曳落空、逾時）。用「槽位資料夾」當號碼牌，
// 所有行程共用同一批槽位；持有者行程已不在，或超過 10 分鐘，就視為過期可回收。
const fs = require('node:fs');
const SLOT_DIR = path.join(os.tmpdir(), 'match3-e2e-slots');
const MAX_SLOTS = Number(process.env.E2E_BROWSER_SLOTS) || 4;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function acquireSlot() {
  fs.mkdirSync(SLOT_DIR, { recursive: true });
  for (;;) {
    for (let i = 0; i < MAX_SLOTS; i++) {
      const dir = path.join(SLOT_DIR, `slot-${i}`);
      try { fs.mkdirSync(dir); fs.writeFileSync(path.join(dir, 'owner'), String(process.pid)); return dir; } catch {}
      try {
        const owner = Number(fs.readFileSync(path.join(dir, 'owner'), 'utf8'));
        const age = Date.now() - fs.statSync(dir).mtimeMs;
        if ((owner && !alive(owner)) || age > 600000) fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}
const releaseSlot = (dir) => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };

async function runJob(job, script) {
  const slot = await acquireSlot();
  try { return await runJobNow(job, script); } finally { releaseSlot(slot); }
}

function runJobNow(job, script) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, ...job.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (e) => resolve({ job, code: 1, out: String(e), ms: Date.now() - started }));
    child.on('close', (code) => resolve({ job, code: code ?? 1, out, ms: Date.now() - started }));
  });
}

async function runParallel(script, jobs, { limit = Number(process.env.E2E_PARALLEL) || 3 } = {}) {
  const queue = [...jobs];
  const results = [];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) results.push(await runJob(job, script));
    }),
  );
  let failed = false;
  for (const job of jobs) {
    const r = results.find((x) => x.job === job);
    console.log(`${r.code === 0 ? 'PASS' : 'FAIL'} ${job.name} (${Math.round(r.ms / 1000)}s)`);
    if (r.code !== 0) { failed = true; console.error(r.out.split('\n').slice(-40).join('\n')); }
  }
  return failed ? 1 : 0;
}

const outDir = (name) => path.join(os.tmpdir(), `match3-e2e-${name}`);

module.exports = { runParallel, outDir };
