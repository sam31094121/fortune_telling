/**
 * 本體立繪品質檢查。
 *
 * 去背是「把純黑鍵成透明」。但影像模型偶爾會無視指示回一張白底或淺底的圖，
 * 那種圖經過黑底去背之後背景原封不動——結果就是一塊白方塊衝過去。
 * 實測就抓到一張（室火豬幼子）。
 *
 * 判準很簡單：正常去背的立繪，透明像素會佔四成以上。
 * 低於門檻就是背景沒被去掉，列出來重生。
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(process.cwd(), 'public/beast-game/spirit');
const MIN_TRANSPARENT = 0.35;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).sort();
const bad = [];

for (const file of files) {
  const { data, info } = await sharp(path.join(dir, file)).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  let clear = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] < 8) clear += 1;
    total += 1;
  }
  const ratio = clear / total;
  if (ratio < MIN_TRANSPARENT) {
    bad.push({ file, ratio });
  }
}

if (bad.length === 0) {
  console.log(`全部 ${files.length} 張都正常去背`);
} else {
  console.log(`${bad.length} / ${files.length} 張背景沒去乾淨：`);
  for (const item of bad) console.log(`  ${item.file}  透明只有 ${(item.ratio * 100).toFixed(1)}%`);
  const adults = bad.filter((b) => !b.file.includes('y')).map((b) => Number(b.file.slice(0, 2)));
  const youngs = bad.filter((b) => b.file.includes('y')).map((b) => Number(b.file.slice(0, 2)));
  if (adults.length) console.log(`\n重生成獸：node scripts/gen-beast-spirits.mjs --only ${adults.join(',')} --force`);
  if (youngs.length) console.log(`重生幼子：node scripts/gen-beast-spirits.mjs --young --only ${youngs.join(',')} --force`);
  process.exitCode = 1;
}
