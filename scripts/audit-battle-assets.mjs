/**
 * 戰鬥素材盤點（AssetAuditReport）
 *
 * 逐一核對 lib/beast-game/battle-assets.ts 登記的每一項：檔案在不在、格式對不對、
 * 手機預算有沒有超、CSS 動畫是不是真的寫在那支檔案裡。
 * 另外掃 components／lib／app 的字串，找出「程式有引用、檔案卻不存在」的素材。
 *
 * 用法：npm run audit:battle-assets（寫出 reports/battle-assets/audit.{json,md}）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE = new Set(['WEBP', 'PNG', 'JPG', 'SVG']);
const AUDIO = new Set(['OGG', 'MP3', 'FLAC', 'M4A']);
const VIDEO = new Set(['WEBM', 'MP4']);
const REFERENCE = /['"`(]\s*(\/(?:audio|beast-game|textures|assets|images|skill-battle-archive|star-beasts|tarot)\/[^'"`)\s${}]+\.(?:webp|png|jpe?g|svg|gif|webm|mp4|ogg|mp3|flac|m4a|wav|glb|gltf))/g;

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full, out);
    } else out.push(full);
  }
  return out;
}

export async function auditBattleAssets(root = ROOT) {
  const loaded = await import(pathToFileURL(path.join(root, '.beast-game-build/lib/beast-game/battle-assets.js')).href);
  const lib = loaded.default ?? loaded;
  const assets = lib.battleAssets();

  const brokenEntries = [];
  const sizes = new Map();
  for (const asset of assets) {
    const problem = (message) => brokenEntries.push({ assetId: asset.assetId, path: asset.path, problem: message });
    if (!lib.BATTLE_ASSET_CATEGORIES.includes(asset.category)) problem(`未知分類 ${asset.category}`);
    if (asset.kind === 'PRESET') {
      const file = path.join(root, asset.path);
      if (!fs.existsSync(file)) { problem('CSS 檔不存在'); continue; }
      if (!new RegExp(`@keyframes\\s+${asset.evidence}\\b`).test(fs.readFileSync(file, 'utf8'))) problem(`找不到 @keyframes ${asset.evidence}`);
      continue;
    }
    const file = path.join(root, 'public', asset.path);
    if (!fs.existsSync(file)) { problem('檔案不存在'); continue; }
    const bytes = fs.statSync(file).size;
    sizes.set(asset.assetId, bytes);
    const ext = path.extname(file).slice(1).toUpperCase().replace('JPEG', 'JPG');
    if (ext !== asset.type) problem(`副檔名 ${ext} 與登記格式 ${asset.type} 不符`);
    const budget = IMAGE.has(asset.type) ? lib.MOBILE_BUDGET_BYTES.IMAGE : AUDIO.has(asset.type) ? lib.MOBILE_BUDGET_BYTES.AUDIO : VIDEO.has(asset.type) ? lib.MOBILE_BUDGET_BYTES.VIDEO : 0;
    if (asset.mobileSafe !== bytes <= budget) problem(`mobileSafe=${asset.mobileSafe} 與實際 ${bytes} bytes（上限 ${budget}）不符`);
    if (asset.preload && (!asset.mobileSafe || bytes > lib.PRELOAD_MAX_BYTES)) problem(`預載素材 ${bytes} bytes 超過 ${lib.PRELOAD_MAX_BYTES}`);
    if (asset.cardId && !asset.path.includes(`/${asset.cardId}/`)) problem(`綁定 ${asset.cardId} 但路徑不屬於這張卡`);
    if (!asset.license) problem('缺授權說明');
  }

  const categories = lib.BATTLE_ASSET_CATEGORIES.map((category) => {
    const inCategory = assets.filter((asset) => asset.category === category);
    const media = inCategory.filter((asset) => asset.kind === 'MEDIA').length;
    const presets = inCategory.length - media;
    return { category, label: lib.BATTLE_ASSET_CATEGORY_LABEL[category], media, presets, found: inCategory.length };
  });

  const missingReferences = [];
  const seen = new Set();
  for (const dir of ['components', 'lib', 'app']) {
    for (const file of walk(path.join(root, dir))) {
      if (!/\.(tsx?|css)$/.test(file)) continue;
      const source = stripComments(fs.readFileSync(file, 'utf8'));
      for (const [, reference] of source.matchAll(REFERENCE)) {
        const relative = path.relative(root, file).split(path.sep).join('/');
        const key = `${relative}|${reference}`;
        if (seen.has(key) || fs.existsSync(path.join(root, 'public', reference))) continue;
        seen.add(key);
        missingReferences.push({ file: relative, path: reference });
      }
    }
  }

  const registered = new Set(assets.filter((asset) => asset.kind === 'MEDIA').map((asset) => asset.path));
  const unregisteredBattleAudio = walk(path.join(root, 'public/audio/taiji'))
    .map((file) => `/${path.relative(path.join(root, 'public'), file).split(path.sep).join('/')}`)
    .filter((reference) => /\.(ogg|mp3|flac|m4a|wav)$/.test(reference) && !registered.has(reference));

  return {
    totalCategories: categories.length,
    foundCategories: categories.filter((row) => row.found > 0).length,
    mediaCategories: categories.filter((row) => row.media > 0).length,
    missingCategories: categories.filter((row) => row.found === 0).map((row) => row.category),
    mediaCount: assets.filter((asset) => asset.kind === 'MEDIA').length,
    presetCount: assets.filter((asset) => asset.kind === 'PRESET').length,
    mediaBytes: [...sizes.values()].reduce((sum, bytes) => sum + bytes, 0),
    categories,
    brokenEntries,
    missingReferences,
    unregisteredBattleAudio,
  };
}

function toMarkdown(report) {
  const rows = report.categories.map((row, index) =>
    `| ${index + 1} | ${row.category} | ${row.label} | ${row.media} | ${row.presets} | ${row.found ? '有' : '**缺**'} |`);
  return [
    '# 戰鬥素材盤點報告',
    '',
    `由 \`npm run audit:battle-assets\` 產生，逐一核對檔案後得出，沒有手填數字。`,
    '',
    `- 分類：${report.totalCategories} 類，有素材 **${report.foundCategories}** 類；其中有實體媒體檔 ${report.mediaCategories} 類`,
    `- 登記：媒體檔 ${report.mediaCount} 個（${(report.mediaBytes / 1_000_000).toFixed(2)} MB）、程式特效 ${report.presetCount} 個`,
    `- 缺少分類：${report.missingCategories.length ? report.missingCategories.join('、') : '無'}`,
    `- 登記錯誤：${report.brokenEntries.length} 項`,
    '',
    '| # | 分類 | 名稱 | 媒體檔 | 程式特效 | 狀態 |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    '## 程式有引用、檔案卻不存在',
    '',
    ...(report.missingReferences.length ? report.missingReferences.map((row) => `- \`${row.path}\`（${row.file}）`) : ['- 無']),
    '',
    '## 登記錯誤',
    '',
    ...(report.brokenEntries.length ? report.brokenEntries.map((row) => `- ${row.assetId} \`${row.path}\`：${row.problem}`) : ['- 無']),
    '',
    `## 太極音效資料夾內尚未登記的音檔（${report.unregisteredBattleAudio.length} 個，未確認內容前不歸類）`,
    '',
    ...report.unregisteredBattleAudio.map((reference) => `- \`${reference}\``),
    '',
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await auditBattleAssets();
  const outDir = path.join(ROOT, 'reports/battle-assets');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'audit.md'), toMarkdown(report));
  console.log(`FOUND = ${report.foundCategories} / ${report.totalCategories} 類（實體媒體 ${report.mediaCategories} 類）`);
  console.log(`媒體檔 ${report.mediaCount}、程式特效 ${report.presetCount}、缺少分類 ${report.missingCategories.join('、') || '無'}`);
  console.log(`登記錯誤 ${report.brokenEntries.length}、引用了卻不存在 ${report.missingReferences.length}`);
  if (report.brokenEntries.length) process.exit(1);
}
