import fs from 'fs';
import http from 'http';

const root = 'C:/Users/DRAGON/Desktop/\u547d\u7406';
const files = [
  'components/model-lab/models/taiji/infiniteHollowSquares.ts',
  'components/model-lab/models/taiji/TaijiModel.tsx',
  'docs/model-lab-taiji-score.md',
];

const report = { time: new Date().toISOString(), files: {}, http: {}, geo: {}, model: {}, scores: {} };

for (const f of files) {
  const p = root + '/' + f;
  try {
    const st = fs.statSync(p);
    report.files[f] = { ok: true, bytes: st.size, mtime: st.mtime.toISOString() };
  } catch (e) {
    report.files[f] = { ok: false, err: String(e.message || e) };
  }
}

function get(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let n = 0;
      res.on('data', (c) => (n += c.length));
      res.on('end', () => resolve({ status: res.statusCode, len: n }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout' });
    });
  });
}

report.http['/'] = await get('http://127.0.0.1:8888/');
report.http['/3D'] = await get('http://127.0.0.1:8888/3D');

const geoPath = root + '/components/model-lab/models/taiji/infiniteHollowSquares.ts';
const modelPath = root + '/components/model-lab/models/taiji/TaijiModel.tsx';
try {
  const g = fs.readFileSync(geoPath, 'utf8');
  report.geo = {
    IN_DEPTH: /IN_DEPTH\s*=\s*(\d+)/.exec(g)?.[1],
    FACE_DEPTH: /FACE_DEPTH\s*=\s*(\d+)/.exec(g)?.[1],
    hasFaceInward: g.includes('faceInwardSquares'),
    hasBidirectional: g.includes("'out'") && g.includes("'in'"),
    hasCoreHalf: g.includes('CORE_HALF'),
    exports: [...g.matchAll(/export function (\w+)/g)].map((m) => m[1]),
    assertsTwelve: g.includes('assertTwelveEdges') || g.includes('assertTwelveEdges'),
  };
} catch (e) {
  report.geo = { error: String(e.message || e) };
}

try {
  const m = fs.readFileSync(modelPath, 'utf8');
  const layer = /id:\s*'([^']*Hollow[^']*)'\s*,\s*name:\s*'([^']*)'/.exec(m);
  const on = /on\('([^']*Hollow[^']*)'\)/.exec(m);
  report.model = {
    layerId: layer?.[1],
    layerName: layer?.[2],
    onId: on?.[1],
    layerOnMatch: layer?.[1] === on?.[1],
    importsHollow: m.includes('infiniteHollowSquares'),
    defaultOn: /twelveHollowSquares[\s\S]{0,80}defaultOn:\s*true/.test(m) || /defaultOn:\s*true[\s\S]{0,40}往內/.test(m),
  };
} catch (e) {
  report.model = { error: String(e.message || e) };
}

// Honest Michelin scores for THIS card only
const httpOk = report.http['/3D']?.status === 200;
const geoOk = report.files[files[0]]?.ok && report.geo.hasFaceInward && Number(report.geo.IN_DEPTH) >= 8;
const wireOk = report.model.layerOnMatch && report.model.importsHollow;
const conceptGap = '用戶：有分未全壘打；外簡內方無限仍需畫面驗證';

report.scores = {
  品質: geoOk && wireOk ? 8.2 : 7.0, // 幾何已朝外簡內方，尚未實拍全壘打
  穩定: httpOk && geoOk ? 8.0 : httpOk ? 7.0 : 5.5,
  服務: 7.5, // 圖層名已可讀，缺引導文案／验收清单在 UI
  note: conceptGap,
  targets: { 品質: 9.5, 穩定: 9.0, 服務: 8.5 },
};

const outDir = 'C:/Users/DRAGON/Desktop/\u547d\u7406/docs';
fs.mkdirSync(outDir, { recursive: true });
const md = `# 立體太極模型・審查健康檢查

時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}（UTC+8）

## 範圍
只查 model-lab「立體太極模型」卡片（\`/3D\`），米其林精神誠實計分。

## HTTP
- \`/\`：${JSON.stringify(report.http['/'])}
- \`/3D\`：${JSON.stringify(report.http['/3D'])}

## 檔案
${Object.entries(report.files)
  .map(([k, v]) => `- \`${k}\`：${v.ok ? `OK ${v.bytes}B @ ${v.mtime}` : 'MISSING ' + v.err}`)
  .join('\n')}

## 幾何核對
- IN_DEPTH＝${report.geo.IN_DEPTH}（往內立方層）
- FACE_DEPTH＝${report.geo.FACE_DEPTH}（六面同心四方形）
- faceInwardSquares＝${report.geo.hasFaceInward}
- exports＝${(report.geo.exports || []).join(', ')}

## 模型掛線
- 圖層 id＝${report.model.layerId}
- 名稱＝${report.model.layerName}
- on()＝${report.model.onId}
- id 與 on 一致＝${report.model.layerOnMatch}

## 米其林分數（誠實）
| 軸 | 現況 | 目標 |
|----|------|------|
| 品質 | **${report.scores.品質}** | 9.5 |
| 穩定 | **${report.scores.穩定}** | 9.0 |
| 服務 | **${report.scores.服務}** | 8.5 |

### 為何未到全壘打
${report.scores.note}
外觀單純的十二線已有；往內四方形層次已寫入（10+8），但「鑽進去仍是方」的全壘打感仍待你眼驗／實拍確認。

## P0 / P1
1. **P0**：瀏覽器實開 \`/3D\` 確認往內同心四方形可讀（外簡內方）。
2. **P1**：若層太密或太淡，調 IN_DEPTH／線寬／透明度至「一鑽就懂」。
3. **P1**：服務向——圖層旁一行引導：「外：十二線；往內：仍是四方形無限」。
`;

fs.writeFileSync(outDir + '/taiji-model-health-check.md', md, 'utf8');
fs.writeFileSync(outDir + '/taiji-model-health-check.json', JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log('WROTE docs/taiji-model-health-check.md');
