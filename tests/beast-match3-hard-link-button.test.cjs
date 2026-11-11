// 困難模式連結攻擊按鈕＋第 8 關護衛死亡特效＋短視窗高度擬合（2026-11-10）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync('components/battlefield/Match3Board.tsx', 'utf8');
const css = fs.readFileSync('components/battlefield/Match3Board.module.css', 'utf8');
const host = fs.readFileSync('components/battlefield/asura-death/AsuraDeathHost.tsx', 'utf8');

// 1) 連結攻擊列：困難模式常駐（不再只在「玩法與操作」打開時出現），非困難模式維持原本位置。
assert(!/help && actions\}/.test(source), 'hard link bar must not depend on help panel');
const treasuresAt = source.indexOf('<OrbTreasures catalog=');
const rigActionsAt = source.indexOf('{rigEnabled && !mobileActionless && actions}');
assert(rigActionsAt > treasuresAt && treasuresAt > 0, 'hard actions JSX still sits right after the treasure row, but stays unmounted');
assert.equal(source.split('{rigEnabled && !mobileActionless && actions}').length - 1, 1, 'hard bar unmounts when actionless');
assert.equal(source.split('{!rigEnabled && !mobileActionless && actions}').length - 1, 1, 'other modes also unmount the bar when actionless');
assert(source.includes('const mobileActionless = true'), 'action bar is unmounted at every width, including 1280');
assert(!source.includes('MOBILE_ACTIONS_MQ'), '640px toolbar breakpoint is gone');
assert(source.includes("fireLinkWithRef.current(ids, 'auto')"), 'auto-launches link attack via fireLinkWith');
assert(source.includes('data-testid="match3-link-launch"'), 'Bot_APP hook match3-link-launch records auto/tap/button');
assert(source.includes('autoLinkArmed.current = false'), 'auto-launch fires once per ready window and will not immediately refire leftover energy');
assert(source.includes("fireLinkWithRef.current(next, 'tap')"), 'tapping two eligible cards launches a link attack');
assert(source.includes("requestCardAttack('link'"), 'auto-launch reuses the same server-side link path');
assert(/deathHold\.size > 0 \|\| deathPending\.size > 0/.test(source), 'auto-launch waits out deathHold/KO');
assert(source.includes('counterFoes.size > 0'), 'auto-launch does not fire on the enemy turn');
assert(source.includes("!(e.target as HTMLElement).closest('[data-r]')"), 'tap empty board clears a pending link');
assert(source.includes('if (link.includes(u.id))'), 'retap a selected card clears it from the link');

