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
const rigActionsAt = source.indexOf('{rigEnabled && actions}');
assert(rigActionsAt > treasuresAt && treasuresAt > 0, 'hard link bar renders right after the treasure row');
assert.equal(source.split('{rigEnabled && actions}').length - 1, 1);
assert.equal(source.split('{!rigEnabled && actions}').length - 1, 1, 'other modes keep their action bar');

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
function tap(over) { const calls = []; const unit = { id: 'u1', element: 'AIR', hp: 100, energy: 100, name: 'x' };
  const ctx = { rigEnabled: true, over: null, busy: false, linkMode: false, link: [], team: [unit], chosen: {}, ENERGY_MAX: 100, LINK_ENERGY_COST: 50, LINK_MIN_CARDS: 2, MATCH3_ORB_LABEL: { AIR: '風' }, fighterCanAct: () => true,
    unleash: u => calls.push('energy:' + u.id), setLink: v => calls.push('link:' + v.join('+')), setLog: () => {}, setChosen: () => calls.push('lead'), chooseLead: () => ({}), ...over };
  vm.runInNewContext(tapJs, ctx); ctx.tap(unit); return calls; }
assert.deepEqual(tap({}), ['energy:u1']);
assert.deepEqual(tap({ linkMode: true }), ['link:u1']);
assert.deepEqual(tap({ linkMode: true, link: ['u1'] }), ['link:']);

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
assert(!/\.wrap\[data-mode\^="hard"\] \.actionBar \{[^}]*display:\s*none/.test(css));
console.log('PASS hard link bar visible+flow, link-mode tap precedence, stage-8 escort fx src stable, short-viewport height fit');
