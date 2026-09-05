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
const { cardSoundProfile, createSoundPlayer, playClashSequence } = context.exports;
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
