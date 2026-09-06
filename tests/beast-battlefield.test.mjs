/**
 * 神獸戰場 V1・守門測試
 * ============================================================================
 *
 * 對應業主〈二十三、第一階段驗收〉。這一版不驗戰鬥平衡，只驗桌面：
 * 卡在哪裡、能不能放、放完狀態對不對。
 *
 * 這支跑的是 TypeScript 原始碼經過 tsconfig.beast-game 編譯後的產物，
 * 與正式程式同一份——不另外抄一份邏輯來測，那等於測自己抄得對不對。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripComments } from './helpers/strip-comments.mjs';
import {
  BENCH_SIZE,
  OPENING_HAND,
  newBattle,
  draw,
  zoneOf,
  legalDestinations,
  canMove,
  moveCard,
  selectCard,
  assertOneZone,
  shuffle,
  isFaceDown,
  flipUp,
  redactFor,
  HIDDEN_CARD,
} from '../.beast-game-build/lib/beast-game/battlefield.js';

/** 固定種子的 rng，測試才可重現。 */
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

const deckA = Array.from({ length: 20 }, (_, i) => `a${String(i).padStart(2, '0')}`);
const deckB = Array.from({ length: 20 }, (_, i) => `b${String(i).padStart(2, '0')}`);
const fresh = () => newBattle(deckA, deckB, seeded(7));

/* ── 一、開局 ─────────────────────────────────────────────────────── */
{
  const s = fresh();
  assert.equal(s.player.hand.length, OPENING_HAND, '起始手牌張數');
  assert.equal(s.opponent.hand.length, OPENING_HAND, '對手也要抽起始手牌');
  assert.equal(s.player.deck.length, deckA.length - OPENING_HAND, '抽掉的要從牌庫扣掉');
  assert.equal(s.player.bench.length, BENCH_SIZE, '後備固定五格');
  assert.ok(s.player.bench.every((slot) => slot === null), '開局後備是空的');
  assert.equal(s.player.active, null, '開局沒有主戰神獸');
  assert.equal(s.phase, 'PREPARE', '開局是佈陣階段，還沒進戰鬥');

  // 洗牌要是同一副牌，只是順序不同——不能多也不能少。
  assert.deepEqual([...s.player.deck, ...s.player.hand].sort(), [...deckA].sort(), '洗牌不得增減卡片');
}

/* ── 二、一張卡只能存在一個位置（業主第九條） ───────────────────── */
{
  let s = fresh();
  const card = s.player.hand[0];

  s = moveCard(s, 'PLAYER', card, { zone: 'BENCH', slotIndex: 2 });
  assert.equal(zoneOf(s, 'PLAYER', card), 'BENCH', '放進後備之後應在後備');
  assert.ok(!s.player.hand.includes(card), '**放上場就不能還留在手牌**');
  assert.equal(s.player.bench[2], card, '要放在指定的那一格，不是隨便一格');

  s = moveCard(s, 'PLAYER', card, { zone: 'ACTIVE' });
  assert.equal(s.player.active, card, '換上主戰');
  assert.equal(s.player.bench[2], null, '原本那一格要空出來');

  assert.doesNotThrow(() => assertOneZone(s), '不變式應成立');
}

/* ── 三、不變式真的會擋（不是印警告） ───────────────────────────── */
{
  const s = fresh();
  const card = s.player.hand[0];
  // 手動製造「同一張卡在兩個位置」，確認不變式抓得到。
  const broken = JSON.parse(JSON.stringify(s));
  broken.player.active = card; // 手牌裡還留著同一張
  assert.throws(
    () => assertOneZone(broken),
    /同時出現在 2 個位置/,
    '同一張卡在兩個位置必須丟例外，不能靜靜放行',
  );

  const shortBench = JSON.parse(JSON.stringify(s));
  shortBench.player.bench = [null, null];
  assert.throws(() => assertOneZone(shortBench), /後備格數/, '後備格數不對要擋');
}

/* ── 四、合法位置只有一份（UI 不得自己判斷） ────────────────────── */
{
  let s = fresh();
  const card = s.player.hand[0];

  // 手牌：主戰空著 → 可上主戰，也可放五個空後備格。
  let dests = legalDestinations(s, 'PLAYER', card);
  assert.ok(dests.some((d) => d.zone === 'ACTIVE'), '主戰空著時手牌可以直接上場');
  assert.equal(dests.filter((d) => d.zone === 'BENCH').length, BENCH_SIZE, '五個空格都合法');

  // 主戰佔用後，另一張手牌就不能直接上主戰了。
  s = moveCard(s, 'PLAYER', card, { zone: 'ACTIVE' });
  const other = s.player.hand[0];
  dests = legalDestinations(s, 'PLAYER', other);
  assert.ok(!dests.some((d) => d.zone === 'ACTIVE'), '主戰有神獸時，手牌不能直接蓋上去');
  assert.equal(canMove(s, 'PLAYER', other, { zone: 'ACTIVE' }), false, 'canMove 要與清單一致');

  // 牌庫裡的卡不能被拿來放——它還沒抽到手上。
  const inDeck = s.player.deck[0];
  assert.equal(legalDestinations(s, 'PLAYER', inDeck).length, 0, '牌庫的卡不得直接上場');
  assert.throws(
    () => moveCard(s, 'PLAYER', inDeck, { zone: 'ACTIVE' }),
    /不能放到那裡/,
    '非法移動要丟例外，不是靜靜不動',
  );
}

