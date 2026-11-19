# 寶石捷連線局中逆轉驗收 — 2026-11-18

## 結果與範圍

實作完成。全站健康64/66原阻擋提交；業主已明確批准本次僅豁免八字來源登記與雙命盤神煞來源核定兩項既有失敗，允許提交及推送遊戲修改。此單次例外不改寫AGENTS.md、來源政策、失敗結果或其他卡片。
只改寶石捷連線hard45的戰鬥規則、簽章/本人保存欄位、前端事實顯示、技能文件與相關測試。其他遊戲與命理卡片沒有解鎖。

新增：存活者逆境援助、同關第三次援擊、五元素武器原倍率×2、八盾第五階至少實扣目標生命上限50%及我方存活者補50%、新成盾同元素補10%、第五關起敵方生命×1.10及攻擊×1.05。零血不補，全隊歸零正常判敗。所有參數來自技能JSON；前端不決定勝負。

## 已執行通過

- npx tsc --noEmit --incremental false
- npm run test:beast-match3
- npm run test:beast-fairness（核心194項、流程9項、1000局抽樣）
- npm run test:star-beast-entry-api
- node tests/beast-match3-treasures.test.cjs
- node tests/beast-match3-comeback.test.cjs
- node tests/beast-match3-comeback-save.test.cjs
- node tests/beast-match3-comeback.e2e.cjs
- node tests/beast-orb-authority.test.cjs（22項，隔離手機流程）
- git diff --check

手機截圖：rare-reduce.png、rare-no-preference.png（本地驗收截圖，非客戶真實資料）。
性能：performance.json，交錯執行相同500組種子；中位增加0.0078ms、p95增加0.0116ms。CPU微基準不等於網路或所有手機的保證。動畫及反擊等待參數未改。

## 健康掃描阻擋

health/latest.json：64通過、2失敗、0波動。與 reports/asura-age-navigation-2026-11-17/health-recheck/latest.json 比對，失敗識別相同：

- BAZI_SOURCE_REGISTRY_COMPLETE：既有八字來源登記完整性。
- DUAL_CHART_SHENSHA_DISPLAY：既有神煞來源待核。

不把它們算成本輪新故障；沒有改寫來源或跳過門檻。掃描自動更新的任務外release-summary時間戳已還原為原版本。

## 驗收界線

本人重送/並發保存使用CAS替身；親友使用實際簽章與HTTP。未對客戶正式帳戶寫入測試資料，沒有聲稱完成正式資料庫或所有關卡組合實戰。新增新盾測試覆蓋手動七珠與融合排除；原800種子回放測試通過，但不宣稱新補血每種自然掉落組合已窮舉。
