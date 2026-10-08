# 真實接點與驗證

以下皆為命理專案根目錄相對路徑；不把程式複製到技能成為第二套來源。唯一維護入口為專案 `docs/技能戰鬥檔案/八字/shensha-rule-integrity`，個人 skills 同名目錄只同步安裝；修改後兩份對應檔須相同。日期化的 reports 是證據快照，不是另一份技能或算法。

## 2026-10-08 現行接點與固定行為

1. 共用輸入：`app/dual-chart/DualChart.tsx` → `components/UnifiedBirthForm.tsx`。一次填表，既有國農曆轉換；不改共用表單、不猜時辰。
2. 後端：`POST /api/dual-chart` → `lib/dual-chart.ts:calculateDualChart` → `lib/three-core-engine.ts:runBaziLayer` → `lib/bazi/engine.ts:createBaziCore`；紫微維持自己規則，核對四柱後才衍生神煞。
3. 神煞唯一現行延伸：`lib/dual-chart-iching-shensha.ts:buildDualChartShenSha`；檢視由 `lib/dual-chart-iching-shensha-card.ts:buildShenShaCardView` 產生 `specialStars.byPillar/card.columns/coverage`。API 傳同份結果；`lib/dual-chart-shensha.ts`、`lib/dual-chart-shensha-card.ts` 是舊檔名，不能另建回來。
4. 前端 `app/dual-chart/BaziChart.tsx:PillarGrid/ShenShaPillarCard` 按 `column.pillar` 對應時／日／月／年；不按陣列位置、不重算。四張原卡放在八字表特星神煞四格，保留內容、來源標示、點閱，僅略去卡內重複柱位標題。下方不重複四張卡。
5. `app/dual-chart/BaziIChingShenShaCard.tsx` 保留融合容器；`app/dual-chart/export-pdf.ts` 讀同一 A4 DOM，不重算命盤。八字＋完整神煞一頁，紫微另頁選項保留；全部大運保留。黑白／彩色、實際 PDF 頁數與高密度內容都要核對，不能用預覽或固定 2 頁文案代替。
6. 手機八字／紫微／列印預覽保留局部左右平移、頁面上下滑動及點卡。既有九行 screen-only CSS 修復需依 Git 及部署查證是否交付，不能因上一份報告寫未發布就回退。
7. 凍結行為、不凍結故障：不改功能的必要修錯依授權處理；新增功能、變更公式／版型等須明確解鎖。禁止順手移大運、刪成六格、移合沖刑害破或另造前端算法。

## 維護必測基準

- 有修改本卡時先跑 `node --test tests/dual-chart-request-lifecycle.test.cjs`：重送、JSON 延遲、改表單、pageshow、會話到期／失效、未知／缺資料、卸載、API 失敗。它執行真實元件處理函式並控制網路時序，不是實機觸控／bfcache 測試。
- `node tests/dual-chart-recalculation-stability.test.cjs`：八組真後端同輸入重算，含早晚子；比較四柱、規則命中、柱位、coverage 及卡片。稽核 ID 與既有阿修羅隨機結語不屬此通過範圍；不可宣稱整份 JSON 都相同。
- `node tests/dual-chart-shensha-column-order.test.cjs`：時日月年、依鍵對柱、不改後端物件；反例包含漏項、重複、改名、錯識別、錯柱與折疊，來源待核仍失敗。
- `node --env-file=.env.local tests/iching-shensha-live-api.test.mjs`：限本機已授權秘密，七組 API 到真實元件、四種缺少時辰；不得输出密碼。這不代替瀏覽器驗收。
- `npm run test:bazi`、`npm run test:bazi-contract`、`npm run test:bazi-ziwei-cross`、`npm run test:bazi-output-availability`，保留所有失敗。依實際改動加建置與型別檢查；純技能歸檔只驗文件／引用／雜湊，不反覆重跑全站。
- UI／列印修改加 `node tests/dual-chart-touch-scroll.test.cjs`、`node tests/dual-chart-pdf-export.test.cjs`，以及獨立測試頁 320／375／390／430 手機、768 平板；左右平移同時不能吞垂直滑動或點擊。下載實際彩色黑白 PDF 逐頁核對，含合成 1995-02-23 女午時 11:30（時13／日4／月2／年3，共22項）高密度案例，八字完整神煞及全部大運不得裁切。實體印表機及真觸控沒測就明示。
- 每次區分「已算正確送達」「來源是否全部核定」「實際 UI/PDF」「發布」；不得把七項健康失敗刪掉、縮小或改成全綠。重現缺陷與本輪證據記於 `reports/dual-chart/card-function-freeze-2026-10-08.md`；先前布局、手機/PDF與發布紀錄在 `reports/dual-chart/shensha-card-placement-2026-10-08.md`。

## 歷史盤點（2026-09-27，以下不是現行支援數或檔名）

保留舊接點與當時測試範圍作追溯；不得依此重建舊引擎、宣稱只支援八項，或把舊測試結果當本輪驗收。當前檔案以上節為準。

## 必讀接點

