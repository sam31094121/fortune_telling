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
for (const c of cards) {
  assert.match(c.id, /^beast_(g_[a-z]+|[ay]\d{2})$/, `舊格式 ID ${c.id}`);
  assert.match(c.art.thumbnail, /\.v2(-480)?\.webp(\?v=\d+)?$/, `${c.id} 縮圖不是 .v2`);
  assert.ok(fs.existsSync(path.join(root, 'public', c.art.thumbnail.split('?')[0])), `${c.id} 縮圖檔不存在`);
}
const comp = fs.readFileSync(path.join(root, 'components/battlefield/Match3Board.tsx'), 'utf8');
assert.ok(/<BeastCardFace\b/.test(comp) && !/<img\b/.test(comp), '我方卡面只用 BeastCardFace（.v2 正式卡面），不另插 <img>');
console.log(`beast-match3-no-old-cards: ${pass} 檔＋60 張卡檢查通過`);