/* ── 五、主戰／後備交換 ─────────────────────────────────────────── */
{
  let s = fresh();
  const first = s.player.hand[0];
  s = moveCard(s, 'PLAYER', first, { zone: 'ACTIVE' });
  const second = s.player.hand[0];
  s = moveCard(s, 'PLAYER', second, { zone: 'BENCH', slotIndex: 0 });

  // 後備換上主戰＝互換，不是把原本那隻擠掉。
  s = moveCard(s, 'PLAYER', second, { zone: 'ACTIVE' });
  assert.equal(s.player.active, second, '後備的換上來');
  assert.equal(s.player.bench[0], first, '**原本的主戰退回它空出來的那一格，不是消失**');
  assert.doesNotThrow(() => assertOneZone(s));

  // 後備全滿時，主戰換不下來——這是規則，不是缺陷。
  let full = fresh();
  const hand = [...full.player.hand];
  full = moveCard(full, 'PLAYER', hand[0], { zone: 'ACTIVE' });
  for (let i = 0; i < BENCH_SIZE; i += 1) {
    full = moveCard(full, 'PLAYER', full.player.hand[0], { zone: 'BENCH', slotIndex: i });
    if (full.player.hand.length === 0) full = draw(full, 'PLAYER');
  }
  assert.equal(
    legalDestinations(full, 'PLAYER', full.player.active).length,
    0,
    '後備滿了，主戰就換不下來',
  );
}

/* ── 六、雙方完全分離 ───────────────────────────────────────────── */
{
  let s = fresh();
  const mine = s.player.hand[0];
  s = moveCard(s, 'PLAYER', mine, { zone: 'ACTIVE' });
  assert.equal(s.opponent.active, null, '動我的卡不得影響對手場上');
  assert.equal(zoneOf(s, 'OPPONENT', mine), null, '我的卡不會出現在對手那一側');

  const theirs = s.opponent.hand[0];
  assert.equal(zoneOf(s, 'PLAYER', theirs), null, '對手的卡不會出現在我這一側');
}

/* ── 七、選取是狀態，不是畫面自己記 ─────────────────────────────── */
{
  let s = fresh();
  const card = s.player.hand[0];
  s = selectCard(s, card);
  assert.equal(s.selectedCardId, card, '點一下選取');
  s = selectCard(s, card);
  assert.equal(s.selectedCardId, null, '再點一下取消');

  s = selectCard(s, card);
  s = moveCard(s, 'PLAYER', card, { zone: 'BENCH', slotIndex: 1 });
  assert.equal(s.selectedCardId, null, '放完要自動取消選取，不然會誤觸下一次');
}

/* ── 八、不可變：舊狀態不得被改到 ───────────────────────────────── */
{
  const before = fresh();
  const snapshot = JSON.stringify(before);
  const card = before.player.hand[0];
  moveCard(before, 'PLAYER', card, { zone: 'ACTIVE' });
  assert.equal(JSON.stringify(before), snapshot, '移動要回新狀態，不得就地改舊的');
}

/* ── 九、洗牌可重現 ─────────────────────────────────────────────── */
{
  const a = shuffle(deckA, seeded(42));
  const b = shuffle(deckA, seeded(42));
  assert.deepEqual(a, b, '同一顆種子要洗出同一副牌，否則重播與回報都查不了');
  const c = shuffle(deckA, seeded(43));
  assert.notDeepEqual(a, c, '不同種子要洗出不同順序');
}

