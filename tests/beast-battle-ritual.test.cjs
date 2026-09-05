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
  assert.ok(!/let enabled = false|!enabled|reducedMotion\(\)/.test(fx), '戰鬥音效不可被預設靜音或減少動態關閉');
  assert.ok(/catch/.test(fx), '播放失敗要靜靜跳過，不得讓遊戲卡住');
  assert.ok(/typeof window === 'undefined'/.test(fx), '伺服器端不可建立音效');

  const ritual = read('components/BeastDuelRitual.tsx');
  assert.ok(!ritual.includes('data-sound-toggle'), '戰鬥不需要另外開啟音效');
  assert.ok(ritual.includes("if (ready) { playPlayerBeastVoice(sound.current.play, 'player', player[0].id);"), '揭牌點擊直接啟動玩家本體音效');
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
  assert.ok(doc.includes('public/audio/beast-voices/manifest.json') && doc.includes('CREDITS.md'), '要連結實際使用的本體聲音素材及授權');
  assert.ok(/還沒做的/.test(doc), '沒做的要照實列出來，不得假裝做完了');
}

console.log('PASS: 逐張交替揭牌、素材真的存在、音效有紀律、演出不決定結果');

/* ── 六、翻牌：手動為主，自動為輔 ───────────────────────────────── */
{
  const ritual = read('components/BeastDuelRitual.tsx');
  assert.ok(/const \[autoFlip, setAutoFlip\] = useState\(false\)/.test(ritual),
    '翻牌必須預設手動——客戶自己一張一張翻，不是一按就自動跑完');
  assert.ok(ritual.includes('data-flip-next'), '要有「翻下一張」的手動按鈕');
  assert.ok(ritual.includes('data-auto-flip'), '要有切換自動翻牌的箭頭');
  assert.ok(/if \(!autoFlip\) return;/.test(ritual),
    '手動模式下自動計時器不得偷偷幫客戶翻');
  assert.ok(/function flipNext/.test(ritual), '手動翻牌要有自己的入口');
}

