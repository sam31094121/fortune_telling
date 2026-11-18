// 英文實際畫面稽核：用真的瀏覽器把每個頁面切成英文，列出「畫面上還是中文」的文字。
// 這支才是「有沒有翻完」的標準，不再靠人用眼睛一頁一頁找，也不依賴字典鍵清單
// （字典鍵清單量不到「連字典都沒有」的句子）。
// 用法：先確認開發伺服器在 8888，再執行
//   node scripts/audit-english-rendered.cjs            → 每頁剩幾句中文
//   node scripts/audit-english-rendered.cjs /tarot     → 列出該頁剩下的中文句子
// 只讀、不改檔。掃的是頁面剛載入的畫面；按了按鈕才出現的內容，要在 STEPS 裡補操作。
const path = require('path');
const root = path.resolve(__dirname, '..');
let chromium;
for (const base of [root, path.join(root, 'scripts/card-preview')]) {
  try { ({ chromium } = require(require.resolve('playwright-core', { paths: [base] }))); break; } catch {}
}
if (!chromium) { console.error('找不到 playwright-core'); process.exit(1); }

const BASE = process.env.AUDIT_BASE || 'http://localhost:8888';
// 要稽核哪個語言：AUDIT_LANG=ko node scripts/audit-english-rendered.cjs（預設 en；zh-Hant 沒有翻譯層，不必稽核）。
const LANG = process.env.AUDIT_LANG || 'en';
const ROUTES = ['/', '/numerology', '/tarot', '/bazi', '/insight', '/music', '/nameology', '/zodiac', '/red-luan-heartbeat',
  '/growth-center', '/star-beasts', '/beast-game', '/nine-grid', '/trust', '/dual-chart', '/ghost-asura'];
const only = process.argv[2];

(async () => {
  // 電腦上實際裝好的 Chromium（版本與 playwright-core 不一定相同，所以直接指定執行檔；找不到就交給 playwright 自己找）。
  const fs = require('fs'); const os = require('os');
  const cacheDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'ms-playwright');
  let executablePath;
  try {
    for (const dir of fs.readdirSync(cacheDir).filter(d => d.startsWith('chromium-')).sort().reverse()) {
      const exe = path.join(cacheDir, dir, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(exe)) { executablePath = exe; break; }
    }
  } catch {}
  const browser = await chromium.launch({ executablePath });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(lang => { try { localStorage.setItem('interface-reading-language-v1', lang); } catch {} }, LANG);
  const page = await ctx.newPage();
  let total = 0;
  for (const route of only ? [only] : ROUTES) {
    try {
      // 開發伺服器第一次進頁會現場編譯：先暖機一次，再正式載入掃描，避免把「還沒編完」誤判成「沒翻譯」。
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 180000 }).catch(() => {});
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(lang => document.documentElement.getAttribute('data-reading-lang') === lang, LANG, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(6000);
      const left = await page.evaluate(() => {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const t = n.nodeValue.trim(); const el = n.parentElement;
          if (!t || !/[㐀-鿿]/.test(t) || !el) continue;
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || el.closest('[data-language-picker]') || el.closest('[data-i18n-skip],[translate="no"]')) continue;
          out.push(t);
        }
        for (const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))
          if (!el.closest('[data-language-picker]')) for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v && /[㐀-鿿]/.test(v)) out.push(`[${a}] ${v}`); }
        return out;
      });
      total += left.length;
      if (only) console.log(left.join('\n')); else console.log(route.padEnd(24), '剩中文', String(left.length).padStart(4));
    } catch (e) { console.log(route.padEnd(24), '無法開啟', e.message.slice(0, 60)); }
  }
  if (!only) console.log('合計', total);
  await browser.close();
})();
