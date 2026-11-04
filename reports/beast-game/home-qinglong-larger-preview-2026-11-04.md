# 首頁青龍放大與抓水珠發布驗收

## 本批提交批准

業主明確確認「好好可以，把它提交，如果沒有更好的方式就直接提交」。依本次連續視覺發布已明確核定的三項既有命理失敗例外，僅BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY保留；不改檢查、不偽造全綠、不擴修命理、不豁免新故障。本批只提交專用CSS與本紀錄，維持完整原圖、98%高度、translate(7px,17px) rotate(-8deg)，不切爪／彎曲重繪。下方未發布文字為歷史預覽狀態。

## 預覽及驗證

業主於朱雀發布期間追加首頁青龍放大、靠近五元素形成落腳張力，明確保留五珠尺寸／顏色／位置／互動。目標為 StarBeastHomeCard，不是內頁白虎朱雀戰鬥入口。本批只修改 components/StarBeastHomeCard.module.css 與本紀錄。

保留原正式 pounce-open.v2.webp、本體比例及-8度朝向，只將高度84%改94%（約增加12%）並下移2px。採爪勢靠近五珠上方的構圖，未重畫落腳動作；沒有移動五珠或遮住珠面。既有空間限制下未宣稱高度等同朱雀，未改其他卡片或擴大卡片高度。

320/390/768/1024px Edge隔離頁面驗證：卡片及五顆寶珠x/y/width/height與原基線JSON完全相同；完整旋轉圖片矩形在卡內，與五珠容器仍有約0.93–1.87px間距（透明圖片內輪廓留白更多），已目視390px。390px點擊正常到/star-beasts。最新截圖qinglong-larger-orbs-{width}.png，位於C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/。

本批僅本機預覽，未批准提交發布。其他未提交工作保留。

## 前批朱雀公開發布完成

提交a86449e9ecc9de85c1cec56199615ecad03e9d82，Vercel success：https://vercel.com/sam31094121s-projects/heaven-earth-humanity-pair/BbVDxxzLezcWDqkqygMir1Gc84Nc 。公開首頁320/390/768px確認新圖1448px原始來源、4:3、21px 12px 55px定稿位置、pointer-events:none，無pageerror。320/768實點、390鍵盤Enter均正常到dual-chart。390px其他14個入口的文字／尺寸／背景／邊框／圖片來源與部署前JSON完全一致。公開框邊截圖已目視確認尾羽進框內、未碰文字。截圖zhuque-live-a86449e-{width}.png及zhuque-live-a86449e-border-{width}.png。main與origin/main同步，工作樹仍保留使用者其他工作及本次青龍未提交預覽。

## 最新貼近五珠上緣

業主指定再大一點、再往下，腳部靠五珠上方。本次height94%→98%（相對前版再增約4.3%）、translateY2px→15px，保留-8度及原圖完整比例。先檢視8px下移仍有明顯距離，後收斂15px；已目視320/390px可見爪／尾下緣貼近五珠上緣，未蓋珠面符號，未宣稱改造肢體。四尺寸五珠及卡片幾何對照基線完全相同，390px實點正常。最新版qinglong-step-orbs-final-{width}.png（DPR3）；原圖片透明矩形可跨五珠區，但實際可見輪廓未遮珠面。仍僅本機預覽，未提交發布。

## 中爪對準水珠（claw-water）

核對StarBeastHomeCard的data-preview-element=WATER，為第三顆水滴形珠。僅整圖水平右移7px，垂直由15改17px；尺度98%、-8度不變。目視320/390px中爪對準水珠上緣，爪尖與水滴符號分離，未壓中心、未拼接爪。四尺寸卡片與全部寶珠幾何完全等同基線，390px入口點擊正常。最新qinglong-claw-water-{width}.png。只是構圖意象，不是抓珠功能；未發布。

發布前限定index快照npm run build完整通過：prebuild6146項、編譯／型別／51頁產出，保留lint warnings；雙入口與60卡技能SSR回歸通過。沒有建立分支或worktree；正式差異只有兩項青龍CSS及本紀錄。
