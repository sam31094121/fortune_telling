const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();

function load(relative) {
  let file = path.resolve(root, relative);
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const customRequire = id => (id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id));
  vm.runInNewContext(source, { module: mod, exports: mod.exports, require: customRequire, console, setTimeout, clearTimeout, structuredClone, window: undefined }, { filename: file });
  return mod.exports;
}
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const rig = load('lib/beast-game/beast-rig.ts');
const fx = load('lib/beast-battle-fx.ts');

/**
 * 三套招式（普攻／技能／暴怒）守門：
 * 同一條時間軸與命中時刻、力道逐級加重、純函式不用亂數、只由戰報裡實際執行的行動決定、不影響任何結果。
 */
const V = ['attack', 'skill', 'rage'];
const spec = (name) => rig.RIG_VARIANTS[name];
const impact = rig.RIG_IMPACT_MS / rig.RIG_STRIKE_MS;

// 1) 戰報行動 → 招式；沒有對應一律普攻
assert.equal(rig.rigVariantOf('ATTACK'), 'attack');
assert.equal(rig.rigVariantOf('SKILL'), 'skill');
assert.equal(rig.rigVariantOf('RAGE'), 'rage');
for (const other of [null, undefined, 'SWITCH', 'SKIP', '']) assert.equal(rig.rigVariantOf(other), 'attack', `${other} falls back to a normal attack`);

// 2) 力道逐級加重：普攻 < 技能 < 暴怒（每一項都不倒退）
for (const key of ['size', 'trail', 'shake', 'zoom', 'pull', 'aura', 'dim', 'rakes', 'ring', 'slowMs', 'windup']) {
  assert.ok(spec('attack')[key] <= spec('skill')[key] && spec('skill')[key] <= spec('rage')[key], `${key} never weakens from attack to skill to rage`);
}
for (const key of ['size', 'zoom', 'pull', 'aura', 'dim', 'ring', 'slowMs']) assert.ok(spec('attack')[key] < spec('rage')[key], `${key} is clearly stronger for rage`);
assert.equal(spec('attack').aura, 0, 'a normal attack has no aura');
assert.equal(spec('attack').ring, 0, 'a normal attack has no shockwave');
assert.equal(spec('attack').cross, false);
assert.equal(spec('skill').cross && spec('rage').cross, true, 'skill and rage leave crossed claw marks');
assert.ok(spec('rage').rakes > spec('attack').rakes, 'rage rakes more');

// 3) 預設就是普攻：不傳招式的舊呼叫（三消、儀式等其他使用者）畫面完全不變
for (let i = 0; i <= 100; i++) {
  const t = i / 100;
  for (const style of [rig.BAIHU_RIG.style, rig.QINGLONG_RIG.style, rig.ZHUQUE_RIG.style, rig.XUANWU_RIG.style]) {
    assert.equal(JSON.stringify(rig.strikeFrame(t, style)), JSON.stringify(rig.strikeFrame(t, style, 'attack')), 'strikeFrame default equals attack');
    assert.equal(JSON.stringify(rig.livingPose(t, style)), JSON.stringify(rig.livingPose(t, style, 'attack')), 'livingPose default equals attack');
    assert.equal(JSON.stringify(rig.cameraFrame(t, style)), JSON.stringify(rig.cameraFrame(t, style, 'attack')), 'cameraFrame default equals attack');
    assert.equal(JSON.stringify(rig.rendFrame(t, style)), JSON.stringify(rig.rendFrame(t, style, 'attack')), 'rendFrame default equals attack');
  }
  assert.equal(rig.storyTime(t), rig.storyTime(t, 'attack'));
  assert.equal(JSON.stringify(rig.bitePull(t)), JSON.stringify(rig.bitePull(t, 'attack')));
}

