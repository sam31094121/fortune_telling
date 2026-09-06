/**
 * 禁止作假・計數器守門
 * ============================================================================
 *
 * 專案鐵律：禁止作假。這一支專門守住「顯示給客戶看的數字」。
 *
 * 【為什麼需要這一支】
 *
 * 2026-09-06 的審查抓到兩件事，兩件都是對客戶說謊：
 *
 *   一、瀏覽人數有 1,011,500 的底數，而且前端每 7–24 秒自己 +1，
 *       切回分頁還會依離開時間補算。number／iching／karma 三個功能
 *       顯示「1,271,2xx 人瀏覽」，visitIds 卻是空陣列——一個人都沒有。
 *
 *   二、認同數有 630,628 的底數。畫面寫「認同 630,674 人」，
 *       實際只有 46 個裝置按過。
 *
 * 虛增的社會證明不會因為「別人都這樣做」就變成可以。
 * 數字歸零之後會很難看，但**難看的真話勝過好看的假話**。
 *
 * 這支測試存在的意義，是讓那些底數不能悄悄被加回來。
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripComments } from './helpers/strip-comments.mjs';

/* ── 一、程式碼裡不得有憑空的底數 ───────────────────────────────── */
{
  const files = [
    'lib/visitor-counter.ts',
    'lib/local-ai-like-counter.ts',
    'components/FeatureVisitorCounter.tsx',
    'components/AiLikeFeedback.tsx',
    'components/AiTrustFeedback.tsx',
    'lib/local-ai-suggestion-counter.ts',
    'lib/local-visitor-counter.ts',
  ];
  for (const file of files) {
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    /*
      六位數以上的字面常數就是可疑的底數——真實計數不會寫死在程式裡。

      要先把底線拿掉再看大小：18_000 有六個字元但只是 18 秒。
      第一版漏了這一步，把毫秒常數當成假數字報上來——
      測試自己誤報，下一個人就會學會忽略它，那比沒有測試更糟。
      所以只看數值本身，且門檻訂在十萬。
    */
    const bigLiterals = [...code.matchAll(/(\w+)\s*=\s*(\d[\d_]*)\b/g)]
      .filter(([, name, literal]) => {
        if (Number(literal.replace(/_/g, '')) < 100_000) return false;
        // 時間常數不是計數：31536000 是一年的秒數（cookie max-age），
        // 不是「三千一百萬人」。用變數名分辨，不然測試會自己誤報。
        return !/_MS$|MS$|SECONDS|AGE|TTL|INTERVAL|DELAY|TIMEOUT|DURATION/i.test(name);
      })
      .map(([, , literal]) => literal);
    assert.deepEqual(
      bigLiterals,
      [],
      `${file} 出現寫死的大數字 ${bigLiterals.join('、')}`
      + '——顯示給客戶的計數不得有憑空的底數',
    );
  }
}

/* ── 二、前端不得自己讓數字長大 ─────────────────────────────────── */
{
  const code = stripComments(fs.readFileSync('components/FeatureVisitorCounter.tsx', 'utf8'));
  for (const forbidden of ['currentCount + 1', 'scheduleNextIncrement', 'applyElapsedIncrement']) {
    assert.ok(
      !code.includes(forbidden),
      `瀏覽數不得由前端自己遞增：${forbidden}`
      + '——沒有人造訪，數字也會往上跑，那是捏造流量',
    );
  }
}

/* ── 二之二、伺服器端也不得憑空長大 ─────────────────────────────── */
{
  const code = stripComments(fs.readFileSync('lib/local-visitor-counter.ts', 'utf8'));
  assert.ok(
    // 用 includes 不用正規式：這串裡有 . 與 +，寫成正規式很容易漏掉跳脫，
    // 而漏掉的後果是「永遠比對不到 → 斷言永遠通過」，比沒有測試更糟。
    !code.includes('displayCount: counter.displayCount + elapsedIncrements'),
    '伺服器不得依經過時間自動加計數——那比前端那條嚴重，它影響每一個人，'
    + '而且會被寫回資料檔固化下來',
  );
  assert.ok(
    code.includes('displayCount: visitIds.length'),
    '顯示數要從真實造訪紀錄推算，不能相信存下來的彙總欄位',
  );

  // 彙總欄位不得凌駕它所彙總的東西。
  for (const file of ['lib/local-ai-like-counter.ts', 'lib/local-ai-suggestion-counter.ts']) {
    const counter = stripComments(fs.readFileSync(file, 'utf8'));
    assert.ok(
      !counter.includes('Math.max(safeTotalCount, safeHighestCount, countFromLogs)'),
      `${file} 不得取「存的總數」與「算出來的」較大值——`
      + '存的一旦被灌過就永遠贏，而且每次寫回就再固化一次',
    );
  }
}

/* ── 三、存起來的數字要跟真實紀錄對得上 ─────────────────────────── */
{
  const visitors = JSON.parse(fs.readFileSync('data/visitor-counters.json', 'utf8'));
  for (const [key, value] of Object.entries(visitors)) {
    const real = (value.visitIds ?? []).length;
    assert.ok(
      value.displayCount <= real,
      `${key} 顯示 ${value.displayCount} 但只有 ${real} 筆真實造訪紀錄`
      + '——顯示數不得大於實際紀錄',
    );
  }

  const like = JSON.parse(fs.readFileSync('data/ai-like-counter.json', 'utf8'));
  const realLike = (like.deviceIds ?? []).length;
  assert.ok(
    like.totalCount <= realLike,
    `認同數顯示 ${like.totalCount} 但只有 ${realLike} 個裝置按過`,
  );
}

console.log('PASS: 程式碼裡沒有憑空的計數底數');
console.log('PASS: 前端不會自己讓瀏覽數長大');
console.log('PASS: 伺服器端不會自己長大，彙總欄位不凌駕真實紀錄');
console.log('PASS: 存起來的數字不超過真實紀錄');
