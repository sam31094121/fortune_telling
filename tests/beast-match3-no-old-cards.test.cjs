/** 三消零舊卡：卡池只來自 60 張 .v2 新卡；三消檔案不引用 _orig 圖、舊圖路徑、測試卡 ID。 */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const { playableCards } = require('../.beast-game-build/lib/beast-game/registry');
const files = ['components/battlefield/Match3Board.tsx', 'components/battlefield/Match3Board.module.css', 'app/beast-game/match3/page.tsx', 'components/battlefield/useDragChain.tsx', 'app/beast-game/match3-preview/Match3Preview.tsx', 'app/beast-game/match3-preview/page.tsx', 'app/beast-game/match3-preview/cards.ts',
  ...fs.readdirSync(path.join(root, 'lib/beast-game/match3')).map((f) => 'lib/beast-game/match3/' + f)];
let pass = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(root, f), 'utf8');
  assert.ok(!/_orig/.test(s), `${f} 引用 _orig`);
  assert.ok(!/\b(ally|enemy)_[a-z]+_\d+\b/.test(s), `${f} 引用測試卡 ID`);
  assert.ok(!/card-battle-v1|test-cards/.test(s), `${f} 引用測試卡資料`);
  assert.ok(!/\/beast-game\/(thumb|front)\//.test(s), `${f} 寫死卡圖路徑`);
  assert.ok(!/\bbeast_[a-z0-9_]+\b/.test(s), `${f} 寫死卡片 ID`);
  pass++;
}
const cards = playableCards();
assert.equal(cards.length, 60, '卡池應為 60 張');
// 正式素材採數字版號或 12 位 SHA-256 前綴作快取版本；仍只接受本地 v2 卡圖。
const thumbnailPattern = /^\/beast-game\/thumb\/[a-z0-9-]+\.v2(-480)?\.webp(?:\?v=(?:\d+|[a-f0-9]{12}))?$/;
for (const version of ['', '?v=11', '?v=f5380a7f9ffd']) {
  assert.match('/beast-game/thumb/guardian-baihu.v2.webp' + version, thumbnailPattern);
}
for (const bad of ['/beast-game/thumb/guardian-baihu.webp', '/beast-game/_orig/guardian-baihu.v2.webp', 'https://example.com/guardian-baihu.v2.webp', '/beast-game/thumb/guardian-baihu.v2.webp?v=garbage', '/beast-game/thumb/guardian-baihu.v2.webp?v=11&other=1']) {
  assert.ok(!thumbnailPattern.test(bad), `不得放行舊圖或非法版本：${bad}`);
}
for (const c of cards) {
  assert.match(c.id, /^beast_(g_[a-z]+|[ay]\d{2})$/, `舊格式 ID ${c.id}`);
  if (c.id === 'beast_y01' && c.art.thumbnail === '/beast-game/front/young-01.hind-paw-v1.svg') {
    const repaired = fs.readFileSync(path.join(root, 'public', c.art.thumbnail), 'utf8');
    const embedded = repaired.match(/data:image\/webp;base64,([^"']+)/);
    assert.ok(embedded, '後腳修補圖必須包含正式原圖');
    assert.deepEqual(Buffer.from(embedded[1], 'base64'), fs.readFileSync(path.join(root, 'public/beast-game/front/young-01.v2.webp')), '修補圖底圖必須與正式 v2 原圖一致');
    assert.ok(!/<script\b|\bon\w+\s*=|(?:href|src)=["'](?:https?:|\/\/)/i.test(repaired), '修補圖不得執行腳本或載入遠端來源');
  } else {
    assert.match(c.art.thumbnail, thumbnailPattern, `${c.id} 縮圖不是合法本地 .v2 版本`);
  }
  assert.ok(fs.existsSync(path.join(root, 'public', c.art.thumbnail.split('?')[0])), `${c.id} 縮圖檔不存在`);
}
const comp = fs.readFileSync(path.join(root, 'components/battlefield/Match3Board.tsx'), 'utf8');
assert.ok(/<BeastCardFace\b/.test(comp), '我方卡面只用 BeastCardFace（.v2 正式卡面）');
for (const img of comp.match(/<img\b[^>]*>/g) ?? []) {
  assert.match(img, /src="\/pwa\/save-shield-080\.png"/, '額外圖片只允許 080 寶珠獎勵圖示，不允許替換卡面');
}
console.log(`beast-match3-no-old-cards: ${pass} 檔＋60 張卡檢查通過`);
