const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('lib/beast-battle-fx.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const timers = new Map();
let nextTimer = 0;
let plays = 0;
const context = { exports: {}, window: {
  setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; },
  clearTimeout(id) { timers.delete(id); },
  matchMedia: () => ({ matches: true }),
}, Audio: class {
  play() { plays++; return Promise.resolve(); }
  pause() {}
} };
vm.runInNewContext(compiled, context);
const { cardSoundProfile, createSoundPlayer, playClashSequence, beastVoiceFor, playPlayerBeastVoice } = context.exports;
for (const element of ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH']) {
  const profiles = new Set();
  for (const form of ['a', 'y']) for (let i = 1; i <= 28; i++) {
    const profile = cardSoundProfile(`beast_${form}${String(i).padStart(2, '0')}`, element);
    for (const field of ['charge', 'impact', 'tail']) assert.ok(fs.existsSync(`public${profile[field]}`), profile[field]);
    const signature = JSON.stringify(profile);
    assert.ok(!profiles.has(signature), '每張卡音效組合應不同');
    profiles.add(signature);
  }
}
const player = createSoundPlayer();
assert.equal(plays, 0, '建立播放器不自動播放');
player.play('/test.ogg');
assert.equal(plays, 1, '无需開關，即使減少動態仍能播放');
player.dispose();
assert.equal(timers.size, 0, '結束時清理聲音');
const heard = [];
const stop = playClashSequence((src) => heard.push(src), 'AIR', false, 'beast_a01');
assert.equal(heard.length, 1);
assert.equal(timers.size, 2);
stop();
assert.equal(timers.size, 0, '跳過時不遺留延遲撞擊');
console.log('PASS: 卡片音效組合唯一、素材存在、直接播放、離場取消');

const manifest = JSON.parse(fs.readFileSync('public/audio/beast-voices/manifest.json', 'utf8'));
assert.equal(Object.keys(manifest.cards).length, 60);
const hashes = new Set();
for (const [id, card] of Object.entries(manifest.cards)) {
  const path = beastVoiceFor(id);
  assert.ok(path, id);
  const bytes = fs.readFileSync(`public${path}`);
  assert.ok(bytes.length > 1500, `${id}: voice file is missing or empty`);
  hashes.add(require('node:crypto').createHash('sha256').update(bytes).digest('hex'));
  const provenance = manifest.sources[card.source];
  assert.ok(provenance?.author && provenance?.license && provenance?.sourceUrl, `${id}: missing provenance`);
  const playerCalls = [];
  playPlayerBeastVoice((src) => playerCalls.push(src), 'opponent', id);
  assert.equal(playerCalls.length, 0, `${id}: opponent must remain silent`);
  playPlayerBeastVoice((src) => playerCalls.push(src), 'player', id);
  assert.deepEqual(playerCalls, [path], `${id}: player must use its own voice`);
}
assert.equal(hashes.size, 60, '成品不能只是複製同一檔案換名稱；此檢查不代替聽感驗收');
for (const id of ['beast_a00', 'beast_y29', '../evil', 'beast_g_unknown']) assert.equal(beastVoiceFor(id), null);
const ritualSource = fs.readFileSync('components/BeastDuelRitual.tsx', 'utf8');
assert.ok(!ritualSource.includes('playClashSequence'), '本體聲音不得再混用舊的雙方撞擊序列');
assert.ok(!ritualSource.includes('sound.current.play('), '所有儀式聲音必須通過玩家本體守門');
console.log('PASS: 六十張本體聲音有來源、對手完全靜音、玩家按卡片發聲');
for (const guardian of ['qinglong', 'zhuque', 'baihu', 'xuanwu']) {
  assert.equal(context.exports.spiritArtFor(`beast_g_${guardian}`), `/beast-game/spirit/guardian-${guardian}.webp`);
}
assert.ok(fs.readFileSync('components/BeastClash3D.tsx', 'utf8').includes('aria-label="雙方神獸本體交戰"'), '有意義的戰鬥畫面不可被當作隱藏裝飾');