/* ── 九之二、蓋牌（業主定調的差異化功能） ───────────────────────── */
{
  let s = fresh();
  const card = s.player.hand[0];

  // 蓋著進場：位置照舊，只是背面朝上。
  s = moveCard(s, 'PLAYER', card, { zone: 'BENCH', slotIndex: 0 }, { faceDown: true });
  assert.equal(s.player.bench[0], card, '蓋著也是實際佔一格');
  assert.ok(isFaceDown(s, 'PLAYER', card), '應該是蓋著的');
  assert.doesNotThrow(() => assertOneZone(s), '蓋牌不得破壞一卡一區');

  // 翻牌顯形。
  s = flipUp(s, 'PLAYER', card);
  assert.ok(!isFaceDown(s, 'PLAYER', card), '翻過就不是蓋著了');
  assert.equal(s.player.bench[0], card, '翻牌不會讓它換位置');
  assert.throws(() => flipUp(s, 'PLAYER', card), /本來就是正面/, '翻一張正面的卡要擋下來——那是呼叫端的錯');

  // 離場自動清掉標記：一張進了棄牌堆還標成蓋著，之後說不清翻過沒有。
  let leaving = fresh();
  const gone = leaving.player.hand[0];
  leaving = moveCard(leaving, 'PLAYER', gone, { zone: 'ACTIVE' }, { faceDown: true });
  assert.ok(isFaceDown(leaving, 'PLAYER', gone), '蓋著上主戰');
  leaving = moveCard(leaving, 'PLAYER', gone, { zone: 'BENCH', slotIndex: 4 });
  assert.ok(!isFaceDown(leaving, 'PLAYER', gone), '再移動時沒指定蓋牌，就該翻回正面');

  assert.throws(
    () => moveCard(fresh(), 'PLAYER', fresh().player.hand[0], { zone: 'DISCARD' }, { faceDown: true }),
    /棄牌堆沒有蓋牌/,
    '棄牌不能蓋著',
  );

  // 不變式：標記留在不在場的卡上要炸。
  const broken = JSON.parse(JSON.stringify(fresh()));
  broken.player.faceDown = ['不在場的卡'];
  assert.throws(() => assertOneZone(broken), /卻不在場上/, '蓋牌標記必須指向場上的卡');
}

/* ── 九之三、對手蓋的牌不該被看見 ───────────────────────────────── */
{
  let s = fresh();
  const secret = s.opponent.hand[0];
  s = moveCard(s, 'OPPONENT', secret, { zone: 'ACTIVE' }, { faceDown: true });

  const view = redactFor(s, 'PLAYER');
  assert.equal(view.opponent.active, HIDDEN_CARD, '**對手蓋著的主戰不得回傳真實卡片 id**');
  assert.ok(!JSON.stringify(view.opponent).includes(secret), '整個對手區塊都不該出現那張卡的 id');
  assert.ok(view.opponent.hand.every((id) => id === HIDDEN_CARD), '對手手牌只留張數，不留內容');
  assert.equal(view.opponent.hand.length, s.opponent.hand.length, '張數要保留，客戶要看得到對手有幾張');
  assert.ok(view.opponent.deck.every((id) => id === HIDDEN_CARD), '對手牌庫同理');

  // 我自己的東西不得被遮。
  assert.deepEqual(view.player, s.player, '遮蔽只作用在對手那一側');

  // 沒蓋的照常看得見——遮蔽不是把整個對手區塗黑。
  let open = fresh();
  const shown = open.opponent.hand[0];
  open = moveCard(open, 'OPPONENT', shown, { zone: 'ACTIVE' });
  assert.equal(redactFor(open, 'PLAYER').opponent.active, shown, '沒蓋的卡照常顯示');
}

/* ── 十、規則不得寫死在畫面（業主第十八條） ─────────────────────── */
{
  /*
    要掃的是程式碼，不是註解。

    第一版直接對整份檔案做字串比對，結果被自己的註解絆倒——
    「收一個 rng 而不是自己呼叫 Math.random」這句話裡有 Math.random，
    測試就報錯了。抓到的不是違規，是自己的說明文字。
    所以先把註解剝掉再掃。
  */
  const engine = stripComments(fs.readFileSync('lib/beast-game/battlefield.ts', 'utf8'));
  for (const forbidden of ['Math.random', 'document', 'window']) {
    assert.ok(
      !engine.includes(forbidden),
      `規則引擎不得碰 ${forbidden}——它要能在伺服器與測試裡跑`,
    );
  }
  // 戰鬥數值不在這裡算。CLAUDE.md：不得建立第二套遊戲核心。
  for (const forbidden of ['calculateDamage', 'computeDamage', 'checkVictory']) {
    assert.ok(
      !engine.includes(forbidden),
      `傷害與勝負在 interactive.ts／battle.ts，戰場層不得自己再算一套：${forbidden}`,
    );
  }
}

console.log('PASS: 開局、洗牌可重現、起始手牌');
console.log('PASS: 一張卡只能存在一個位置，違反會丟例外');
console.log('PASS: 合法位置只有一份，非法移動擋得下來');
console.log('PASS: 主戰／後備互換、後備滿了換不下來');
console.log('PASS: 雙方完全分離、選取是狀態、舊狀態不可變');
console.log('PASS: 蓋牌進場、翻牌顯形、離場自動翻回正面');
console.log('PASS: 對手蓋著的牌不回傳真實 id，張數照留');
console.log('PASS: 戰場層不重算傷害與勝負');
