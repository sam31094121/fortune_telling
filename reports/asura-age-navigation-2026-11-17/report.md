# 阿修羅年齡導覽視覺驗證（2026-11-17）

本輪只修改 AsuraAgeTimeline.tsx、AsuraAgeTimeline.module.css；新增 development-only 的 app/internal/asura-age-review/page.tsx 供合成資料視覺檢查。無後端、命盤 API、解讀、共享寶珠材質或技能來源修改。完成限定視覺工作後恢復凍結。

正式入口：http://localhost:8888/ghost-asura 。依原流程取得結果後查看年齡時間線上方導覽。
安全預覽：http://localhost:8888/internal/asura-age-review 。直接顯示實際共用元件；標明合成資料、不代表客戶命盤、不呼叫 API 或儲存進度，production 回傳 notFound。

原六個小圈改為五顆既有 ElementTreasureOrb（空、風、水、火、地），採靜態展示，不啟動儀式／獎勵。六段資料僅導覽略過首段，原內容、原順序與上一段入口保留。其他段數保留全部導航，元素循環展示，不裁資料；不是年齡元素的命理判定。現在段直接讀 isCurrent，跳轉保留原 segments 索引。

驗證：
- Playwright / Edge：320、375、390、430、1280px，五色／五顆、年齡標示、44px 觸控區、所有五個原目標、Enter 操作、上一段返回首段通過。
- 額外 1／12 段不遺失導航；首段為目前段時不錯標其他寶珠；reduced-motion 模式通過，寶珠本身 animated=false。
- 合成預覽 API 請求數 0，頁面 JS 錯誤 0。這是實際元件隔離驗證，不宣稱客戶正式全流程或真機性能已測。
- check:ghost-asura:types、tsc --noEmit --incremental false、soft-element-orb、today-quest-state、ghost-asura-present-guide、ghost-asura-stability、ghost-asura-page-flow、ghost-asura-layout 全通過；git diff --check 通過。
- 既有全站 latest.json：2026-11-17 19:15（台北）64/66。本輪沒有重跑或覆寫完整健康紀錄。獨立重跑來源阻擋：八字來源 19 claim / 8 ERROR；易經神煞 deliveryOk=true、sourceVerified=false、59 項來源待核。保留原規則，不宣稱是本輪造成。

證據絕對目錄：C:/Users/DRAGON/Desktop/命理/.tmp/asura-age-review/
- before-mobile.png / before-desktop.png：修改前。
- after-320.png / after-375.png / after-390.png / after-430.png / after-1280.png：修改後。
- verify.cjs / results.json：可重跑視覺驗證。
- bazi-source-gate.txt / iching-source-gate.txt：本輪來源閘門輸出。

未提交、未推送：AGENTS.md 要求檢查失敗時禁止自動更新。main 與 origin/main 同步，但工作區有本輪未提交內容及原有其他聊天 reports/beast-game、reports/screen-health 變更；原有變更未處理。

## 條件提交授權後重查（2026-11-17 19:39 台北）

已 git fetch origin main，HEAD 與 origin/main 均為 a9b0ad90c9429bdeb02de1518932d2cd026706eb；本輪視覺程式尚未提交。重新審查差異確認僅導覽，不改後端、命盤 API 或解讀。

再次通過：check:ghost-asura:types、soft-element-orb、ghost-asura-stability、ghost-asura-page-flow、五寬度瀏覽器 verify.cjs 與 git diff --check。既有其他同版本回歸證據仍適用。

完整手機優先健康檢查 19:36–19:39：64/66、2 failed、0 warnings、1 flaky。來源阻擋仍為 BAZI_SOURCE_REGISTRY_COMPLETE 與 DUAL_CHART_SHENSHA_DISPLAY。以原健康腳本副本執行，只調整相依模組的絕對引用及報告輸出目錄，使用 --mobile-first --no-repair，沒有修改檢查斷言；完整結果在 health-recheck/latest.json，保留其他聊天的 reports/screen-health/latest.json。

收尾再次查核發現其他操作已於 19:38 建立並推送 c31afd81cda4c5a932dcae7fe517c09b11151087；fetch 後 HEAD 與 origin/main 相同，遠端包含兩個 AsuraAgeTimeline 檔、合成預覽及先前報告。本代理沒有執行 commit / push，也不建立空提交。完整健康檢查仍有兩項失敗，不能宣稱符合健康全通過條件。現在只留下本次報告追加與 health-recheck 證據未提交。
