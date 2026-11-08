// UNIFIED BEAST RETOUCH v1 (2026-11-08) — ONE method for all 60 cards; only per-card params (masks/positions) differ.
// Spec: _tmp_beast_retouch/UNIFIED-METHOD-20261108.md
// Usage (from project root): node _tmp_beast_retouch/retouch-unified.mjs young-01 [young-02 ...]
// Never writes to public/. Never resizes/crops/moves/generates. Candidates -> _tmp_beast_retouch/candidates/
import sharp from 'sharp'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const ROOT = process.cwd(); const T = path.join(ROOT, '_tmp_beast_retouch');
const BK = path.join(T, '_backup-retouch-20261108', 'front'); const OUT = path.join(T, 'candidates'); fs.mkdirSync(OUT, { recursive: true });
const GUARD = ['baihu', 'qinglong', 'zhuque', 'xuanwu'].map(g => path.join(ROOT, 'public/beast-game/front', `guardian-${g}.v2.webp`));
const HD = { long: 1280, short: 720 };          // skill floor (owner 2026-11-08)
const CARD_FRONT_EXCEPTION = { w: 720, h: 540 };   // owner decision 2026-11-08 18:48 UTC+8: card fronts at guardian size 720x540 pass the size floor
const TOL_TONE = 0.95, TOL_DETAIL = 1.0;         // fixed for whole set
const SHARP_LADDER = [0.5, 0.6, 0.7, 0.8];        // fixed for whole set
const PARAMS = fs.existsSync(path.join(T, 'card-params.json')) ? JSON.parse(fs.readFileSync(path.join(T, 'card-params.json'), 'utf8')) : {};
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const sums = Object.fromEntries(fs.readFileSync(path.join(T, '_backup-retouch-20261108', 'SHA256SUMS.tsv'), 'utf8')
  .split(/\r?\n/).filter(l => l && !l.startsWith('#') && !l.startsWith('\uFEFF#')).map(l => { const [s, h] = l.split('\t'); return [s, h]; }));
