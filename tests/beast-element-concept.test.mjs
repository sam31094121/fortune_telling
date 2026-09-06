/**
 * 遊戲核心概念・相生相剋大於戰鬥力
 * ============================================================================
 *
 * 業主定調：「讓客戶知道、學會相生相剋的概念，而不是戰鬥力有多強就一定贏。」
 *
 * 這支鎖的是那句話的後半：**戰鬥力強不保證贏**。
 * 元素倍率被調成沒有意義的數字時，這裡會報錯——
 * 不是因為數字變了，是因為那樣改之後整個遊戲的立意就沒了。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripComments } from './helpers/strip-comments.mjs';
import { newMatch, advance, chooseAI } from '../.beast-game-build/lib/beast-game/interactive.js';
import { playableCards } from '../.beast-game-build/lib/beast-game/registry.js';
import { elementMultiplier, ELEMENT_COUNTER } from '../.beast-game-build/lib/beast-game/elements.js';

/* ── 一、相剋表沿用五行，不是隨便配的 ───────────────────────────── */
{
  // 空(金)剋風(木)、風(木)剋地(土)、地(土)剋水、水剋火、火剋空(金)
  assert.equal(ELEMENT_COUNTER.SPACE, 'AIR');
  assert.equal(ELEMENT_COUNTER.AIR, 'EARTH');
  assert.equal(ELEMENT_COUNTER.EARTH, 'WATER');
  assert.equal(ELEMENT_COUNTER.WATER, 'FIRE');
  assert.equal(ELEMENT_COUNTER.FIRE, 'SPACE');

  // 五個元素首尾相接成一個環：任一元素都剋一個、也被一個剋。
  const counters = Object.values(ELEMENT_COUNTER);
  assert.equal(new Set(counters).size, 5, '相剋要形成完整的環，不能有人剋不到或沒人剋');

  assert.ok(elementMultiplier('WATER', 'FIRE') > 1, '水剋火要有加成');
  assert.ok(elementMultiplier('FIRE', 'WATER') < 1, '火打水要吃虧');
  assert.equal(elementMultiplier('WATER', 'SPACE'), 1, '沒有相剋關係就是 1，不做多餘調整');
}

/* ── 二、帶剋的低戰力，打得贏被剋的高戰力 ───────────────────────── */
{
  const cards = playableCards();
  const young = cards.filter((card) => /^beast_y/.test(card.id));
  const mature = cards.filter((card) => /^beast_(g_|a)/.test(card.id));
  const group = (list) => {
    const map = {};
    for (const card of list) (map[card.element] = map[card.element] ?? []).push(card.id);
    return map;
  };
  const W = group(young);
  const S = group(mature);

  const play = (a, b, seed) => {
    let state = newMatch(a, b, seed);
    while (state.status === 'PLAYING') {
      state = advance(state, chooseAI(state, 'player'), chooseAI(state, 'opponent'));
    }
    return state.winner;
  };

  let weakWins = 0;
  let total = 0;
  for (const weakElement of Object.keys(W)) {
    for (const strongElement of Object.keys(S)) {
      if (elementMultiplier(weakElement, strongElement) <= 1) continue;
      if (W[weakElement].length < 3 || S[strongElement].length < 3) continue;
      const weakTeam = W[weakElement].slice(0, 3);
      const strongTeam = S[strongElement].slice(0, 3);
      for (let seed = 0; seed < 10; seed += 1) {
        // 鏡像：同一組陣容各當一次先手，先手優勢因此抵銷。
        for (const swap of [false, true]) {
          const winner = play(swap ? strongTeam : weakTeam, swap ? weakTeam : strongTeam, seed);
          total += 1;
          const weakSideWon = swap ? winner === 'opponent' : winner === 'player';
          if (weakSideWon) weakWins += 1;
        }
      }
    }
  }

  assert.ok(total > 0, '要有可比的對局');
  const rate = weakWins / total;
  assert.ok(
    rate > 0.6,
    `帶剋的幼子只贏了 ${(rate * 100).toFixed(1)}%（${weakWins}/${total}）`
    + '——「戰鬥力強就一定贏」正是業主明說不要的那件事，'
    + '元素倍率若被調到沒有份量，這個遊戲的立意就沒了',
  );
}

/* ── 三、倍率要有份量，但也不該是零風險 ─────────────────────────── */
{
  const source = stripComments(fs.readFileSync('lib/beast-game/elements.ts', 'utf8'));
  const advantage = Number(/ELEMENT_ADVANTAGE_MULTIPLIER = ([\d.]+)/.exec(source)?.[1]);
  const disadvantage = Number(/ELEMENT_DISADVANTAGE_MULTIPLIER = ([\d.]+)/.exec(source)?.[1]);
  assert.ok(advantage > 1, '剋要有加成');
  assert.ok(disadvantage < 1, '被剋要吃虧');
  assert.ok(
    advantage <= 1.5 && disadvantage >= 0.6,
    '倍率過大會讓元素變成唯一因素，卡片數值與技能就沒有意義了',
  );
}

/* ── 四、概念要寫在技能檔案裡 ───────────────────────────────────── */
{
  const doc = fs.readFileSync('docs/beast-game-skill.md', 'utf8');
  assert.ok(doc.includes('相生相剋大於戰鬥力'), '核心概念要寫進技能檔案，不能只存在對話裡');
  assert.ok(
    /規則裡有，跟客戶學得到，是兩件事/.test(doc),
    '要寫明「規則成立」與「客戶學得到」的差別——'
    + '沒做到畫面提示之前，不能宣稱這個遊戲教會了客戶什麼',
  );
}

console.log('PASS: 相剋表沿用五行，形成完整的環');
console.log('PASS: 帶剋的低戰力打得贏被剋的高戰力');
console.log('PASS: 倍率有份量，但沒有大到讓數值與技能失去意義');
console.log('PASS: 核心概念寫在技能檔案裡');