// 4) 時間軸與命中時刻不變：三套招式命中那一刻都是 RIG_IMPACT_MS；慢動作只在咬合之後，總長仍是 1；單調遞增
for (const name of V) {
  assert.equal(rig.storyTime(0, name), 0);
  assert.equal(rig.storyTime(1, name), 1, `${name} still ends exactly at the end`);
  assert.ok(Math.abs(rig.storyTime(impact, name) - impact) < 1e-9, `${name}: the bite is still at the same real moment`);
  assert.equal(rig.storyTime(0.5, name), 0.5, `${name}: the approach is untouched`);
  let prev = -1;
  for (let i = 0; i <= 600; i++) { const v = rig.storyTime(i / 600, name); assert.ok(v >= prev, `${name}: story time never runs backwards`); prev = v; }
}
// 咬合後 200 毫秒時，動畫落後真實時間多少：暴怒落後最多（停得最久），技能次之，普攻最少
const lag = (name) => (impact + 200 / rig.RIG_STRIKE_MS) - rig.storyTime(impact + 200 / rig.RIG_STRIKE_MS, name);
assert.ok(lag('rage') > lag('skill') && lag('skill') > lag('attack') && lag('attack') > 0, 'rage holds the bite longest, skill longer than a normal attack');

// 5) 光暈：普攻全程沒有；技能、暴怒在衝刺到咬合最強，開頭與結尾都是 0
for (const style of [rig.BAIHU_RIG.style, rig.QINGLONG_RIG.style, rig.ZHUQUE_RIG.style, rig.XUANWU_RIG.style]) {
  let peak = { attack: 0, skill: 0, rage: 0 };
  for (let i = 0; i <= 400; i++) for (const name of V) peak[name] = Math.max(peak[name], rig.strikeFrame(i / 400, style, name).aura);
  assert.equal(peak.attack, 0, 'no aura on a normal attack');
  assert.ok(peak.skill > 0.4 && peak.skill < peak.rage, 'skill glows, rage glows more');
  assert.ok(peak.rage > 0.9, 'rage is fully wrapped in its element colour');
  for (const name of V) {
    assert.equal(rig.strikeFrame(0, style, name).aura, 0, 'no aura before the wind-up');
    assert.ok(rig.strikeFrame(1, style, name).aura < 0.01, 'no aura once it has dissolved');
  }
}

// 6) 龍的技能先盤旋纏繞：只有青龍的技能有盤旋；衝刺中有、抵達對手前歸零；老虎、朱雀、玄武都沒有
const orbitPeak = (style, name, from, to) => { let m = 0; for (let i = 0; i <= 300; i++) { const t = from + (to - from) * i / 300; const o = rig.strikeFrame(t, style, name).orbit; m = Math.max(m, Math.hypot(o.x, o.y)); } return m; };
assert.ok(orbitPeak(rig.QINGLONG_RIG.style, 'skill', rig.RIG_PHASES.run[0], rig.RIG_PHASES.run[1]) > 0.15, 'the dragon coils around its prey in the skill');
assert.equal(orbitPeak(rig.QINGLONG_RIG.style, 'skill', rig.RIG_PHASES.attack[0], 1), 0, 'the coil has resolved before the bite');
assert.equal(orbitPeak(rig.QINGLONG_RIG.style, 'attack', 0, 1), 0, 'a normal attack does not coil');
assert.equal(orbitPeak(rig.QINGLONG_RIG.style, 'rage', 0, 1), 0, 'rage is a straight overwhelming strike, not a coil');
for (const name of V) {
  assert.equal(orbitPeak(rig.BAIHU_RIG.style, name, 0, 1), 0, 'the tiger never orbits');
  assert.equal(orbitPeak(rig.XUANWU_RIG.style, name, 0, 1), 0, 'the tortoise never orbits: it plants itself and slams');
}
// 朱雀專屬技能：先拔高再高空俯衝——衝刺中向上拱起，抵達對手前歸零；普攻、暴怒仍是直線
const lift = (name) => { let m = 0; for (let i = 0; i <= 300; i++) m = Math.max(m, -rig.strikeFrame(rig.RIG_PHASES.run[0] + (rig.RIG_PHASES.run[1] - rig.RIG_PHASES.run[0]) * i / 300, rig.ZHUQUE_RIG.style, name).orbit.y); return m; };
assert.ok(lift('skill') > 0.7, 'the phoenix climbs high before diving in its skill');
assert.equal(lift('attack'), 0, 'a normal attack is a straight flight');
assert.equal(lift('rage'), 0, 'rage is a straight overwhelming strike');
assert.equal(orbitPeak(rig.ZHUQUE_RIG.style, 'skill', rig.RIG_PHASES.attack[0], 1), 0, 'the dive has landed before the bite');
assert.equal(orbitPeak(rig.ZHUQUE_RIG.style, 'attack', 0, 1) + orbitPeak(rig.ZHUQUE_RIG.style, 'rage', 0, 1), 0);
// 輪廓連續：俯衝路徑不跳位（相鄰兩個取樣點的偏移差有界）
let prevO = rig.strikeFrame(rig.RIG_PHASES.run[0], rig.ZHUQUE_RIG.style, 'skill').orbit; let maxJump = 0;
for (let i = 1; i <= 600; i++) { const o = rig.strikeFrame(rig.RIG_PHASES.run[0] + (rig.RIG_PHASES.run[1] - rig.RIG_PHASES.run[0]) * i / 600, rig.ZHUQUE_RIG.style, 'skill').orbit; maxJump = Math.max(maxJump, Math.hypot(o.x - prevO.x, o.y - prevO.y)); prevO = o; }
assert.ok(maxJump < 0.03, `the dive path is continuous (max step ${maxJump.toFixed(4)})`);

