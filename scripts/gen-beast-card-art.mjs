/**
 * 神獸卡遊戲｜三段式卡圖產生器
 *
 * 規格第十四條：卡片圖片不得一次載入全部高清素材。
 * thumbnail → medium → high resolution，只有進入卡片詳細頁才載高畫質。
 *
 * 原圖 3392×5056、每張約 2.8–3.6MB。手牌放五張就是十幾 MB，手機必掛。
 * 這支腳本從既有素材產出兩個尺寸，原圖完全不動：
 *   thumb  256w   手牌與戰場用（約 20–35KB）
 *   front  720w   卡片正面用（約 150–250KB）
 * high 直接指回既有原圖，不複製一份。
 *
 * 加卡之後重跑：node scripts/gen-beast-card-art.mjs
 */

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outThumb = path.join(root, 'public/beast-game/thumb');
const outFront = path.join(root, 'public/beast-game/front');
fs.mkdirSync(outThumb, { recursive: true });
fs.mkdirSync(outFront, { recursive: true });

const data = JSON.parse(fs.readFileSync(path.join(root, 'data/star-beasts.json'), 'utf8'));

/** 四象素材。這四張是季節主宰，與二十八宿分開放。 */
const GUARDIANS = [
  { slug: 'qinglong', file: 'qinglong.png' },
  { slug: 'zhuque', file: 'zhuque.png' },
  { slug: 'baihu', file: 'baihu.png' },
  { slug: 'xuanwu', file: 'xuanwu.png' },
];

const jobs = [];
for (const item of data.items) {
  const n = String(item.id).padStart(2, '0');
  jobs.push({ key: `adult-${n}`, src: item.image });
  jobs.push({ key: `young-${n}`, src: item.youngDivineImage });
}
for (const guardian of GUARDIANS) {
  jobs.push({ key: `guardian-${guardian.slug}`, src: `/star-beasts/four-guardians/${guardian.file}` });
}

let done = 0;
let skipped = 0;
for (const job of jobs) {
  const src = path.join(root, 'public', job.src.replace(/^\//, ''));
  if (!fs.existsSync(src)) {
    console.warn('缺原圖，跳過：', job.src);
    skipped += 1;
    continue;
  }
  await sharp(src).resize({ width: 256 }).webp({ quality: 78 })
    .toFile(path.join(outThumb, `${job.key}.webp`));
  await sharp(src).resize({ width: 720 }).webp({ quality: 82 })
    .toFile(path.join(outFront, `${job.key}.webp`));
  done += 1;
}

// 牌背：抽卡儀式從這張翻開。用專案既有的太極做底，不另外找素材。
await sharp(path.join(root, 'public/taiji.png'))
  .resize({ width: 512, height: 758, fit: 'contain', background: { r: 12, g: 10, b: 32, alpha: 1 } })
  .webp({ quality: 82 })
  .toFile(path.join(root, 'public/beast-game/card-back.webp'));

const sizeOf = (dir) => fs.readdirSync(dir).reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
console.log(`完成 ${done} 張（跳過 ${skipped}）`);
console.log(`thumb 合計 ${(sizeOf(outThumb) / 1024 / 1024).toFixed(2)}MB`);
console.log(`front 合計 ${(sizeOf(outFront) / 1024 / 1024).toFixed(2)}MB`);
