// 首頁 15 卡手機健康檢查設定（只描述「要查什麼」，不含任何產品邏輯）。
// 卡片順序 = 首頁 .home-feature-launch 的實際視覺順序（reports/mobile-15-review-2026-11-20/home-cards.json）。
export const HOME_CARD_SELECTOR = '.home-feature-launch';

export const CARDS = [
  { n: 1, id: 'tarot', href: '/tarot', name: '古老塔羅牌' },
  { n: 2, id: 'red-luan', href: '/red-luan-heartbeat', name: '桃花紅鸞心動' },
  { n: 3, id: 'numerology', href: '/numerology', name: '易經論數字' },
  { n: 4, id: 'ghost-asura', href: '/ghost-asura', name: '鬼魅阿修羅' },
  { n: 5, id: 'insight', href: '/insight', name: '易經紫微斗數' },
  { n: 6, id: 'match', href: '/match', name: '易經靈魂配對' },
  { n: 7, id: 'music', href: '/music', name: '生成一首歌', gated: true },
  { n: 8, id: 'zodiac', href: '/zodiac', name: '易經西洋星座' },
  { n: 9, id: 'bazi', href: '/bazi', name: '易經八字命盤' },
  { n: 10, id: 'nameology', href: '/nameology', name: '易經姓名學' },
  { n: 11, id: 'nameology-bazi', href: '/nameology?mode=bazi', name: '八字姓名學' },
  { n: 12, id: 'dual-chart', href: '/dual-chart', name: '易經神煞', gated: true },
  { n: 13, id: 'star-beasts', href: '/star-beasts', name: '星宿神獸' },
  { n: 14, id: '3d', href: '/3D', name: '立體太極模型' },
  { n: 15, id: 'nine-grid', href: '/nine-grid', name: '九宮格靈動數字' },
];

// 首頁本身也當一列檢查（第 0 列），並在手機寬度做「早滑被拉回」檢查。
export const HOME = { n: 0, id: 'home', href: '/', name: '首頁' };

export const VIEWPORTS = [
  { width: 360, height: 780, mobile: true },
  { width: 390, height: 844, mobile: true },
  { width: 1280, height: 900, mobile: false },
];

// 子流程：寶珠大小不縮。盤面需要遊戲進行中才會出現；沒出現就誠實標 SKIP，不為了出盤面去開局（開局會寫帳本）。
export const SUBFLOWS = [
  {
    id: 'bead-size',
    href: '/beast-game/match3-hard',
    cellSelector: '[data-testid="match3-board"] [data-r]',
    minPx: 44, // Match3Board.module.css .orb min-width/min-height
  },
];

// 米其林門檻（業主訂）：品質 9.5／穩定 9／服務 8.5。
export const THRESHOLDS = {
  clsMax: 0.05, // 小於 0.05 才算過
  lateShiftAfterMs: 2500, // 這之後才發生的位移視為「延遲出現的內容」（例如晚到的離線橫幅）
  settleMs: 6000, // 載入後再觀察多久，才抓得到晚到的橫幅
  tapMinPx: 44,
  fontMinBodyPx: 14,
  fontHardMinPx: 12,
  fontSmallShareMax: 0.15, // 可見文字中 <14px 的字數比例上限
  contrastNormal: 4.5,
  contrastLarge: 3,
  lcpGoodMs: 2500,
  lcpPoorMs: 4000,
  earlySwipeAtMs: 400, // DOMContentLoaded 後多久開始滑
  earlySwipePx: 1500,
  earlySwipeWatchMs: 6000,
  earlySwipePullbackPx: 200,
  earlySwipeRuns: 2, // 拉回是時序問題，跑兩次、任一次被拉回就算 FAIL
};

export const MICHELIN_TARGETS = { quality: 9.5, stability: 9, service: 8.5 };

// 頁面上出現這些字樣視為「客戶看得到的錯誤」。
export const VISIBLE_ERROR_RE = /Application error|This page could not be found|Internal Server Error|Unhandled Runtime Error|Something went wrong|發生錯誤|出錯了|載入失敗|服務尚未就緒/;

// 本工具不會用的連接埠（他人服務或被保留）。
export const RESERVED_PORTS = [3010, 3092, 3227, 8888, 9333];

export const DISK = {
  minFreeGbForBuild: 6,
  minFreeGbForRun: 0.3,
  minFreeMemGbForBuild: 2, // next build 在這個 repo 常吃 2G 以上；不足就拒建，避免把同機其他 bot 擠到 OOM
};

// 本機伺服器常缺正式後端設定（Supabase 等），這些 API 回 503 只代表「本機環境沒接後端」，
// 在非正式站目標降為 WARN 並標明；正式站上一律照 FAIL。
export const LOCAL_ENV_GAP_APIS = [/\/api\/home-trust/, /\/api\/guestbook/];
