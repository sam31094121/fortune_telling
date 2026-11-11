// 青龍本體出場素材「完整性」守門（2026-11-08）。只驗引用、雜湊、尺寸、透明通道、候選可追溯。
// 畫質與配色是否「可交付」是另一件事，見 tests/beast-qinglong-gate.test.cjs（修圖技能檔的交付門檻）。
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(path.resolve(__dirname, '..', 'node_modules', 'sharp'));

const root = path.join(__dirname, '..');
const dir = path.join(root, 'public/beast-game/rig/qinglong');
const candDir = path.join(root, 'reports/beast-rig-review/qinglong-2026-11-08/candidates');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const rigSource = fs.readFileSync(path.join(root, 'lib/beast-game/beast-rig.ts'), 'utf8');
const qinglongBlock = rigSource.slice(rigSource.indexOf('export const QINGLONG_RIG'), rigSource.indexOf('const phoenixAnchors'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n += 1; };

(async () => {
  // ── 上線中的四幀：rig 引用、manifest 登記、檔案本身三者一致 ──
  const rigFiles = [...qinglongBlock.matchAll(/file:\s*'([^']+)'/g)].map((m) => m[1]);
  ok(rigFiles.length === 2, '青龍 rig 引用 2 個檔案（咬合、撲咬），飛行兩幀走預設檔名');
  ok(manifest.frames.length === 4, 'manifest 有 4 幀');
  for (const f of manifest.frames) {
    const p = path.join(dir, f.file);
    ok(fs.existsSync(p), `${f.id} 檔案存在：${f.file}`);
    ok(sha(p) === f.sha256, `${f.id} 雜湊與 manifest 一致`);
    const meta = await sharp(p).metadata();
    ok(meta.width === f.width && meta.height === f.height, `${f.id} 原生尺寸與 manifest 一致（${meta.width}×${meta.height}）`);
    ok(meta.hasAlpha, `${f.id} 有透明通道（只出本體，沒有矩形背景）`);
  }
  for (const f of rigFiles) ok(manifest.frames.some((x) => x.file === f), `rig 引用的 ${f} 在 manifest 登記`);

  // ── 不把候選當成品：public 底下不得出現未通過交付門檻的 v3 檔，rig 與 manifest 也不得引用 ──
  ok(!fs.readdirSync(dir).some((f) => /\.v3\./.test(f)), 'public 底下沒有 v3 候選檔（未過畫質底線，不得上線）');
  ok(!/\.v3\.webp/.test(qinglongBlock), 'rig 沒有引用 v3 候選');
  ok(!manifest.frames.some((f) => /\.v3\./.test(f.file)), 'manifest 沒有把 v3 登記為上線幀');

  // ── 候選可追溯：雜湊、來源原檔、尺寸、透明度逐像素與來源相同 ──
  const cand = JSON.parse(fs.readFileSync(path.join(candDir, 'candidates.json'), 'utf8'));
  ok(/候選/.test(cand.status) && /不得(接入或)?交付/.test(cand.status), '候選狀態明載仍是候選、決定前不得接入或交付');
  for (const c of cand.files) {
    const cp = path.join(candDir, c.file), sp = path.join(root, c.gradedFrom.path);
    ok(fs.existsSync(cp) && sha(cp) === c.sha256, `候選 ${c.file} 雜湊與紀錄一致`);
    ok(fs.existsSync(sp) && sha(sp) === c.gradedFrom.sha256, `來源原檔 ${c.gradedFrom.file} 保留且雜湊未被動過`);
    const [a, b] = await Promise.all([cp, sp].map((p) => sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
    ok(a.info.width === b.info.width && a.info.height === b.info.height, `${c.file} 與來源同尺寸`);
    let alphaDiff = 0; for (let i = 3; i < a.data.length; i += 4) alphaDiff += Math.abs(a.data[i] - b.data[i]);
    ok(alphaDiff === 0, `${c.file} 透明度與來源逐像素相同（沒有動到去背邊緣）`);
  }
  // ── 業主例外（鐵律 3：AI 來源）只對登記當下的雜湊有效；素材一換就失效，必須重新審查 ──
  const exc = JSON.parse(fs.readFileSync(path.join(root, 'reports/beast-rig-review/qinglong-2026-11-08/exception-2026-11-11.json'), 'utf8'));
  ok(exc.card === 'beast_g_qinglong' && exc.approvedBy === '業主' && exc.approvedAt === '2026-11-11', '例外登記：青龍、業主、2026-11-11');
  ok(Array.isArray(exc.notGeneralizedTo) && exc.notGeneralizedTo.includes('白虎') && exc.notGeneralizedTo.includes('其餘 56 隻'), '例外明載不泛化到其他卡');
  ok(exc.frames.length === manifest.frames.length, '例外涵蓋的幀數與 manifest 相同');
  for (const f of manifest.frames) {
    const e = exc.frames.find((x) => x.id === f.id);
    ok(e && e.file === f.file && e.sha256 === f.sha256, `${f.id} 的素材與例外登記的雜湊一致；若失敗代表素材已更換，例外失效，需重新審查並重新核准`);
  }

  console.log(`beast-qinglong-body: ${n} checks passed`);
})().catch((e) => { console.error(e); process.exit(1); });
