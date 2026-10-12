// 上鎖卡片守門：清單裡每一張卡片，頁面、API、首頁按鈕都要上鎖，且密碼本身不得出現在任何程式碼裡。
// 做法與清單見 lib/locked-cards.ts。執行：node tests/locked-cards.test.cjs（不需 dev server）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let checks = 0;
const yes = (c, m) => { assert.ok(c, m); checks += 1; };

// 讀出清單（lib/locked-cards.ts 裡每一筆 route / apis）
const registry = read('lib/locked-cards.ts');
const cards = [...registry.matchAll(/route: '([^']+)', apis: \[([^\]]*)\]/g)].map((m) => ({
  route: m[1],
  apis: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]),
}));
yes(cards.length >= 2, '上鎖清單至少要有易經神煞與生成一首歌');
yes(cards.some((c) => c.route === '/music'), '清單要有 /music（生成一首歌）');

const home = read('app/page.tsx') + read('components/GhostAsuraHomeEntry.tsx'); // 阿修羅入口在自己的元件裡
const auth = read('lib/dual-chart-auth.ts');
yes(auth.includes('export function lockedCardGuard') && auth.includes('validSession('), '共用 API 守衛 lockedCardGuard 要存在並檢查 session');

for (const card of cards) {
  // 1. 頁面：伺服器端外殼，沒有有效 session 就是密碼畫面
  if (card.route !== '/dual-chart') {
    const pagePath = `app${card.route}/page.tsx`;
    const page = read(pagePath);
    yes(!/^\s*['"]use client['"]/.test(page), `${pagePath} 必須是伺服器端外殼（不能是 use client），密碼才在伺服器核對`);
    yes(page.includes('validSession(') && page.includes('<PasswordGate'), `${pagePath} 沒有有效 session 要顯示 PasswordGate`);
    yes(page.includes("dynamic = 'force-dynamic'"), `${pagePath} 要是動態頁，不能被快取成已解鎖的畫面`);
  }
  // 2. API：每支都要先過守衛
  // 易經神煞既有的 API 另有速率限制與同源檢查；本守門只管新加的「鎖號碼」卡片
  for (const api of card.route === '/dual-chart' ? [] : card.apis) {
    const routePath = `app/api/${api}/route.ts`;
    const code = read(routePath);
    yes(code.includes('lockedCardGuard(request)') || code.includes('validSession('), `${routePath} 要先檢查密碼 session`);
  }
  // 3. 首頁按鈕：寫「輸入密碼」（不能還寫「請點我開啟」）
  // 連結可能出現多次（導覽小連結＋卡片），找到帶有 home-feature-cta 按鈕的那一張
  const ctas = [];
  for (let at = home.indexOf(`href="${card.route}"`); at !== -1; at = home.indexOf(`href="${card.route}"`, at + 1)) {
    const block = home.slice(at, at + 6000);
    const i = block.indexOf('home-feature-cta');
    if (i !== -1) ctas.push(block.slice(i, i + 400));
  }
  yes(ctas.length > 0, `首頁要有連到 ${card.route} 的卡片`);
  yes(ctas[0].includes('輸入密碼') && !ctas[0].includes('請點我開啟'), `${card.route} 的首頁按鈕要寫「輸入密碼」`);
}

// 4. 密碼畫面不得自己存或比對密碼，只能丟給同一個登入口
const gate = read('components/PasswordGate.tsx');
yes(gate.includes("'/api/dual-chart/session'"), '密碼畫面要用與易經神煞同一個登入口');
yes(!/localStorage|sessionStorage/.test(gate), '密碼畫面不得把密碼存在瀏覽器');

// 5. 密碼本身（環境變數 DUAL_CHART_PASSWORD 的值）不得出現在任何被追蹤的檔案
const secrets = [];
for (const envFile of ['.env.local', '.env']) {
  const p = path.join(root, envFile);
  if (!fs.existsSync(p)) continue;
  const m = fs.readFileSync(p, 'utf8').match(/^DUAL_CHART_PASSWORD\s*=\s*"?([^"\r\n]+)"?/m);
  if (m && m[1].trim().length >= 4) secrets.push(m[1].trim());
}
if (process.env.DUAL_CHART_PASSWORD && process.env.DUAL_CHART_PASSWORD.length >= 4) secrets.push(process.env.DUAL_CHART_PASSWORD);
let tracked = [];
try { tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean); } catch { /* 不在 git 內就略過 */ }
const textExt = /\.(ts|tsx|js|jsx|cjs|mjs|json|md|css|sql|yml|yaml|sh|txt)$/;
for (const secret of [...new Set(secrets)]) {
  for (const f of tracked.filter((x) => textExt.test(x) && !x.startsWith('node_modules/'))) {
    let body = '';
    try { body = fs.readFileSync(path.join(root, f), 'utf8'); } catch { continue; }
    assert.ok(!body.includes(secret), `密碼不得出現在程式碼或文件裡：${f}`);
  }
  checks += 1;
}
yes(!/\.env(\.local)?$/m.test(tracked.join('\n')), '.env 檔不得被版控追蹤');

console.log(`locked-cards: ${checks} checks passed`);
