# 神獸各玩法卡面同步（2026-10-24）

授權範圍：以目前簡單三卡戰場的卡片為基準，同步其他既有玩法呈現；玩法、數值、收藏結算及後端資料不變。

施工前證據：BattleArena 的新版血條與手機卡片比例被 data-easy-cards/tapToAttack 限定；中等 BeastDuelRitual 揭牌與等待卡仍直接使用縮圖加舊框，未使用簡單戰場的 BeastCardFace。2026-10-19 紀錄明載當時只解鎖簡單，其他模式維持凍結。現行入口三種，DifficultyIndicator 的五級文字沒有呼叫端，沒有可驗收的第四／第五入口。

8888 實際使用 C:/Users/DRAGON/Desktop/命理 的 main，本輪直接在該目錄限定施工。此聊天自動附加的 8452 工作樹保持未改，不建立其他分支。不推送、不發布。既有其他工作與圖片修改保留。

## 本輪完成範圍

- 共用 FrameV1Tile：可點選卡、純顯示卡與縮圖均使用同一完整卡面；移除 StandardTile 舊卡面與未知 ID 的舊圖 fallback。未知 ID 顯示「暫時無法取得」。
- 60 卡的 180 張既有 front／480／thumb 圖片網址改用實際檔案 SHA-256 前 12 碼作版本，避免沿用舊快取；未修改圖片內容。
- 簡單／困難戰場共用卡片及血條呈現；簡單點卡攻擊開關仍只屬簡單。困難手牌、主戰、後備與押卡改完整 63:88，避免方槽裁掉技能列。
- 中等揭牌、等待、收藏、成長押卡、獎卡、結算與詳情改完整卡面；保留原三局規則與角色戰鬥立繪。未添加中等原本沒有的即時 HP 或魔珠。
- 星宿神獸圖鑑、四象、詳情、成長中心、羈絆、八字四柱、紫微本命／幼子、姓名學、配對入口共用 CatalogBeastCard，再使用既有後端手冊與 BeastCardFace；沒有修改選獸規則。
- 清除父層 img／span／small 樣式對完整卡內容的誤套；成長與羈絆幼子不再覆蓋成獸技能列。移除前卡多餘舊金屬外框，牌背保留。
- 舊資產仍有來源登記、角色演出或其他共享引用，未刪除這些資料。此次移除的是已確認替代的前端卡片渲染與回退路徑。

## 可重用標準

C:/Users/DRAGON/.codex/skills/beast-game-fairness/references/shared-card-standard.md 與 card-baseline-2026-10-24.json 已保存；基準清單含 180 圖檔及 4 原始來源摘要，沒有以完工版本覆蓋施工前快照。技能格式驗證通過。

## 驗證與限制

- 新增 BeastCardSync：60 卡逐一核對 tile／face／thumb 文字與圖片 srcSet 相同、可選卡仍只有一個按鈕及原點選回呼；未知 ID 不回退舊圖。2 項測試通過。
- 公平性 194 核心、9 獨立回歸及 1000 局抽樣通過；三局模式 1000 局、API、揭牌儀式、音色、難度 15 項（各難度 600 樣本）通過。
- 押卡及收藏 50 項回歸通過。第一次健康檢查中的 BEAST_STAKE_REWARD 失敗為測試載入器不支援 cards/skills/index.ts；已補一般目錄解析並完整重跑原斷言通過，未降低測試。
- 八字基本 81/81 通過；健康檢查內八字紫微交叉、輸出可用性通過。型別檢查通過；指定檔 ESLint 0 error，星宿頁既有 hook dependency warning 保留。
- 真實本機頁面：390px 星宿圖鑑成獸／幼子、困難準備手牌點入主戰已觀察，完整卡面與技能列可見，沒有押注或扣動客戶收藏。
- 合成資料掛載真實元件：390px 中等揭牌、困難戰場、八字四柱、紫微成獸／幼子切換、收藏卡已觀察。這不是八字／紫微完整送出流程驗收；沒有宣稱所有真人遊戲流程、所有手機或全部 60 張均逐張肉眼驗收。
- 截圖：reports/card-sync/{medium-390,star-young-390,bazi-390,ziwei-young-390,collection-390,hard-preparation-390}.png。工程臨時頁已移除，未保留額外產品入口。
- 另一名唯讀代理複查舊卡引用、CSS 污染及裁切；指出困難方形槽，已修正並在正式頁點選驗收。

## 全站健康檢查仍未通過

原始 reports/screen-health/latest.json：55 項中 45 通過、10 失敗。上述押卡項已單獨修正重跑通過，未覆寫原始失敗報告。其餘 9 項未在此次卡面同步範圍修正或宣稱通過：
BAZI_SERVICE_AVAILABILITY、BAZI_SOURCE_REGISTRY_COMPLETE、BAZI_FEATURE_COMPLETE、ICHING_NO_FABRICATED_HOUR、NO_FABRICATED_COUNTERS、THREE_CORE_TRADITIONAL_DEFECTS、ZIWEI_FORM_FILL、AI_TEACHER_AVAILABILITY、DUAL_CHART_SHENSHA_DISPLAY。

本輪沒有提交、推送或發布。主線原有 ahead 8 / behind 8 及其他工作變更均保留；不能宣稱乾淨同步或全站健康。限定卡面呈現範圍完成後恢復功能凍結。

## 最終建置與推送門檻核對

- npm run build 最終通過（隔離 .next-production，未停用 8888），完整記錄在 reports/card-sync/build.log。首次建置因已刪除工程驗收頁的 .next/types 殘留而失敗；僅刪除該頁生成型別後重跑通過。
- 最新業主已授權「好了，全部提交推上」，取代本輪早期不推送要求。但 AGENTS 明定一般發布授權不豁免測試門檻；目前健康檢查未全過，因此尚未提交或推送，不把此狀態稱為發布完成。
- 已 git fetch origin main；main 與 origin/main 仍 ahead 8 / behind 8，雙方各有未整合提交。未 rebase、merge、reset 或 force push，既有工作均保留。
- HEAD 所存上一份健康報告已有八字服務、來源完整性、功能完整性、計數器、三核心原典及雙盤神煞等 6 項同名失敗。另 3 項（易經無時辰斷言、老師回應契約、紫微鬼魅劇情等待超時）仍須獨立釐清，不能全稱為本輪前已知。相關核心與兩個斷言測試檔沒有本輪差異；紫微手機流程已走到鬼魅老師階段後超時，不能宣稱整個流程通過。
- 本輪代碼在卡片／其引用與展示樣式、測試載入器、新增卡片一致性測試和報告；九宮格、75 張圖片與既有資產報告不是本輪產出。沒有將這些既有修改暫存或混入提交。
