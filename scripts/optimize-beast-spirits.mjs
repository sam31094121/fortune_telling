/**
 * 把已經生成的本體立繪縮到網頁尺寸。
 *
 * 第一版產生器直接存模型回來的原始尺寸（848×1259 PNG，一張約 1.4MB）。
 * 六十張就是 84MB——手機優先 60FPS 的憲章下不能接受，
 * 而且三維場景裡本體最多佔螢幕高度一半，512 高綽綽有餘。
 *
 * 這支把既有的 PNG 轉成 512 高的 WebP 並刪掉原檔，只跑一次就好。
 * 之後產生器本身就會直接輸出 WebP。
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(process.cwd(), 'public/beast-game/spirit');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
let before = 0;
let after = 0;

for (const file of files) {
  const from = path.join(dir, file);
  const to = from.replace(/\.png$/, '.webp');
  before += fs.statSync(from).size;
  await sharp(from)
    .resize({ height: 512, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(to);
  after += fs.statSync(to).size;
  fs.unlinkSync(from);
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
console.log(`轉換 ${files.length} 張：${mb(before)}MB → ${mb(after)}MB`);
