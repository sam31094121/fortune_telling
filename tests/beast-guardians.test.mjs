/**
 * 《四大神獸》・歸屬與強弱
 * ============================================================================
 *
 * 業主定調：「改為《四大神獸》……60 張的神獸卡有分等級強弱，
 * 戰鬥力強弱都要清楚。五元素相生相剋。」
 *
 * 這支守兩件事：
 *   一、四象歸屬取自既有資料，不另立對照表——兩份分組遲早有一份是錯的
 *   二、**強弱標示不得說謊**。實測六十張戰力差距只有 16 分，
 *       在這種分佈上做四階星等就是假分級。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripComments } from './helpers/strip-comments.mjs';
import { GUARDIANS, guardianOf, tierOf, TIER_LABEL, powerScore, powerLabel, POWER_SPREAD } from '../.beast-game-build/lib/beast-guardians.js';
import { interactiveCatalog } from '../.beast-game-build/lib/beast-game/interactive.js';

/* ── 一、四大神獸各統領七宿 ─────────────────────────────────────── */
{
  assert.equal(GUARDIANS.length, 4, '四象就是四位');
  for (const guardian of GUARDIANS) {
    assert.equal(guardian.mansions.length, 7, `${guardian.name} 應統領七宿`);
  }
  const all = GUARDIANS.flatMap((g) => g.mansions);
  assert.equal(new Set(all).size, 28, '二十八宿要剛好被分完，不重不漏');

  // 歸屬取自資料，不是另編的：春屬蒼龍、秋屬白虎。
  assert.equal(guardianOf('beast_a01')?.key, 'QINGLONG', '角木蛟屬東方蒼龍');
  assert.equal(guardianOf('beast_y15')?.key, 'BAIHU', '奎木狼屬西方白虎');
  // 四象本尊回自己。
  assert.equal(guardianOf('beast_g_xuanwu')?.key, 'XUANWU');
  // 幼子與成獸同宿，歸屬必須一致。
  for (let n = 1; n <= 28; n += 1) {
    const id = String(n).padStart(2, '0');
    assert.equal(
      guardianOf(`beast_y${id}`)?.key,
      guardianOf(`beast_a${id}`)?.key,
      `第 ${n} 宿的幼子與成獸歸屬要一致——長大不會換一位四象`,
    );
  }
}

/* ── 二、等級分得出來 ───────────────────────────────────────────── */
{
  assert.equal(tierOf('beast_y01'), 'YOUNG');
  assert.equal(tierOf('beast_a01'), 'ADULT');
  assert.equal(tierOf('beast_g_baihu'), 'GUARDIAN');
  for (const key of ['YOUNG', 'ADULT', 'GUARDIAN']) {
    assert.ok(TIER_LABEL[key]?.length > 2, `${key} 要有看得懂的名稱`);
  }
}

/* ── 三、強弱標示不得說謊 ───────────────────────────────────────── */
{
  const cards = interactiveCatalog();
  assert.equal(cards.length, 60);
  const scores = cards.map((card) => powerScore(card.stats));
  const spread = Math.max(...scores) - Math.min(...scores);

  // 這是實測事實：回合制引擎刻意把六十張的數值壓平。
  assert.ok(
    spread < 40,
    `戰力差距 ${spread} 分。若引擎改成真的有階級差距，`
    + 'POWER_SPREAD 與說明文案都要跟著改——否則畫面會繼續說「差距很小」而那句變成假的',
  );
  assert.ok(POWER_SPREAD.flat, '目前是壓平的分佈，這件事要記在程式裡，不是靠記憶');

  /*
    在 16 分的差距上做四階星等，六十張會全部落在同一階，
    看起來像分級、實際上沒有——那是假分級。
    所以標示只分三段，而且一定附上「差距很小」這句實話。
  */
  const label = powerLabel(scores[0]);
  assert.ok(['偏高', '中等', '偏低'].includes(label.text), '只分三段，不做看起來厲害的假分級');
  assert.ok(/差距很小/.test(label.note), '要講明白差距很小，不能讓客戶以為挑數字大的就贏');
  assert.ok(/相剋/.test(label.note), '要指回真正決定勝負的東西：五元素相剋');

  // 星等字樣不得出現：那正是先前差點做出來的假分級。
  const source = stripComments(fs.readFileSync('lib/beast-guardians.ts', 'utf8'));
  assert.ok(!source.includes('★'), '不得用星等——在壓平的分佈上做星等就是假分級');
}

/* ── 四、總分不得回饋到戰鬥 ─────────────────────────────────────── */
{
  for (const engine of ['lib/beast-game/interactive.ts', 'lib/beast-game/effects.ts', 'lib/beast-game/battle.ts']) {
    assert.ok(
      !fs.readFileSync(engine, 'utf8').includes('powerScore'),
      `${engine} 不得讀戰鬥力總分——那是給人看的摘要，`
      + '戰鬥一旦讀它就是第二套數值來源',
    );
  }
}

console.log('PASS: 四大神獸各統領七宿，二十八宿不重不漏');
console.log('PASS: 幼子／成獸／四象分得出等級，同宿歸屬一致');
console.log('PASS: 強弱標示不說謊——壓平的分佈不做假星等');
console.log('PASS: 戰鬥力總分不回饋到戰鬥');
