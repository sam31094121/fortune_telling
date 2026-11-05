# 首頁數字入口視覺驗收 — 2026-11-05

範圍：業主批准九宮格靈動數字（觜火猴幼子）及易經論數字（壁水貐幼子）的首頁入口視覺並提交。不改計算、目的頁或其他卡片。

素材：BeastCardTile 正式卡面 young-20.v2.webp、young-14.v2.webp。全部沿用現有素材，無生成新圖。九宮格使用原圖竹林邊景；壁水貐保留原卡黑色場景與石台。

檔案：app/page.tsx 的兩個入口與兩份獨立 CSS module。其他原有未提交工作排除。

驗證：320、390、768、1024px 預覽；圖片底部位於按鈕上方；易經論數字逐尺寸點擊到 /numerology。九宮格先前 320/390/768 尺寸基準不變，本輪再次檢查四尺寸無遮擋。人工查看 390px 截圖，角色完整、標題和按鈕清楚。npm run build、npx tsc --noEmit、git diff --check 通過。編譯保留既有警告，未修改其他命理模組或宣稱全站來源稽核通過。

截圖：C:/Users/DRAGON/Desktop/命理/.tmp/number-final-390.png；C:/Users/DRAGON/Desktop/命理/.tmp/nine-grid-final.png。

限制：手機瀏覽器尺寸模擬，非實體手機驗收。正式部署須另核對。
