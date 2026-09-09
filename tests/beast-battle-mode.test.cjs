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
  vm.runInNewContext(source, { module, exports: module.exports, require: customRequire, console, setTimeout, clearTimeout, AbortController, structuredClone, crypto: require('node:crypto').webcrypto }, { filename: file });
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

// Structural guard for the phone regression; real scrolling is also checked in-browser.
// The preparation guide used to occupy the whole fixed footer, leaving an 8px hand area.
const postcss = require('postcss');
const screenCss = postcss.parse(fs.readFileSync(path.join(root, 'components/battlefield/BattleScreen.module.css'), 'utf8'));
const arenaCss = postcss.parse(fs.readFileSync(path.join(root, 'components/battlefield/BattleArena.module.css'), 'utf8'));
function mobileDeclaration(css, media, selector, property) {
  let value;
  css.walkAtRules('media', rule => {
    if (rule.params !== media) return;
    rule.walkRules(selector, style => style.walkDecls(property, decl => { value = decl.value; }));
  });
  return value;
}
const prepare = ".controls[data-preparing='true']";
assert.equal(mobileDeclaration(screenCss, '(max-width: 600px)', prepare, 'display'), 'grid');
assert.equal(mobileDeclaration(screenCss, '(max-width: 600px)', prepare, 'overflow'), 'hidden');
assert.equal(mobileDeclaration(screenCss, '(max-width: 600px)', `${prepare} > .controlScroll`, 'overflow-y'), 'auto');
assert.equal(mobileDeclaration(screenCss, '(max-width: 600px)', `${prepare} > .footer`, 'position'), 'static');
const battlefieldPage = fs.readFileSync(path.join(root, 'app/beast-game/battlefield/page.tsx'), 'utf8');
assert.match(battlefieldPage, /match\?\.status === 'FINISHED' \? '本場結束'/, 'Finished battles do not advertise a next round');
assert.match(battlefieldPage, /data-battle-controls data-preparing=\{!match\}/, 'Only preparation uses the combined phone scroll area');
assert.equal((battlefieldPage.match(/parentElement\?\.scrollTo\(\{ top: 0 \}\)/g) || []).length, 3, 'Inspection and navigation reset the phone scroll area');
assert.equal(mobileDeclaration(arenaCss, '(max-width: 480px)', '.fighters', 'grid-template-columns'), 'minmax(0, 1fr) minmax(0, 1fr)');
assert.equal(mobileDeclaration(arenaCss, '(max-width: 480px)', '.fighter', 'height'), '100%');
console.log('PASS: phone preparation can scroll past the guide; card artwork has a bounded grid track');

const { preparationGuidance, nextStakeSelection } = load('components/battlefield/preparation-guidance.ts');
const StartGuide = load('components/battlefield/BattleStartGuide.tsx').default;
const baselineGuide = { ready: false, hasActive: false, formationReady: false, checkingRecords: false, recordProblem: false, trial: false };
const preparationSteps = [
  { step: 1, label: '選主戰卡', done: false, icon: '🐉' },
  { step: 2, label: '補後備卡', done: false, icon: '🛡️', recommended: true },
  { step: 3, label: '選押注卡', done: false, icon: '💎' },
  { step: 4, label: '檢查陣容', done: false, icon: '✓' },
  { step: 5, label: '開戰！', done: false, icon: '⚔️' },
];
for (const scenario of [
  { name: 'no active card', input: {}, step: 1, reason: '先把一隻神獸放到主戰格。' },
  { name: 'stake required, reserve only recommended', input: { hasActive: true, formationReady: true }, step: 3, reason: '先押一張收藏卡' },
  { name: 'invalid formation', input: { hasActive: true }, step: 4, reason: '請確認陣容' },
  { name: 'checking records', input: { checkingRecords: true }, step: 3, reason: '正在核對押注紀錄…' },
  { name: 'record failure', input: { recordProblem: true }, step: 3, reason: '請先處理押注提示' },
  { name: 'trial ready without reserve', input: { hasActive: true, formationReady: true, ready: true, trial: true }, step: 5 },
  { name: 'staked formation ready', input: { hasActive: true, formationReady: true, ready: true }, step: 5 },
]) {
  const input = { ...baselineGuide, ...scenario.input };
  const beforeInput = JSON.stringify(input);
  const guidance = preparationGuidance(input);
  assert.equal(guidance.currentStep, scenario.step, scenario.name);
  const html = render(StartGuide, {
    ...guidance, steps: preparationSteps, status: '系統測試資料', canStart: input.ready,
    checkingRecords: input.checkingRecords, startButtonText: input.trial ? '開始體驗戰' : '確認開戰',
    blockReason: scenario.reason, onReviewStep() {}, onStart() { throw new Error('Rendering must not start a battle'); },
  });
  assert.equal((html.match(/<button\b/g) || []).length, 1, 'One next action, not five competing steps');
  assert.doesNotMatch(html, /progressBar|stepsGrid|⏳/, 'No permanent progress animation or fake waiting');
  const action = html.match(/<button[^>]*data-start-confirmation="(?:true|false)"[^>]*>/)?.[0];
  assert.ok(action, 'One separate battle-confirmation action');
  assert.equal(action.includes('disabled=""'), input.checkingRecords, 'Only pending record work blocks navigation');
  assert.ok(action.includes(`data-start-confirmation="${input.ready}"`));
  if (!input.ready && !input.checkingRecords) assert.ok(action.includes(`aria-label="${guidance.actionLabels[scenario.step]}"`));
  assert.equal(JSON.stringify(input), beforeInput, 'Guidance never mutates readiness');
}
assert.match(battlefieldPage, /hidden=\{prepareView !== 'stake'\}[^>]*data-preparation-progress/, 'Stake review remains reachable as a separate pane');
assert.match(battlefieldPage, /hidden=\{prepareView !== 'help'\}/, 'Instructions do not occupy the main controls');
assert.match(battlefieldPage, /!match && !inspection \?/, 'Inspection never competes with the start footer');
assert.match(battlefieldPage, /後備是建議增援/);
assert.match(battlefieldPage, /onReviewStep=\{reviewStep\}/);
assert.match(battlefieldPage, /onStart=\{\(\) => void start\(\)\}/, 'Starting remains a separate explicit action');
console.log('PASS: real readiness drives the highlighted step; recommendations do not block play; waiting and actionable guidance are distinct');

