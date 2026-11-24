// 並行跑多個彼此獨立的 e2e 子行程（每個有自己的瀏覽器設定檔與輸出資料夾）。
// 失敗不吞：任何一個非 0 就整體失敗，並把該子行程最後的輸出原樣印出。
// 上限預設 3：真實瀏覽器同時開太多，反而讓畫格／時序類斷言誤判，所以不求最大並行。
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

function runJob(job, script) {
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
