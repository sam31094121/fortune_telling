/**
 * 暴風型科技武器・守門
 * ============================================================================
 *
 * 業主定調：
 *   「戰鬥卡片要帶有科技功能的武器的概念，用現有的素材、有授權、暴風型的。」
 *   「要有裸體科技武器，配合每一隻神獸，深於暴露霸氣型科技武器。」
 *   「『五合』本身承受本體的武器，要有邏輯，要經過細修。」
 *
 * 這支守四條線：
 *   一、武器不得碰數值 —— 演出就是演出，傷害在 interactive.ts
 *   二、部位必須與專案文件一致 —— 兩份對不上的設定比只有一份還糟
 *   三、六十張各有各的武器 —— 規格寫明「各卡武器不得複製」
 *   四、素材必須真的存在且有授權
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stripComments } from './helpers/strip-comments.mjs';
import { weaponFor, MANSION_WEAPON, WEAPON_CLASSES } from '../.beast-game-build/lib/beast-game/weapons.js';
import { playableCards } from '../.beast-game-build/lib/beast-game/registry.js';

const cards = playableCards();
assert.equal(cards.length, 60, '卡池應為六十張');

/* ── 一、武器不得碰數值 ─────────────────────────────────────────── */
{
  const source = stripComments(fs.readFileSync('lib/beast-game/weapons.ts', 'utf8'));
  for (const forbidden of ['damage', 'attack', 'hp', 'multiplier', 'Math.random']) {
    assert.ok(
      !source.includes(forbidden),
      `武器只是演出，不得出現 ${forbidden}——傷害在 interactive.ts，`
      + '一旦這裡也算就是第二套數值來源，而平衡是用一萬場抽樣驗過的',
    );
  }

  // 反面：戰鬥引擎不得反過來讀武器。
  for (const engine of ['lib/beast-game/interactive.ts', 'lib/beast-game/effects.ts', 'lib/beast-game/battle.ts']) {
    assert.ok(
      !fs.readFileSync(engine, 'utf8').includes('weapons'),
      `${engine} 不得引用武器表——武器影響不到勝負，這條線兩邊都要守`,
    );
  }
}