// 玄武專屬技能：甲殼重擊——命中後兩段地震、較大衝擊波與揚塵、較長慢動作；其他招式與其他神獸沒有
assert.ok(rig.rigVariantSpec(rig.XUANWU_RIG.style, 'skill').quake === 1 && rig.rigVariantSpec(rig.XUANWU_RIG.style, 'attack').quake === 0 && rig.rigVariantSpec(rig.XUANWU_RIG.style, 'rage').quake === 0, 'only the tortoise skill quakes');
for (const style of [rig.BAIHU_RIG.style, rig.QINGLONG_RIG.style, rig.ZHUQUE_RIG.style]) assert.equal(rig.rigVariantSpec(style, 'skill').quake, 0, 'only the tortoise skill quakes');
assert.ok(rig.rigVariantSpec(rig.XUANWU_RIG.style, 'skill').shake > rig.RIG_VARIANTS.skill.shake, 'the tortoise slam shakes harder than the shared skill');
const camX = (style, ms) => { const c = rig.cameraFrame(ms / rig.RIG_STRIKE_MS, style, 'skill'); return Math.hypot(c.shakeX, c.shakeY); };
let firstPeak = 0; let secondPeak = 0; let dip = 9;
for (let ms = rig.RIG_IMPACT_MS; ms <= rig.RIG_IMPACT_MS + 60; ms += 2) firstPeak = Math.max(firstPeak, camX(rig.XUANWU_RIG.style, ms));
for (let ms = rig.RIG_IMPACT_MS + 130; ms <= rig.RIG_IMPACT_MS + 250; ms += 2) secondPeak = Math.max(secondPeak, camX(rig.XUANWU_RIG.style, ms));
assert.ok(secondPeak > 1.2, 'a second tremor follows the first');
assert.ok(secondPeak < firstPeak, 'the second tremor is lighter than the first');
assert.ok(Math.hypot(rig.cameraFrame(0.995, rig.XUANWU_RIG.style, 'skill').shakeX, rig.cameraFrame(0.995, rig.XUANWU_RIG.style, 'skill').shakeY) < 0.6, 'the ground stops shaking by the end');
const quakeAt = (name) => rig.rendFrame((rig.RIG_IMPACT_MS + 100) / rig.RIG_STRIKE_MS, rig.XUANWU_RIG.style, name).quake;
assert.ok(quakeAt('skill') > 0.7 && quakeAt('attack') === 0 && quakeAt('rage') === 0, 'dust and tremor belong to the skill only');
assert.equal(rig.rendFrame((rig.RIG_IMPACT_MS - 30) / rig.RIG_STRIKE_MS, rig.XUANWU_RIG.style, 'skill').quake, 0, 'no quake before the slam lands');
assert.ok(rig.strikeFrame(0.45, rig.XUANWU_RIG.style, 'skill').dust >= rig.strikeFrame(0.45, rig.XUANWU_RIG.style, 'attack').dust, 'more dust kicked up on the way in');
// 每隻神獸的專屬招式都不動命中時刻
for (const style of [rig.QINGLONG_RIG.style, rig.ZHUQUE_RIG.style, rig.XUANWU_RIG.style]) {
  assert.ok(Math.abs(rig.storyTime(impact, 'skill', style) - impact) < 1e-9, 'the bite moment is untouched by signature skills');
  let prev = -1; for (let i = 0; i <= 600; i++) { const v = rig.storyTime(i / 600, 'skill', style); assert.ok(v >= prev); prev = v; }
  assert.equal(rig.storyTime(1, 'skill', style), 1);
}

