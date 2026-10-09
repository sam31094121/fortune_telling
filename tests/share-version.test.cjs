/**
 * 分享連結版本號守門測試
 * ============================================================================
 *
 * 業主定調：分享鈕給出去的連結要帶版本號（?v=），以後變更也一樣。
 * LINE、Facebook 以整串網址當預覽快取鍵，版本號不變就會一直顯示舊圖舊文案。
 *
 * 守三件事：
 *   一、withShareVersion 的行為（補 v、覆蓋舊 v、保留其他參數與 # 片段）
 *   二、凡是會把連結交給別人的檔案（系統分享、LINE、複製連結）必須使用 withShareVersion，
 *       新增分享入口忘了帶版本號，這裡會直接擋下。
 *   三、各頁 OG metadata 一律取自 lib/share-preview.ts，不得再寫死圖片路徑。
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/* ── 一、行為 ───────────────────────────────────────────────────────── */
const code = ts.transpileModule(read('lib/share-preview.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'URLSearchParams', code)(mod, mod.exports, URLSearchParams);
const { withShareVersion, SHARE_IMAGE_VERSION, SHARE_IMAGE } = mod.exports;

assert.ok(SHARE_IMAGE_VERSION && /^[\w.-]+$/.test(SHARE_IMAGE_VERSION), '版本號必須是非空、可安全放進網址的字串');
assert.equal(
  withShareVersion('https://heaven-earth-humanity-pair.vercel.app/'),
  `https://heaven-earth-humanity-pair.vercel.app/?v=${SHARE_IMAGE_VERSION}`,
  '沒有查詢參數時補上 ?v=',
);
assert.equal(
  withShareVersion('https://x.test/a?from=share'),
  `https://x.test/a?from=share&v=${SHARE_IMAGE_VERSION}`,
  '已有其他參數時保留並用 & 接上 v',
);
assert.equal(
  withShareVersion('https://x.test/a?v=2&from=share'),
  `https://x.test/a?v=${SHARE_IMAGE_VERSION}&from=share`,
  '網址已有舊 v 要覆蓋成最新版本，不得重複出現兩個 v',
);
assert.equal(
  withShareVersion('https://x.test/a?k=1#top'),
  `https://x.test/a?k=1&v=${SHARE_IMAGE_VERSION}#top`,
  '# 片段要保留在最後',
);
assert.equal(withShareVersion(''), '', '空字串原樣回傳（伺服端沒有 window 時）');
assert.ok(SHARE_IMAGE.endsWith(`?v=${SHARE_IMAGE_VERSION}`), '圖片網址與連結共用同一個版本號');

/* ── 二、所有分享入口都要過 withShareVersion ──────────────────────────── */
const SCAN_DIRS = ['app', 'lib', 'components', 'features'];
const SHARE_PATTERN = /navigator\.share\s*\(|line\.me\/R\/msg|lineit\/share|facebook\.com\/sharer|twitter\.com\/intent|x\.com\/intent/;

/** 沒有把「連結」交給別人的檔案，必須寫明為什麼可以不帶版本號。 */
const EXEMPT = {
  'components/PersonalityMusicReport.tsx': '只分享歌曲文字，不帶任何網址',
  'app/dual-chart/BaziChart.tsx': '分享的是圖片檔，不帶網址',
  'lib/ghost-asura-share.ts': '通用分享函式，不自己組網址；網址由 getShareURL（已帶版本號）或呼叫端提供',
  'lib/red-luan-followup.ts': '分享的網址來自 app/red-luan-heartbeat/page.tsx 的 reminder.url，該處已帶版本號（下方另行檢查）',
};

function walk(dir, out) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(rel, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(rel);
    }
  }
}

const files = [];
for (const dir of SCAN_DIRS) walk(dir, files);

const missing = [];
for (const rel of files) {
  const src = read(rel);
  if (!SHARE_PATTERN.test(src)) continue;
  if (EXEMPT[rel]) continue;
  // 要有「呼叫」才算；只 import 不用不算數。
  if (!/withShareVersion\(/.test(src)) missing.push(rel);
}
assert.deepEqual(
  missing,
  [],
  `這些檔案會把連結交給別人，卻沒有使用 withShareVersion（lib/share-preview.ts）：\n  ${missing.join('\n  ')}\n` +
    '請把分享的網址包一層 withShareVersion(...)；若真的不分享網址，加進本測試 EXEMPT 並寫明理由。',
);

assert.ok(
  read('app/red-luan-heartbeat/page.tsx').includes('withShareVersion('),
  '紅鸞心動頁組 reminder.url 時必須使用 withShareVersion',
);
assert.ok(
  read('lib/ghost-asura-share.ts').includes('withShareVersion(url.toString())'),
  'getShareURL 必須回傳帶版本號的網址',
);

/* ── 三、OG metadata 一律取自共用檔 ──────────────────────────────────── */
for (const rel of [
  'app/layout.tsx',
  'app/beast-game/layout.tsx',
  'app/red-luan-heartbeat/layout.tsx',
  'app/ghost-asura/skill/page.tsx',
]) {
  const src = read(rel);
  assert.ok(src.includes("@/lib/share-preview"), `${rel} 的 OG 設定必須取自 lib/share-preview.ts`);
  assert.ok(!/og-taichi-preview|og-tiandiren/.test(src), `${rel} 不得寫死分享圖路徑，改 lib/share-preview.ts 即可`);
}

console.log('share-version: 全部通過');