const selected = ['beast_a01'];
assert.equal(JSON.stringify(nextStakeSelection(selected, 'beast_a02')), '["beast_a02"]', 'Replacing a stake never appends a hidden second card');
assert.equal(JSON.stringify(nextStakeSelection(selected, 'beast_a01')), '[]', 'Tapping the selected stake withdraws it');
assert.equal(JSON.stringify(nextStakeSelection([], 'beast_a02')), '["beast_a02"]');
assert.deepEqual(selected, ['beast_a01'], 'Selection helper does not mutate existing state');
assert.match(battlefieldPage, /runOwnedDuel\(stakeCardIds\[0\]/, 'Existing single-card settlement is unchanged');
const compactActions = render(load('components/battlefield/BattlePanel.tsx').BattleActionBar, { match, onAction() { throw new Error('Read-only render'); }, compact: true, cards: interactiveCatalog() });
assert.equal((compactActions.match(/<button\b/g) || []).length, 4, 'Combat starts with four clear commands');
for (const text of ['普通攻擊', '技能', '換卡', '說明']) assert.ok(compactActions.includes(text));
assert.doesNotMatch(compactActions, /aria-label="點戰鬥卡換上場"/, 'Reserve choices open on demand');
const prepSource = fs.readFileSync(path.join(root, 'components/battlefield/BattleArena.tsx'), 'utf8');
assert.ok(prepSource.indexOf('<HandZone') < prepSource.indexOf('<div ref={placement}'), 'Choose the hand before choosing the destination');
assert.match(prepSource, /requestAnimationFrame/);
assert.match(prepSource, /data-place-active/);
console.log('PASS: single-card selection matches settlement; four commands and separate help preserve game rules');

const ActionBar = load('components/battlefield/BattlePanel.tsx').BattleActionBar;
const { advance } = load('lib/beast-game/interactive.ts');
const opponentDown = structuredClone(match);
opponentDown.opponent.team[opponentDown.opponent.active].hp = 0;
opponentDown.opponent.team[opponentDown.opponent.active].defeated = true;
const replacementHtml = render(ActionBar, { match: opponentDown, compact: true, onAction() {} });
assert.match(replacementHtml, /繼續，對手換卡/);
assert.doesNotMatch(replacementHtml, /普通攻擊|耗氣/);
const replaced = advance(opponentDown, { type: 'ATTACK' });
assert.equal(replaced.round, opponentDown.round, 'Replacement is not a completed combat round');
assert.equal(replaced.player.team[0].hp, opponentDown.player.team[0].hp);
assert.equal(replaced.player.energy, opponentDown.player.energy);
assert.equal(replaced.opponent.active, 1);
assert.equal(replaced.opponent.team[1].hp, opponentDown.opponent.team[1].hp, 'Continue never attacks the replacement');
const playerDown = structuredClone(match);
playerDown.player.team[0].hp = 0; playerDown.player.team[0].defeated = true;
const forcedHtml = render(ActionBar, { match: playerDown, compact: true, onAction() {}, cards: interactiveCatalog() });
assert.match(forcedHtml, /選擇接替主戰的後備/);
assert.doesNotMatch(forcedHtml, /普通攻擊|本回合指令/);
assert.equal((forcedHtml.match(/<button\b/g) || []).length, 1, 'Only the living reserve is actionable');
console.log('PASS: forced replacements are clearly labelled and do not masquerade as ignored attacks');

// Full-size artwork is on demand; battle and hands keep the small portrait assets.
const { combatGuideFor } = load('lib/beast-game/combat-guide.ts');
for (const card of interactiveCatalog()) {
  const guide = combatGuideFor(card.id);
  assert.equal(guide.front, card.front);
  assert.ok(fs.existsSync(path.join(root, 'public', guide.front)), `${card.id}: original artwork exists`);
  const html = render(Guide, { cardId: card.id, onClose() {} });
  assert.match(html, /data-card-showcase/, 'Default view puts the beast illustration first');
  assert.equal((html.match(/<img\b/g) || []).length, 1, 'Inspect one original, not the whole catalog');
  assert.ok(html.includes(`src="${card.front}"`));
  for (const label of ['神獸卡面', '卡片能力', '五元素相剋', '回到操控', '查看效果']) assert.ok(html.includes(label));
}
assert.doesNotMatch(arena, /src="\/beast-game\/front\//, 'Combat keeps lightweight thumbnails');
assert.match(arena, /width="256" height="384"/, 'Images reserve their portrait proportions');
const guideCss = postcss.parse(fs.readFileSync(path.join(root, 'components/battlefield/BattleCardGuide.module.css'), 'utf8'));
for (const [css, selector] of [[arenaCss, '.art img'], [guideCss, '.portrait']]) {
  let fit;
  css.walkRules(selector, rule => rule.walkDecls('object-fit', decl => { fit = decl.value; }));
  assert.equal(fit, 'contain', `${selector}: keep the entire original illustration`);
}
console.log('PASS: all 60 original portraits are available, loaded one at a time, with abilities and return controls retained');
