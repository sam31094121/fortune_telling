// young-22 (井木犴・幼子) ONLY — right back + tail shadow lift candidates (+4 / +7). Owner-approved 2026-11-08 19:5x UTC+8.
// Separate from retouch-unified.mjs and from y21-shadow-lift.mjs (no shared mask). Reads SHA-verified backup;
// writes only _tmp_beast_retouch/candidates/y22-shadow/. No resize/crop/sharpen/generation; lossless WebP output.
// Mask: hand-drawn polygon INSIDE right back + tail (inset from golden rim, off bamboo, off hind paw, off rock contact),
// feathered inward (0 at polygon edge), faded to 0 for rows >= Y_ZERO (tail/rock contact). Only pixels with L<96.
// Final rounded pixel: Lum(out)-Lum(in) <= cap (same formula), hue kept via RGB scaling; stepped down if over.
import sharp from 'sharp'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const ROOT = process.cwd(), T = path.join(ROOT, '_tmp_beast_retouch');
const SRC = path.join(T, '_backup-retouch-20261108', 'front', 'young-22.v2.webp');
const WANT = '6ECEBFF2F36661BD23A7A89D49891DE204BE1A1693390D57EBAFE8308B7E4F9B';
const OUT = path.join(T, 'candidates', 'y22-shadow'); fs.mkdirSync(OUT, { recursive: true });
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const Lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const buf = fs.readFileSync(SRC); if (sha(buf) !== WANT) throw new Error('backup SHA mismatch');
const POLY = [[455,250],[488,266],[516,292],[536,320],[550,350],[562,378],[598,392],[628,404],[646,426],[652,455],[645,476],[622,484],[580,482],[546,474],[522,466],[503,452],[490,430],[478,412],[474,380],[464,340],[450,300],[443,270]];
const L_MAX = 96, L_FULL = 40, Y_FADE0 = 466, Y_ZERO = 478, FEATHER = 4;
(async () => {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  const svg = `<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/><polygon points="${POLY.map(p => p.join(',')).join(' ')}" fill="#fff"/></svg>`;
  const poly = await sharp(Buffer.from(svg)).removeAlpha().extractChannel(0).raw().toBuffer(); if (poly.length !== n) throw new Error('poly size');
  const blur = await sharp(poly, { raw: { width: W, height: H, channels: 1 } }).blur(FEATHER).extractChannel(0).raw().toBuffer(); if (blur.length !== n) throw new Error('blur size');
  const M = new Float32Array(n);
  for (let i = 0; i < n; i++) { if (!poly[i]) continue; const y = Math.floor(i / W); const yf = y < Y_FADE0 ? 1 : y >= Y_ZERO ? 0 : (Y_ZERO - y) / (Y_ZERO - Y_FADE0); M[i] = Math.max(0, (blur[i] / 255 - 0.5) * 2) * yf; }
  const rep = { card: 'young-22', method: 'y22-shadow-lift v1 (right back + tail only)', srcSha: WANT, poly: POLY, rules: { L_MAX, L_FULL, Y_FADE0, Y_ZERO, FEATHER, cap: 'final rounded Lum delta <= cap' }, out: {} };
  const vis = Buffer.alloc(n * 3); for (let i = 0; i < n; i++) { const v = Math.round(M[i] * 255); vis[i*3] = Math.round(data[i*3] * 0.5); vis[i*3+1] = Math.max(Math.round(data[i*3+1] * 0.5), v); vis[i*3+2] = Math.round(data[i*3+2] * 0.5); }
  await sharp(vis, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(OUT, 'young-22.mask-vis.png'));
  for (const cap of [4, 7]) {
    const o = Buffer.from(data); let changed = 0;
    for (let i = 0; i < n; i++) {
      if (M[i] <= 0) continue; const r = data[i*3], g = data[i*3+1], b = data[i*3+2]; const L = Lum(r, g, b); if (L >= L_MAX) continue;
      const f = L <= L_FULL ? 1 : (L_MAX - L) / (L_MAX - L_FULL); let dd = cap * M[i] * f; if (dd < 0.05) continue;
      let nr = r, ng = g, nb = b;
      for (let k = 0; k < 400 && dd > 0; k++) { let tr, tg, tb; if (L >= 6) { const s = (L + dd) / L; tr = r*s; tg = g*s; tb = b*s; } else { tr = r+dd; tg = g+dd; tb = b+dd; }
        tr = Math.min(255, Math.round(tr)); tg = Math.min(255, Math.round(tg)); tb = Math.min(255, Math.round(tb));
        if (Lum(tr, tg, tb) - L <= cap + 1e-9) { nr = tr; ng = tg; nb = tb; break; } dd -= 0.05; }
      o[i*3] = nr; o[i*3+1] = ng; o[i*3+2] = nb; if (nr !== r || ng !== g || nb !== b) changed++;
    }
    const png = path.join(OUT, `young-22.shadow+${cap}.png`), wp = path.join(OUT, `young-22.shadow+${cap}.cand.webp`);
    await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(png);
    await sharp(o, { raw: { width: W, height: H, channels: 3 } }).webp({ lossless: true, effort: 6 }).toFile(wp);
    const back = await sharp(wp).removeAlpha().raw().toBuffer(); let maxF = 0, minF = 1e9, over = 0, outside = 0, hi = 0, low = 0, cnt = 0;
    for (let i = 0; i < n; i++) { const r = data[i*3], g = data[i*3+1], b = data[i*3+2]; if (back[i*3] === r && back[i*3+1] === g && back[i*3+2] === b) continue; cnt++;
      const df = Lum(back[i*3], back[i*3+1], back[i*3+2]) - Lum(r, g, b); maxF = Math.max(maxF, df); minF = Math.min(minF, df); if (df > cap + 1e-9) over++; if (!poly[i]) outside++; if (Lum(r, g, b) >= L_MAX) hi++; if (Math.floor(i / W) >= Y_ZERO) low++; }
    if (over || outside || hi || low) throw new Error(`verify fail cap${cap}: over=${over} outside=${outside} hi=${hi} low=${low}`);
    const m = await sharp(wp).metadata(); const e = { webp: path.relative(ROOT, wp), webpSha: sha(fs.readFileSync(wp)), png: path.relative(ROOT, png), pngSha: sha(fs.readFileSync(png)), w: m.width, h: m.height, changedPx: cnt, maxFinalDeltaL: +maxF.toFixed(3), minFinalDeltaL: +minF.toFixed(3), overCap: over, outsidePolygon: outside, changedAtL96plus: hi, changedRowsYge478: low, thumbs: {} };
    const TD = path.join(OUT, 'thumb', `+${cap}`); fs.mkdirSync(TD, { recursive: true });
    for (const [suf, tw, th] of [['.v2.webp', 256, 192], ['.v2-480.webp', 480, 360]]) { const tp = path.join(TD, `young-22${suf}`);
      await sharp(wp).resize(tw, th, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 90, effort: 6 }).toFile(tp); const tm = await sharp(tp).metadata(); e.thumbs[path.relative(ROOT, tp)] = { sha: sha(fs.readFileSync(tp)), w: tm.width, h: tm.height }; }
    rep.out[`+${cap}`] = e; void changed;
  }
  fs.writeFileSync(path.join(OUT, 'young-22.shadow.report.json'), JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep.out, null, 1));
})();
