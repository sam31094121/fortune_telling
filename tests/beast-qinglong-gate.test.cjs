// 青龍本體出場素材「交付門檻」（修圖技能檔案鐵律的可執行版，2026-11-08）。
//
// 技能檔鐵律：任何修過或上線的圖，必須先通過 HD 畫質底線（長邊 ≥ 1280、短邊 ≥ 720）與其他必要檢查，
// 全部 PASSED 才可交付；任一未過就停止交付與上線，不能放大湊尺寸、不能假 PASS。
//
// 這支測試只回答「這些素材夠不夠格交付」，結果如實印出、不通過就 exit 1。
// 2026-11-08 業主批准底線改為 1280×720；尺寸通過不代表其他項目通過。
// 這是已知、已記錄的未通過狀態，不是測試壞了；不要為了讓它變綠而放大圖片或調低門檻。
// 它刻意不放進推送閘，由 npm run test:beast-qinglong-gate 手動執行。
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(path.resolve(__dirname, '..', 'node_modules', 'sharp'));

const root = path.join(__dirname, '..');
const dir = path.join(root, 'public/beast-game/rig/qinglong');
const candDir = path.join(root, 'reports/beast-rig-review/qinglong-2026-11-08/candidates');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

const FLOOR_LONG = 1280, FLOOR_SHORT = 720; // HD 底線
const results = [];
const check = (group, name, pass, detail) => results.push({ group, name, pass, detail });

const rgb2hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; };
async function analyse(file, { skipDarkBg = false } = {}) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const acc = { blue: [0, 0, 0], gold: [0, 0, 0] }; let rim = 0, whiteRim = 0;
  const W = info.width, H = info.height;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const [h, s, v] = rgb2hsv(data[i], data[i + 1], data[i + 2]);
    if (skipDarkBg && v < 0.2) continue;
    const k = (h >= 190 && h <= 250 && s > 0.25) ? 'blue' : (h >= 25 && h <= 55 && s > 0.35 && v > 0.35) ? 'gold' : null;
    if (!k) continue; acc[k][0]++; acc[k][1] += s; acc[k][2] += v;
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4; if (data[i + 3] < 200) continue;
    if (data[((y * W + x - 1) * 4) + 3] < 20 || data[((y * W + x + 1) * 4) + 3] < 20 || data[(((y - 1) * W + x) * 4) + 3] < 20 || data[(((y + 1) * W + x) * 4) + 3] < 20) {
      rim++; if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) whiteRim++;
    }
  }
  const f = (a) => ({ n: a[0], s: a[1] / a[0], v: a[2] / a[0] });
  return { width: W, height: H, blue: f(acc.blue), gold: f(acc.gold), whiteRimPct: rim ? 100 * whiteRim / rim : 0 };
}

(async () => {
  const master = await analyse(path.join(root, 'public/beast-game/front/guardian-qinglong.v2.webp'), { skipDarkBg: true });
  const targets = [
    ...manifest.frames.map((f) => ({ label: `上線 ${f.id}（${f.file}）`, group: '上線中的素材', file: path.join(dir, f.file) })),
    ...JSON.parse(fs.readFileSync(path.join(candDir, 'candidates.json'), 'utf8')).files.map((c) => ({ label: `候選 ${c.id}（${c.file}）`, group: '調色候選', file: path.join(candDir, c.file) })),
  ];
  const analysed = [];
  for (const t of targets) {
    const a = await analyse(t.file); analysed.push({ ...t, a });
    const long = Math.max(a.width, a.height), short = Math.min(a.width, a.height);
    check(t.group, `${t.label} 畫質：HD 底線（長邊≥${FLOOR_LONG}、短邊≥${FLOOR_SHORT}）`, long >= FLOOR_LONG && short >= FLOOR_SHORT, `實際 ${a.width}×${a.height}`);
    check(t.group, `${t.label} 去背邊緣白邊殘留 <1%`, a.whiteRimPct < 1, `${a.whiteRimPct.toFixed(2)}%`);
    check(t.group, `${t.label} 鱗片配色貼近母版（明度 ±0.06）`, Math.abs(a.blue.v - master.blue.v) <= 0.06, `素材 ${a.blue.v.toFixed(2)}／母版 ${master.blue.v.toFixed(2)}`);
    check(t.group, `${t.label} 鬃毛飽和貼近母版（±0.08）`, Math.abs(a.gold.s - master.gold.s) <= 0.08, `素材 ${a.gold.s.toFixed(2)}／母版 ${master.gold.s.toFixed(2)}`);
  }
  for (const group of ['上線中的素材', '調色候選']) {
    const g = analysed.filter((x) => x.group === group);
    const bv = g.map((x) => x.a.blue.v);
    // 候選只有兩幀，要拿它和上線的飛行兩幀合起來看才是「串著播」的實際情況
    const mix = group === '調色候選' ? [...g, ...analysed.filter((x) => x.group === '上線中的素材' && /run-/.test(x.label))] : g;
    const mv = mix.map((x) => x.a.blue.v);
    check(group, `${group}：串著播的幀之間鱗片明度差距 ≤0.04（不會中途變色）`, Math.max(...mv) - Math.min(...mv) <= 0.04, `差距 ${(Math.max(...mv) - Math.min(...mv)).toFixed(3)}（${mix.length} 幀）`);
    void bv;
  }

  // ── 報告 ──
  let lastGroup = '';
  for (const r of results) {
    if (r.group !== lastGroup) { console.log(`\n【${r.group}】`); lastGroup = r.group; }
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  → ${r.detail}`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n青龍交付門檻：${results.length - failed.length} 通過／${failed.length} 未通過`);
  if (failed.length) {
    console.log('結論：未通過，依修圖技能檔鐵律不得交付或上線。這不是測試壞掉；請依上列未通過項目修復並重驗；尺寸合格不替代配色與視覺驗收。');
    process.exit(1);
  }
  console.log('結論：全部通過。');
})().catch((e) => { console.error(e); process.exit(2); });
