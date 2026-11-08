// 青龍 v2 兩幀（咬合、撲咬）配色對齊母版：只改顏色（鱗片與鬃毛），不動透明度、構圖、細節。
// 目標值取自原卡母版與同角色飛行兩幀的實測平均（見 qinglong-color.cjs）。
const sharp = require(require('node:path').resolve(process.cwd(), 'node_modules/sharp'));
const fs = require('node:fs'); const crypto = require('node:crypto');
const dir = 'public/beast-game/rig/qinglong/';
const sm = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rgb2hsv = (r, g, b) => { r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; let h=0; if(d){ if(mx===r)h=((g-b)/d)%6; else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0)h+=360;} return [h, mx?d/mx:0, mx]; };
const hsv2rgb = (h, s, v) => { const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c; let r=0,g=0,b=0; if(h<60)[r,g,b]=[c,x,0]; else if(h<120)[r,g,b]=[x,c,0]; else if(h<180)[r,g,b]=[0,c,x]; else if(h<240)[r,g,b]=[0,x,c]; else if(h<300)[r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x]; return [(r+m)*255,(g+m)*255,(b+m)*255]; };
// 倍率＝目標平均／v2 實測平均
const K = { blue: { s: 0.725, v: 0.545 }, gold: { s: 0.81, v: 0.94 } };
async function grade(inFile, outFile) {
  const input = fs.readFileSync(dir + inFile);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    let [h, s, v] = rgb2hsv(data[i], data[i + 1], data[i + 2]);
    const wb = sm(h, 185, 200) * (1 - sm(h, 245, 260)) * sm(s, 0.15, 0.3);
    const wg = sm(h, 18, 28) * (1 - sm(h, 52, 62)) * sm(s, 0.2, 0.35) * sm(v, 0.25, 0.4);
    const ks = 1 + wb * (K.blue.s - 1) + wg * (K.gold.s - 1);
    const kv = 1 + wb * (K.blue.v - 1) + wg * (K.gold.v - 1);
    const [r, g, b] = hsv2rgb(h, Math.min(1, s * ks), Math.min(1, v * kv));
    data[i] = Math.round(r); data[i + 1] = Math.round(g); data[i + 2] = Math.round(b);
  }
  const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 94, alphaQuality: 100 }).toBuffer();
  fs.writeFileSync(dir + outFile, out);
  const meta = await sharp(out).metadata();
  console.log(outFile, `${meta.width}×${meta.height}`, out.length + ' bytes', 'sha256=' + crypto.createHash('sha256').update(out).digest('hex'));
}
(async () => {
  console.log('原稿雜湊（保留不動）:');
  for (const f of ['bite-close.v2.webp', 'pounce-open.v2.webp']) console.log('  ', f, crypto.createHash('sha256').update(fs.readFileSync(dir + f)).digest('hex'));
  await grade('bite-close.v2.webp', 'bite-close.v3.webp');
  await grade('pounce-open.v2.webp', 'pounce-open.v3.webp');
})();
