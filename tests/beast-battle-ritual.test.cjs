/**
 * 神獸決鬥・戰鬥儀式守門測試
 * ============================================================================
 *
 * 業主定調：「一張一張地翻牌，不要一次就六張牌一起翻。
 * 要同時『我翻一張，對方翻一張』的概念。」
 * 「要更強烈的遊戲感儀式，可以去找現有的素材，把它組合起來。」
 *
 * 這支測試守三件事：
 *   翻牌是逐張交替的，不是六張一起
 *   演出用的是既有素材，沒有偷偷新增檔案
 *   演出不決定任何結果（規格第十二條）
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/* ── 一、逐張交替揭牌 ───────────────────────────────────────────── */
{
  const fx = read('lib/beast-battle-fx.ts');
  assert.ok(fx.includes('REVEAL_ORDER'), '要有明確的揭牌順序');

  // 順序必須是交替的：玩家、對手、玩家、對手…
  // 從陣列的 [ 開始取，否則型別註記裡的 side: 'player' | 'opponent' 會被算成一張牌。
  const orderStart = fx.indexOf('[', fx.indexOf('REVEAL_ORDER'));
  const orderBlock = fx.slice(orderStart, fx.indexOf('REVEAL_INTERVAL_MS'));
  const sides = [...orderBlock.matchAll(/side: '(player|opponent)'/g)].map((m) => m[1]);
  assert.equal(sides.length, 6, '六張都要在順序裡');
  for (let i = 0; i < sides.length; i += 1) {
    assert.equal(sides[i], i % 2 === 0 ? 'player' : 'opponent',
      `第 ${i + 1} 張應該是${i % 2 === 0 ? '玩家' : '對手'}的——順序必須交替`);
  }

  const ritual = read('components/BeastDuelRitual.tsx');
  assert.ok(ritual.includes('revealCount'), '要用計數逐張翻，不能用一個布林翻全部');
  assert.ok(ritual.includes('isRevealed('), '每張卡要自己判斷翻了沒');
  assert.ok(
    !/const revealed = phase !== 'covered';[\s\S]{0,200}data-revealed=\{revealed \? 'yes' : 'no'\}/.test(ritual),
    '不得再用單一布林控制六張卡的翻面',
  );
  assert.ok(/prefers-reduced-motion/.test(ritual), '減少動態時要直接全開，不折磨人');
}

/* ── 二、素材必須真的存在（組合既有素材，不是寫死路徑） ─────────── */
{
  const fx = read('lib/beast-battle-fx.ts');
  // 路徑是用 AUDIO_BASE 組出來的樣板字串，所以抓資料夾常數與檔名再自己組回去。
  const base = /const AUDIO_BASE = '([^']+)'/.exec(fx);
  assert.ok(base, '要有一個統一的音效資料夾常數，不得每處各寫一次路徑');
  const files = [...fx.matchAll(/AUDIO_BASE\}\/([\w.-]+)/g)].map((m) => m[1]);
  const paths = [...new Set(files)].map((file) => `${base[1]}/${file}`);
  assert.ok(paths.length >= 6, `五元素加撞擊音效至少六個，實際 ${paths.length}`);
  for (const rel of paths) {
    assert.ok(
      fs.existsSync(path.join(root, 'public', rel.replace(/^\//, ''))),
      `素材不存在：${rel}——不得寫死不存在的路徑`,
    );
  }

  // 五個元素都要有對應音效，不能只做一半
  for (const element of ['SPACE', 'AIR', 'WATER', 'FIRE', 'EARTH']) {
    assert.ok(new RegExp(`${element}: \{`).test(fx), `${element} 要有對應的演出素材`);
  }
}

/* ── 三、音效的紀律 ─────────────────────────────────────────────── */
{
  const fx = read('lib/beast-battle-fx.ts');
  assert.ok(/let enabled = false/.test(fx), '音效必須預設關閉，不得一進頁面就出聲');
  assert.ok(/catch/.test(fx), '播放失敗要靜靜跳過，不得讓遊戲卡住');
  assert.ok(/prefers-reduced-motion/.test(fx), '要尊重減少動態的設定');

  const ritual = read('components/BeastDuelRitual.tsx');
  assert.ok(ritual.includes('data-sound-toggle'), '要有可辨識的音效開關');
}

/* ── 四、演出不得決定結果（規格第十二條） ───────────────────────── */
{
  const fx = read('lib/beast-battle-fx.ts');
  for (const forbidden of ['playToEnd', 'performAttack', 'computeDamage', 'resolveStake', 'Math.random']) {
    assert.ok(!fx.includes(forbidden), `演出素材檔不得出現 ${forbidden}——它只是對照表`);
  }

  const ritual = read('components/BeastDuelRitual.tsx');
  const code = ritual
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*');
    })
    .join('\n');
  for (const forbidden of ['playToEnd', 'performAttack', 'computeDamage', 'resolveStake']) {
    assert.ok(!code.includes(forbidden), `儀式元件不得自己算結果：${forbidden}`);
  }
  assert.ok(!code.includes('Math.random'), '演出不得有任何亂數——結果早就定了');
}

/* ── 五、技能檔案要寫下來 ───────────────────────────────────────── */
{
  const doc = read('docs/beast-game-skill.md');
  assert.ok(doc.includes('戰鬥儀式感'), '技能檔案要有戰鬥儀式感這一節');
  assert.ok(/動畫不得決定戰鬥結果/.test(doc), '要寫明演出不決定結果這條線');
  assert.ok(/tornado-wind|earth-rift/.test(doc), '要列出用了哪些既有素材');
  assert.ok(/還沒做的/.test(doc), '沒做的要照實列出來，不得假裝做完了');
}

console.log('PASS: 逐張交替揭牌、素材真的存在、音效有紀律、演出不決定結果');
