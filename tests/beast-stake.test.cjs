/**
 * 神獸卡・押注與獎勵守門測試
 * ============================================================================
 *
 * 業主定調：「輸贏雙方各放一張卡片進去，贏的人可以獲得一張卡片，
 * 輸的人那張卡片則會被沒收。」以及「贏要有獎勵，獎勵要很清楚地告知。」
 *
 * 這是整套遊戲**唯一會拿走客戶東西**的機制，所以守得比別處更緊：
 *   結算只能由後端算
 *   沒收必須明確告知，不得用軟話蓋過去
 *   重播不得重複發獎（否則一直按重播就能刷卡）
 *   存不進去要照實說，不得顯示「已放進收藏」卻其實沒存到
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function loadModule(rel) {
  const compiled = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const ctx = { exports: {}, module: { exports: {} }, require, console };
  ctx.module.exports = ctx.exports;
  vm.runInNewContext(compiled, ctx);
  return ctx.exports;
}

const stake = loadModule('lib/beast-game/stake.ts');

/* ── 一、結算規則：贏拿走、輸沒收、平退回 ───────────────────────── */
{
  const won = stake.resolveStake({ playerStake: 'A', opponentStake: 'B', winner: 'PLAYER' });
  assert.equal(won.verdict, 'WON');
  assert.equal(won.gainedCardId, 'B', '贏了要拿到對手押的那張');
  assert.equal(won.forfeitedCardId, null, '贏了不得沒收自己的');
  assert.equal(won.netChange, 1);

  const lost = stake.resolveStake({ playerStake: 'A', opponentStake: 'B', winner: 'OPPONENT' });
  assert.equal(lost.verdict, 'LOST');
  assert.equal(lost.forfeitedCardId, 'A', '輸了要沒收自己押的那張');
  assert.equal(lost.gainedCardId, null, '輸了不得還拿到對手的');
  assert.equal(lost.netChange, -1);

  const drew = stake.resolveStake({ playerStake: 'A', opponentStake: 'B', winner: 'DRAW' });
  assert.equal(drew.verdict, 'RETURNED');
  assert.equal(drew.netChange, 0, '平手誰也不該有損失');

  // 系統自己沒跑完，不能由客戶承擔損失
  const broken = stake.resolveStake({ playerStake: 'A', opponentStake: 'B', winner: null });
  assert.equal(broken.verdict, 'RETURNED');
  assert.equal(broken.forfeitedCardId, null, '戰局沒跑完不得沒收客戶的卡');
}

/* ── 二、沒收要說得清楚，不得用軟話蓋過去 ───────────────────────── */
{
  const lost = stake.resolveStake({ playerStake: 'A', opponentStake: 'B', winner: 'OPPONENT' });
  assert.ok(/沒收/.test(lost.message), '沒收的訊息必須出現「沒收」兩個字');
  assert.ok(/移除/.test(lost.message), '必須講明從收藏移除');
  assert.ok(
    !/未獲得獎勵|沒有獎勵|再接再厲/.test(lost.message),
    '不得用「本次未獲得獎勵」這種話把沒收藏起來',
  );

  const won = stake.resolveStake({ playerStake: 'A', opponentStake: 'B', winner: 'PLAYER' });
  assert.ok(/收藏/.test(won.message), '贏了要講清楚卡去了哪裡');
}

/* ── 三、押注前就要知道會失去什麼 ───────────────────────────────── */
{
  const empty = stake.describeStakeRisk(null);
  assert.equal(empty.canStart, false, '沒放賭注卡不得開戰');
  assert.ok(/沒收/.test(empty.detail), '空的時候就要先講輸了會被沒收');

  const ready = stake.describeStakeRisk('尾火虎');
  assert.equal(ready.canStart, true);
  assert.ok(ready.headline.includes('尾火虎'), '要講出押的是哪一張');
  assert.ok(/輸了/.test(ready.detail) && /沒收/.test(ready.detail), '押注前必須明講輸了的後果');
}

/* ── 四、驗證：沒放或不存在的卡不得押 ───────────────────────────── */
{
  const known = (id) => id === 'beast_a01';
  assert.equal(stake.validateStake(null, known).ready, false, '空賭注格不得開戰');
  assert.equal(stake.validateStake('beast_fake', known).ready, false, '不在牌庫的卡不得押');
  assert.equal(stake.validateStake('beast_a01', known).ready, true);
}

/* ── 五、後端才是唯一的結算者 ───────────────────────────────────── */
{
  const api = read('app/api/beast-game/route.ts');
  assert.ok(api.includes('resolveStake'), '押注結算必須在後端做');
  assert.ok(api.includes('validateStake'), '後端要擋沒放賭注卡的請求');
  assert.ok(
    /winner: state\.winner/.test(api),
    '勝負必須取自 Game Core，不得採用前端傳來的結果',
  );

  const page = read('app/beast-game/page.tsx');
  const code = page
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*');
    })
    .join('\n');
  assert.ok(!code.includes('resolveStake('), '前端不得自己結算押注');
  assert.ok(
    !/verdict\s*=\s*['"]WON['"]/.test(code),
    '前端不得自己決定輸贏歸屬',
  );
}

/* ── 六、重播不得重複發獎 ───────────────────────────────────────── */
{
  const page = read('app/beast-game/page.tsx');
  assert.ok(
    /!result\.isReplay|!data\.isReplay/.test(page),
    '重播必須跳過發獎，否則一直按重播就能刷卡',
  );
}

/* ── 七、收藏要誠實：存哪裡、存不進去要說 ───────────────────────── */
{
  const store = read('lib/beast-collection.ts');
  assert.ok(store.includes('COLLECTION_STORAGE_NOTICE'), '要有一段給客戶看的儲存說明');
  assert.ok(/換手機|清除/.test(store), '必須講明換裝置或清除資料會不見');
  assert.ok(store.includes('try {') && store.includes('catch'), '讀寫都要包 try/catch');
  assert.ok(/history/.test(store), '沒收要留紀錄，客戶要查得到什麼時候失去什麼');

  const page = read('app/beast-game/page.tsx');
  assert.ok(
    /stakeSaved === false/.test(page),
    '存不進去時要照實告訴客戶，不得顯示「已放進收藏」卻其實沒存到',
  );
  assert.ok(page.includes('COLLECTION_STORAGE_NOTICE'), '戰果頁也要顯示儲存說明');
}

/* ── 八、獎勵要指引到成長中心 ───────────────────────────────────── */
{
  const page = read('app/beast-game/page.tsx');
  assert.ok(/growth-center/.test(page), '獎勵要指引到成長中心，不能只說「已收藏」');

  const shelf = read('components/DuelCollectionShelf.tsx');
  assert.ok(shelf.includes('data-duel-collection'), '成長中心要有可辨識的收藏格');
  assert.ok(/還沒有贏來的卡/.test(shelf), '空的時候要說得出怎麼拿到第一張');
  assert.ok(/beast-game/.test(shelf), '空狀態要有去玩的入口');
  assert.ok(/被沒收的紀錄/.test(shelf), '被沒收的也要看得到');
  assert.ok(shelf.includes('COLLECTION_STORAGE_NOTICE'), '收藏格要顯示儲存說明');

  const growth = read('app/growth-center/page.tsx');
  assert.ok(growth.includes('DuelCollectionShelf'), '成長中心必須掛上收藏格');
}

console.log('PASS: 押注結算只在後端、沒收明確告知、重播不重複發獎、收藏誠實揭露');
