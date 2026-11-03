# 首頁戰鬥神獸卡片五珠裝飾

業主明確允許只美化首頁「戰鬥神獸卡片」，加入遊戲中的五元素寶珠，禁止改卡片尺寸、文字、排列或入口。完成後恢復此限定範圍凍結。

沿用 Match3ElementGlyph 與 Match3Board 的五色材質 CSS，只顯示靜態裝飾，不掛載戰鬥元件、計時器、音效或存檔操作。五珠絕對定位在原卡空白處，不參與排版；使用首頁專屬軟角剪裁 ID，避免與遊戲 SVG 衝突。所有變更僅首頁卡元件及其局部樣式。

## 驗證
- 完整 production build、TypeScript 與 locked-cards 18 項通過；diff check 通過。既有非阻擋 lint 警告仍存在。
- 獨立隔離 Chromium：320/390/1366 寬，卡片分別280×264、350×240、976×240；卡片、外層、圖示、標題及CTA所有bbox和原版完全一致。
- 五珠各32×32，排列寬208，無內部捲軸，地珠完整，與按鈕相距18px；原入口 /star-beasts 實點成功，頁面錯誤0。
- 修正途中發現沿用遊戲wrap帶入overflow-x:hidden造成裝飾區小捲軸；僅在首頁裝飾區設overflow:visible修正，遊戲樣式未更動。
- 本機首頁HTTP200，右側目前首頁及目標卡已實際看見；沒有重設使用者資料。
- 手機為瀏覽器尺寸模擬，不宣稱實體手機驗收。

證據：本機Temp/match3-campaign-qa-6iavDQ/evidence三尺寸圖片與Temp/home-beast-orbs-candidate-comparison-20261103.json。此為提交前紀錄，正式部署另核對。