async function metrics(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H; const L = new Float32Array(n); let sr = 0, sb = 0, ss = 0;
  for (let i = 0; i < n; i++) { const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]; L[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b; sr += r; sb += b; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); ss += mx ? (mx - mn) / mx : 0; }
  const sorted = Float32Array.from(L).sort(); const pct = p => sorted[Math.min(n - 1, Math.floor(p / 100 * n))];
  let s = 0, s2 = 0, c = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; const v = L[i - 1] + L[i + 1] + L[i - W] + L[i + W] - 4 * L[i]; s += v; s2 += v * v; c++; }
  // border energy: mean |laplacian| on the outermost 4px vs interior (detects subject cut by frame)
  let be = 0, bc = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (x < 5 || y < 5 || x > W - 6 || y > H - 6) { const i = y * W + x; be += Math.abs(L[i - 1] + L[i + 1] + L[i - W] + L[i + W] - 4 * L[i]); bc++; } }
  const mean = L.reduce((a, b) => a + b, 0) / n;
  return { w: W, h: H, meanL: +mean.toFixed(1), p1: +pct(1).toFixed(1), p99: +pct(99).toFixed(1), sat: +(ss / n).toFixed(3), RB: +(sr / sb).toFixed(2), lapvar: +(s2 / c - (s / c) ** 2).toFixed(1), borderEnergy: +(be / bc).toFixed(2) };
}
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const label = (t, w) => Buffer.from(`<svg width="${w}" height="34"><rect width="100%" height="100%" fill="#000"/><text x="10" y="24" font-family="Arial" font-size="18" fill="#fff">${esc(t)}</text></svg>`);
async function sideBySide(a, b, out, la, lb) {
  const m = await sharp(a).metadata(); const W = m.width, H = m.height;
  await sharp({ create: { width: W * 2 + 12, height: H + 34, channels: 3, background: '#000' } }).composite([
    { input: await sharp(a).removeAlpha().png().toBuffer(), left: 0, top: 34 }, { input: await sharp(b).removeAlpha().png().toBuffer(), left: W + 12, top: 34 },
    { input: label(la, W), left: 0, top: 0 }, { input: label(lb, W), left: W + 12, top: 0 }]).png().toFile(out);
}
(async () => {
  const G = []; for (const g of GUARD) G.push(await metrics(g));
  const env = { p1Max: Math.max(...G.map(g => g.p1)), p99Min: Math.min(...G.map(g => g.p99)), lapMin: Math.min(...G.map(g => g.lapvar)), lapMed: [...G.map(g => g.lapvar)].sort((a, b) => a - b)[2] };
  fs.writeFileSync(path.join(OUT, 'guardian-envelope.json'), JSON.stringify({ guardians: ['baihu', 'qinglong', 'zhuque', 'xuanwu'], G, env }, null, 1));
  for (const card of process.argv.slice(2)) {
    if (/^guardian-/.test(card)) throw new Error('guardians are reference-only, never processed');
    const file = `${card}.v2.webp`, src = path.join(BK, file); const buf = fs.readFileSync(src);
    const rep = { card, method: 'UNIFIED-v1', src: `_tmp_beast_retouch/_backup-retouch-20261108/front/${file}`, srcSha: sha(buf), steps: [], params: PARAMS[card] || {} };
    rep.shaOk = rep.srcSha === sums[`public/beast-game/front/${file}`]; if (!rep.shaOk) throw new Error('backup SHA mismatch ' + file);
    const m0 = await metrics(buf); rep.before = m0; let touched = false;
    // S1 tone envelope: only if the card falls clearly below the guardian series white point; same linear on R,G,B (hue kept), black point anchored
    let a = 1, b = 0;
    if (m0.p99 < env.p99Min * TOL_TONE) { a = Math.min(1.25, env.p99Min / m0.p99); b = -m0.p1 * (a - 1); touched = true; rep.steps.push(`S1 tone: p99 ${m0.p99} < ${TOL_TONE}x guardian min ${env.p99Min} -> linear a=${a.toFixed(3)} b=${b.toFixed(1)}`); }
    else rep.steps.push('S1 tone: inside guardian envelope -> no change');
    let stage = a !== 1 ? await sharp(buf).removeAlpha().linear(a, b).png().toBuffer() : await sharp(buf).removeAlpha().png().toBuffer();
    // S2 detail: L-channel unsharp (sharp works in LAB L) only if softer than guardian minimum; smallest sigma on fixed ladder that reaches it
    const m1 = await metrics(stage);
    if (m1.lapvar < env.lapMin * TOL_DETAIL) {
      let chosen = null;
      for (const sg of SHARP_LADDER) { const t = await sharp(stage).sharpen({ sigma: sg, m1: 0.4, m2: 1.0, x1: 3 }).png().toBuffer(); const mt = await metrics(t); chosen = { sg, t, mt }; if (mt.lapvar >= env.lapMin) break; }
      stage = chosen.t; touched = true; rep.steps.push(`S2 detail: lapvar ${m1.lapvar} < guardian min ${env.lapMin} -> sharpen sigma=${chosen.sg} m1=0.4 m2=1.0 x1=3 -> ${chosen.mt.lapvar}`);
    } else rep.steps.push('S2 detail: lapvar >= guardian min -> no change');
    // S3 geometry: none. Framing/grounding/clipping are audited (S4) but never "fixed" by moving, scaling or painting.
    rep.steps.push('S3 geometry: none (no resize, crop, move, generation)');
    const outW = path.join(OUT, `${card}.cand.webp`);
    if (touched) await sharp(stage).webp({ quality: 95, effort: 6 }).toFile(outW); else fs.copyFileSync(src, outW);
    rep.touched = touched; rep.after = await metrics(outW); rep.candidate = `_tmp_beast_retouch/candidates/${card}.cand.webp`; rep.candSha = sha(fs.readFileSync(outW));
    const long = Math.max(rep.after.w, rep.after.h), short = Math.min(rep.after.w, rep.after.h);
    rep.hdFloor = (long >= HD.long && short >= HD.short) ? 'PASS' : (rep.after.w === CARD_FRONT_EXCEPTION.w && rep.after.h === CARD_FRONT_EXCEPTION.h) ? 'PASS (owner exception 2026-11-08 18:48: card front 720x540 = guardian size)' : `FAIL (${rep.after.w}x${rep.after.h} < 1280x720; no higher-res source of this art; upscaling forbidden)`;
    rep.deliverable = rep.hdFloor.startsWith('PASS') ? 'needs site review (360/390/768) before replacing public/' : 'NO (skill iron rule: HD floor) — original kept in public/';
    await sideBySide(src, outW, path.join(OUT, `${card}.compare.png`), `OLD ${file}`, `NEW candidate UNIFIED-v1 (${touched ? rep.steps.filter(s => /->\s*(linear|sharpen)/.test(s)).map(s => s.slice(0, 2)).join('+') : 'no change: bytes identical'})`);
    // S8 thumbs: only for touched cards; derived from the candidate front with fixed sizes/encoder (same for whole set)
    if (touched) { fs.mkdirSync(path.join(OUT, 'thumb'), { recursive: true }); rep.thumbs = {};
      for (const [suffix, w, h] of [['.v2.webp', 256, 192], ['.v2-480.webp', 480, 360]]) {
        const tp = path.join(OUT, 'thumb', `${card}${suffix}`); await sharp(outW).resize(w, h, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 90, effort: 6 }).toFile(tp);
        rep.thumbs[`thumb/${card}${suffix}`] = sha(fs.readFileSync(tp)); } }
    fs.writeFileSync(path.join(OUT, `${card}.report.json`), JSON.stringify(rep, null, 1));
    console.log(JSON.stringify({ card, touched, steps: rep.steps.slice(0, 2), before: rep.before, after: rep.after, hd: rep.hdFloor }));
  }
})();
