/**
 * 後端運算、前端只顯示（2026-09-15 業主定調）
 * ============================================================================
 *
 * 「後端運算檔案負責技能、易經後端運算，再送給前端；
 *   易經前端不負責運算，前端只負責顯示易經。」
 *
 * 這支測試把那句話變成會紅的斷言：網頁端元件一行戰鬥運算都不准有。
 * 第一階段：困難戰場戰鬥與押注結算搬到後端；第二階段：可出招與暴怒判斷由後端 battleViewFor 送來。
 * 第三階段：3A 開局發牌與易經佈陣搬到後端（牌桌票）；3B 相剋與戰力分析由後端手冊與戰況判斷送來。
 * 掃描不看 'use client' 標記——被網頁端元件引用的元件一樣在瀏覽器執行。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`PASS: ${name}`); };
const read = (file) => fs.readFileSync(file, 'utf8');
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .map((line) => line.replace(/(^|[^:'"`\\])\/\/.*$/, '$1'))
  .join('\n');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full.split(path.sep).join('/'));
  }
  return out;
}
const isClient = (source) => /^\s*['"]use client['"]/.test(source);

const COMPUTE = ['advance', 'chooseAI', 'newMatch', 'startFromField', 'judgeVictorySkill', 'resolveStake', 'stakeRewardCount', 'distributeRewardCards', 'bossNotice', 'playSeries', 'chooseSeriesOpponent', 'judgeSeriesVictorySkill',
  // 第二階段：可出招與暴怒判斷
  'legalActions', 'rageUnavailableReason', 'rageMaterialFor', 'rageFusionGuide', 'battleViewFor',
  // 第三階段 3A：開局發牌、洗牌、易經自動佈陣
  'newBattle', 'autoPlaceOpponent', 'buildUniqueDeck', 'buildFreshOpeningDeck',
  // 第三階段 3B：相剋與戰力分析
  'combatGuideFor', 'describeMatchup', 'explainOutcome', 'elementPercent', 'elementGuideRows', 'elementMultiplier', 'describeCardElement', 'buildGuideBook', 'liveGuidesFor'];

check('網頁端元件不得呼叫任何戰鬥、易經、押注運算函式', () => {
  const offenders = [];
  for (const file of [...walk('components'), ...walk('app/beast-game')]) {
    const source = read(file);
    // 不看 'use client' 標記：被網頁端元件引用的元件一樣在瀏覽器執行（3B 盤點時抓到 BattlePowerAnalysis 漏網）。
    const code = stripComments(source);
    for (const name of COMPUTE) {
      if (new RegExp(`(^|[^\\w.])${name}\\(`, 'm').test(code)) offenders.push(`${file} → ${name}()`);
    }
    if (/battle-session/.test(code)) offenders.push(`${file} → 匯入伺服器專用的戰局票`);
  }
  assert.deepEqual(offenders, [], `前端不得運算：\n${offenders.join('\n')}`);
});

check('困難戰場：開戰與出招都送到後端 API，押注仍走共用的收藏帳本結算', () => {
  const page = stripComments(read('app/beast-game/battlefield/page.tsx'));
  assert.match(page, /\/api\/beast-game\/battlefield/);
  assert.match(page, /type: 'START'/);
  assert.match(page, /type: 'ACTION'/);
  assert.match(page, /type: 'AUTO'/);
  assert.match(page, /runOwnedStakesDuel\(stakeCardIds/);
});

check('困難戰場後端：易經判斷、勝負、技術判斷、押注獎勵都在 API 算，難度由後端決定', () => {
  const route = stripComments(read('app/api/beast-game/battlefield/route.ts'));
  for (const name of ['advance(', 'chooseAI(', 'newMatch(', 'judgeVictorySkill(', 'stakeRewardCount(', 'resolveStake(', 'bossNotice(', 'legalActions(', 'signBattleSession(', 'openBattleSession(']) {
    assert.ok(route.includes(name), `後端要負責 ${name}`);
  }
  assert.match(route, /difficulty: stakeCount > 0 \? 'HARD' : 'EASY'/, '難度由後端依押注決定，不採信前端');
});

check('自動連擊：下一招由後端決定（困難 AUTO、簡單 AUTO_STEP），自動連擊條不自己判斷', () => {
  const pace = stripComments(read('components/battlefield/BattlePace.tsx'));
  assert.ok(!/chooseAI|legalActions/.test(pace), '自動連擊條不得自己判斷出什麼招');
  const turns = stripComments(read('app/api/beast-game/turns/route.ts'));
  assert.match(turns, /case 'AUTO_STEP'/);
  assert.match(turns, /advance\(a\.match,chooseAI\(a\.match,'player'\)\)/);
  assert.match(stripComments(read('components/BeastTurnGame.tsx')), /send\('AUTO_STEP'\)/);
});

check('戰局票：竄改、偽造、過期一律拒收；原票可接續', () => {
  const { signBattleSession, openBattleSession, BATTLE_SESSION_MAX_AGE_MS } = require('../.beast-game-build/lib/beast-game/battle-session');
  const { newMatch, interactiveCatalog } = require('../.beast-game-build/lib/beast-game/interactive');
  const ids = interactiveCatalog().map((c) => c.id);
  const session = { v: 1, match: newMatch(ids.slice(0, 3), ids.slice(3, 6), 7, { difficulty: 'HARD' }), stakeCardId: ids[0], stakeCount: 3, issuedAt: Date.now() };
  const token = signBattleSession(session);
  assert.deepEqual(openBattleSession(token), session);
  const [payload, signature] = token.split('.');
  const forged = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  forged.match.opponent.team[0].hp = 1;
  forged.stakeCount = 20;
  assert.equal(openBattleSession(`${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${signature}`), null, '改血量或押注張數必須拒收');
  assert.equal(openBattleSession(`${payload}.not-a-signature`), null);
  assert.equal(openBattleSession('garbage'), null);
  assert.equal(openBattleSession(token, session.issuedAt + BATTLE_SESSION_MAX_AGE_MS + 1), null, '過期必須拒收');
});

check('第二階段：可出招與暴怒判斷由後端 battleViewFor 送來（困難 API、turns API），元件照印', () => {
  assert.match(stripComments(read('app/api/beast-game/battlefield/route.ts')), /view: battleViewFor\(match\)/);
  assert.match(stripComments(read('app/api/beast-game/turns/route.ts')), /view:a\.match\?battleViewFor\(a\.match\):null/);
  for (const file of ['components/battlefield/BattlePanel.tsx', 'components/battlefield/BattleArena.tsx', 'components/BeastTurnGame.tsx', 'app/beast-game/battlefield/page.tsx']) {
    assert.match(read(file), /BattleView/, `${file} 要吃後端送來的 BattleView`);
  }
});

check('第三階段 3A：開局發牌與易經自動佈陣在後端，開戰核對牌桌票（易經陣容不採信前端）', () => {
  const route = stripComments(read('app/api/beast-game/battlefield/route.ts'));
  for (const name of ['newBattle(', 'autoPlaceOpponent(', 'buildUniqueDeck(', 'buildFreshOpeningDeck(', 'signTableTicket(', 'openTableTicket(']) {
    assert.ok(route.includes(name), `後端要負責 ${name}`);
  }
  assert.match(route, /newMatch\(body\.playerTeam, table\.opponentTeam/, '易經陣容一律採用牌桌票裡後端排好的');
  const page = stripComments(read('app/beast-game/battlefield/page.tsx'));
  assert.match(page, /type: 'DEAL'/);
  assert.match(page, /tableToken: tableToken\.current/);
  const { signTableTicket, openTableTicket, openBattleSession } = require('../.beast-game-build/lib/beast-game/battle-session');
  const ticket = { v: 1, kind: 'table', playerCards: ['a', 'b'], opponentTeam: ['x', 'y'], issuedAt: Date.now() };
  const token = signTableTicket(ticket);
  assert.deepEqual(openTableTicket(token), ticket);
  const [payload, signature] = token.split('.');
  const forged = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  forged.opponentTeam = ['weak'];
  assert.equal(openTableTicket(`${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${signature}`), null, '改易經陣容必須拒收');
  assert.equal(openBattleSession(token), null, '牌桌票不能冒充戰局票');
});

check('第三階段 3B：相剋與戰力分析由後端算好（手冊 API＋戰況判斷），元件照印', () => {
  // 演出規劃（planTierPresentation／planFusionPresentation）只決定播哪段動畫與音效，屬前端視覺感官，不列入後端化。
  assert.match(stripComments(read('app/api/beast-game/guide-book/route.ts')), /buildGuideBook\(\)/);
  assert.match(stripComments(read('lib/beast-game/battle-view.ts')), /guides: liveGuidesFor\(match\)/);
  for (const file of ['components/battlefield/BattleArena.tsx', 'components/battlefield/BattleCardGuide.tsx', 'components/battlefield/BattlePowerAnalysis.tsx', 'components/battlefield/BeastCardTile.tsx', 'components/battlefield/ElementMatchupGuide.tsx', 'components/battlefield/MatchupSummary.tsx']) {
    assert.match(read(file), /useGuideBook\(\)/, `${file} 要照印後端相剋戰力手冊`);
  }
  assert.match(read('components/battlefield/BattlePanel.tsx'), /view\?\.guides\.outcome/, '戰果解說照印後端判斷');
  for (const file of ['app/beast-game/battlefield/page.tsx', 'components/BeastTurnGame.tsx']) {
    assert.match(read(file), /<GuideBookProvider value=\{guideBook\}>/, `${file} 外層要載入後端手冊`);
  }
});

console.log(`beast backend-only — PASS ${passed}`);