// 7) 咬住後的拉扯力道、爪痕、衝擊波、鏡頭
const pullPeak = (name) => { let m = 0; for (let i = 0; i <= 400; i++) m = Math.max(m, rig.bitePull(i / 400, name)[0]); return m; };
assert.ok(pullPeak('attack') < pullPeak('skill') && pullPeak('skill') < pullPeak('rage'), 'the bite pulls harder with skill and rage');
assert.ok(pullPeak('rage') <= 0.12 * 1.7 + 1e-9, 'the pull stays bounded');
const at = (ms) => ms / rig.RIG_STRIKE_MS;
const r0 = rig.rendFrame(at(rig.RIG_IMPACT_MS + 100), rig.BAIHU_RIG.style, 'attack');
const r1 = rig.rendFrame(at(rig.RIG_IMPACT_MS + 100), rig.BAIHU_RIG.style, 'skill');
const r2 = rig.rendFrame(at(rig.RIG_IMPACT_MS + 100), rig.BAIHU_RIG.style, 'rage');
assert.ok(r0.marks === 3 && r0.cross === false && r0.ringPower === 0, 'normal attack: three claw marks, no shockwave');
assert.ok(r1.marks === 3 && r1.cross === true && r1.ringPower > 0 && r1.ringPower < r2.ringPower, 'skill: crossed marks and a light shockwave');
assert.ok(r2.marks === 5 && r2.cross === true && r2.ringPower > 0.8, 'rage: five marks, crossed, full shockwave');
for (const name of V) {
  const before = rig.rendFrame(at(rig.RIG_IMPACT_MS - 40), rig.BAIHU_RIG.style, name);
  assert.ok(before.slash === 0 && before.ring === 0 && before.power === 0, `${name}: nothing is torn before the bite lands`);
  const gone = rig.rendFrame(0.99, rig.BAIHU_RIG.style, name);
  assert.ok(gone.power === 0 && gone.ringPower === 0, `${name}: the marks are gone once the strike ends`);
}
const cam = (name, ms) => rig.cameraFrame(at(ms), rig.BAIHU_RIG.style, name);
assert.ok(cam('rage', 1000).zoom > cam('skill', 1000).zoom && cam('skill', 1000).zoom > cam('attack', 1000).zoom, 'the camera pushes in harder for bigger moves');
const shake = (name) => { let m = 0; for (let ms = 1120; ms < 1300; ms += 4) { const c = cam(name, ms); m = Math.max(m, Math.hypot(c.shakeX, c.shakeY)); } return m; };
assert.ok(shake('attack') < shake('skill') && shake('skill') < shake('rage'), 'the impact shakes harder for bigger moves');
assert.ok(shake('rage') < 14, 'camera shake stays bounded');
for (const name of V) assert.ok(Math.hypot(cam(name, 1490).shakeX, cam(name, 1490).shakeY) < 0.3 && Math.abs(cam(name, 1490).zoom - 1) < 0.02, `${name}: the camera settles before the end`);