/* ── 七、神獸本體立繪 ───────────────────────────────────────────── */
{
  const fx = read('lib/beast-battle-fx.ts');
  assert.ok(fx.includes('spiritArtFor'), '要有卡片對應本體立繪的函式');
  assert.ok(/beast_g_qinglong/.test(fx), '四象也要對得到本體');

  const clash = read('components/BeastClash3D.tsx');
  assert.ok(clash.includes('playerSpirit'), '三維對撞要吃本體立繪');
  assert.ok(/alphaTest/.test(clash), '去背立繪要開 alphaTest，邊緣才不會有一圈灰');
  assert.ok(/playerSpirit \?\? playerArt/.test(clash),
    '沒有立繪時要退回卡面，不得開天窗');

  // 產生器要存在，而且不能一聲不響跑完六十張花錢
  const gen = read('scripts/gen-beast-spirits.mjs');
  assert.ok(/--limit/.test(gen), '產生器要能限制張數，不得預設跑完全部');
  assert.ok(/已存在/.test(gen), '已存在的檔案要跳過，避免重複付費');
  assert.ok(/keyOutBlack/.test(gen), '要有去背步驟');

  // 已經生成的立繪必須真的帶 alpha
  const dir = path.join(root, 'public/beast-game/spirit');
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => /\.(png|webp)$/.test(f));
    assert.ok(files.length > 0, '至少要有一張本體立繪');
    for (const file of files) {
      const buffer = fs.readFileSync(path.join(dir, file));
      if (file.endsWith('.webp')) {
        assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${file} 必須是有效 WebP`);
        assert.equal(buffer.toString('ascii', 8, 12), 'WEBP', `${file} 必須是有效 WebP`);
        let hasAlpha = false;
        for (let offset = 12; offset + 8 <= buffer.length;) {
          const kind = buffer.toString('ascii', offset, offset + 4);
          const size = buffer.readUInt32LE(offset + 4);
          assert.ok(offset + 8 + size <= buffer.length, `${file} 區塊不可截斷`);
          if (kind === 'ALPH') hasAlpha = true;
          if (kind === 'VP8L' && size >= 5 && buffer[offset + 8] === 0x2f) {
            hasAlpha ||= Boolean(buffer.readUInt32LE(offset + 9) & 0x10000000);
          }
          offset += 8 + size + (size % 2);
        }
        assert.ok(hasAlpha, `${file} 必須帶 alpha 通道`);
        continue;
      }
      // PNG 色彩型別在 IHDR 第 25 byte：6 = RGBA、4 = 灰階+alpha
      const colourType = buffer[25];
      assert.ok([4, 6].includes(colourType),
        `${file} 必須帶 alpha 通道（色彩型別 ${colourType}）——沒去背就不是本體立繪`);
    }
  }
}

/* ── 八、三段式猛烈音效 ─────────────────────────────────────────── */
{
  const fx = read('lib/beast-battle-fx.ts');
  assert.ok(fx.includes('playClashSequence'), '要有三段式撞擊的播放函式');
  for (const layer of ['charge', 'impact', 'tail']) {
    assert.ok(new RegExp(`${layer}:`).test(fx), `三段式要有 ${layer} 這一層`);
  }
  // 五個元素的撞擊材質要不一樣，否則「符合邏輯的聲音」就是空話
  const impacts = [...fx.matchAll(/impact: `\$\{SFX\}\/([\w.-]+)`/g)].map((m) => m[1]);
  assert.ok(impacts.length >= 4, '至少四個元素要有自己的撞擊音');
  assert.ok(new Set(impacts).size >= 3,
    '各元素的撞擊材質不得全部一樣——風撞木、地撞石、空撞金屬才是符合邏輯');

  const ritual = read('components/BeastDuelRitual.tsx');
  assert.ok(ritual.includes('playPlayerBeastVoice'), '交鋒依新規格只播玩家本體聲音');
}

console.log('PASS: 手動翻牌、本體立繪帶 alpha、三段式音效各元素材質不同');

/* ── 九、六十張都要有本體，而且背景要真的去乾淨 ─────────────────── */
{
  const dir = path.join(root, 'public/beast-game/spirit');
  assert.ok(fs.existsSync(dir), '本體立繪資料夾必須存在');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.webp'));

  // 二十八隻成獸＋二十八隻幼子＋四象各自的本體。
  const adults = files.filter((f) => /^\d{2}\.webp$/.test(f));
  const youngs = files.filter((f) => /^\d{2}y\.webp$/.test(f));
  assert.equal(adults.length, 28, `成獸本體要二十八隻，實際 ${adults.length}`);
  assert.equal(youngs.length, 28, `幼子本體要二十八隻，實際 ${youngs.length}`);
  for (const guardian of ['qinglong', 'zhuque', 'baihu', 'xuanwu']) {
    assert.ok(files.includes(`guardian-${guardian}.webp`), `${guardian} 要有自己的本體`);
  }
  assert.equal(files.length, 60, '六十張都必須有獨立本體檔');

  // 幼子不得直接用成獸的圖——那是拿大人的圖冒充小孩
  for (const id of ['01', '06', '13']) {
    const adult = fs.readFileSync(path.join(dir, `${id}.webp`));
    const young = fs.readFileSync(path.join(dir, `${id}y.webp`));
    assert.ok(!adult.equals(young), `${id} 的幼子與成獸不得是同一張圖`);
  }

  // 檔案要夠小，六十張本體不能把手機拖垮
  const total = files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(total < 8 * 1024 * 1024,
    `本體立繪合計要小於 8MB，實際 ${(total / 1024 / 1024).toFixed(1)}MB`);

  // 有品質檢查腳本，而且門檻寫在裡面
  const checker = read('scripts/check-beast-spirits.mjs');
  assert.ok(/MIN_TRANSPARENT/.test(checker), '要有去背成功與否的判準，不能只憑肉眼看');
}

console.log('PASS: 二十八成獸＋二十八幼子本體齊備、幼子不與成獸共用、合計夠小');
