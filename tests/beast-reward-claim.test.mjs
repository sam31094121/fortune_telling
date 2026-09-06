/**
 * 完成使命 → 獎項格子 → 親手領取
 * ============================================================================
 *
 * 業主定調：「只要完成任務，就送一張卡片當獎勵。只要有使命未完成的，
 * 去把它完成，就會有獎勵跑出來，會顯示在獎項的格子裡。
 * 客戶要去把它收集起來，才算是真正的收藏的過程，有儀式感。」
 *
 * 所以這支守的是那個「中間狀態」：
 * 獎勵先躺在格子裡，**不算收藏**；領了才算。
 * 少了這一步，卡片會悄悄多一張——收藏的重量來自親手拿到，
 * 不是來自數字變大。
 */

import assert from 'node:assert/strict';
import { offerReward, claimReward, unclaimedRewardCount } from '../.beast-game-build/lib/beast-collection-ledger.js';

const base = { cards: [], history: [] };
const at = '2026-09-06T00:00:00.000Z';
const reward = { id: 'quest:eight-gates', cardId: 'beast_y01', reason: '完成八關探索' };

/* ── 一、發獎不等於入袋 ─────────────────────────────────────────── */
{
  const offered = offerReward(base, reward, at);
  assert.equal(unclaimedRewardCount(offered), 1, '獎勵要出現在格子裡');
  assert.equal(offered.cards.length, 0, '**還沒領，就不算收藏**——這一步不能省');
  assert.equal(offered.rewards[0].reason, '完成八關探索', '格子上要說得出為什麼給你');
}

/* ── 二、領了才進收藏 ───────────────────────────────────────────── */
{
  const offered = offerReward(base, reward, at);
  const { collection, claimed } = claimReward(offered, reward.id, at);
  assert.equal(claimed.cardId, 'beast_y01', '回傳領到什麼，畫面才演得出儀式');
  assert.equal(unclaimedRewardCount(collection), 0, '領完格子要空出來');
  assert.equal(collection.cards.length, 1, '收藏多一張');
  assert.equal(collection.cards[0].cardId, 'beast_y01');
  assert.equal(collection.cards[0].source, 'GROWTH');
}

/* ── 三、不得重複發、不得重複領 ─────────────────────────────────── */
{
  let state = offerReward(base, reward, at);
  state = offerReward(state, reward, at);
  assert.equal(unclaimedRewardCount(state), 1, '同一份使命回報兩次，不得變成兩份獎勵');

  const { collection } = claimReward(state, reward.id, at);
  assert.throws(
    () => claimReward(collection, reward.id, at),
    /已經領過/,
    '領第二次要擋下來，而且要講得出原因——靜靜忽略會讓「我明明按了」無從查起',
  );

  // 領過之後就算使命再回報一次，也不會又冒出一份。
  const again = offerReward(collection, reward, at);
  assert.equal(unclaimedRewardCount(again), 0, '領過的獎勵不得再發一次');
}

/* ── 四、壞資料擋在門口 ─────────────────────────────────────────── */
{
  assert.throws(() => offerReward(base, { ...reward, cardId: 'beast_zz99' }, at), /不存在/, '不存在的卡不得當獎勵');
  assert.throws(() => offerReward(base, { ...reward, id: '' }, at), /識別碼/, '沒有識別碼就擋不住重複發放');
}

/* ── 五、多份獎勵各自獨立 ───────────────────────────────────────── */
{
  let state = offerReward(base, reward, at);
  state = offerReward(state, { id: 'quest:daily-4', cardId: 'beast_y04', reason: '累計四次每日任務' }, at);
  assert.equal(unclaimedRewardCount(state), 2, '兩份使命兩份獎勵');

  const { collection } = claimReward(state, 'quest:daily-4', at);
  assert.equal(unclaimedRewardCount(collection), 1, '領一份不會把另一份也帶走');
  assert.equal(collection.cards[0].cardId, 'beast_y04', '領到的是指定的那一份');
}

console.log('PASS: 發獎不等於入袋，領了才算收藏');
console.log('PASS: 不得重複發、不得重複領');
console.log('PASS: 壞資料擋在門口，多份獎勵各自獨立');
