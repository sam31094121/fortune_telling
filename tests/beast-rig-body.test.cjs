const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const cache = new Map();

// Render the real presentation components. Effects do not run or write inventory.
function load(relative) {
  let file = path.resolve(root, relative);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index');
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const customRequire = id => {
    if (id.endsWith('.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (id === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children); };
    if (id === 'next/dynamic') return () => () => null;
    return id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
  };
  vm.runInNewContext(source, { module: mod, exports: mod.exports, require: customRequire, console, setTimeout, clearTimeout, AbortController, structuredClone, crypto: require('node:crypto').webcrypto }, { filename: file });
  return mod.exports;
}
let guideBookCache;
const bookOf = () => (guideBookCache ??= load('lib/beast-game/guide-book.ts').buildGuideBook());
// 2026-09-15 後端化 3B：相剋戰力手冊由後端 buildGuideBook 算好；渲染真實元件時包上同一份手冊。
const render = (component, props = {}) => renderToStaticMarkup(React.createElement(load('components/battlefield/GuideBookContext.tsx').GuideBookProvider, { value: bookOf() }, React.createElement(component, props)));
// 2026-09-15 第二階段：可出招與暴怒判斷由後端 battleViewFor 送來；渲染真實元件時傳入同一份後端判斷。
const viewOf = (m) => load('lib/beast-game/battle-view.ts').battleViewFor(m);

/**
 * 神獸戰鬥動畫（白虎）守門
 * 動畫只是演出：時間軸是純函式、素材是新版卡面的關鍵幀、不決定任何戰鬥結果、原始卡片與既有素材不被改動。
 */
const sharp = require('sharp');
const rig = load('lib/beast-game/beast-rig.ts');
const { newMatch, advance } = load('lib/beast-game/interactive.ts');
const presentation = load('lib/beast-game/combat-presentation.ts');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

(async () => {
  // 1) 登記：目前只有白虎有骨架，其他神獸維持原本的卡片衝鋒
  assert.deepEqual(Object.keys(rig.BEAST_RIGS), ['beast_g_baihu', 'beast_g_qinglong', 'beast_g_zhuque', 'beast_g_xuanwu']);
  assert.equal(rig.rigFor('beast_g_zhuque'), rig.ZHUQUE_RIG);
  assert.equal(rig.rigFor(null), null);

  // 2) 時間軸：階段首尾相接，涵蓋 0..1；命中時刻落在攻擊階段；卡片隱藏區間與 CSS 同步
  const phases = Object.values(rig.RIG_PHASES);
  assert.equal(phases[0][0], 0);
  assert.equal(phases.at(-1)[1], 1);
  for (let i = 1; i < phases.length; i++) assert.equal(phases[i][0], phases[i - 1][1], 'phases are contiguous');
  const impact = rig.RIG_IMPACT_MS / rig.RIG_STRIKE_MS;
  assert.ok(impact >= rig.RIG_PHASES.attack[0] && impact < rig.RIG_PHASES.attack[1], 'impact falls inside the attack phase');
  const css = read('components/battlefield/BattleDock.module.css');
  const [hideFrom, hideTo] = rig.RIG_CARD_HIDDEN;
  assert.ok(css.includes(`${Math.round(hideFrom * 100)}%, ${Math.round(hideTo * 100) - 1}% { opacity: 0.12; visibility: visible; }`), 'CSS fades the dock card exactly during RIG_CARD_HIDDEN (name and energy bar stay)');

  // 3) 純函式：同一個 t 永遠同一個畫面；任何時刻都有可見的身體；跳出前與回到卡片後透明
  let minBody = 1;
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const a = rig.strikeFrame(t);
    assert.equal(JSON.stringify(a), JSON.stringify(rig.strikeFrame(t)), 'strikeFrame is deterministic');
    const solid = Math.max(0, ...a.layers.map((l) => l.alpha)) * a.alpha;
    if (t > 0.13 && t < rig.RIG_PHASES.recover[0] + 0.03) minBody = Math.min(minBody, solid);
    for (const layer of a.layers) assert.ok(rig.BAIHU_RIG.frames.some((f) => f.id === layer.frame), `unknown frame ${layer.frame}`);
  }
  assert.ok(minBody >= 0.99, `a fully opaque body underneath at every moment of the strike (min ${minBody.toFixed(2)})`);
  assert.ok(rig.strikeFrame(0).alpha < 0.05, 'starts hidden inside the card');
  assert.ok(rig.strikeFrame(1).alpha < 0.05, 'ends hidden: the original card takes over again');

  // 4) 穩定本體以關節推進；朱雀保留收翼↔展翼，命中後就地散去。
  const used = new Set();
  for (let i = 0; i <= 400; i++) for (const l of rig.strikeFrame(i / 400).layers) if (l.alpha > 0.5) used.add(l.frame);
  for (const id of ['bite-close', 'pounce-open']) assert.ok(used.has(id), `pose ${id} is shown`);
  const reach = new Set(); let switches = 0; let last = null;
  const dragonClaws = [], dragonBody = [], dragonTail = [];
  for (let i = 0; i <= 400; i++) {
    const t = rig.RIG_PHASES.run[0] + (rig.RIG_PHASES.run[1] - rig.RIG_PHASES.run[0]) * (i / 400);
    const top = rig.strikeFrame(t, rig.RIG_STYLES.zhuque).layers.sort((a, b) => b.alpha - a.alpha)[0].frame;
    reach.add(top); if (last && top !== last) switches++; last = top;
    const dragonLayers = rig.strikeFrame(t, rig.RIG_STYLES.qinglong).layers;
    assert.equal(dragonLayers.length, 1, 'dragon charge uses one stable body');
    assert.equal(dragonLayers[0].frame, 'pounce-open', 'dragon preserves refined color and body composition through charge');
    assert.equal(dragonLayers[0].alpha, 1, 'dragon body stays opaque');
    dragonClaws.push(rig.livingPose(t, rig.RIG_STYLES.qinglong).clawSwing);
    dragonBody.push(rig.bodyWave(t, 0.5, rig.RIG_STYLES.qinglong));
    dragonTail.push(rig.bodyWave(t, 0.9, rig.RIG_STYLES.qinglong));
  }
  assert.ok(reach.has('run-gather') && reach.has('run-reach') && switches >= 2, 'avian flight keeps gathered and stretched wing poses');
  for (const [part, values] of [['claw', dragonClaws], ['body', dragonBody], ['tail', dragonTail]]) {
    assert.ok(Math.max(...values) - Math.min(...values) > 0.001, `dragon ${part} still articulates with its stable sprite`);
  }
  assert.equal(rig.strikeFrame(rig.RIG_PHASES.attack[0] + 0.001).travel.progress, 1, 'reaches the opponent');
  assert.ok(rig.strikeFrame(0.2).travel.progress > 0, 'dashes out of the card');
  const gone = rig.strikeFrame(rig.RIG_PHASES.recover[1] - 0.001);
  assert.ok(gone.travel.progress === 1 && gone.alpha < 0.05, 'after the bite it fades out at the opponent instead of running back');
  for (let i = 0; i <= 400; i++) { const f = rig.strikeFrame(rig.RIG_PHASES.attack[0] + (1 - rig.RIG_PHASES.attack[0]) * i / 400); assert.equal(f.travel.progress, 1, 'never leaves the opponent after arriving'); }
  assert.ok(rig.strikeFrame(impact).flash > 0.9, 'bite flash is peaked at the impact time');
  const bite = rig.strikeFrame(rig.RIG_PHASES.attack[0] + (rig.RIG_PHASES.attack[1] - rig.RIG_PHASES.attack[0]) * 0.3);
  assert.ok(bite.layers.some((l) => l.frame === 'pounce-open' && l.alpha > 0.7), 'mouth is wide open before the bite');
  assert.ok(rig.livingPose(impact + 0.01, rig.BAIHU_RIG.style).jaw < 0.08, 'jaw closes at impact without changing the body image');

  // 5) 素材：manifest 與程式一致；每張都有透明背景（去背成功）且身體內部的條紋沒被挖穿
  const widths = {};
  for (const [rigDef, minWidth] of [[rig.BAIHU_RIG, 1000], [rig.QINGLONG_RIG, 1300], [rig.ZHUQUE_RIG, 1500], [rig.XUANWU_RIG, 1500]]) {
    const dir = path.join(root, 'public/beast-game/rig', rigDef.dir);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.source, `public/beast-game/front/guardian-${rigDef.dir}.v2.webp`, 'source is the new-version card art');
    widths[rigDef.dir] = [];
    for (const spec of rigDef.frames) {
      const entry = manifest.frames.find((f) => f.id === spec.id);
      assert.ok(entry, `${rigDef.dir}/${spec.id} in manifest`);
      assert.ok(Math.abs(entry.norm - spec.norm) < 1e-4, `${rigDef.dir}/${spec.id} norm matches manifest`);
      const file = path.join(dir, spec.file ?? `${spec.id}.webp`);
      assert.ok(fs.existsSync(file), `${rigDef.dir}/${spec.id}.webp exists`);
      const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.ok(info.width >= minWidth, `${rigDef.dir}/${spec.id} keeps enough resolution (${info.width}px wide)`);
      widths[rigDef.dir].push(info.width);
      let clear = 0; let opaque = 0;
      for (let i = 3; i < data.length; i += 4) { if (data[i] < 8) clear++; else if (data[i] > 247) opaque++; }
      const total = data.length / 4;
      assert.ok(clear / total > 0.25, `${rigDef.dir}/${spec.id} has a transparent background (${(clear / total * 100).toFixed(0)}%)`);
      assert.ok(opaque / total > 0.3, `${rigDef.dir}/${spec.id} body is solid, not punched out (${(opaque / total * 100).toFixed(0)}% opaque)`);
    }
  }
  // 青龍的素材品質不得低於白虎（業主要求：青龍必須在白虎之上）：解析度更高、動作姿勢數不少於白虎的主要動作
  assert.ok(Math.min(...widths.qinglong) >= 1300, 'refined dragon retains native detail without upscaling');
  for (const id of ['bite-close', 'pounce-open', 'run-gather', 'run-reach']) assert.ok(rig.QINGLONG_RIG.frames.some((f) => f.id === id), `qinglong has the ${id} pose`);
  // 青龍的身體要像真的龍一樣搖動：波由頭傳到尾、頭穩尾大、隨時間流動；白虎是剛體不切條
  const q = rig.QINGLONG_RIG.style;
  assert.ok(Math.abs(rig.bodyWave(0.4, 0.5, rig.BAIHU_RIG.style)) < 0.03, 'tiger torso cannot ripple like a snake');
  assert.equal(rig.bodyWave(0.4, 0.5, q), rig.bodyWave(0.4, 0.5, q), 'wave is deterministic');
  let head = 0; let tail = 0; let moves = 0; let prev = null;
  for (let i = 0; i <= 200; i++) {
    const t = rig.RIG_PHASES.leap[0] + (rig.RIG_PHASES.attack[0] - rig.RIG_PHASES.leap[0]) * i / 200;
    head = Math.max(head, Math.abs(rig.bodyWave(t, 0.02, q)));
    tail = Math.max(tail, Math.abs(rig.bodyWave(t, 0.98, q)));
    const mid = rig.bodyWave(t, 0.6, q);
    if (prev !== null && Math.sign(mid) !== Math.sign(prev)) moves++;
    prev = mid;
  }
  assert.ok(tail > head * 8, `head stays steady while the tail whips (head ${head.toFixed(3)}, tail ${tail.toFixed(3)})`);
  assert.ok(tail > 0.08 && tail < 0.3, 'tail amplitude is visible but not absurd');
  assert.ok(moves >= 4, 'the body wave keeps travelling during the dash');
  assert.ok(rig.RIG_MESH.cols >= 20 && rig.RIG_MESH.rows >= 16, 'enough mesh cells for a smooth curve');
  // 活體：頭、下顎、前爪、後爪都真的動，位移有界（不能把圖撕爛），且每個部位只影響自己附近
  const A = rig.QINGLONG_RIG.frames.find((f) => f.id === 'pounce-open').anchors;
  const poseAt = (t) => rig.livingPose(t, q);
  let jawMin = 9; let jawMax = -9; let clawMin = 9; let clawMax = -9; let pitchMax = -9; let hindSwing = 0;
  for (let i = 0; i <= 300; i++) {
    const t = i / 300; const po = poseAt(t);
    jawMin = Math.min(jawMin, po.jaw); jawMax = Math.max(jawMax, po.jaw);
    clawMin = Math.min(clawMin, po.clawSwing); clawMax = Math.max(clawMax, po.clawSwing);
    pitchMax = Math.max(pitchMax, po.headPitch);
    hindSwing = Math.max(hindSwing, Math.abs(po.hind[0]), Math.abs(po.hind[1]));
    for (const [u, v] of [[0.2, 0.3], [0.25, 0.4], [0.05, 0.62], [0.37, 0.88], [0.9, 0.5], [0.5, 0.95]]) {
      const [dx, dy] = rig.meshDisplace(u, v, 1.13, A, po, t, q);
      assert.ok(Math.hypot(dx, dy) < 0.32, `mesh displacement stays bounded (${Math.hypot(dx, dy).toFixed(3)} at ${u},${v})`);
    }
  }
  assert.ok(jawMax - jawMin > 0.35, `the jaw really opens and shuts (range ${(jawMax - jawMin).toFixed(2)} rad)`);
  assert.ok(clawMax - clawMin > 0.6, 'the front claw winds up and rakes');
  assert.equal(pitchMax, 0, 'the head advances forward without nodding down');
  assert.ok(hindSwing > 0.03, 'the hind claws paddle while running');
  // 部位只影響自己附近：頭部動作時，遠處的尾巴只受身體波浪影響
  const farBefore = rig.meshDisplace(0.9, 0.3, 1.13, A, { headPitch: 0, headThrust: 0, jaw: 0, clawSwing: 0, hind: [0, 0] }, 0.4, q);
  const farAfter = rig.meshDisplace(0.9, 0.3, 1.13, A, { headPitch: 0.3, headThrust: 0.07, jaw: 0.4, clawSwing: 0.5, hind: [0.04, -0.04] }, 0.4, q);
  assert.ok(Math.abs(farBefore[0] - farAfter[0]) < 1e-9 && Math.abs(farBefore[1] - farAfter[1]) < 1e-9, 'moving the head or claws never drags the tail');
  // 真閉口同構圖素材：持咬段不得再退回張嘴底圖。
  for (let i = 0; i <= 100; i++) {
    const t = rig.RIG_PHASES.attack[1] + (rig.RIG_PHASES.recover[1] - 0.001 - rig.RIG_PHASES.attack[1]) * i / 100;
    const f = rig.strikeFrame(t, q);
    assert.ok(f.layers.every((l) => l.frame === 'bite-close'), 'the held bite uses the same-composition closed-mouth body');
  }
  const stage = read('components/battlefield/BeastRigStage.tsx');
  assert.ok(stage.includes('meshDisplace(') && stage.includes('livingPose('), 'stage deforms the sprite as a mesh');
  // 時間感：咬合前 1:1、咬合後約 120 毫秒慢動作、之後追回；單調遞增、終點仍是 1（總長與命中時刻都不變）
  assert.equal(rig.storyTime(0), 0);
  assert.equal(rig.storyTime(1), 1);
  assert.ok(Math.abs(rig.storyTime(impact) - impact) < 1e-9, 'story time equals real time at the impact moment');
  let prevS = -1;
  for (let i = 0; i <= 500; i++) { const v = rig.storyTime(i / 500); assert.ok(v >= prevS, 'story time never runs backwards'); prevS = v; }
  const slowSpan = rig.RIG_SLOWMO_MS / rig.RIG_STRIKE_MS;
  assert.ok((rig.storyTime(impact + slowSpan) - rig.storyTime(impact)) < slowSpan * 0.4, 'the bite plays in slow motion');
  assert.ok(rig.storyTime(0.5) === 0.5, 'the approach is untouched');
  // 鏡頭：咬合前推進、咬合瞬間重震、約 0.4 秒後回穩；震動不用亂數、同一刻同一結果
  const camAt = (ms) => rig.cameraFrame(ms / rig.RIG_STRIKE_MS, rig.BAIHU_RIG.style);
  assert.equal(JSON.stringify(camAt(1130)), JSON.stringify(camAt(1130)), 'camera is deterministic');
  assert.ok(camAt(1000).zoom > camAt(300).zoom && camAt(1000).zoom > 1, 'camera pushes in on the dash');
  assert.ok(Math.hypot(camAt(1135).shakeX, camAt(1135).shakeY) > 1.5, 'the bite shakes the battlefield');
  assert.ok(Math.hypot(camAt(1480).shakeX, camAt(1480).shakeY) < 0.2 && Math.abs(camAt(1480).zoom - 1) < 0.01, 'the camera settles before the end');
  assert.ok(Math.abs(camAt(100).zoom - 1) < 0.001 && camAt(100).shakeX === 0, 'no camera movement during the wind-up');
  // 聲音：有動畫的神獸改走與動畫階段對齊的時間軸，咬合那一聲落在 RIG_IMPACT_MS（與對手受擊、鏡頭同一瞬間）
  const fx = load('lib/beast-battle-fx.ts');
  for (const [id, el] of [['beast_g_baihu', 'SPACE'], ['beast_g_qinglong', 'AIR']]) {
    const tl = fx.beastActionTimeline(id, el, 'player', false, true);
    const strikes = tl.filter((c) => c.what === 'strike').map((c) => c.at);
    assert.ok(strikes.includes(rig.RIG_IMPACT_MS), `${id}: the bite sound lands exactly on the impact moment`);
    assert.ok(strikes.filter((x) => x > rig.RIG_IMPACT_MS).length >= 2, `${id}: the follow-up bites have their own sounds`);
    assert.ok(tl.every((c) => c.at >= 0 && c.at <= rig.RIG_STRIKE_MS), `${id}: every cue falls inside the strike`);
    assert.ok(tl.some((c) => c.what === 'charge' && c.at >= rig.RIG_PHASES.leap[0] * rig.RIG_STRIKE_MS - 1 && c.at <= rig.RIG_PHASES.leap[1] * rig.RIG_STRIKE_MS), `${id}: a whoosh as it leaps out of the card`);
    const old = fx.beastActionTimeline(id, el, 'player', false, false);
    assert.equal(old.find((c) => c.what === 'strike').at, 430, 'beasts without animation keep the original sound timing');
    assert.ok(fx.beastActionTimeline(id, el, 'opponent', false, true).every((c) => c.what !== 'voice'), 'the opponent still never roars over the player');
  }
  assert.ok(read('components/battlefield/BattlePanel.tsx').includes('rigged'), 'the panel passes the rig flag to the sound timeline');
  assert.ok(read('components/battlefield/BeastRigStage.tsx').includes('storyTime(real)'), 'the stage plays the slow-motion time map');
  // 青龍：同一條時間軸，咬完就地散去，且每個時刻都有完全不透明的身體（沒有重影）
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const f = rig.strikeFrame(t, rig.QINGLONG_RIG.style);
    for (const layer of f.layers) assert.ok(rig.QINGLONG_RIG.frames.some((x) => x.id === layer.frame), `qinglong timeline only uses its own poses (${layer.frame})`);
  }

  // 6) 不動原始素材：新版卡面與既有本體立繪維持原檔，本次只新增 rig 資料夾
  const { placeRig, alignRigContact, rigContactPull } = load('components/battlefield/BeastRigStage.tsx');
  for (const definition of Object.values(rig.BEAST_RIGS)) {
    const spec = definition.frames.find(f => f.id === 'pounce-open');
    const meta = await sharp(path.join(root, 'public/beast-game/rig', definition.dir, spec.file ?? 'pounce-open.webp')).metadata();
    const aspect = meta.width / meta.height;
    for (const width of [360, 390, 430, 1280]) for (const side of [-1, 0, 1]) {
      const geometry = { arenaWidth: Math.min(width, 640), from: { cx: width / 2 - side * 65, top: 600, width: 70, height: 98 }, to: { cx: width / 2 + side * 65, top: 180, width: 96, height: 134 } };
      for (const t of [impact, 0.82, 0.88]) {
        const f = rig.strikeFrame(t, definition.style);
        const p = alignRigContact(placeRig(geometry, f, definition.style.size), f, spec, aspect, t, geometry, definition);
        const contact = spec.contact ?? [spec.anchors.head[0] - 0.1, spec.anchors.jaw[1]];
        const delta = rig.meshDisplace(...contact, aspect, spec.anchors, rig.livingPose(t, definition.style), t, definition.style);
        const dh = p.unit * spec.norm;
        const x = ((contact[0] - 0.5) * aspect + delta[0]) * dh * (p.mirror ? -1 : 1);
        const y = ((contact[1] - 0.92) + delta[1]) * dh * f.squash;
        const a = p.rotation * (p.mirror ? -1 : 1);
        const pull = rigContactPull(p, t, 96);
        assert.ok(Math.abs(p.x + x * Math.cos(a) - y * Math.sin(a) - geometry.to.cx - pull[0]) < 0.001, `${definition.dir} mouth tracks the horizontal tear contact`);
        assert.ok(Math.abs(p.y + x * Math.sin(a) + y * Math.cos(a) - geometry.to.top - 134 * 0.55 - pull[1]) < 0.001, `${definition.dir} mouth tracks the vertical tear contact`);
        assert.ok(Math.sin(a) * (p.mirror ? 1 : -1) < 0, 'head faces upward toward opponent, never away from it');
      }
    }
  }

  for (const f of ['public/beast-game/front/guardian-baihu.v2.webp', 'public/beast-game/spirit/guardian-baihu.webp']) assert.ok(fs.existsSync(path.join(root, f)), `${f} untouched`);
  assert.doesNotMatch(read('scripts/build-beast-rig-sprites.mjs'), /public\/beast-game\/(front|spirit|thumb)['"`\/]\s*[,)]?\s*[^\n]*writeFile|toFile\(path\.join\(root, ?'public\/beast-game\/(front|spirit)/);

  // 7) 動畫不決定結果：不用亂數、不匯入會算勝負的函式；只拉長輸入鎖的演出時間
  for (const f of ['lib/beast-game/beast-rig.ts', 'components/battlefield/BeastRigStage.tsx', 'components/battlefield/useRigStrike.ts']) {
    const src = read(f);
    assert.doesNotMatch(src, /Math\.random/, `${f} has no randomness`);
    // 只借型別（import type）不算：型別不會跑任何運算
    assert.doesNotMatch(src.replace(/^import type .*$/gm, ''), /from ['"][^'"]*(interactive|battle-session|adjudication|battle-validation|stake)/, `${f} imports nothing that decides outcomes`);
  }
  const base = newMatch(['beast_a02', 'beast_a03'], ['beast_a06', 'beast_a22'], 42);
  const baihu = newMatch(['beast_g_baihu', 'beast_a02'], ['beast_a06', 'beast_a22'], 42);
  const baihuAfter = advance(baihu, { type: 'ATTACK' });
  const beforeJson = JSON.stringify(baihuAfter);
  assert.ok(presentation.combatPlaybackMs(baihuAfter) >= rig.RIG_STRIKE_MS, 'input stays locked until the whole strike has played');
  assert.equal(JSON.stringify(baihuAfter), beforeJson, 'presentation timing never changes the match');
  const baseAfter = advance(base, { type: 'ATTACK' });
  assert.ok(presentation.combatPlaybackMs(baseAfter) < 1500, 'beasts without a rig keep their original timing');
  assert.equal(presentation.combatPlaybackMs(baihuAfter, true), 180, 'reduced motion skips the long strike');
  assert.equal(presentation.rigStrikeEndMs(base), 0);

  // 8) 戰場串接：只在剛收到新戰報、主戰有骨架、出了傷害招式、且未開減少動態時播；原始卡片只在動畫期間隱藏
  const hook = read('components/battlefield/useRigStrike.ts');
  assert.ok(hook.includes('strike = Boolean(match && rig && !reduced && playing && playStartRevision !== null'), 'plays only while a fight is being shown');
  assert.ok(hook.includes("match.revision !== playStartRevision && match.revision > 0 && isDamagingAction(match, 'player')"), 'plays only on a freshly received report with a damaging action');
  const dock = read('components/battlefield/BattleDock.tsx');
  assert.ok(dock.includes('useRigStrike(match, playing)'), 'the dock decides when the beast leaves its card');
  assert.ok(dock.includes('data-rig={active && rigState.strike && readyRigId === fighter.cardId}'), 'only the active card fades while its beast is out');
  assert.ok(dock.includes('<BeastRigStage'), 'the dock hosts the stage');
  const arenaSrc = read('components/battlefield/BattleArena.tsx');
  assert.ok(arenaSrc.includes('useRigStrike(match, playing).strike'));
  assert.match(arenaSrc, /RIG_IMPACT_MS/, 'hit reaction and element effects wait for the bite');
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)") && css.includes(".card[data-rig='true'] > span:first-child { animation: none; }"), 'reduced motion skips the fade');
  const stageSrc = read('components/battlefield/BeastRigStage.tsx');
  assert.ok(stageSrc.includes('[data-dock-card][data-active="true"]'), 'the beast leaves from and returns to the active dock card');
  const bird = rig.ZHUQUE_RIG;
  // 換奔跑幀時嘴口不能因不同圖片底邊/norm而倒跳（使用者750ms重現）。
  const tigerGeometry = { arenaWidth: 390, from: { cx: 195, top: 620, width: 70, height: 100 }, to: { cx: 195, top: 140, width: 96, height: 134 } };
  let previousTigerMouthX = Infinity;
  for (const t of [0.397, 0.45, 0.48, 0.5, 0.52, 0.55, 0.5799, 0.5801]) {
    const f = rig.strikeFrame(t, rig.RIG_STYLES.baihu); const points = [];
    for (const spec of rig.BAIHU_RIG.frames.filter(s => s.contact)) {
      const meta = await sharp(path.join(root, 'public/beast-game/rig/baihu', spec.file ?? `${spec.id}.webp`)).metadata();
      const aspect = meta.width / meta.height;
      const p = alignRigContact(placeRig(tigerGeometry, f, 1), f, spec, aspect, t, tigerGeometry, rig.BAIHU_RIG);
      const d = spec.anchors ? rig.meshDisplace(...spec.contact, aspect, spec.anchors, rig.livingPose(t, rig.RIG_STYLES.baihu), t, rig.RIG_STYLES.baihu) : [0, 0];
      const dh = p.unit * spec.norm;
      const x = (spec.contact[0] - 0.5) * dh * aspect + d[0] * dh;
      const y = ((spec.contact[1] - 0.92) * dh + d[1] * dh) * f.squash;
      points.push([p.x + x * Math.cos(p.rotation) - y * Math.sin(p.rotation), p.y + x * Math.sin(p.rotation) + y * Math.cos(p.rotation)]);
    }
    for (const point of points) assert.ok(Math.hypot(point[0] - points[0][0], point[1] - points[0][1]) < 0.001, 'tiger run/attack poses share the same mouth path across 750ms');
    assert.ok(points[0][0] <= previousTigerMouthX + 0.001, 'left-facing tiger advances left instead of drifting backwards right at 596–870ms');
    previousTigerMouthX = points[0][0];
  }
  const tigerAnchors = rig.BAIHU_RIG.frames.find(f => f.id === 'pounce-open').anchors;
  const forearmU = (tigerAnchors.claw[0] + tigerAnchors.shoulder[0]) / 2;
  const forearmV = (tigerAnchors.claw[1] + tigerAnchors.shoulder[1]) / 2;
  const relaxed = { headPitch: 0, headThrust: 0, jaw: 0, clawSwing: 0, hind: [0, 0] };
  const limbRest = rig.meshDisplace(forearmU, forearmV, 1.82, tigerAnchors, relaxed, 0.7, rig.RIG_STYLES.baihu);
  const limbPush = rig.meshDisplace(forearmU, forearmV, 1.82, tigerAnchors, { ...relaxed, clawSwing: 0.4 }, 0.7, rig.RIG_STYLES.baihu);
  assert.ok(Math.hypot(limbPush[0] - limbRest[0], limbPush[1] - limbRest[1]) > 0.03, 'tiger forearm follows shoulder instead of twisting only the paw');
  const turtleAnchors = rig.XUANWU_RIG.frames.find(x => x.id === 'pounce-open').anchors;
  const turtlePush = { ...relaxed, clawSwing: 0.11 };
  const farRest = rig.meshDisplace(...turtleAnchors.farFore.claw, 1.5, turtleAnchors, relaxed, 0.7, rig.RIG_STYLES.xuanwu);
  const farPush = rig.meshDisplace(...turtleAnchors.farFore.claw, 1.5, turtleAnchors, turtlePush, 0.7, rig.RIG_STYLES.xuanwu);
  assert.ok(Math.hypot(farPush[0] - farRest[0], farPush[1] - farRest[1]) > 0.005, 'tortoise far foreleg has a separate shoulder-linked small movement');
  const shellRest = rig.meshDisplace(0.6, 0.45, 1.5, turtleAnchors, relaxed, 0.7, rig.RIG_STYLES.xuanwu);
  const shellPush = rig.meshDisplace(0.6, 0.45, 1.5, turtleAnchors, turtlePush, 0.7, rig.RIG_STYLES.xuanwu);
  assert.ok(Math.hypot(shellPush[0] - shellRest[0], shellPush[1] - shellRest[1]) < 0.00001, 'foreleg loading must not bend the hard shell');
  const wingAnchors = bird.frames.find(f => f.id === 'pounce-open').anchors;
  const stillPose = { headPitch: 0, headThrust: 0, jaw: 0, clawSwing: 0, hind: [0, 0] };
  for (const wing of wingAnchors.wings) {
    for (const boundary of [0.52, 0.58, 0.68]) {
      const before = rig.meshDisplace(...wing.tip, 1.5, wingAnchors, stillPose, boundary - 0.00001, bird.style);
      const after = rig.meshDisplace(...wing.tip, 1.5, wingAnchors, stillPose, boundary + 0.00001, bird.style);
      assert.ok(Math.hypot(after[0] - before[0], after[1] - before[1]) < 0.001, 'phoenix wings fold continuously into attack');
    }
  }
  console.log('PASS: guardian strikes — native refined cutouts, continuous wings, aligned forward contact and reversible tearing, unchanged outcomes');
})().catch((error) => { console.error(error); process.exit(1); });
