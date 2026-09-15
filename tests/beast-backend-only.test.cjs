/**
 * 後端運算、前端只顯示（2026-09-15 業主定調）
 * ============================================================================
 *
 * 「後端運算檔案負責技能、易經後端運算，再送給前端；
 *   易經前端不負責運算，前端只負責顯示易經。」
 *
 * 這支測試把那句話變成會紅的斷言：網頁端元件一行戰鬥運算都不准有。
 * 第一階段：困難戰場戰鬥與押注結算搬到後端；第二階段：可出招與暴怒判斷由後端 battleViewFor 送來。
 * 第三階段待辦（照實列出，不假裝做完）：相剋與戰力分析、開局發牌與易經佈陣仍在網頁端（見最後一項）。
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
  'legalActions', 'rageUnavailableReason', 'rageMaterialFor', 'rageFusionGuide', 'battleViewFor'];

check('網頁端元件不得呼叫任何戰鬥、易經、押注運算函式', () => {
  const offenders = [];
  for (const file of [...walk('components'), ...walk('app/beast-game')]) {
    const source = read(file);
    if (!isClient(source)) continue;
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

check('第三階段待辦照實列出：相剋與戰力分析、開局發牌與易經佈陣仍在網頁端', () => {
  const PHASE3 = ['combatGuideFor', 'describeMatchup', 'explainOutcome', 'elementPercent', 'elementGuideRows', 'elementMultiplier', 'autoPlaceOpponent', 'newBattle', 'planTierPresentation', 'planFusionPresentation'];
  const pending = [];
  for (const file of [...walk('components'), ...walk('app/beast-game')]) {
    const source = read(file);
    if (!isClient(source)) continue;
    const code = stripComments(source);
    const hits = PHASE3.filter((name) => new RegExp(`(^|[^\\w.])${name}\\(`, 'm').test(code));
    if (hits.length) pending.push(`${file}：${hits.join('、')}`);
  }
  console.log(`   第三階段待辦（${pending.length} 個檔案）：\n     ${pending.join('\n     ') || '已全部完成'}`);
  assert.ok(true);
});

console.log(`beast backend-only — PASS ${passed}`);
