/**
 * 押注獎勵守門：輸少贏多——贏得張數不少於押注張數，技術越好越多，最多 100 張。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAX_STAKE_CARDS,
  MAX_REWARD_CARDS,
  stakeRewardCount,
  describeStakeOdds,
} from '../.beast-game-build/lib/beast-game/stake-rules.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`PASS  ${name}`);
};

check('押注上限 20 張、獎勵上限 100 張', () => {
  assert.equal(MAX_STAKE_CARDS, 20);
  assert.equal(MAX_REWARD_CARDS, 100);
});

check('押 20 張險勝拿 20 張；打得漂亮照技術給，最多 100 張', () => {
  assert.equal(stakeRewardCount(20, 1), 20);
  assert.equal(stakeRewardCount(20, 8), 20);
  assert.equal(stakeRewardCount(20, 25), 25);
  assert.equal(stakeRewardCount(20, 55), 55);
  assert.equal(stakeRewardCount(20, 100), 100);
  assert.equal(stakeRewardCount(1, 8), 8);
  assert.equal(stakeRewardCount(5, 250), 100);
});

check('任何押注與技術組合都不會贏得比押得少，也不超過 100', () => {
  for (let staked = 1; staked <= MAX_STAKE_CARDS; staked += 1) {
    for (let bonus = 0; bonus <= 120; bonus += 1) {
      const reward = stakeRewardCount(staked, bonus);
      assert.ok(reward >= staked, `押 ${staked} 技術 ${bonus} 只拿 ${reward}`);
      assert.ok(reward <= MAX_REWARD_CARDS);
    }
  }
});

check('壞資料不會多發也不會少發', () => {
  assert.equal(stakeRewardCount(0, 0), 1);
  assert.equal(stakeRewardCount(Number.NaN, Number.NaN), 1);
  assert.equal(stakeRewardCount(99, 0), MAX_STAKE_CARDS);
});

check('押注前的三句話跟著張數變，講清楚輸多少、至少贏多少、最多多少', () => {
  const odds = describeStakeOdds(20);
  assert.match(odds.lose, /只失去這 20 張/);
  assert.match(odds.win, /至少再得 20 張/);
  assert.match(odds.win, /最多 100 張/);
  assert.match(odds.draw, /退回/);
  assert.match(describeStakeOdds(3).win, /至少再得 3 張/);
});

check('三個結算入口都用同一條公式，收藏帳本也保底', () => {
  for (const file of ['app/api/beast-game/stake-duel/route.ts', 'app/api/beast-game/route.ts', 'app/beast-game/battlefield/page.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /stakeRewardCount\(/, `${file} 必須用 stakeRewardCount`);
    assert.doesNotMatch(source, /gainedCount:\s*(Math\.min\(MAX_REWARD_CARDS,\s*)?judgment\.bonusCards/, `${file} 不得直接拿技術分當獎勵`);
  }
  const ledger = fs.readFileSync('lib/beast-collection-ledger.ts', 'utf8');
  assert.match(ledger, /Math\.max\(entries\.length,outcome\.gainedCount\?\?0\)/, '入庫張數至少等於押注張數');
});

check('畫面與評語不再出現舊規則', () => {
  const files = ['lib/beast-game/iching-judgment.ts', 'lib/beast-game/stake.ts', 'components/battlefield/StakeSlot.tsx', 'components/GrowthStakeSlots.tsx', 'app/beast-game/battlefield/page.tsx'];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /押五贏五|押一贏一|5～20 張|沒收五張|最多 5 張|\/5 張/, `${file} 還有舊規則`);
  }
});

check('規則寫進唯一的技能檔案', () => {
  const doc = fs.readFileSync('docs/beast-game-skill.md', 'utf8');
  assert.ok(doc.includes('押注獎勵：輸少贏多'));
});

console.log(`\n押注獎勵 — PASS ${passed}`);
