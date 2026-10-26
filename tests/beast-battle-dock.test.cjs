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
 * 戰鬥畫面最下方固定選卡列（BattleDock）守門：
 * 帶入幾張就顯示幾張、點任何一張立即上場（走後端 SWITCH 合法動作）、沒有額外換卡按鈕與二次確認、
 * 三種難度共用、列在動畫中與對戰結束後都不消失。
 */
const { newMatch, interactiveCatalog, legalActions } = load('lib/beast-game/interactive.ts');
const Dock = load('components/battlefield/BattleDock.tsx').default;
const cards = interactiveCatalog();
const ids = ['beast_y21', 'beast_a02', 'beast_a06', 'beast_a22', 'beast_a03'];
const foes = ['beast_a06', 'beast_a22', 'beast_a03', 'beast_y21', 'beast_a02'];

// 1) 帶入幾張就排幾張
for (const n of [2, 3, 5]) {
  const match = newMatch(ids.slice(0, n), foes.slice(0, n), 7);
  const html = render(Dock, { match, view: viewOf(match), cards, onAction() {} });
  assert.equal((html.match(/data-dock-card=/g) || []).length, n, `dock shows ${n} cards for a ${n}-card team`);
  assert.match(html, new RegExp(`data-count="${n}"`));
  assert.match(html, /data-battle-dock/);
}

// 2) 主戰按不下去，其他活著的後備一鍵就能換；點下去交出的就是後端給的 SWITCH 動作，原封不動
const match = newMatch(ids.slice(0, 3), foes.slice(0, 3), 7);
const view = viewOf(match);
const switches = view.legal.filter((a) => a.type === 'SWITCH');
assert.ok(switches.length >= 1, 'core offers voluntary switches');
let sent = [];
const html = render(Dock, { match, view, cards, onAction(a) { sent.push(a); } });
const buttons = html.match(/<button[^>]*>/g) || [];
assert.equal(buttons.length, 3);
assert.equal(buttons.filter((b) => b.includes('disabled=""')).length, 3 - switches.length, 'only legal switches are tappable (the active fighter is not)');
assert.match(html, /aria-current="true"/, 'active fighter is marked');

// 3) 沒有額外換卡按鈕、沒有二次確認
assert.doesNotMatch(html, /確認|換卡/);

// 4) 動畫演出中（busy）與對戰結束後，列仍在，只是按不下去
const busyHtml = render(Dock, { match, view, cards, busy: true, onAction() {} });
assert.equal((busyHtml.match(/data-dock-card=/g) || []).length, 3, 'dock stays during playback');
assert.equal((busyHtml.match(/<button[^>]*disabled=""/g) || []).length, 3, 'nothing is tappable during playback');
const finished = structuredClone(match);
finished.status = 'FINISHED'; finished.winner = 'player';
const finishedHtml = render(Dock, { match: finished, view: viewOf(finished), cards, onAction() {} });
assert.equal((finishedHtml.match(/data-dock-card=/g) || []).length, 3, 'dock stays after the battle ends');

// 5) 原始碼層：三種難度共用同一個元件；舊的換卡流程確實移除
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
for (const page of ['components/BeastTurnGame.tsx', 'app/beast-game/battlefield/page.tsx']) {
  assert.match(read(page), /<BattleDock[\s/>]/, `${page} renders the shared dock`);
  assert.doesNotMatch(read(page), /onSwap=|swapOnSide/, `${page} no longer passes the old swap props`);
}
assert.doesNotMatch(read('components/battlefield/BattlePanel.tsx'), /data-swap-entry|commandView === 'swap'|點戰鬥卡換上場/, 'old swap button and reserve panel are gone');
assert.doesNotMatch(read('components/battlefield/BattleArena.tsx'), /swapCard|onSwap|換卡上場/, 'old side swap cards are gone');
// 6) 動畫與資料：選卡列只讀後端的合法動作與 Match，不自己算
const dockSrc = read('components/battlefield/BattleDock.tsx');
assert.doesNotMatch(dockSrc, /Math\.random|legalActions|advance\(|newMatch/, 'dock never computes outcomes');
assert.match(dockSrc, /view\?\.legal/, 'dock reads backend-provided legal actions');
// 7) 樣式：固定在畫面底部
assert.match(read('components/battlefield/BattleDock.module.css'), /position: *fixed/);
// 8) 卡片本身就是出戰卡：每張下方一條生命能量條（數值取自 Match）；點主戰＝攻擊／查看，由上層決定
const meters = html.match(/role="meter"[^>]*/g) || [];
assert.equal(meters.length, 3, 'one energy bar per card');
match.player.team.forEach((f, i) => assert.ok(meters[i].includes(`aria-valuenow="${f.hp}"`) && meters[i].includes(`aria-valuemax="${f.maxHp}"`), 'energy bar equals the fighter hp'));
const withTap = render(Dock, { match, view, cards, onAction() {}, onActiveTap() {}, activeTapLabel: 'attack' });
assert.match(withTap, new RegExp(`aria-label="讓${match.player.team[match.player.active].name}普通攻擊"`), 'tapping the active card attacks');
assert.doesNotMatch(withTap.match(/<button[^>]*data-active="true"[^>]*>/)[0], /disabled=""/, 'active card is tappable when the screen allows it');
assert.match(html.match(/<button[^>]*data-active="true"[^>]*>/)[0], /disabled=""/, 'active card is inert when the screen gives no action');

// 9) 戰場在對戰中只留對手，不再多一張卡站在前面作戰；一體成型的外框樣式存在
const Arena = load('components/battlefield/BattleArena.tsx').default;
const arenaHtml = render(Arena, { match, view, cards, onInspect() {} });
assert.doesNotMatch(arenaHtml, /data-fighter="player"/, 'no extra player card in front during a battle');
assert.match(arenaHtml, /data-fighter="opponent"/);
assert.match(arenaHtml, /data-solo="true"/);
assert.match(read('components/battlefield/BattleScreen.module.css'), /\.split\[data-dock='true'\] \{[^}]*border: 1px solid/, 'arena, controls and dock share one frame');
console.log('PASS: bottom dock shows every brought-in card, one tap switches via backend legal actions, no extra swap button or confirmation, shared by all difficulties');
