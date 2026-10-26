/**
 * 把驗收通過的姿勢關鍵幀（.tmp/rig/poses）去背、裁切、依面積正規化，輸出成動畫用精靈：
 *   public/beast-game/rig/<card>/<pose>.webp   （透明背景、不縮小：保持模型原解析度的 0.75 倍以上）
 *   public/beast-game/rig/<card>/manifest.json （每幀尺寸、地面錨點、相對大小）
 *
 * 去背：只把「與畫面邊界相連的近黑區域」當背景（泛洪），身體內部的黑條紋、嘴內暗部一律保留；
 * 逐像素「暗就透明」會把白虎的黑條紋挖穿，第一版就是這樣失敗的。
 *
 * Usage: node scripts/build-beast-rig-sprites.mjs baihu [--round 1]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const card = process.argv[2] ?? 'baihu';
const roundIdx = process.argv.indexOf('--round');
const round = roundIdx >= 0 ? process.argv[roundIdx + 1] : '1';
const inDir = path.join(root, '.tmp/rig/poses');
const outDir = path.join(root, 'public/beast-game/rig', card);
/** 輸出寬度上限：手機上本體最大約螢幕寬的一半，1.5 倍螢幕像素密度已足夠，且比原圖解析度高於一般卡面的 512 高。 */
const MAX_WIDTH = 900;

/** 毛皮平均色（亮、低飽和的像素）：用來把各姿勢的色調對回母版，避免生成圖偏亮偏暖。 */
function furMean(data, channels, opaqueOnly) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += channels) {
    if (opaqueOnly && data[i + 3] < 250) continue;
    const R = data[i], G = data[i + 1], B = data[i + 2];
    const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    if (lum > 107 && (mx ? (mx - mn) / mx : 0) < 0.42) { r += R; g += G; b += B; n++; }
  }
  return [r / n, g / n, b / n];
}
const sourceArt = await sharp(path.join(root, 'public/beast-game/front/guardian-baihu.v2.webp')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const targetFur = furMean(sourceArt.data, sourceArt.info.channels, false);

const files = fs.readdirSync(inDir).filter((f) => f.startsWith(`${card}-`) && f.endsWith(`.r${round}.png`)).sort();
if (!files.length) throw new Error(`.tmp/rig/poses 裡找不到 ${card} 的第 ${round} 輪關鍵幀`);
fs.mkdirSync(outDir, { recursive: true });

const frames = [];
for (const file of files) {
  const pose = file.slice(card.length + 1, file.length - `.r${round}.png`.length);
  const { data, info } = await sharp(path.join(inDir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;
  const out = Buffer.from(data);
  const luma = (p) => 0.299 * out[p * channels] + 0.587 * out[p * channels + 1] + 0.114 * out[p * channels + 2];
  /*
    去背：不能逐像素「暗就透明」——白虎身上有黑條紋與嘴內暗部，會被挖穿（第一版就是這樣）。
    正確做法：只有「與畫面邊界相連的近黑區域」才是背景（泛洪）；身體內部的暗色一律保留。
    被腿、尾巴圈住的封閉背景洞，另外把「純黑（亮度 < 8）且面積夠大」的連通塊也當背景。
  */
  const bg = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  let sp = 0;
  const seed = (p) => { if (!bg[p] && luma(p) < 14) { bg[p] = 1; stack[sp++] = p; } };
  for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
  const flood = (limit) => {
    while (sp) {
      const p = stack[--sp]; const x = p % W; const y = (p / W) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (q >= 0 && !bg[q] && luma(q) < limit) { bg[q] = 1; stack[sp++] = q; }
      }
    }
  };
  flood(14);
  // 封閉的純黑洞
  const seen = new Uint8Array(W * H);
  for (let s0 = 0; s0 < W * H; s0++) {
    if (bg[s0] || seen[s0] || luma(s0) >= 8) continue;
    const comp = []; let top = 0; stack[top++] = s0; seen[s0] = 1;
    while (top) { const p = stack[--top]; comp.push(p); const x = p % W; const y = (p / W) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) if (q >= 0 && !seen[q] && !bg[q] && luma(q) < 8) { seen[q] = 1; stack[top++] = q; } }
    if (comp.length > 150) for (const p of comp) { bg[p] = 1; }
  }
  // 邊緣：背景旁 2 像素內依亮度做漸層，避免硬鋸齒與黑邊；其餘像素一律不透明
  const dist = new Int8Array(W * H).fill(3);
  for (let p = 0; p < W * H; p++) if (bg[p]) dist[p] = 0;
  for (let pass = 1; pass <= 2; pass++) for (let p = 0; p < W * H; p++) {
    if (dist[p] !== 3) continue; const x = p % W; const y = (p / W) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) if (q >= 0 && dist[q] === pass - 1) { dist[p] = pass; break; }
  }
  let minX = W, minY = H, maxX = 0, maxY = 0, area = 0;
  for (let p = 0; p < W * H; p++) {
    let a = 255;
    if (bg[p]) a = 0;
    else if (dist[p] <= 2) a = Math.round(Math.min(1, Math.max(0, (luma(p) - 6) / 34)) * 255);
    out[p * channels + 3] = a;
    if (a > 40) { const x = p % W, y = (p / W) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; area += a / 255; }
  }
  // 色調對回母版（毛皮平均色）：每個通道各乘一個係數，上限 1.25、下限 0.75，避免過度修正
  const fur = furMean(out, channels, true);
  const gain = fur.map((v, i) => Math.min(1.25, Math.max(0.75, targetFur[i] / v)));
  for (let p = 0; p < W * H; p++) {
    const i = p * channels;
    out[i] = Math.min(255, Math.round(out[i] * gain[0]));
    out[i + 1] = Math.min(255, Math.round(out[i + 1] * gain[1]));
    out[i + 2] = Math.min(255, Math.round(out[i + 2] * gain[2]));
  }
  console.log(pose, '色調係數', gain.map((v) => v.toFixed(2)).join(','));
  const pad = 6;
  const crop = { left: Math.max(0, minX - pad), top: Math.max(0, minY - pad), width: Math.min(W, maxX + pad) - Math.max(0, minX - pad) + 1, height: Math.min(H, maxY + pad) - Math.max(0, minY - pad) + 1 };
  const scale = Math.min(1, MAX_WIDTH / crop.width);
  const target = path.join(outDir, `${pose}.webp`);
  await sharp(out, { raw: { width: W, height: H, channels } }).extract(crop)
    .resize({ width: Math.round(crop.width * scale) }).webp({ quality: 90, alphaQuality: 95 }).toFile(target);
  const meta = await sharp(target).metadata();
  frames.push({ id: pose, file: `${pose}.webp`, width: meta.width, height: meta.height, area: Math.round(area * scale * scale), bytes: fs.statSync(target).size });
  console.log(pose, `${meta.width}x${meta.height}`, `${(fs.statSync(target).size / 1024).toFixed(0)}KB`);
}
// 面積正規化：以所有幀面積的中位數為 1，邊長依 sqrt(面積比) 縮放，讓不同姿勢的「身體大小」看起來一致
const areas = frames.map((f) => f.area).sort((a, b) => a - b);
const median = areas[Math.floor(areas.length / 2)];
for (const f of frames) f.norm = Number((Math.sqrt(median / f.area)).toFixed(4));
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ card, round, source: 'public/beast-game/front/guardian-baihu.v2.webp', frames }, null, 2));
console.log('manifest', frames.map((f) => `${f.id}:${f.norm}`).join(' '));
