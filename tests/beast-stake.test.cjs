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
  assert.ok(/一張/.test(lost.message), '一次只沒收押注的一張');
  assert.ok(!/已從.*移除|已放進/.test(lost.message), 'API 不知道本機是否保存，不可預先宣稱已扣卡');
  assert.ok(
    !/未獲得獎勵|沒有獎勵|再接再厲/.test(lost.message),
    '不得用「本次未獲得獎勵」這種話把沒收藏起來',
  );

  const won = stake.resolveStake({ playerStake: 'A', opponentStake: 'B', winner: 'PLAYER' });
  assert.ok(/對手/.test(won.message), '贏得的必須是對手原本押的卡');
}

/* ── 三、押注前就要知道會失去什麼 ───────────────────────────────── */
{
  const empty = stake.describeStakeRisk(null);
  assert.equal(empty.canStart, false, '沒放賭注卡不得開戰');
  assert.ok(/沒收/.test(empty.detail), '空的時候就要先講輸了會被沒收');

  const ready = stake.describeStakeRisk('尾火虎');
  assert.equal(ready.canStart, true);
  assert.ok(ready.headline.includes('尾火虎'), '要講出押的是哪一張');
  assert.ok(/輸/.test(ready.detail) && /沒收/.test(ready.detail), '押注前必須明講輸了的後果');
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
  assert.ok(read('components/BeastStakeResult.tsx').includes('COLLECTION_STORAGE_NOTICE'), '戰果頁也要顯示儲存說明');
}

/* ── 八、獎勵要指引到成長中心 ───────────────────────────────────── */
{
  const page = read('app/beast-game/page.tsx');
  assert.ok(/growth-center#beast-collection/.test(read('components/BeastStakeResult.tsx')), '獎勵直接指引成長中心收藏格');

  const shelf = read('components/DuelCollectionShelf.tsx');
  assert.ok(shelf.includes('data-duel-collection'), '成長中心要有可辨識的收藏格');
  assert.ok(/完成首頁探索/.test(shelf), '無卡可押的新客戶要能先獲得成長卡，不能困在對戰循環');
  assert.ok(/beast-game/.test(shelf), '空狀態要有去玩的入口');
  assert.ok(/被沒收的紀錄/.test(shelf), '被沒收的也要看得到');
  assert.ok(shelf.includes('COLLECTION_STORAGE_NOTICE'), '收藏格要顯示儲存說明');

  const growth = read('app/growth-center/page.tsx');
  assert.ok(growth.includes('DuelCollectionShelf'), '成長中心必須掛上收藏格');
}

console.log('PASS: 押注結算只在後端、沒收明確告知、重播不重複發獎、收藏誠實揭露');

/* ── 九、押注只能押自己的卡（成長中心來的） ────────────────────── */
{
  const owned = read('lib/beast-owned-cards.ts');
  assert.ok(/羈絆解鎖/.test(owned) && /決鬥贏來/.test(owned), '「我的卡」只有這兩個來源，都要寫明');
  assert.ok(
    owned.includes('readCollection'),
    '決鬥贏來的卡要算進可押注的卡',
  );
  assert.ok(
    owned.includes('gameCardIdsForMansion'),
    '羈絆解鎖的二十八宿編號要換成遊戲卡 id 才能押',
  );
  assert.ok(
    owned.includes('NO_OWNED_CARDS_GUIDE'),
    '一張都沒有時要有引導，不能只把按鈕變灰',
  );

  // 解鎖規則只能有一套
  const growth = read('app/growth-center/page.tsx');
  assert.ok(
    growth.includes("from '@/lib/beast-owned-cards'"),
    '成長中心要用共用的解鎖規則，不得自己再寫一套',
  );
  assert.ok(
    !/const MODULE_CARD_IDS: Record<string, number> = \{ number: 1/.test(growth),
    '解鎖對照表不得在成長中心裡再寫一份',
  );

  const page = read('app/beast-game/page.tsx');
  assert.ok(page.includes('readOwnedCards'), '賭注格要讀「我的卡」');
  assert.ok(page.includes('data-owned-cards'), '賭注要從自己的卡裡挑，不是六十張卡池');
  assert.ok(page.includes('data-stake-empty'), '一張都沒有時要有可辨識的引導區塊');
  assert.ok(
    /贏來的卡馬上就能拿去押下一場/.test(page),
    '決鬥後要重讀「我的卡」，贏來的能馬上押、輸掉的要立刻消失',
  );
}

/* ── 十、輸贏要有很清楚的大提示 ────────────────────────────────── */
{
  const page = read('components/BeastStakeResult.tsx');
  assert.ok(page.includes('data-stake-headline'), '要有輸贏的大提示區塊');
  assert.ok(/＋1/.test(page) && /−1/.test(page), '要用 ＋1 / −1 講清楚多了還是少了');
  assert.ok(/你多了一張/.test(page), '贏了要明講「你多了一張某某」');
  assert.ok(/被沒收了/.test(page), '輸了要明講「某某被沒收了」');
  assert.ok(
    /receipt\?\.remaining/.test(page),
    '同名多張時要顯示實際剩餘，不能宣稱整種卡都不能再押',
  );
  assert.ok(/grayscale/.test(page), '被沒收的卡要在視覺上明顯不一樣');
}

console.log('PASS: 押注只押自己的卡、解鎖規則唯一、輸贏有清楚的大提示');
