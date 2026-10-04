# 新版阿修羅／神獸依賴分離

核對時間：2026-10-04 11:05（台北）。延續 `ghost-asura-release-audit-2026-10-04.md`，不覆蓋前輪失敗紀錄。

## 本輪要求與結論

使用者明確要求只處理阿修羅，把無關的神獸切開；神獸先不修。完成的是**模組依賴與專項驗證的分離**，不是兩套獨立部署，也不是全站健康通過。本輪未新增提交或推送。

## 實際连接點與修正

原路徑：`/ghost-asura` → `/api/dual-chart` → `lib/dual-chart.ts` → 僅為使用 `verifyFourPillars` 而載入 `lib/three-in-one.ts` → `lib/ziwei-star-beast-link.ts` → `data/star-beasts.json`。

已改為：`lib/dual-chart.ts` → `lib/four-pillar-verification.ts`。將既有四柱比較函式、中文標籤和型別原樣移出為無依賴工具。`three-in-one.ts` 仍呼叫及重新匯出同一份工具，既有呼叫者不需改動，神獸整合流程保留。沒有新造四柱算法、改命中規則或刪原始結果。

專項入口 `npm run check:ghost-asura` 使用 `tsconfig.ghost-asura.json` 檢查真實页面、首頁入口、全域 layout、共用 API／session 及其傳遞依賴，再跑新版穩定性、生命週期、文案、呈現、接線和多寬度資料一致性測試。這個命令**不是 production build，也不取代現有發布閘**。根 tsconfig、next.config、build 腳本、推送閘及 Vercel 設定未改。

TypeScript 實際傳遞圖包含 102 個專案檔案，沒有神獸功能、素材資料或整合模組。共用語言提供者仍帶入兩個純字串翻譯字典 `lib/korean-copy/pages/star-beasts.ts`／`beast-game.ts`；不是遊戲邏輯。測試僅允許這兩個明確檔案，並逐個 AST 節點要求其為純字串物件，禁止把函式／匯入／展開運算偽裝成字典。未為了隔離而改全站翻譯系統。

## 可重現驗證

| 指令／檢查 | 本輪結果 | 證據界線 |
|---|---|---|
| 新依賴邊界測試，改接線前 | 失敗 | 抓到 `ziwei-star-beast-link.ts`、`data/star-beasts.json`；先證明原耦合存在 |
| `npm run check:ghost-asura` | 通過 | 真實傳遞型別依賴、後端執行不載入神獸、16 種四柱差異、舊匯出與新工具函式同一性；其餘新版專項全過 |
| `npm run test:bazi` | 81 通過／0 失敗 | 四柱原算法未變 |
| `npm run test:bazi-ziwei-cross` | 104 通過／0 失敗 | 三核心原流程 |
| `npm run test:three-in-one` | 142 通過／0 失敗 | 既有整合、神獸提供與缺時辰拒絕條件均保留 |
| `npm run test:iching-shensha-live-api` | 7 組通過、4 種未知／缺時辰拒絕通過 | 真實本機 API、實際元件，不代替幾何驗證 |
| `npm run test:bazi-output-availability` | 仍失敗 | 舊鬼魅 hook 顯示斷言 `tests/dual-chart-iching-shensha-output.test.cjs:292`，本輪未擴修 |
| `npm run build` | 仍失敗 | 編譯階段成功；型別檢查停在 `components/StarBeastHomeCard.tsx:81` 英文字典缺 badge。未略過 |
| 相關三個 lib 檔 eslint、`git diff --check` | 通過 | 不替全站其他項目背書 |

## 真實畫面

在原本的阿修羅驗證頁重新按「開啟命魂戰局」，同一份輸入重新呼叫後端。年／月／日／時顯示 3／4／4／6、17 枚覺醒，頁面原布局未改，沒有跳到神獸；此筆數不是產品常數。其他使用者的雙命盤頁保留，未重填。

截圖：`.tmp/ghost-asura-layout-qa/isolation-2026-10-04.png`。瀏覽器結果與實際操作已驗；本輪沒有新增手機幾何設計，先前手機證據見 layout／release-audit 報告。原來源 6 已核／59 參考待補的狀態完全未升格。

## 發布邊界與下一個必要決策

- 整站仍是單一 Next 專案，首頁載入神獸卡，而 `npm run build` 檢查全站；移除阿修羅業務依賴不會讓獨立的首頁錯誤消失。
- 本輪没有重跑整批 55 項健康掃描。上一輪 45／55（9 執行失敗、1 未執行）保留於 `reports/screen-health/latest.json`，不能說只剩神獸一個問題；相關輸出回歸本輪亦再次失敗。
- 沒有改神獸檔、關閉型別檢查、從根配置排除檔案、改部署路由或繞推送閘。依目前 AGENTS 條件不提交／推送。
- 若要在全站尚未修復前獨立發布阿修羅，需要另行批准「獨立部署單位」的架構工作：獨立入口及建置、只引用共用命理核心、保留 session 安全邊界、確認既有域名路由／發布方式。這不是再詢問相同提交許可，也不等於修改神獸；實作與外部部署變更未執行。
- 不擴大部署範圍的選項是保留本機已驗證版本，待整站門檻恢復再提交既有範圍。main 仍 ahead 1，含先前提交及本機未提交修改，沒有清理或覆蓋其他工作。
