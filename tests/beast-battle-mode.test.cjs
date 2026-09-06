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
  const module = { exports: {} }; cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const customRequire = id => {
    if (id.endsWith('.css')) return new Proxy({}, { get: (_, key) => String(key) });
    if (id === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children);
    if (id === 'next/dynamic') return () => () => null;
    return id.startsWith('@/') ? load(id.slice(2)) : id.startsWith('.') ? load(path.resolve(path.dirname(file), id)) : require(id);
  };
  vm.runInNewContext(source, { module, exports: module.exports, require: customRequire, console, setTimeout, clearTimeout, AbortController, crypto: require('node:crypto').webcrypto }, { filename: file });
  return module.exports;
}
const render = (component, props = {}) => renderToStaticMarkup(React.createElement(component, props));
const onlyBattle = html => {
  assert.doesNotMatch(html, /成長中心|成長收藏|每日任務|完成使命|召喚神獸|覺醒成獸|growth-center#/);
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (href !== '/audio/beast-voices/credits.html') assert.ok(href.startsWith('/beast-game'), `Game navigation must stay in battle: ${href}`);
  }
};

const { BATTLE_VENUES, BATTLE_NO_STAKE_GUIDE } = load('lib/beast-game/venues.ts');
for (const venue of Object.values(BATTLE_VENUES)) {
  assert.equal(venue.license, 'CC0-1.0');
  assert.ok(fs.statSync(path.join(root, 'public', venue.image)).size < 100_000, 'Mobile background under 100 KB');
}
assert.notEqual(BATTLE_VENUES.cards.image, BATTLE_VENUES.fighting.image);
assert.equal(BATTLE_NO_STAKE_GUIDE.href, '/beast-game/battlefield');
assert.match(render(load('components/BeastLegacyGame.tsx').default), /進入卡片體驗戰/);
onlyBattle(render(load('components/BeastLegacyGame.tsx').default));
onlyBattle(render(load('components/BeastTurnGame.tsx').default));
const ritualCards = [
  { id: 'beast_y21', name: '參水猿・幼子', thumbnail: '/beast-game/card-back.webp', element: 'WATER' },
  { id: 'beast_a02', name: '亢金龍', thumbnail: '/beast-game/card-back.webp', element: 'SPACE' },
  { id: 'beast_a06', name: '尾火虎', thumbnail: '/beast-game/card-back.webp', element: 'FIRE' },
];
const ritual = render(load('components/BeastDuelRitual.tsx').default, { player: ritualCards, opponent: ritualCards, onComplete() {}, onCancel() {} });
assert.match(ritual, /data-duel-visual/);
assert.match(ritual, /data-duel-controls/);
assert.match(ritual, /ring-arena.webp/);
assert.doesNotMatch(ritual, /tarot\/card-back/);
onlyBattle(ritual);

const { newMatch, interactiveCatalog } = load('lib/beast-game/interactive.ts');
const match = newMatch(['beast_y21', 'beast_a02'], ['beast_a06', 'beast_a22'], 42);
const before = JSON.stringify(match);
const Arena = load('components/battlefield/BattleArena.tsx').default;
const Panel = load('components/battlefield/BattlePanel.tsx').default;
const Guide = load('components/battlefield/BattleCardGuide.tsx').default;
const arena = render(Arena, { match, cards: interactiveCatalog(), onInspect() {} });
assert.match(arena, /data-battle-venue="cards"/);
assert.match(arena, /forest-battle.webp/);
assert.match(arena, /生命/);
onlyBattle(arena);
onlyBattle(render(Guide, { cardId: match.player.team[0].cardId, fighter: match.player.team[0], onClose() {} }));
onlyBattle(render(Panel, { match, onAction() {}, compact: true, cards: interactiveCatalog() }));
assert.equal(JSON.stringify(match), before, 'Changing the battle display must not mutate the match');
for (const winner of ['player', 'opponent', null]) {
  onlyBattle(render(Panel, { match: { ...match, status: 'FINISHED', winner }, onAction() {}, compact: true }));
}
const trial = render(load('components/battlefield/StakeSlot.tsx').default, { owned: [], selected: null, steps: [], onSelect() {}, trial: true });
assert.match(trial, /體驗戰免押卡/);
assert.match(trial, /不押卡、不發卡也不沒收/);
onlyBattle(trial);
console.log('PASS: battle entry, no-stake guidance, live combat, abilities and all outcomes stay in battle mode');
console.log('PASS: two licensed mobile venues, read-only rendering and honest trial stakes');
