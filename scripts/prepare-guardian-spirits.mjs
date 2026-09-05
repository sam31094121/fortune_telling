/** Uses the existing sharp sprite pipeline on approved, generated cutouts.
 * Unlike the older black key, only connected neutral light matte is removed.
 * White fur inside the creature is retained. Input originals are never changed.
 * Usage: node scripts/prepare-guardian-spirits.mjs <guardian> <input.png>
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const [name, input] = process.argv.slice(2);
if (!['qinglong', 'zhuque', 'baihu', 'xuanwu'].includes(name) || !input) throw new Error('Expected guardian name and source PNG');
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const candidate = new Uint8Array(width * height);
const visited = new Uint8Array(width * height);
for (let p = 0; p < candidate.length; p++) {
  const i = p * 4;
  const lo = Math.min(data[i], data[i+1], data[i+2]);
  const hi = Math.max(data[i], data[i+1], data[i+2]);
  candidate[p] = lo > 223 && hi - lo < 16 ? 1 : 0;
}
const queue = new Int32Array(width * height);
// Matte components touching the canvas border are background. Large flat
// neutral holes enclosed by curled tails are also matte, not colored anatomy.
for (let origin = 0; origin < candidate.length; origin++) {
  if (!candidate[origin] || visited[origin]) continue;
  let head = 0, tail = 1, border = false;
  queue[0] = origin; visited[origin] = 1;
  while (head < tail) {
    const p = queue[head++], x = p % width, y = Math.floor(p / width);
    if (!x || x === width-1 || !y || y === height-1) border = true;
    const add = (next) => { if (!visited[next] && candidate[next]) { visited[next] = 1; queue[tail++] = next; } };
    if (x) add(p-1); if (x < width-1) add(p+1);
    if (y) add(p-width); if (y < height-1) add(p+width);
  }
  // Interior pale fur must survive. For the white tiger, remove only the
  // exterior matte; its stance has no enclosed background holes.
  if (border || (name !== 'baihu' && tail > 300)) {
    for (let i = 0; i < tail; i++) data[queue[i]*4+3] = 0;
  }
}
const dest = path.join('public/beast-game/spirit', `guardian-${name}.webp`);
await sharp(data, { raw: { width, height, channels: 4 } })
  .resize({ height: 512 }).webp({ quality: 86, alphaQuality: 100 }).toFile(dest);
console.log(dest, fs.statSync(dest).size);