| 用途 | 路徑 |
|---|---|
| 四柱唯一來源、晚子策略 | `lib/bazi/engine.ts` |
| 三核心整合，不另起四柱 | `lib/three-core-engine.ts` |
| 神煞指定版本與跨書限制 | `docs/技能戰鬥檔案/八字/神煞逐條對照.md` |
| 可機讀的原典主張 | `docs/技能戰鬥檔案/八字/來源登記.json` |
| 來源治理 | `docs/技能戰鬥檔案/易經/來源治理.md` |
| 列管及解除條件 | `docs/技能戰鬥檔案/易經/禁止正式使用清單.json` |
| 來源狀態計算、不是手填狀態 | `lib/iching-source-gate.ts` |
| 逐項神煞輸出許可 | `lib/bazi-traditional-gate.ts` |
| 沿用同源四柱的既有後端延伸 | `lib/dual-chart-shensha.ts` |
| 雙命盤串接 | `lib/dual-chart.ts`、`app/api/dual-chart/route.ts` |
| 各柱顯示及來源披露 | `app/dual-chart/BaziChart.tsx`、`lib/shensha-display-copy.ts` |
| 一般八字顯示 | `components/bazi/customer/ProfessionalBaziTable.tsx` |

神煞 V5 實作目前在四柱核心內，不是附件假定的獨立 `SHENSHA_ENGINE` 服務。附件 `/api/shensha/result`、`production_rule` 表等是示例，本技能不建立它們。雙命盤客戶填表/門禁/列印檢查使用已有 `dual-chart-card` 技能，不在本技能複製另一套 UI 操作規格。

## 驗證依改動選擇

- 指定神煞公式、來源/柱位：`npm run test:shensha-source-tables`，實際測例在 `tests/shensha-source-tables.test.ts`。
- 來源與逐項放行：`npm run test:bazi-traditional-gate`、`npm run test:bazi-output-availability`。
- API 到實際元件：`npm run test:shensha-live-api`。該測試只在既有授權下讀本機 `.env.local` 的門禁配置，不輸出秘密；使用合成命例，原始真實客戶資料不得加入技能。
- 更改四柱或整合鏈：按專案規則跑 `npm run test:bazi`、`npm run test:bazi-ziwei-cross` 及輸出可用性回歸；不能只用神煞測試替整體背書。
- UI/列印有改動：實際送出合成資料、核对時/日/月/年欄序、神煞所在柱與來源說明，再分別驗手機/PDF。PDF或實體列印沒做就列未測。
- 文件技能歸檔：`quick_validate.py`、JSON解析、引用存在性、原附件與封存檔 SHA256、安裝版/維護版逐檔一致；不以文件驗證代替產品測試。

## 範圍有限的現況證據

2026-09-27先前實測（本次歸檔未重跑）：八字81、三核心104、神煞表值/柱位1011及六組API/元件命例通過。1011是規則組合，非1011個歷史命例；通過只涵蓋測試內容。

- 合成1990-01-01男，卯時05:30：年/月/日/時＝己巳/丙子/丙寅/辛卯；UI時柱桃花、原典71頁。
- 同日亥時21:30：時柱己亥；UI依所選版本顯示天乙與驛馬，並保留各自原典頁碼。
- 合成1990-02-15男午時11:30：庚午/戊寅/辛亥/甲午；UI神煞列空欄，但核心有天乙受限，不能宣稱無神煞。
- 同日00:30為戊子時、23:30為庚子時，日柱均辛亥，符合現有晚子策略；既有核心晚子測例只明確測日不換/時支子，不能冒充晚子時干的所有傳統依據已獨立驗完。

以上為較早快照，不代表目前接點狀態。2026-09-27接點恢復後的查核結果如下：

- 四柱核心內已有天乙、文昌、桃花、驛馬、華蓋五項；雙命盤既有後端延伸另計羊刃、元辰、將星，共八項。延伸只讀同一份已驗證四柱，不重新排盤。
- `lib/dual-chart.ts` 呼叫 `buildDualChartShenSha`，將 `specialStars.byPillar`／`coverage` 經現有 API 傳給前端；不得刪掉延伸只留下核心五項，也不能把漏掉的項目當成未命中。
- 現行天乙、文昌已採指定版本放行，不再以其他書有異說單獨阻擋。八項接口及元件驗證可通過，但不代表所有照片名稱都已實作。
- 實作來源仍有差異：元辰目前引用《太黅》卷六，其餘七項引用袁樹珊1937本。尚未統一前不能宣稱八項均出自同一版本；不能為修文案暗中刪項或換公式。
- 健康檢查 `scripts/dual-chart-shensha-display-check.cjs` 固定核對上述八項，遺失延伸、coverage缺項、缺柱及後端有結果而前端漏顯都須失敗。健康通過只限此支援範圍。
- 外部對讀入口：[國家圖書館《增訂命理探原》1938再版](https://taiwanebook.ncl.edu.tw/zh-tw/book/NCL-9910006747)。書目已核為袁樹珊著、潤德堂出版，僅作既定1937取法的校對參考；書目存在不證每條公式或預測效度。

本批接點恢復後已驗：八字81、八字紫微交叉104、API到元件6組、後端到顯示3組、輸出可用性及型別檢查。新加的健康反例另驗移除延伸、同時縮減規則與coverage、缺柱、重複coverage，防止「少算也通過」。最新結果與未測項記錄於 `reports/dual-chart/shensha-source-ui-2026-09-26.md`，不把快照當永久保證。
