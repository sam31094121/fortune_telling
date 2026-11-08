// 青龍素材檢查：原生尺寸、有無透明通道、去背邊緣、有沒有被畫布邊界裁切、有效內容範圍。
const sharp = require(require('node:path').resolve(process.cwd(), 'node_modules/sharp')); const path = require('node:path'); const fs = require('node:fs'); const crypto = require('node:crypto');
const dir = 'public/beast-game/rig/qinglong'; const out = process.argv[2];
const files = ['bite-close.v2.webp','pounce-open.v2.webp','run-gather.webp','run-reach.webp','bite-close.webp','pounce-open.webp'];
(async () => {
  for (const f of files) {
    const p = path.join(dir, f); const buf = fs.readFileSync(p);
    const img = sharp(buf); const meta = await img.metadata();
    const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height; const A = (x, y) => data[(y * W + x) * 4 + 3];
    let minX = W, minY = H, maxX = -1, maxY = -1, opaque = 0, semi = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = A(x, y); if (a > 8) { opaque++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } if (a > 8 && a < 247) semi++; }
    // 邊界列／欄上是否有不透明像素（有＝內容被畫布邊界裁切）
    const edge = { top: 0, bottom: 0, left: 0, right: 0 };
    for (let x = 0; x < W; x++) { if (A(x, 0) > 40) edge.top++; if (A(x, H - 1) > 40) edge.bottom++; }
    for (let y = 0; y < H; y++) { if (A(0, y) > 40) edge.left++; if (A(W - 1, y) > 40) edge.right++; }
    // 去背邊緣的光暈：與透明相鄰的不透明像素裡，近白色（可能是白邊殘留）的比例
    let rim = 0, whiteRim = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (A(x, y) < 200) continue;
      if (A(x - 1, y) < 20 || A(x + 1, y) < 20 || A(x, y - 1) < 20 || A(x, y + 1) < 20) { rim++; const i = (y * W + x) * 4; if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) whiteRim++; }
    }
    console.log(JSON.stringify({ 檔案: f, 格式: meta.format, 原生: `${meta.width}×${meta.height}`, 透明通道: meta.hasAlpha, 位元組: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12),
      內容範圍: `x ${minX}-${maxX} / y ${minY}-${maxY}`, 內容佔畫布: `${((maxX - minX + 1) / W * 100).toFixed(0)}%×${((maxY - minY + 1) / H * 100).toFixed(0)}%`,
      邊界不透明像素: edge, 半透明邊緣像素: semi, 去背邊緣白邊比例: rim ? (whiteRim / rim * 100).toFixed(1) + '%' : 'n/a' }));
    // 轉成 PNG 供目視（棋盤格底，看得出透明與邊緣）
    const bg = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 60, g: 60, b: 70, alpha: 1 } } }).png().toBuffer();
    const merged=await sharp(bg).composite([{ input: buf }]).png().toBuffer(); await sharp(merged).resize({ width: 900 }).png().toFile(path.join(out, f.replace(/.webp$/, ".png")));
  }
})();
