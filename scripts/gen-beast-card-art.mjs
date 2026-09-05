import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ids = [1, 2, 3, 4, 5, 6];
const pad = (n) => String(n).padStart(2, '0');

for (const id of ids) {
  const src = path.join(root, 'public/star-beasts/adult-divine-v2', `${pad(id)}.png`);
  if (!fs.existsSync(src)) { console.log('缺原圖', src); continue; }
  // 手牌用：256 寬。手機一次可能同時有 5–8 張，這一層必須夠小。
  await sharp(src).resize({ width: 256 }).webp({ quality: 78 })
    .toFile(path.join(root, 'public/beast-game/thumb', `${pad(id)}.webp`));
  // 卡片正面（中等）：720 寬。點開卡片才用。
  await sharp(src).resize({ width: 720 }).webp({ quality: 82 })
    .toFile(path.join(root, 'public/beast-game/front', `${pad(id)}.webp`));
}

// 牌背：抽卡儀式從這張翻開。用專案既有的太極做底，不另外找素材。
const backSrc = path.join(root, 'public/taiji.png');
await sharp(backSrc)
  .resize({ width: 512, height: 758, fit: 'contain', background: { r: 12, g: 10, b: 32, alpha: 1 } })
  .webp({ quality: 82 })
  .toFile(path.join(root, 'public/beast-game/card-back.webp'));

const list = (dir) => fs.readdirSync(path.join(root, dir)).map((f) => {
  const s = fs.statSync(path.join(root, dir, f));
  return `${dir}/${f} ${(s.size / 1024).toFixed(0)}KB`;
});
console.log(list('public/beast-game/thumb').join('\n'));
console.log(list('public/beast-game/front').join('\n'));
console.log('card-back', (fs.statSync(path.join(root, 'public/beast-game/card-back.webp')).size / 1024).toFixed(0) + 'KB');
