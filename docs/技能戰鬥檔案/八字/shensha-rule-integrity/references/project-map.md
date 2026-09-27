# 真實接點與驗證

以下皆為命理專案根目錄相對路徑；不把程式複製到技能成為第二套來源。換電腦使用時先取得對應專案，再核對檔案/版本是否存在。2026-09-27盤點，不作永遠有效的完成宣告。

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