/* ── 二、部位與專案文件一致 ─────────────────────────────────────── */
{
  const doc = fs.readFileSync('docs/beast-game-skill.md', 'utf8');
  const fromDoc = new Map();
  for (const m of doc.matchAll(/^#### \d{2} ([^｜\n]+)｜[^｜\n]+｜([^｜\n]+)$/gm)) {
    if (!fromDoc.has(m[1].trim())) fromDoc.set(m[1].trim(), m[2].trim());
  }
  assert.equal(fromDoc.size, 28, '文件裡應該有二十八宿的四象定位');

  for (const [mansion, entry] of Object.entries(MANSION_WEAPON)) {
    const documented = fromDoc.get(mansion);
    assert.ok(documented, `${mansion} 不在文件的二十八宿條目裡`);
    assert.equal(
      entry.part,
      documented,
      `${mansion} 的部位與文件不符：表寫「${entry.part}」，文件寫「${documented}」`
      + '——改了一邊沒改另一邊，兩份設定就開始各說各話',
    );
  }
  assert.equal(Object.keys(MANSION_WEAPON).length, 28, '二十八宿一個都不能少');
}

/* ── 三、各卡武器不得複製 ───────────────────────────────────────── */
{
  const names = cards.map((card) => weaponFor(card.id, card.name, card.element).name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  assert.deepEqual(
    [...new Set(duplicates)],
    [],
    '六十張要有六十種武器名（規格：各卡武器不得複製）',
  );

  // 幼子與成獸是同一個部位、不同級數——名字要看得出差別。
  const young = weaponFor('beast_y01', '角木蛟・幼子', 'AIR');
  const adult = weaponFor('beast_a01', '角木蛟', 'AIR');
  assert.notEqual(young.name, adult.name, '幼子與成獸的武器名要分得出來');
  assert.equal(young.part, adult.part, '同一宿的部位相同——長大的是武裝，不是換了身體');
}

/* ── 四、每一張都拿得到完整武器 ─────────────────────────────────── */
{
  for (const card of cards) {
    const weapon = weaponFor(card.id, card.name, card.element);
    for (const field of ['name', 'weaponClass', 'motion', 'exposed', 'blade', 'impact', 'part']) {
      assert.ok(weapon[field], `${card.name} 的武器缺 ${field}——戰鬥畫面不能開天窗`);
    }
    assert.ok(WEAPON_CLASSES.includes(weapon.weaponClass), `${card.name} 的武器型別不在清單裡`);
    // 業主要的是「裸露機構」，所以這一句必須真的講到機構，不能是空話。
    assert.ok(
      /外露|不包殼|開放式|無蓋|全段/.test(weapon.exposed),
      `${card.name} 的裸露描述沒講到機構怎麼露出來：${weapon.exposed}`,
    );
  }
}

/* ── 五、素材真的存在，而且有授權 ───────────────────────────────── */
{
  const used = new Set();
  for (const card of cards) {
    const weapon = weaponFor(card.id, card.name, card.element);
    for (const asset of [weapon.blade, weapon.impact]) used.add(asset);
  }
  for (const asset of used) {
    assert.ok(
      fs.existsSync(path.join('public', asset.replace(/^\//, ''))),
      `武器素材不存在：${asset}——寫了路徑卻沒有檔案，上線就是 404`,
    );
  }

  // 授權要查得到。CC0 圖在 LICENSES.md 裡逐檔列名。
  const licences = fs.readFileSync('public/audio/taiji/LICENSES.md', 'utf8');
  for (const sprite of ['lightning-sprite-cc0.png', 'lightning-impact-cc0.png']) {
    assert.ok(licences.includes(sprite), `${sprite} 沒有登記在 LICENSES.md——用了就要說得出授權`);
    assert.ok(/CC0/i.test(licences), 'CC0 授權要寫明');
  }

  // 沒有新增任何素材檔：全部來自既有的太極音效與圖庫。
  for (const asset of used) {
    assert.ok(
      asset.startsWith('/audio/taiji/'),
      `武器素材必須沿用既有的授權素材庫：${asset}`,
    );
  }
}

/* ── 六、聲音只有一個來源，順序就是動作的邏輯 ─────────────────── */
{
  const weaponSrc = stripComments(fs.readFileSync('lib/beast-game/weapons.ts', 'utf8'));
  assert.ok(
    !/charge:|strike:|[.]ogg|[.]mp3/.test(weaponSrc),
    '武器不得自帶音色——本體叫聲與三段式交鋒音已經各有一套，'
    + '武器再一套就是第三套，同一次出手會聽到三種不搭的音色',
  );

  const fx = stripComments(fs.readFileSync('lib/beast-battle-fx.ts', 'utf8'));
  assert.ok(fx.includes('beastActionTimeline'), '要有一條統一的出手時間軸');
  assert.ok(
    fx.includes('cardSoundProfile(cardId, element)'),
    '時間軸的音色要取自同一張卡的 profile——這樣「誰在打」從吼到命中都是同一個聲音身分',
  );
}

/* ── 七、時間軸：先吼、再蓄力、再命中、最後餘響 ─────────────────── */
{
  const line = fs.readFileSync('lib/beast-battle-fx.ts', 'utf8');
  const beats = /ACTION_BEATS = \{ voice: (\d+), charge: (\d+), strike: (\d+), tail: (\d+) \}/.exec(line);
  assert.ok(beats, '找不到出手節奏的時間點');
  const [, voice, charge, strike, tail] = beats.map(Number);
  assert.ok(
    voice < charge && charge < strike && strike < tail,
    `順序必須是 吼 → 蓄力 → 命中 → 餘響，實際是 ${voice}/${charge}/${strike}/${tail}`
    + '——打到了才聽到蓄力，就是邏輯不連貫',
  );

  // 與三維衝鋒動畫對齊：聲音要落在畫面該落的位置。
  const clash = fs.readFileSync('components/BeastClash3D.tsx', 'utf8');
  for (const beat of [charge, strike, tail]) {
    assert.ok(
      clash.includes(String(beat)),
      `${beat}ms 這個時間點在 BeastClash3D 裡找不到——聲音與動作對不上`,
    );
  }
}

console.log('PASS: 武器只是演出，不碰傷害；戰鬥引擎也不讀武器表');
console.log('PASS: 二十八宿部位與專案文件逐字一致');
console.log('PASS: 六十張六十種武器，幼子與成獸分得出級數');
console.log('PASS: 每張都拿得到完整武器，裸露描述講得出機構');
console.log('PASS: 素材真的存在、沿用既有授權素材庫、授權查得到');
console.log('PASS: 聲音只有一個來源，武器不自帶音色');
console.log('PASS: 吼 → 蓄力 → 命中 → 餘響，且與三維衝鋒動畫對齊');
