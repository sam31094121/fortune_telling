// 八字後端一鍵健康檢查（業主 2026-11-26）
//   npm run health:bazi              實跑全部八字相關守門測試，印出實測數字，寫 reports/bazi-health/latest.json
//   npm run health:bazi -- --write-skill   同時把實測結果寫回 docs/技能戰鬥檔案/八字/八字.json 的 verification（數字全部來自實跑，不手填）
// 失敗不吞：任何一項沒過就整體失敗（exit 1），並印出該項最後的輸出。
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = path.join(root, 'docs/技能戰鬥檔案/八字/八字.json');
const CHECKS = [
  ['排盤黃金測試', 'test:bazi'], ['V5 契約', 'test:bazi-contract'], ['欄位涵蓋', 'test:bazi-coverage'],
  ['傳統閘門', 'test:bazi-traditional-gate'], ['功能完整', 'test:bazi-feature-complete'], ['輸出可得性', 'test:bazi-output-availability'],
  ['獨立審查（400 組）', 'test:bazi-independent-audit'], ['紙本流年神煞與旺衰格局', 'test:annual-shensha-paper'],
  ['技能檔自身一致', 'test:bazi-skill-file'], ['其餘八字守門（7 支）', 'test:bazi-extra'],
  ['八字→紫微→易經交叉', 'test:three-core'], ['三合一整合層', 'test:three-in-one'], ['八字紫微交叉', 'test:bazi-ziwei-cross'],
  ['真太陽時', 'test:true-solar-time'], ['來源登記閘門', 'test:iching-sources'], ['五神守門', 'test:soul-match'],
];
const run = (script) => new Promise((resolve) => {
  const t0 = Date.now(); let out = '';
  const child = spawn(`npm run ${script}`, { cwd: root, shell: true });
  child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => resolve({ script, code, out, ms: Date.now() - t0 }));
});
const summarize = (out) => {
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  const pass = [...lines].reverse().find((l) => /PASS \d+|checks passed|passed|PASS:|ok$/.test(l));
  return (pass ?? lines[lines.length - 1] ?? '').replace(/\s+/g, ' ').slice(0, 110);
};

const results = [];
// 3 並行：每支都只讀、各自編譯到不同資料夾；真正共用輸出目錄的幾支（tsc 暫存）排在同一批外面逐一跑
const SERIAL = new Set(['test:bazi', 'test:bazi-contract', 'test:bazi-coverage', 'test:bazi-traditional-gate', 'test:bazi-ziwei-cross']);
for (const [label, script] of CHECKS.filter(([, s]) => SERIAL.has(s))) results.push({ label, ...(await run(script)) });
const rest = CHECKS.filter(([, s]) => !SERIAL.has(s)); const queue = [...rest];
await Promise.all(Array.from({ length: 3 }, async () => { for (let c = queue.shift(); c; c = queue.shift()) results.push({ label: c[0], ...(await run(c[1])) }); }));

const order = new Map(CHECKS.map(([, s], i) => [s, i]));
results.sort((a, b) => order.get(a.script) - order.get(b.script));
let failed = 0;
for (const r of results) {
  const ok = r.code === 0; if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${r.label.padEnd(22)} ${(r.ms / 1000).toFixed(0).padStart(3)}s  ${ok ? summarize(r.out) : '失敗'}`);
}
// 基礎設施：推送閘有沒有真的會跑
let hooksPath = ''; try { hooksPath = execSync('git config core.hooksPath', { cwd: root }).toString().trim(); } catch {}
const hooksOk = !hooksPath || (hooksPath !== 'NUL' && hooksPath !== '/dev/null');
console.log(`${hooksOk ? '✓' : '⚠'} 推送閘生效                core.hooksPath=${hooksPath || '（預設）'}${hooksOk ? '' : '：已被關閉，git push 不會跑任何檢查'}`);

const head = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch { return ''; } })();
const report = { measuredAt: new Date().toISOString(), gitHead: head, passed: results.length - failed, failed, hooksOk, checks: results.map((r) => ({ label: r.label, script: r.script, ok: r.code === 0, seconds: Math.round(r.ms / 1000), summary: r.code === 0 ? summarize(r.out) : r.out.split('\n').slice(-12).join('\n') })) };
fs.mkdirSync(path.join(root, 'reports/bazi-health'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/bazi-health/latest.json'), JSON.stringify(report, null, 2) + '\n');
if (process.argv.includes('--write-skill') && failed === 0) {
  const skill = JSON.parse(fs.readFileSync(SKILL, 'utf8'));
  skill.verification.measuredAt = new Date().toISOString().slice(0, 10);
  skill.verification.tests = report.checks.filter((c) => c.ok).map((c) => ({ script: `npm run ${c.script}`, result: c.summary }));
  fs.writeFileSync(SKILL, JSON.stringify(skill, null, 2) + '\n');
  console.log('已把實測結果寫回八字技能檔 verification');
}
console.log(failed ? `\n❌ ${failed} 項沒過` : `\n✅ 八字後端健康檢查 ${results.length} 項全過`);
process.exit(failed ? 1 : 0);
