// 比較各幀與原卡的配色：只取「藍色鱗片」與「金棕鬃毛」兩類像素，算平均明度與飽和度。
const sharp = require(require('node:path').resolve(process.cwd(), 'node_modules/sharp'));
const rgb2hsv = (r, g, b) => { r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; let h=0; if(d){ if(mx===r)h=((g-b)/d)%6; else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0)h+=360;} return [h, mx?d/mx:0, mx]; };
async function stats(file, label, opts={}) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const acc = { blue: [0,0,0,0], gold: [0,0,0,0] };
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] < 200) continue;
    const [h,s,v] = rgb2hsv(data[i], data[i+1], data[i+2]);
    if (opts.skipDarkBg && v < 0.2) continue; // 原卡沒有透明通道，濾掉深色夜空背景
    const k = (h >= 190 && h <= 250 && s > 0.25) ? 'blue' : (h >= 25 && h <= 55 && s > 0.35 && v > 0.35) ? 'gold' : null;
    if (!k) continue; acc[k][0]++; acc[k][1]+=s; acc[k][2]+=v; acc[k][3]+=h;
  }
  const f = (a) => a[0] ? `S=${(a[1]/a[0]).toFixed(2)} V=${(a[2]/a[0]).toFixed(2)} H=${(a[3]/a[0]).toFixed(0)}° (${a[0]}px)` : '無';
  console.log(label.padEnd(34), '鱗片(藍):', f(acc.blue), ' ｜ 鬃毛(金):', f(acc.gold));
}
(async()=>{
  const d='public/beast-game/rig/qinglong/';
  await stats('public/beast-game/front/guardian-qinglong.v2.webp','原卡（美術母版）',{skipDarkBg:true});
  for (const f of ['bite-close.v2.webp','pounce-open.v2.webp','run-gather.webp','run-reach.webp']) await stats(d+f,f);
})();
