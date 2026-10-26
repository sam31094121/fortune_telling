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
  assert.deepEqual(Object.keys(rig.BEAST_RIGS), ['beast_g_baihu']);
  assert.equal(rig.rigFor('beast_g_qinglong'), null);
  assert.equal(rig.rigFor(null), null);

  // 2) 時間軸：階段首尾相接，涵蓋 0..1；命中時刻落在攻擊階段；卡片隱藏區間與 CSS 同步
  const phases = Object.values(rig.RIG_PHASES);
  assert.equal(phases[0][0], 0);
  assert.equal(phases.at(-1)[1], 1);
  for (let i = 1; i < phases.length; i++) assert.equal(phases[i][0], phases[i - 1][1], 'phases are contiguous');
  const impact = rig.RIG_IMPACT_MS / rig.RIG_STRIKE_MS;
  assert.ok(impact >= rig.RIG_PHASES.attack[0] && impact < rig.RIG_PHASES.attack[1], 'impact falls inside the attack phase');
  const css = read('components/battlefield/BattleArena.module.css');
  const [hideFrom, hideTo] = rig.RIG_CARD_HIDDEN;
  assert.ok(css.includes(`${Math.round(hideFrom * 100)}%, ${Math.round(hideTo * 100) - 1}% { opacity: 0; visibility: hidden; }`), 'CSS hides the card exactly during RIG_CARD_HIDDEN');

  // 3) 純函式：同一個 t 永遠同一個畫面；任何時刻都有可見的身體；跳出前與回到卡片後透明
  let minBody = 1;
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const a = rig.strikeFrame(t);
    assert.equal(JSON.stringify(a), JSON.stringify(rig.strikeFrame(t)), 'strikeFrame is deterministic');
    const solid = Math.max(0, ...a.layers.map((l) => l.alpha)) * a.alpha;
    if (t > 0.13 && t < 0.88) minBody = Math.min(minBody, solid);
    for (const layer of a.layers) assert.ok(rig.BAIHU_RIG.frames.some((f) => f.id === layer.frame), `unknown frame ${layer.frame}`);
  }
  assert.ok(minBody >= 0.99, `a fully opaque body underneath at every moment of the strike (min ${minBody.toFixed(2)})`);
  assert.ok(rig.strikeFrame(0).alpha < 0.05, 'starts hidden inside the card');
  assert.ok(rig.strikeFrame(1).alpha < 0.05, 'ends hidden: the original card takes over again');

  // 4) 動作都做到了：蓄勢、跑（收腳↔伸展交替）、撲擊張嘴、咬合、返回、落地，並真的往對手移動再回來
  const used = new Set();
  for (let i = 0; i <= 400; i++) for (const l of rig.strikeFrame(i / 400).layers) if (l.alpha > 0.5) used.add(l.frame);
  for (const id of ['bite-close', 'run-gather', 'run-reach', 'pounce-open', 'land-crouch']) assert.ok(used.has(id), `pose ${id} is shown`);
  const reach = new Set(); let switches = 0; let last = null;
  for (let i = 0; i <= 400; i++) { const t = rig.RIG_PHASES.run[0] + (rig.RIG_PHASES.run[1] - rig.RIG_PHASES.run[0]) * (i / 400); const top = rig.strikeFrame(t).layers.sort((a, b) => b.alpha - a.alpha)[0].frame; reach.add(top); if (last && top !== last) switches++; last = top; }
  assert.ok(reach.has('run-gather') && reach.has('run-reach') && switches >= 4, 'running alternates between gathered and stretched poses');
  assert.equal(rig.strikeFrame(rig.RIG_PHASES.attack[0] + 0.001).travel.progress, 1, 'reaches the opponent');
  assert.ok(rig.strikeFrame(0.15).travel.progress > 0 && rig.strikeFrame(0.8).travel.progress < 1, 'travels out and back');
  assert.ok(rig.strikeFrame(impact).flash > 0.9, 'bite flash is peaked at the impact time');
  const bite = rig.strikeFrame(rig.RIG_PHASES.attack[0] + (rig.RIG_PHASES.attack[1] - rig.RIG_PHASES.attack[0]) * 0.3);
  assert.ok(bite.layers.some((l) => l.frame === 'pounce-open' && l.alpha > 0.7), 'mouth is wide open before the bite');
  assert.ok(rig.strikeFrame(impact + 0.01).layers.some((l) => l.frame === 'bite-close' && l.alpha > 0.9), 'jaws are shut at the bite');

  // 5) 素材：manifest 與程式一致；每張都有透明背景（去背成功）且身體內部的條紋沒被挖穿
  const dir = path.join(root, 'public/beast-game/rig/baihu');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.source, 'public/beast-game/front/guardian-baihu.v2.webp', 'source is the new-version card art');
  for (const spec of rig.BAIHU_RIG.frames) {
    const entry = manifest.frames.find((f) => f.id === spec.id);
    assert.ok(entry, `${spec.id} in manifest`);
    assert.ok(Math.abs(entry.norm - spec.norm) < 1e-4, `${spec.id} norm matches manifest`);
    const file = path.join(dir, `${spec.id}.webp`);
    assert.ok(fs.existsSync(file), `${spec.id}.webp exists`);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.ok(info.width >= 600, `${spec.id} keeps enough resolution (${info.width}px wide)`);
    let clear = 0; let opaque = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] < 8) clear++; else if (data[i] > 247) opaque++; }
    const total = data.length / 4;
    assert.ok(clear / total > 0.25, `${spec.id} has a transparent background (${(clear / total * 100).toFixed(0)}%)`);
    assert.ok(opaque / total > 0.3, `${spec.id} body is solid, stripes not punched out (${(opaque / total * 100).toFixed(0)}% opaque)`);
  }

  // 6) 不動原始素材：新版卡面與既有本體立繪維持原檔，本次只新增 rig 資料夾
  for (const f of ['public/beast-game/front/guardian-baihu.v2.webp', 'public/beast-game/spirit/guardian-baihu.webp']) assert.ok(fs.existsSync(path.join(root, f)), `${f} untouched`);
  assert.doesNotMatch(read('scripts/build-beast-rig-sprites.mjs'), /public\/beast-game\/(front|spirit|thumb)['"`\/]\s*[,)]?\s*[^\n]*writeFile|toFile\(path\.join\(root, ?'public\/beast-game\/(front|spirit)/);

  // 7) 動畫不決定結果：不用亂數、不匯入會算勝負的函式；只拉長輸入鎖的演出時間
  for (const f of ['lib/beast-game/beast-rig.ts', 'components/battlefield/BeastRigStage.tsx']) {
    const src = read(f);
    assert.doesNotMatch(src, /Math\.random/, `${f} has no randomness`);
    assert.doesNotMatch(src, /from ['"][^'"]*(interactive|battle-session|adjudication|battle-validation|stake)/, `${f} imports nothing that decides outcomes`);
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
  const arena = read('components/battlefield/BattleArena.tsx');
  assert.match(arena, /rigStrike = Boolean\(match && activeRig && rigReady && !reduced && playing/);
  assert.match(arena, /match\.revision !== playStartRevision && playerStrike/);
  assert.match(arena, /data-rig=\{side === 'player' && rigStrike\}/);
  assert.match(arena, /RIG_IMPACT_MS/, 'hit reaction and element effects wait for the bite');
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.artSpace\[data-rig='true'\]/);
  console.log('PASS: white tiger strike — pure timeline, new-version art keyframes with a solid cut-out, run/leap/bite/return all present, never decides outcomes, originals untouched');
})().catch((error) => { console.error(error); process.exit(1); });
