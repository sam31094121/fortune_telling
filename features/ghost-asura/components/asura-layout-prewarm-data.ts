// 2026-11-09 用戶鈺勝指定（任務 3：動畫／開卡在畫面外先排版）。
// 阿修羅結果卡實際用到的「字體堆疊 × 字重 × 字級」組合（由 production build 開卡後逐元素量測 computed style 取得，
// 收斂成 400／700／900 後共 39 組；其中 2 組 generic serif 的首次中文後援字型搜尋單次就要約 55ms（CPU 4×），
// 無法再切小，放進預排會在表單頁產生長任務，所以不預排，共 37 組）。只拿來在填表閒置時預先建立字型與字形快取，不顯示、不含任何命盤內容。
// 若卡片 CSS 之後改字體／字級，這張表只是少暖到幾組，不會影響畫面；可用 _tmp 量測腳本重新產生。
export const ASURA_PREWARM_FONTS: ReadonlyArray<readonly [family: string, weight: number, size: string]> = [
  ["\"Asura Brand Brush\", DFKai-SB, BiauKai, STKaiti, KaiTi, \"Noto Serif TC\", \"Songti TC\", PMingLiU, serif", 400, "42.12px"],
  ["\"Asura Brand Brush\", serif", 400, "42px"],
  ["\"Asura Tiles Brush\", \"Asura Brand Brush\", DFKai-SB, BiauKai, STKaiti, KaiTi, \"Noto Serif TC\", \"Songti TC\", PMingLiU, serif", 400, "28px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "12px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "13px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "14px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "15px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "16px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "17.5px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "17px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "18px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 400, "20px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "10px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "11.52px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "11px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "12px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "13px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "14px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "15px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "16.38px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "16px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "17.5px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 700, "18px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "10px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "11px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "12px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "13px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "14px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "15px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "16px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "17.5px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "18px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "19.6px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "20px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "21px"],
  ["\"Microsoft JhengHei\", \"PingFang TC\", \"Noto Sans TC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif, ui-sans-serif, system-ui, sans-serif", 900, "24px"],
  ["sans-serif", 400, "13px"],
];

// 固定的常用字樣本（卡面固定標題常見字＋數字與標點），不含個人資料。
export const ASURA_PREWARM_TEXT = '鬼魅阿修羅命魂戰局印記覺醒過去現在未來旗令勢戰神你今年的是在不了有和人這中大為上我以要他時來用們到作，。、：「」（）0123456789';
