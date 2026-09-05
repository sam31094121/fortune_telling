/**
 * 神獸卡・正統卡片規格守門測試
 * ============================================================================
 *
 * 業主定調：「全部的牌要有正統牌組、正統遊戲卡片的概念……
 * 放進去規格都一致，空間和距離都剛剛好，不會多也不會少。」
 *
 * 六十張卡、出戰三席、揭牌儀式、放大預覽——四個地方必須是同一個規格。
 * 只要有人在其中一處另外寫一套比例，這支測試就會擋下來。
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const frame = read('components/BeastCardFrame.module.css');

/* ── 一、比例必須是正統集換式卡牌的 63 × 88 mm ───────────────────── */
assert.ok(
  frame.includes('aspect-ratio: 63 / 88'),
  '卡片比例必須是 63/88（實體集換式卡牌通用規格），不得自訂',
);
assert.ok(
  !frame.includes('aspect-ratio: 4 / 7'),
  '4/7 比正統卡片窄，排起來像貼紙不像一副牌，不得回頭使用',
);

/* ── 二、圖要填滿圖窗，不得整張留白 ──────────────────────────────── */
{
  // .art 的預設必須是 cover；contain 只准出現在放大預覽那一段。
  const artBlock = frame.slice(frame.indexOf('.art {'), frame.indexOf('.preview {'));
  assert.ok(artBlock.includes('object-fit: cover'), '手牌與三席的圖必須填滿圖窗（cover）');
  assert.ok(
    !artBlock.includes('object-fit: contain'),
    '整張卡 contain 會讓每張留白位置不一樣，那正是「空間跑掉」的來源',
  );
  assert.ok(frame.includes('.preview .art'), '放大預覽才可以用 contain 看完整張圖');
}

/* ── 三、四個使用卡片的地方都必須吃同一份規格 ───────────────────── */
{
  const surfaces = [
    ['app/beast-game/page.tsx', '組陣台（六十張卡池、出戰三席、放大預覽）'],
    ['components/BeastDuelRitual.tsx', '揭牌儀式'],
  ];
  for (const [file, label] of surfaces) {
    const source = read(file);
    assert.ok(
      source.includes('BeastCardFrame.module.css'),
      `${label} 必須使用共用卡片規格，不得自己排一套`,
    );
    // 自己另外寫比例＝規格分裂，六十張就會長得不一樣
    assert.ok(
      !/aspect-\[\d+\/\d+\]/.test(source) && !/aspectRatio/.test(source),
      `${label} 不得自己指定比例，一律走 BeastCardFrame`,
    );
  }
}

/* ── 四、卡內尺度要跟著卡寬走，不得寫死 px ──────────────────────── */
{
  assert.ok(frame.includes('container-type: inline-size'), '卡片要建立容器查詢，內部尺度才跟得上卡寬');
  for (const token of ['cqw']) {
    assert.ok(frame.includes(token), `卡內尺度要用 ${token}，寫死 px 會讓小卡爆框、大卡縮成一團`);
  }
  // 名字條高度要固定，否則六十張並排時底部會參差不齊
  const nameBar = frame.slice(frame.indexOf('.nameBar {'));
  assert.ok(nameBar.includes('white-space: nowrap'), '名字長短不一時不得把卡撐高');
  assert.ok(nameBar.includes('text-overflow: ellipsis'), '名字過長要省略，不得換行改變卡高');
}

console.log('PASS: 六十張卡、三席、儀式、預覽共用同一份正統卡片規格（63×88mm）');
/* ── 五、放牌不得讓版面跳動 ────────────────────────────────────── */
{
  const page = read('app/beast-game/page.tsx');
  // 「移出」原本只有放了卡才長出來，放牌瞬間整區從 395px 變 443px，
  // 下面的內容整片往下跳——那就是「卡片放進去都會跑掉」。
  assert.ok(
    page.includes('永遠佔位'),
    '出戰三席的操作列必須永遠佔位，放牌不得改變區塊高度',
  );
  const slotFooter = page.slice(page.indexOf('永遠佔位'), page.indexOf('永遠佔位') + 900);
  assert.ok(
    /className="mt-1 h-11"/.test(slotFooter),
    '操作列要有固定高度的容器，空格時也保留同樣的高度',
  );
}

console.log('PASS: 放牌不會讓版面跳動');
