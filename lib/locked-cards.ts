/**
 * 上鎖卡片清單（業主定案 2026-10-12）：點進去要先輸入密碼，密碼與「易經神煞」是同一組，輸入一次全部解開（30 分鐘）。
 *
 * 「鎖號碼」的做法（以後要鎖別的卡片，照同樣方式做，然後把它加進下面這份清單）：
 *   1. 頁面：app/<路徑>/page.tsx 改成伺服器端外殼，沒有有效 session 就顯示 <PasswordGate>（見 app/music/page.tsx）
 *   2. 後端：該卡片用到的 API，POST 開頭先呼叫 lockedCardGuard(request)（見 lib/dual-chart-auth.ts）
 *   3. 首頁：卡片的按鈕文字改成「輸入密碼」
 *   4. 把路徑登記在這裡；tests/locked-cards.test.cjs 會逐一核對上面三點，並確認密碼本身不在任何程式碼裡
 *
 * 密碼不寫在程式裡：它是環境變數 DUAL_CHART_PASSWORD（搭配 DUAL_CHART_SESSION_SECRET，至少 32 字）。
 * 要換密碼就換環境變數，所有上鎖卡片同時生效。沒設定密碼時（開發或公開模式）會放行，與易經神煞一致。
 */
export interface LockedCard {
  /** 卡片連結（首頁卡片的 href） */
  route: string;
  /** 這張卡片用到、必須同樣上鎖的 API 路徑（app/api/<名稱>/route.ts） */
  apis: readonly string[];
  /** 密碼畫面的標題 */
  title: string;
}

export const LOCKED_CARDS: readonly LockedCard[] = [
  { route: '/dual-chart', apis: ['dual-chart'], title: '輸入密碼，開啟易經神煞' },
  { route: '/music', apis: ['music-generate', 'music-elevenlabs', 'music-lyria'], title: '輸入密碼，開啟人格音樂' },
  { route: '/ghost-asura', apis: ['ghost-asura/reading', 'ghost-asura/timeline', 'ghost-asura/validate-consistency'], title: '輸入密碼，開啟鬼魅阿修羅' },
];
