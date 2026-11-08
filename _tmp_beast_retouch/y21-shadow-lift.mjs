// young-21 (參水猿・幼子) ONLY — shadow lift candidates (+4 / +7 per 255). Owner-approved 2026-11-08.
// Separate from retouch-unified.mjs. Reads SHA-verified backup; writes only _tmp_beast_retouch/candidates/y21-shadow/.
// Output WebP is LOSSLESS so pixels outside the mask stay identical to the decoded original.
// No resize/crop/sharpen/generation. Changes only inside a hand-drawn subject polygon (inset-feathered so the fur rim is untouched),
// only warm dark pixels (L<96), hue kept via per-pixel RGB scaling. Pixels outside the polygon are byte-identical by construction (verified).
import sharp from 'sharp'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const ROOT = process.cwd(), T = path.join(ROOT, '_tmp_beast_retouch');
const SRC = path.join(T, '_backup-retouch-20261108', 'front', 'young-21.v2.webp');
const WANT = 'DF100C6C43185E86F9EA958D4B93F0C2C727EF3580C3A0559FFE9F2B6192B025';
const OUT = path.join(T, 'candidates', 'y21-shadow'); fs.mkdirSync(OUT, { recursive: true });
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const buf = fs.readFileSync(SRC); if (sha(buf) !== WANT) throw new Error('backup SHA mismatch');
const POLY = [[300,45],[350,42],[385,65],[400,105],[412,135],[470,175],[520,215],[560,260],[588,320],[598,380],[596,440],[586,452],[500,456],[488,448],[440,464],[358,464],[350,452],[330,446],[300,443],[290,438],[268,446],[262,460],[176,460],[170,448],[180,400],[195,340],[205,300],[214,250],[212,200],[212,130],[226,92],[260,56]];
const L_MAX = 96, L_FULL = 40, Y_FADE0 = 440, Y_FADE1 = 450; // rows >= Y_FADE1 never change (keeps hand/foot contact shadow on the rock)
const Lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
(async () => {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  const svg = `<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/><polygon points="${POLY.map(p => p.join(',')).join(' ')}" fill="#fff"/></svg>`;
  const poly = (await sharp(Buffer.from(svg)).removeAlpha().extractChannel(0).raw().toBuffer());
  if (poly.length !== n) throw new Error('poly mask size '+poly.length);
  const blur = (await sharp(poly, { raw: { width: W, height: H, channels: 1 } }).blur(4).extractChannel(0).raw().toBuffer());
  const gateRaw = Buffer.alloc(n);
  for (let i = 0; i < n; i++) { const r = data[i*3], g = data[i*3+1], b = data[i*3+2]; gateRaw[i] = (r >= b && (r - g) <= 40) ? 255 : 0; }
  const gate = await sharp(gateRaw, { raw: { width: W, height: H, channels: 1 } }).blur(1).extractChannel(0).raw().toBuffer();
  if (blur.length !== n || gate.length !== n) throw new Error('mask size');
  const M = new Float32Array(n);
  for (let i = 0; i < n; i++) { if (!poly[i]) { M[i] = 0; continue; } const inset = Math.max(0, (blur[i] / 255 - 0.5) * 2); const y = Math.floor(i / W); const yf = y < Y_FADE0 ? 1 : y >= Y_FADE1 ? 0 : (Y_FADE1 - y) / (Y_FADE1 - Y_FADE0); M[i] = inset * yf * gate[i] / 255; }
  const rep = { card: 'young-21', method: 'y21-shadow-lift v3 (strict final-pixel dL cap; ground-contact band y>=440 fades to 0 by y=450)', srcSha: WANT, poly: POLY, rules: { L_MAX, L_FULL, inset: 'blur(4) of polygon, (v-0.5)*2 -> 0 at polygon edge', gate: 'R>=B && R-G<=40, blur(1)' }, out: {} };
  const maskVis = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) { const v = Math.round(M[i] * 255); maskVis[i*3] = Math.round(data[i*3] * 0.4); maskVis[i*3+1] = Math.max(Math.round(data[i*3+1] * 0.4), v); maskVis[i*3+2] = Math.round(data[i*3+2] * 0.4); }
  await sharp(maskVis, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(OUT, 'young-21.mask-vis.png'));
  for (const cap of [4, 7]) {
    const o = Buffer.from(data); let changed = 0, outside = 0, maxD = 0, sumD = 0;
    for (let i = 0; i < n; i++) {
      if (M[i] <= 0) continue; const r = data[i*3], g = data[i*3+1], b = data[i*3+2]; const L = 0.2126*r + 0.7152*g + 0.0722*b;
      if (L >= L_MAX) continue; const f = L <= L_FULL ? 1 : (L_MAX - L) / (L_MAX - L_FULL); const d = cap * M[i] * f; if (d < 0.05) continue;
      // strict cap on the FINAL rounded pixel: Lum(out) - Lum(in) <= cap; step the lift down until it holds
      let dd = d, nr = r, ng = g, nb = b, fd = 0;
      for (let k = 0; k < 400 && dd > 0; k++) {
        let tr, tg, tb; if (L >= 6) { const s = (L + dd) / L; tr = r * s; tg = g * s; tb = b * s; } else { tr = r + dd; tg = g + dd; tb = b + dd; }
        tr = Math.min(255, Math.round(tr)); tg = Math.min(255, Math.round(tg)); tb = Math.min(255, Math.round(tb));
        const df = Lum(tr, tg, tb) - L; if (df <= cap + 1e-9) { nr = tr; ng = tg; nb = tb; fd = df; break; } dd -= 0.05; }
      o[i*3] = nr; o[i*3+1] = ng; o[i*3+2] = nb;
      if (nr !== r || ng !== g || nb !== b) { changed++; if (!poly[i]) outside++; } maxD = Math.max(maxD, fd); sumD += fd;
    }
    const png = path.join(OUT, `young-21.shadow+${cap}.png`), wp = path.join(OUT, `young-21.shadow+${cap}.cand.webp`);
    await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(png);
    await sharp(o, { raw: { width: W, height: H, channels: 3 } }).webp({ lossless: true, effort: 6 }).toFile(wp);
    const back = (await sharp(wp).removeAlpha().raw().toBuffer()); let maxF = -1e9, minF = 1e9, bad = 0, out2 = 0, hi = 0, low = 0;
    for (let i = 0; i < n; i++) { const r = data[i*3], g = data[i*3+1], b = data[i*3+2]; const q = back[i*3], u = back[i*3+1], v = back[i*3+2]; if (q === r && u === g && v === b) continue;
      const df = Lum(q, u, v) - Lum(r, g, b); maxF = Math.max(maxF, df); minF = Math.min(minF, df); if (df > cap + 1e-9) bad++; if (!poly[i]) out2++; if (Lum(r, g, b) >= L_MAX) hi++; if (Math.floor(i / W) >= Y_FADE1) low++; }
    if (bad || out2 || hi || low) throw new Error(`verify fail cap${cap}: over=${bad} outside=${out2} hi=${hi} contactBand=${low}`);
    const m = await sharp(wp).metadata();
    rep.out[`+${cap}`] = { webp: path.relative(ROOT, wp), webpSha: sha(fs.readFileSync(wp)), pngLossless: path.relative(ROOT, png), pngSha: sha(fs.readFileSync(png)), w: m.width, h: m.height, changedPx: changed, changedOutsidePolygon: outside, maxDeltaL: +maxD.toFixed(3), meanDeltaOnChanged: +(sumD / Math.max(1, changed)).toFixed(2), verifyDecoded: { maxFinalDeltaL: +maxF.toFixed(3), minFinalDeltaL: +minF.toFixed(3), overCap: bad, outsidePolygon: out2, changedAtL96plus: hi, changedInContactBandY450plus: low } };
    if (cap === 7) { const TD = path.join(OUT, 'thumb'); fs.mkdirSync(TD, { recursive: true }); rep.out['+7'].thumbs = {};
      for (const [suf, tw, th] of [['.v2.webp', 256, 192], ['.v2-480.webp', 480, 360]]) { const tp = path.join(TD, `young-21${suf}`);
        await sharp(wp).resize(tw, th, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 90, effort: 6 }).toFile(tp); const tm = await sharp(tp).metadata();
        rep.out['+7'].thumbs[path.relative(ROOT, tp)] = { sha: sha(fs.readFileSync(tp)), w: tm.width, h: tm.height }; } }
  }
  fs.writeFileSync(path.join(OUT, 'young-21.shadow.report.json'), JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep.out, null, 1));
})();
