/**
 * 戰場 → 戰鬥・橋接守門
 * ============================================================================
 *
 * 業主定調〈二十四〉：戰場穩了才加 HP、攻擊、防禦、速度、技能、傷害、勝負。
 *
 * 這支守的是那條界線：橋接層只翻譯，不當裁判。
 * 傷害與勝負已經在 interactive.ts 通過認證（test:beast-game 194 項），
 * 橋接層一旦「順便算一下」就是第二套核心，兩邊遲早給出不同答案。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newBattle, moveCard, draw, BENCH_SIZE, assertOneZone } from '../.beast-game-build/lib/beast-game/battlefield.js';
import { fieldTeam, canStartBattle, startFromField, autoPlaceOpponent } from '../.beast-game-build/lib/beast-game/battle-bridge.js';
import { advance, legalActions, MAX_TEAM } from '../.beast-game-build/lib/beast-game/interactive.js';
import { playableCards } from '../.beast-game-build/lib/beast-game/registry.js';
import { stripComments } from './helpers/strip-comments.mjs';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 用真的卡片 id 開桌——橋接會去 registry 取卡，假 id 測不出真問題。 */
const ids = playableCards().map((card) => card.id);
assert.equal(ids.length, 60, '卡池應為六十張');

const freshBattle = (seed = 5) => {
  const rng = seeded(seed);
  const pick = (n) => {
    const pool = ids.slice();
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  };
  return newBattle(pick(20), pick(20), rng);
};

/* ── 一、主戰一定排第一 ─────────────────────────────────────────── */
{
  let s = freshBattle();
  const first = s.player.hand[0];
  const second = s.player.hand[1];
  s = moveCard(s, 'PLAYER', second, { zone: 'BENCH', slotIndex: 3 });
  s = moveCard(s, 'PLAYER', first, { zone: 'ACTIVE' });

  const team = fieldTeam(s, 'PLAYER');
  assert.equal(team[0], first, '**主戰要排第一**——Match 的 active 索引開場就是 0，順序錯就會顯示 A 打、實際打 B');
  assert.ok(team.includes(second), '後備也要算進隊伍');
  assert.equal(team.length, 2, '場上兩隻就是兩隻');

  // 沒有主戰時只回後備，不會憑空生出一隻。
  const benchOnly = freshBattle();
  const only = benchOnly.player.hand[0];
  const staged = moveCard(benchOnly, 'PLAYER', only, { zone: 'BENCH', slotIndex: 0 });
  assert.deepEqual(fieldTeam(staged, 'PLAYER'), [only], '沒有主戰就只有後備那幾隻');
}

/* ── 二、開戰條件講得出原因，不是只把按鈕變灰 ───────────────────── */
{
  const s = freshBattle();
  const check = canStartBattle(s);
  assert.equal(check.ready, false, '雙方都沒上場時不能開戰');
  assert.ok(check.reason && check.reason.length > 4, '**要講得出為什麼不能開戰**，不是只回 false');

  assert.throws(() => startFromField(s, 1), /主戰|佈陣/, '條件不足就開戰要擋下來');
}

/* ── 三、對手用同一套規則佈陣，沒有特權 ─────────────────────────── */
{
  const placed = autoPlaceOpponent(freshBattle(), seeded(11));
  assert.ok(placed.opponent.active, '對手要先有主戰');
  assert.equal(placed.opponent.bench.length, BENCH_SIZE, '對手後備格數與玩家相同');
  assert.doesNotThrow(() => assertOneZone(placed), '對手也受一卡一區的不變式約束');

  // 對手不得動到玩家那一側。
  const before = freshBattle();
  const after = autoPlaceOpponent(before, seeded(11));
  assert.deepEqual(after.player, before.player, '**對手佈陣不得改到玩家的任何東西**');

  const source = fs.readFileSync('lib/beast-game/battle-bridge.ts', 'utf8');
  assert.ok(
    source.includes('legalDestinations') && source.includes('moveCard'),
    '對手佈陣必須走玩家同一套函式，不得另寫一條捷徑',
  );
}

