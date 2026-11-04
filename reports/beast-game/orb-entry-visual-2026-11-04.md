# 寶珠入口視覺（2026-11-04）

## 本批發布批准

業主在明確詢問本批三項既有命理檢查例外後回覆「好，現在這個把它提交都沒問題了，直接上線啊」。本批可提交發布，例外僅 BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY，不豁免新故障或擴大範圍。下方未發布狀態為製作過程紀錄。提交僅入口 page.tsx、GameModes.module.css 與本紀錄；上方三合一戰鬥卡不是本批設計任務。

發布前將暫存區匯出為獨立檔案快照（無分支／worktree），只包含已提交基線及本批三檔，排除其他使用者未提交修改。快照 npm run build 完整通過，保留 lint warnings；實際雙入口及六十張原技能渲染回歸通過。最終六尺寸置中、路徑合法及入口點擊證據沿用本輪已完成驗證。

## 第七版擺正置中（最終交付）

依業主最後收斂指示，僅移除棋盤 rotateX／rotateZ／scale 與父層透視，陰影改為水平置中；保留第六版所有水元素連線、左右斜連、三盾牌與標題，不再擴改火／水線條。六種尺寸實測棋盤 transform=none，棋盤與卡片中心差小於 1px，無橫向溢出；檢視最新 390px 圖確認擺正。截圖 orb-card-v7-straight-{width}.png、orb-entry-v7-straight-{width}.png 為目前最終版本。其餘規則與入口驗證沿用第六版，未提交、未推送、未發布。

## 第六版：左右斜向與三盾牌（歷史）

業主連續細修後以「左邊保留、右邊再一個斜向」為準：保留左下斜線與上方斜線，右側第七欄增加斜向轉折。14 顆水珠構成單一合法路徑，含水平、垂直及兩種斜向。線與光暈引用原遊戲 water 類別的 --c=#2c74d0，只以同色深淺提高辨識。無新增說明文字。

三顆遊戲 080 盾牌在第七列的第二、四、六欄（土／風／火），不與連線相交。直接重用遊戲的 shieldOrb、magic、shieldCell CSS 與 /pwa/save-shield-080.png；雖檔名與安裝盾牌素材相同，但已確認這就是 Match3Board 的實際盾牌渲染，入口不掛安裝事件或技能。普通同色路徑觸發盾牌可清同色珠；三顆以上純盾牌同元素連線轉換其他同色珠為盾牌，混合元素則清除涉及元素、充能並反擊減傷一半。這是唯讀功能核對，不改規則，也不把裝飾圖視為玩家戰局。

從最新 JSX 的實際盤面與 SVG 路徑擷取資料，用遊戲 canExtend 逐步驗證全部相鄰、同色、不重複、不交叉，且避開三盾位置。最新 Edge 隔離頁面 320/375/390/430/768/1024px 均無橫向溢出、無 pageerror、三盾圖片解碼成功；390px 實際點擊進原遊戲。TypeScript 在加入盾牌與路徑後通過，後續僅微調盤面及 SVG 常數。最新檔名 orb-card-v6-right-diagonal-{width}.png、orb-entry-v6-right-diagonal-{width}.png；已目視檢查 390px 最新卡面。v3/v4/v5 都是中間版本，不作最終展示。未提交、未推送、未發布，其他使用者修改保留。

## 第三版方向示意（歷史）

依業主要求在第二版真實遊戲寶石上，用圖示範上下左右連線。只調整入口靜態盤面排列、連線 SVG 與入口樣式：11 顆同色水珠的單一路徑，起點實心點、終點圓環、四個格間小箭頭。沒有增加說明文字或遊戲功能。

唯讀核對 config.ts：hard45 為 7×8 且 diagonal=true；board.ts isAdjacent 接受八方向；drag.ts canExtend 檢查相鄰、同色及重複格。從本次 JSX 盤面與 SVG 擷取實際座標，用既有編譯 canExtend 逐顆驗證通過，同時確認含上、下、左、右四方向。此路徑是合法示例，不宣稱只允許四方向，也不修改引擎。

Edge 隔離瀏覽器 320/375/390/430/768/1024px：56 個原版符號、無橫向溢出、無 pageerror；390px 實際點擊進入原 match3-hard。已檢視 orb-card-v3-390.png。最新截圖以 orb-card-v3-{width}.png 與 orb-entry-v3-{width}.png 存在前述視覺資料夾。保留 v2 與 actual-game-board-v2.png 供歷史對照，不將舊圖當最新交付。本次仍不提交、不推送、不發布。

