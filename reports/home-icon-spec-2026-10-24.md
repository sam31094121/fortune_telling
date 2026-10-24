# 首頁十五個圖示小卡規格統一 — 2026-10-24

## 本輪範圍
業主以「古老塔羅牌標題旁金字塔」定位，明確要求十五個小圖示卡同規格；隨後指定內部意境下一輪再改，本輪只做外部規格並使用既有配色。這不是已撤回的整張入口卡方案。

統一實際規格：64×64px、1:1、20px圓角、8px內距、1px實線邊框、grid置中、禁止縮小、無傾斜。各圖示原有背景與邊框色不覆寫，內部圖案、字形、SVG與動畫皆未改。只使用溫和中性陰影，不引入統一金色。

## 實作盤點
在四個TSX檔的十五個原容器加 data-home-entry-icon，CSS只選取首頁群組內此標記，不選取標題、整卡或按鈕。

| 功能 | 原圖示 | 位置 |
|---|---|---|
| 易經靈魂配對 | 緣 | app/page.tsx |
| 生成一首歌 | 生 | app/page.tsx |
| 易經姓名學 | 名 | app/page.tsx |
| 姓名學 × 八字 | 合 | app/page.tsx |
| 易經論數字 | 吉 | app/page.tsx |
| 易經紫微斗數 | 紫 | app/page.tsx |
| 易經八字命盤 | 辰 | app/page.tsx |
| 易經神煞 | 易 | app/page.tsx |
| 易經西洋星座 | 星 | app/page.tsx |
| 桃花・紅鸞心動 | 桃 | app/page.tsx |
| 立體太極模型 | 原太極／立方SVG | app/page.tsx |
| 九宮格靈動數字 | 九 | app/page.tsx |
| 鬼魅阿修羅 | 修 | components/GhostAsuraHomeEntry.tsx |
| 星宿神獸卡片 | 宿 | components/StarBeastHomeCard.tsx |
| 古老塔羅牌 | 原金字塔 | features/tarot/components/TarotEntryCard.tsx |

## 配色來源
沿用 app/globals.css 現有 .home-oracle-3d-emblem 各分類的 --emblem-main/hot/deep（rose、violet、amber、emerald、fuchsia、indigo、peach），以及 .number-fortune-auspicious-emblem、.ziwei-dou-3d-emblem、.tarot-entry-emblem 專屬色。
阿修羅沿用 GhostAsuraHomeEntry.module.css 與既有全域覆蓋；太極沿用 app/page.tsx 既有SVG／容器及全域盾牌色覆蓋。沒有把來源類別色強行蓋過現行全域配色政策，新增CSS不設定 border-color、background 或內部字色。

## 驗證
- 320、390、430、768、1280 寬度：每張入口恰有1個標記，總計15個；所有實際尺寸均64×64，圓角20px，內距8px，transform none。
- 上述寬度標題與按鈕無溢出、頁面無水平溢出。
- 桌機修改前後逐一比對15張入口：href、文字、標題字型／字色、整卡背景／邊框、按鈕背景／字色全部相同。
- 程式差異確認TSX只增加標記，未改內部圖案或事件。未重新執行十五個功能內部流程；本輪不變更導航。
- 手機／桌機實際截圖檢視。
- test:locked-cards 18項通過；test:mobile-zoom-pan 50項通過；git diff --check 通過。
- 既有六項全站健康失敗仍保留，最後有效全站結果49/55，本輪不宣稱改善。

## 交付與界線
新截圖（不要與已撤回整卡方案混用）：
C:/Users/DRAGON/Documents/Codex/2026-10-24/realtime-voice-chat-2/outputs/home-icon-spec-desktop.png
C:/Users/DRAGON/Documents/Codex/2026-10-24/realtime-voice-chat-2/outputs/home-icon-spec-mobile.png

本輪僅本機預覽，不提交推送。已部署的三張遊戲難度入口與神獸角色卡未改；其他九宮格等未提交工作保留。內部圖案意境待下一輪業主指定。

最終建置：npm run build 通過（41/41 靜態頁，exit 0），含最後20px圓角版本；原有 lint warnings 保留。

後續業主目視驗收指出阿修羅、立體太極、塔羅等呈現／對齊仍不同，已依新授權完成逐卡修正；最終規格與75筆量測以 home-icon-alignment-2026-10-24.md 為準，勿將前輪僅容器尺寸通過當作最終視覺驗收。