/* ── 四、開戰之後的隊伍就是場上那幾隻 ───────────────────────────── */
{
  let s = freshBattle(9);
  s = autoPlaceOpponent(s, seeded(9));
  const mine = s.player.hand[0];
  s = moveCard(s, 'PLAYER', mine, { zone: 'ACTIVE' });
  s = moveCard(s, 'PLAYER', s.player.hand[0], { zone: 'BENCH', slotIndex: 0 });

  const match = startFromField(s, 12345);
  assert.deepEqual(
    match.player.team.map((f) => f.cardId),
    fieldTeam(s, 'PLAYER'),
    '戰鬥隊伍必須逐張等於場上那幾隻',
  );
  assert.deepEqual(
    match.opponent.team.map((f) => f.cardId),
    fieldTeam(s, 'OPPONENT'),
    '對手同理',
  );
  assert.equal(match.player.active, 0, '開場出戰的是主戰那一隻');
  assert.ok(match.player.team.length <= MAX_TEAM, `隊伍不得超過 ${MAX_TEAM} 隻`);

  // 同一顆種子要打出同一場，否則重播與回報都查不了。
  const again = startFromField(s, 12345);
  assert.deepEqual(
    advance(match, { type: 'ATTACK' }).player.team.map((f) => f.hp),
    advance(again, { type: 'ATTACK' }).player.team.map((f) => f.hp),
    '同種子同動作要得到同結果',
  );
}

/* ── 五、隊伍一到六隻都打得起來（原本寫死三張） ─────────────────── */
{
  for (const size of [1, 2, 3, 6]) {
    let s = freshBattle(20 + size);
    s = autoPlaceOpponent(s, seeded(20 + size));
    s = moveCard(s, 'PLAYER', s.player.hand[0], { zone: 'ACTIVE' });
    for (let i = 0; i < size - 1; i += 1) {
      // 起始手牌只有五張，要擺滿主戰＋五後備就得先補抽。
      if (!s.player.hand.length) s = draw(s, 'PLAYER');
      if (!s.player.hand.length) break;
      s = moveCard(s, 'PLAYER', s.player.hand[0], { zone: 'BENCH', slotIndex: i });
    }
    const match = startFromField(s, 777);
    assert.equal(match.player.team.length, size, `${size} 隻要開得起來`);
    assert.ok(legalActions(match, 'player').length > 0, `${size} 隻時要有可執行的動作`);
  }
}

/* ── 六、橋接層不當裁判 ─────────────────────────────────────────── */
{
  // 掃的是程式碼，不是註解——說明「為什麼不用 Math.random」的那句話裡就有它。
  const source = stripComments(fs.readFileSync('lib/beast-game/battle-bridge.ts', 'utf8'));
  for (const forbidden of ['Math.random', 'hp -', 'damage', 'winner =']) {
    assert.ok(
      !source.includes(forbidden),
      `橋接層只翻譯不算數值，不得出現 ${forbidden}`,
    );
  }
  assert.ok(source.includes('newMatch'), '開戰要交給 interactive.ts 的 newMatch');
}

/* ── 七、勝負只能來自核心 ───────────────────────────────────────── */
{
  const panel = stripComments(fs.readFileSync('components/battlefield/BattlePanel.tsx', 'utf8'));
  assert.ok(panel.includes('match.winner'), '結果要讀 match.winner');
  for (const forbidden of ['Math.random', 'calculateDamage', 'hp <= 0', 'hp === 0']) {
    assert.ok(!panel.includes(forbidden), `畫面不得自己判斷勝負或算傷害：${forbidden}`);
  }
  assert.ok(panel.includes('legalActions'), '可出的招要問 legalActions，畫面不自己判斷');

  const page = stripComments(fs.readFileSync('app/beast-game/battlefield/page.tsx', 'utf8'));
  assert.ok(page.includes('advance('), '出招要交給 advance()');
  assert.ok(!page.includes('Math.random'), '頁面不得用 Math.random——種子才可重播');
}

console.log('PASS: 主戰排第一、場上就是隊伍');
console.log('PASS: 開戰條件講得出原因，條件不足擋得下來');
console.log('PASS: 對手同一套佈陣規則，不得動到玩家那一側');
console.log('PASS: 一到六隻都打得起來，同種子同結果');
console.log('PASS: 橋接層只翻譯不當裁判，勝負只來自核心');
