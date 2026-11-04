# 首頁青龍入口發布驗收

## 本批發布授權

業主在本次連續視覺發布作業已明確指示「那三項先暫時先暫停啦，先把這個都把它提交上去」，並在知道首頁尚未發布的情況審查青龍定稿、暫停聽取專業意見後，針對手機角色可辨及可點擊兩點最後答覆「好，OK」。依這次完整授權，首頁三檔可發布；僅保留 BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY 三個既有失敗例外，不關閉檢查、不宣稱全綠、不豁免新故障。下方「尚未發布／未獲例外」為歷史狀態。

定稿為 -8 度，沒有再改設計。提交僅 components/StarBeastHomeCard.tsx、components/StarBeastHomeCard.module.css、本紀錄。其他工作保留。

## 預覽與定稿過程

業主限定：首頁神獸入口上方改為正式青龍戰鬥姿態、移除可見「戰鬥神獸卡片」標題；下方五珠保持原樣，不加說明文。僅改 StarBeastHomeCard.tsx、其專用 CSS 與本紀錄。

使用 lib/beast-game/beast-rig.ts 的 QINGLONG_RIG 已登錄 pounce-open.v2.webp 完整張口戰鬥本體，CSS 整張旋轉 -18 度；無 AI 生成、裁切、角色改造或新增動畫。標題保留為連結無障礙名稱。五珠 JSX、樣式引用、材質與點擊行為未改。

Edge 隔離瀏覽器驗證 320/390/768/1024px：卡片寬高及每顆寶珠相對卡片的 x/y/width/height 與修改前 JSON 完全相同，圖片解碼成功、無 pageerror；390px 點擊正確進入 /star-beasts。已目視390px截圖。npx tsc --noEmit 通過，差異格式檢查通過。非手機實機測試，未宣稱全站健康通過。

截圖與修改前幾何紀錄位於 C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/，檔名 home-qinglong-{width}.png、home-before-{width}.json。

本批為本機預覽，未提交推送。既有全站健康59/62，BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY 未在本批修復；前批發布例外不沿用本批。其他未提交工作原樣保留。

前批白虎／朱雀入口 38dd3cf8e170f953248d39f5555cd5c15c0a44a5 已推送且 Vercel success。公開站390/768px確認正式兩張圖與核定旋轉角度，無 pageerror，點擊到 battlefield；公開截圖 duel-live-38dd3cf-{width}.png。

最後目視320/390/768px，判斷可定稿、不追加修飾。四尺寸檢查完整旋轉圖片矩形都在卡內、未碰五珠（外接矩形間距至少2px，透明圖實際輪廓留白更多），全頁無橫向溢出，唯一可見文字為原開啟按鈕。

業主追加重心微調：僅將整張青龍旋轉從 -18 度減至 -8 度，位置、尺寸、素材不變，非改坐姿。最新 home-qinglong-stable-{width}.png。四尺寸重驗卡片與五珠幾何完全不變，完整圖像在卡內，距五珠約10px，無橫向溢出；已目視320/390px，傾斜收斂且保留張口攻勢。仍未提交發布。

發布前：限定 Git index 快照 npm run build 完整通過（prebuild 6146項、編譯、型別、51頁產出；保留 lint warnings）。320/390px重新實點成功；五珠 JSX 與上一提交逐字比對完全相同。沒有新分支或 worktree。
