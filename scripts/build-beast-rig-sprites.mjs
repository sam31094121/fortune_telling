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
// 白虎 1400px、青龍 1600px（青龍必須高於白虎：業主定案 2026-10-26）。
const MAX_WIDTH = card === 'baihu' ? 1400 : 1600;
/** 封閉暗洞（身體被腿、尾巴圈住的背景）的判斷：白虎有黑條紋，門檻要嚴（純黑、大塊）；青龍的鱗片與鬃毛縫隙多，用「中性灰黑、小塊也算」 */
const HOLE = card === 'baihu' ? { luma: 8, minSize: 2500, neutralOnly: false } : { luma: 13, minSize: 350, neutralOnly: true };
const SOURCE = `public/beast-game/front/guardian-${card}.v2.webp`;

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
const sourceArt = await sharp(path.join(root, SOURCE)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
  // 生成圖偶有一圈細灰框（亮度約 32）：最外 4 像素一律當背景，不讓它被當成身體而撐大裁切範圍
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4) { const q = y * W + x; if (!bg[q]) { bg[q] = 1; stack[sp++] = q; } }
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
    if (bg[s0] || seen[s0] || luma(s0) >= HOLE.luma) continue;
    const comp = []; let top = 0; stack[top++] = s0; seen[s0] = 1;
    while (top) { const p = stack[--top]; comp.push(p); const x = p % W; const y = (p / W) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) if (q >= 0 && !seen[q] && !bg[q] && luma(q) < HOLE.luma) { seen[q] = 1; stack[top++] = q; } }
    if (comp.length > HOLE.minSize) {
      // 嘴內的暗紅、鼻孔的暗色是身體的一部分，不是背景：背景洞是「中性灰黑」（三個色頻幾乎相同），帶紅或帶藍的暗區一律保留
      let r = 0, g = 0, b = 0;
      for (const p of comp) { r += out[p * channels]; g += out[p * channels + 1]; b += out[p * channels + 2]; }
      r /= comp.length; g /= comp.length; b /= comp.length;
      const neutral = !HOLE.neutralOnly || Math.max(r, g, b) - Math.min(r, g, b) < 4;
      if (neutral || comp.length > 4000) for (const p of comp) { bg[p] = 1; }
    }
  }
  // 開運算（先侵蝕再膨脹）：把背景裡「很窄的暗縫」還給身體——鼻孔、嘴角、毛叢間的暗處會被泛洪沿細縫灌進去而被誤判成背景
  {
    const R = 2;
    const pass = (src, mode) => {
      const tmp = new Uint8Array(W * H); const dst = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = mode === 'dilate' ? 0 : 1; for (let k = -R; k <= R; k++) { const xx = x + k; const b = xx < 0 || xx >= W ? (mode === 'dilate' ? 0 : 1) : src[y * W + xx]; if (mode === 'dilate' ? b : !b) { v = mode === 'dilate' ? 1 : 0; break; } } tmp[y * W + x] = v; }
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { let v = mode === 'dilate' ? 0 : 1; for (let k = -R; k <= R; k++) { const yy = y + k; const b = yy < 0 || yy >= H ? (mode === 'dilate' ? 0 : 1) : tmp[yy * W + x]; if (mode === 'dilate' ? b : !b) { v = mode === 'dilate' ? 1 : 0; break; } } dst[y * W + x] = v; }
      return dst;
    };
    const opened = pass(pass(bg, 'erode'), 'dilate');
    for (let p = 0; p < W * H; p++) if (!opened[p]) bg[p] = 0;
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
    else if (dist[p] === 1 && luma(p) < 38) a = 0; // 最外圈偏暗的像素是黑底殘留（暗邊），直接去掉
    else if (dist[p] <= 2) {
      const alpha = Math.min(1, Math.max(0, (luma(p) - 6) / 34));
      a = Math.round(alpha * 255);
      // 去黑邊（decontaminate）：把被黑底壓暗的邊緣色還原成前景色
      if (alpha > 0.08 && alpha < 1) for (let c = 0; c < 3; c++) out[p * channels + c] = Math.min(255, Math.round(out[p * channels + c] / Math.max(alpha, 0.35)));
    }
    out[p * channels + 3] = a;
    if (a > 40) { const x = p % W, y = (p / W) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; area += a / 255; }
  }
  // 色調對回母版（毛皮平均色）：每個通道各乘一個係數，上限 1.25、下限 0.75，避免過度修正
  const fur = furMean(out, channels, true);
  const gain = fur.map((v, i) => (Number.isFinite(v) && Number.isFinite(targetFur[i]) ? Math.min(1.25, Math.max(0.75, targetFur[i] / v)) : 1));
  for (let p = 0; p < W * H; p++) {
    const i = p * channels;
    out[i] = Math.min(255, Math.round(out[i] * gain[0]));
    out[i + 1] = Math.min(255, Math.round(out[i + 1] * gain[1]));
    out[i + 2] = Math.min(255, Math.round(out[i + 2] * gain[2]));
  }
  console.log(pose, '色調係數', gain.map((v) => v.toFixed(2)).join(','));
  const pad = 6;
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  const crop = { left, top, width: Math.min(W - 1, maxX + pad) - left + 1, height: Math.min(H - 1, maxY + pad) - top + 1 };
  const scale = Math.min(1, MAX_WIDTH / crop.width);
  const target = path.join(outDir, `${pose}.webp`);
  await sharp(out, { raw: { width: W, height: H, channels } }).extract(crop)
    .resize({ width: Math.round(crop.width * scale), kernel: 'lanczos3' })
    // 縮小後輕微銳化：找回毛髮與條紋邊緣的細節，不過度（避免光暈）
    .sharpen({ sigma: 0.7, m1: 0.5, m2: 1.5 })
    .webp({ quality: 92, alphaQuality: 96 }).toFile(target);
  const meta = await sharp(target).metadata();
  frames.push({ id: pose, file: `${pose}.webp`, width: meta.width, height: meta.height, area: Math.round(area * scale * scale), bytes: fs.statSync(target).size });
  console.log(pose, `${meta.width}x${meta.height}`, `${(fs.statSync(target).size / 1024).toFixed(0)}KB`);
}
// 面積正規化：以所有幀面積的中位數為 1，邊長依 sqrt(面積比) 縮放，讓不同姿勢的「身體大小」看起來一致
const areas = frames.map((f) => f.area).sort((a, b) => a - b);
const median = areas[Math.floor(areas.length / 2)];
for (const f of frames) f.norm = Number((Math.sqrt(median / f.area)).toFixed(4));
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ card, round, source: SOURCE, frames }, null, 2));
console.log('manifest', frames.map((f) => `${f.id}:${f.norm}`).join(' '));