// 8) 純函式：同一刻同一結果、不用亂數
for (const name of V) {
  assert.equal(JSON.stringify(rig.strikeFrame(0.7, rig.QINGLONG_RIG.style, name)), JSON.stringify(rig.strikeFrame(0.7, rig.QINGLONG_RIG.style, name)), `${name} is deterministic`);
  assert.equal(JSON.stringify(rig.livingPose(0.8, rig.QINGLONG_RIG.style, name)), JSON.stringify(rig.livingPose(0.8, rig.QINGLONG_RIG.style, name)));
}
assert.doesNotMatch(read('lib/beast-game/beast-rig.ts'), /Math\.random/, 'no randomness in the timeline');

// 9) 聲音：每套招式的咬合聲都落在 RIG_IMPACT_MS；技能、暴怒層次更多、更重；對手不吼
for (const [id, el] of [['beast_g_baihu', 'SPACE'], ['beast_g_qinglong', 'AIR'], ['beast_g_zhuque', 'FIRE'], ['beast_g_xuanwu', 'WATER']]) {
  const tl = Object.fromEntries(V.map((name) => [name, fx.beastActionTimeline(id, el, 'player', false, true, name)]));
  for (const name of V) {
    assert.ok(tl[name].filter((c) => c.what === 'strike').some((c) => c.at === rig.RIG_IMPACT_MS), `${id}/${name}: the bite sound lands exactly on the impact moment`);
    assert.ok(tl[name].every((c) => c.at >= 0 && c.at <= rig.RIG_STRIKE_MS), `${id}/${name}: every cue is inside the strike`);
    assert.ok(tl[name].every((c) => c.volume > 0 && c.volume <= 1), `${id}/${name}: volumes are sane`);
  }
  assert.ok(tl.attack.length < tl.skill.length && tl.skill.length < tl.rage.length, `${id}: more layers for skill and rage`);
  if (id === 'beast_g_zhuque') assert.ok(tl.skill.some((c) => c.what === 'charge' && c.rate === 1.3), 'the phoenix dive has a rising wind-rush');
  if (id === 'beast_g_xuanwu') assert.ok(tl.skill.some((c) => c.at === rig.RIG_IMPACT_MS + 120 && c.what === 'strike'), 'the tortoise slam has a second tremor sound');
  const heavyAtImpact = (name) => tl[name].filter((c) => c.at === rig.RIG_IMPACT_MS && c.src.includes('loud-thunder')).length;
  assert.ok(heavyAtImpact('attack') === 0 && heavyAtImpact('skill') >= 1 && heavyAtImpact('rage') >= 1, `${id}: thunder under the bite only for skill and rage`);
  assert.equal(JSON.stringify(tl.attack), JSON.stringify(fx.beastActionTimeline(id, el, 'player', false, true)), `${id}: the default sound timeline is the normal attack`);
  assert.ok(fx.beastActionTimeline(id, el, 'opponent', false, true, 'rage').every((c) => c.what !== 'voice'), 'the opponent never roars over the player');
  assert.equal(fx.beastActionTimeline(id, el, 'player', false, false, 'rage').find((c) => c.what === 'strike').at, 430, 'beasts without animation keep the original sound timing');
}

// 10) 接線：招式取自戰報「實際執行的行動」，舞台、選卡列、面板都有接上
const hook = read('components/battlefield/useRigStrike.ts');
assert.ok(hook.includes("performedAction(match, 'player')") && hook.includes('rigVariantOf('), 'the variant comes from what the battle log says was actually performed');
assert.ok(read('components/battlefield/BattleDock.tsx').includes('variant={rigState.variant}'), 'the dock hands the variant to the stage');
assert.ok(read('components/battlefield/BeastRigStage.tsx').includes('storyTime(real, variant, rig.style)'), 'the stage plays the variant slow motion');
assert.ok(read('components/battlefield/BattlePanel.tsx').includes('rigVariantOf(pAction)'), 'the panel uses the variant for sound');
assert.doesNotMatch(hook + read('components/battlefield/BeastRigStage.tsx'), /from ['"][^'"]*(adjudication|battle-session|battle-validation|stake)/, 'the animation layer imports nothing that decides outcomes');

console.log('PASS: three attack variants — attack < skill < rage in weight, same timeline and bite moment, dragon-only coil, aura and shockwave, layered sound on the impact, defaults unchanged for other users');