// 2) 實際渲染 actions JSX：困難／非困難 × 開／關
const start = source.indexOf('  const actions = (');
const end = source.indexOf('\n  );', start) + 5;
const jsx = source.slice(start, end);
const js = ts.transpileModule(jsx + '\nglobalThis.out = actions;', { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
function render(over) {
  const ctx = { React, styles: { actionBar: 'actionBar', on: 'on', pulse: 'pulse', fire: 'fire' }, linkMode: false, pulse: false, link: [], problem: 'tooFew', over: null, fireSub: 'sub', rigEnabled: true, LINK_MIN_CARDS: 2, LINK_ENERGY_COST: 50,
    setLinkMode: () => {}, setLink: () => {}, setLog: () => {}, setPulse: () => {}, later: () => {}, fireLink: () => {}, ...over };
  vm.runInNewContext(js, ctx); return renderToStaticMarkup(ctx.out);
}
let html = render({});
assert.match(html, /data-testid="match3-link-mode"/); assert.match(html, /data-testid="match3-link-fire"/);
assert.match(html, /aria-pressed="false"/); assert.match(html, /點滿能量卡＝能量技/);
html = render({ linkMode: true, link: ['a'] });
assert.match(html, /aria-pressed="true"/); assert.match(html, /連線模式：開/); assert.match(html, /點卡＝加入連線/);
html = render({ rigEnabled: false });
assert(!/match3-link-mode-hint/.test(html), 'non-hard modes keep their original button text');

// 3) 連線模式開時點卡＝加入連線、不發能量技；關時維持原本（滿能量直接發能量技）
assert(/const energyReady = rigEnabled && full && !busy && !over && !linkMode/.test(source), 'energy-ready state disabled during link mode');
const tapBody = source.slice(source.indexOf('  const tapAlly ='), source.indexOf('  // Stored-energy attacks'));
const tapJs = ts.transpileModule(tapBody + '\n globalThis.tap = tapAlly;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function tap(over) { const calls = []; const unit = { id: 'u1', element: 'AIR', hp: 100, energy: 100, name: 'x', ...((over && over.unit) || {}) };
  const ctx = { rigEnabled: true, over: null, busy: false, linkMode: false, link: [], mobileActionless: false, team: [unit], chosen: {}, ENERGY_MAX: 100, LINK_ENERGY_COST: 50, LINK_MIN_CARDS: 2, MATCH3_ORB_LABEL: { AIR: '風' }, fighterCanAct: () => true,
    unleash: u => calls.push('energy:' + u.id), setLink: v => calls.push('link:' + v.join('+')), setLinkMode: () => {}, setLog: () => {}, setChosen: () => calls.push('lead'), chooseLead: () => ({}), fireLinkWithRef: { current: (ids, source) => calls.push('fire:' + source + ':' + ids.join('+')) }, ...over };
  vm.runInNewContext(tapJs, ctx); ctx.tap(unit); return calls; }
assert.deepEqual(tap({}), ['energy:u1']);
assert.deepEqual(tap({ linkMode: true }), ['link:u1']);
assert.deepEqual(tap({ linkMode: true, link: ['u1'] }), ['link:']);
assert.deepEqual(tap({ mobileActionless: true }), ['energy:u1'], 'actionless: a lone full-energy tap still fires the energy skill');
assert.deepEqual(tap({ mobileActionless: true, unit: { energy: 50 } }), ['link:u1'], 'actionless: first >=50-energy tap arms a silent link');
assert.deepEqual(tap({ mobileActionless: true, link: ['u2'] }), ['link:u2+u1', 'fire:tap:u2+u1'], 'actionless: second eligible tap launches the link attack');

// 4) 連結攻擊擊倒走伺服端擊倒事件（死亡動畫）
assert(/queueKnockouts\(foes, damaged, actionId, 'server-link'/.test(source));

// 5) 第 8 關：魔王全身圖只給第 5 格，護衛死亡特效的 src 不得被換掉
const dsLine = source.split('\n').find(l => l.includes('const deathSrc ='));
const dsJs = ts.transpileModule(dsLine + '\nglobalThis.ds = deathSrc;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const foes = [0, 1, 2, 3, 4].map(i => ({ id: 'f' + i, thumbnail: 't' + i, hp: i === 4 ? 500 : 0 }));
const dctx = { foes, rigEnabled: true, guardianDuel: true, duelArt: 'boss-full.webp' }; vm.runInNewContext(dsJs, dctx);
for (let i = 0; i < 4; i++) assert.equal(dctx.ds('f' + i), 't' + i, `escort ${i} keeps its own art during guardian duel`);
assert.equal(dctx.ds('f4'), 'boss-full.webp');
// 只有第 5 隻對手（i === 4）才用守護獸對決卡圖。接受兩種寫法：行內 <Match3TargetArt src=…>（舊），
// 或交給 FoeBattleArt 元件的 rigSrc=…（對手卡圖加備援後的新寫法）；兩種都必須帶 i === 4 條件，意圖不變。
assert(
  source.includes('<Match3TargetArt src={guardianDuel && duelArt && i === 4 ? duelArt : f.thumbnail} />')
  || source.includes('rigSrc={guardianDuel && duelArt && i === 4 ? duelArt : f.thumbnail}'),
  'target art must keep the i === 4 guard (only the 5th foe uses the guardian duel art)'
);
assert(!source.includes('rigSrc={guardianDuel && duelArt ? duelArt'), 'the guard must not regress to applying duel art to every foe');
assert(/lockedFor: ev\?\.id, src: lockedSrc/.test(host) && /src=\{ev \? \(a\.src \?\? srcOf\?\.\(t\.foeId\)\) : srcOf\?\.\(t\.foeId\)\}/.test(host), 'playing regular fx locks its src');

// 6) 短視窗（1280×720/800）也做高度擬合，敵方列與棋盤不會捲出畫面
assert(source.includes("window.matchMedia('(max-width: 900px), (max-height: 960px)').matches"));
assert(/\.wrap\[data-mode\^="hard"\] \.actionBar \{ margin: 4px 0 0;/.test(css));
assert(/^\.actionBar \{ display: none; /m.test(css) || css.includes('.actionBar { display: none; }'), 'CSS hides the action bar at every width before hydrate');
assert(!css.includes('row-gap: calc(var(--orb-gap, 4px) + 7px)'), 'must not widen row-gap; freed height goes to square orb size via --compact-board-width');
assert(source.includes('holdAutoLink'), 'm3debug hook can hold auto-link so a manual two-card tap can be verified');
assert(source.includes("get('m3autolink') === '0'"), 'm3debug + m3autolink=0 also holds auto-link; production URLs without m3debug are unchanged');
assert(source.includes('if (autoLinkHold.current) return'), 'auto-launch respects the test-only hold');
assert(source.includes('bossFxHold'), 'duel layout and .foeArt hold through boss-death-fx done');
console.log('PASS hard link bar unmounted at all widths, auto-link, tap precedence, stage-8 escort fx src stable, short-viewport height fit');