## 第二版歷史（下方第一版已被業主否決）

業主要求使用遊戲盤面真正的造型、符號及材質，優先於通用圓珠技能。已唯讀確認 Match3Board.tsx 的 OrbCell：使用 Match3Board.module.css 的 orb／各元素類別／gem，困難模式使用 Match3ElementGlyph；並非 BeadOrb 或 ElementTreasureOrb。

入口直接重用上述 CSS module 與 Match3ElementGlyph，沒有修改它們或遊戲引擎。第二版加大寶石尺度、使用微傾斜棋盤、厚度陰影與香檳金框、同色斜連線，保留單一主標題。第一版通用圓珠引用已移除。

Edge 隔離瀏覽器實際從 match3-hard → 親朋好友 → 選主角 → 選四位夥伴 → 開戰，取得真實 56 珠盤面截圖，與第二版逐項對照形狀及符號。未出招、未使用客戶收藏或既有瀏覽器資料。320/375/390/430/768/1024px 第二版入口皆有 56 個原版 glyph 且無橫向溢出；入口回歸及 TypeScript 通過。這不是實機驗收。嘗試開啟 IAB 預覽失敗（此環境無 IAB），改提供最新圖片與本機網址。

第二版最新截圖位於同一視覺資料夾：orb-card-v2-390.png、orb-entry-v2-768.png、actual-game-board-v2.png（真實遊戲盤面對照），其餘尺寸亦以 v2 命名，避免第一版圖片快取。未提交、未推送、未發布；原發布門檻不變，不再次打斷製作要求批准。

## 第一版歷史紀錄（不作目前交付）

範圍僅 /star-beasts 的寶珠戰・困難入口。修改 app/star-beasts/page.tsx、GameModes.module.css；本文件記錄驗收。沒有修改遊戲規則、獎勵、難度、結算、命理、神獸資料或三合一戰鬥流程。

使用既有 ElementTreasureOrb 共用五色材質，靜態 7×8 裝飾盤面與同色斜連線；只顯示原主標題。不是客戶實際戰局、進度或可領獎內容。未生成圖片、未複製第三方美術、未新增音效或互動。網格項目靠上，避免新卡高度拉長旁邊原戰鬥卡；1024px 下原戰鬥卡仍 232px 高。

## 官方研究

- King 2023 年公告 Candy Crush 系列累計超過 50 億次下載，僅支持該系列普及程度，不支持某卡面最受喜歡或留存保證：https://www.king.com/corporate-and-media/posts/press-releases/celebrating-20-years-of-gaming-excellence-kings-milestone-journey/
- Flow Free 官方遊戲頁強調同色連線、盤面和彩色圖形：https://www.bigduckgames.com/flowfree
- Candy Crush 官方入口：https://www.king.com/game/candycrush （轉往 https://www.candycrush.com/）。本輪採用「盤面為主、元素易辨、連線清楚、標題簡短」的設計判斷，不宣稱大數據已證明本入口最佳。

## 實際驗證

- soft-element-orb 材質／靜態狀態回歸通過。
- today-quest-state 12 項既有共享狀態回歸通過。
- beast-match3-picker-render 通過：六十張原技能及雙入口保留。
- npx tsc --noEmit --incremental false 通過；git diff --check 通過。
- Edge headless 隔離頁面、reduced-motion 偏好：320/375/390/430/768/1024px 均無橫向溢出、無 pageerror；56 顆共用寶珠、只留標題，390px 實際點擊轉入 /beast-game/match3-hard。
- 首輪文字斷言因瀏覽器在箭頭前插入換行而失敗，改用忽略排版空白的同內容比對後通過；未改產品文案來遷就測試。
- 逐張檢視 320px 卡面、390px 頁面、1024px 頁面。非手機／平板真機驗收，不宣稱性能或喜好測試完成。
- 截圖位於 C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/，orb-card-{width}.png 與 orb-entry-{width}.png。

## 發布狀態

未提交、未推送、未部署。本批不沿用上一批三合一戰鬥的發布例外。既有全站結果 59/62，BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY 尚未獲本批例外；不反覆重跑無關已知失敗、不修改命理。其他既有未提交工作保留。
