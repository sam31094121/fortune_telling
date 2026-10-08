# 神煞易經：功能凍結與最小穩定性修復

盤點日期：2026-10-08，Asia/Taipei。這是可追溯狀態快照，不是永久正確或全站穩定保證。

## 本輪授權與界線

- 業主先要求所有卡片功能固定，隨後明確補充：允许查核并修复不穩定，但不能改功能、算法、欄序、文案、互動、版型或其他卡片。
- 本輪只查神煞易經的資料鏈，修正五種已重現的請求／結果狀態問題；不動四柱、紫微、神煞規則、API 回傳、排版、列印引擎或來源政策。
- 永久維護界線寫入 `AGENTS.md`；需變更功能時由業主指名卡片與範圍解鎖，限定修改驗證後恢復凍結。凍結不阻止客戶正常排盤，不增加登入鎖、不停止服務。
- 已收到本輪修好後發布的指示，但沒有批准略過失敗檢查的明確例外；不將一般發布授權當成全綠或永久解除門檻。

## 版本基準（本輪只讀核對）

| 層次 | 實際證據與狀態 |
|---|---|
| 本輪起始本機 HEAD | `d438fa365f947587cef85bfc1136e7ef0be119a1`；本輪开始时工作树乾淨 |
| 遠端 main | `git ls-remote` 確認 `fabf679dbbe05e4892c04dd72e38518bd89abaab`；最初本機追蹤指標落後，不能依當時 ahead 2 就說遠端差兩筆 |
| 手機九行 CSS | 已包含於外部提交 `da277112f6953cf07e69a8aa516bb15a185a85f6`，是遠端 fabf679 的祖先，並非仍未推送。本輪沒重複改它，也沒有撤回 |
| 遠端部署訊號 | GitHub combined status 對 fabf679 回 Vercel success；[該次部署紀錄](https://vercel.com/sam31094121s-projects/heaven-earth-humanity-pair/BpWHViZSL7zXE3CgK52LwidbZCks)。這不等於本輪改動已發布；本輪未重新確認正式網址對應 SHA |
| 先前正式站畫面證據 | `shensha-card-placement-2026-10-08.md` 記錄 2a3bb59 的正式站平板／手機和 PDF；是先前證據，不冒充本輪新請求修復的部署驗收 |
| 本機未推提交（14:52後盤點快照） | d438fa3、fc2f5ba、04f5c98、c8bea2a，另有 dadf341（新列印與語音 API）及 590e9d4（開始指南）。main 領先當次遠端 fabf679 共6筆，皆非本輪提交；逐筆查核見本文末，不回退、不悄悄連帶推送 |

本輪尚未提交／推送：`DualChart.tsx` 最小狀態修復、兩份新增回歸測試、AGENTS、健康維護文件、既有神煞技能兩份同步文件、本報告。個人技能副本在專案 Git 外，已同步本機，不能宣稱隨 Git 自動發布到其他電腦。

### 同時進行的外部修改

工作期間新增的 `lib/export-stable-shensha-pdf.ts`、`scripts/migrate-shensha-to-stable.ts`、`scripts/backup-shensha-monthly.ts` 後來已由外部提交，另新增初始化工具及 `SHENSHA_PERMANENT_GUIDE.md`。皆不是本輪產物；保留原狀，未執行、未驗收、未加入本輪範圍。提交訊息聲稱永久穩定，不能當成實測證據。當次引用搜尋只在新版本模組、新 PDF 工具、遷移腳本與新測試間看到引用，未見既有 app 接入；這只是當下快照，不保證其他工作之後不再變動。發布 main 會包含外部已提交內容，不能聲稱只推本輪修復。

## 實際資料鏈與保障

1. `DualChart.tsx` 送出共用表單已轉為國曆的資料；`POST /api/dual-chart` 呼叫 `calculateDualChart`，`Cache-Control: no-store`。
2. `lib/dual-chart.ts` 沿用 `runBaziLayer`，該層调用 `lib/bazi/engine.ts:createBaziCore`，並將同一份 core 交給 professional 輸出及紫微四柱核對；不由前端再排四柱。
3. `buildDualChartShenSha` 在 `lib/dual-chart-iching-shensha.ts`，只在後端延伸既有四柱；`lib/dual-chart-iching-shensha-card.ts` 生成 `byPillar`／`card.columns`。舊檔名 `dual-chart-shensha-card.ts` 不存在，已在技能現行接點更正，沒有重建第二個引擎。
4. `PillarGrid` 依 `column.pillar === key` 放入時／日／月／年，不依後端陣列位置；四張原卡的內容及連結保留，頂端柱位標題保留，卡內重复標題不顯示。前端排序不是重新判定神煞。
5. 列印用同份 result 與既有 A4 DOM；八字完整神煞一頁，紫微可另頁，彩色／黑白、全大運不改。禁止將放棄的「移左側、只留六格、移合沖刑害破」當待實作需求。

## 五種重現與修復

測試 `tests/dual-chart-request-lifecycle.test.cjs` 執行實際元件處理函式，控制網路與 React hook 時序；不是假寫成功狀態，也不是完整真機測試。測試工具最初遞迴錯誤已修正，以下是修正測試工具後、修改產品前的真實結果：9 測試中 4 過、5 失敗。

| 缺陷 | 修改前 | 本轮最小修復 |
|---|---|---|
| 改表單／換人 | 已完成的舊結果仍掛在新表單下方，且 PDF 檔名會讀目前表單 | 清除舊結果及舊 PDF 連結，等既有送出重新產生 |
| 返回頁面 pageshow | 只清結果，未取消在途請求，舊請求完成會重新放回 | abort＋失效化 request identity＋清結果 |
| 會話到期 | 同一 recheck 缺口，舊回應可重新顯示 | 同上，不改會話期限或門禁政策 |
| unlocked 失效後再恢復 | 原請求仍可落入 state，解鎖後出現舊盤 | 失效化在途請求、清結果及列印狀態 |
| 不完整的快速重送 | 舊請求取消後，驗證提前返回，busy 留 true | 缺資料返回前解除忙碌狀態 |

修復只在 `app/dual-chart/DualChart.tsx`：新增 17 行、刪除 2 行。原有連續送出、JSON 解析後 request identity 核對、卸載 abort 與失敗錯誤提示均保留。修後 9/9 過；網路故意忽略 abort 時仍不能用舊回應覆蓋新盤。

## 本輪驗證

| 檢查 | 結果與界線 |
|---|---|
| request-lifecycle | 9/9；包含上述五種缺陷與四種既有保護 |
| recalculation-stability | 8 組各重算兩次，含 00:30／23:30；四柱、raw、byPillar、coverage、card 一致，無同柱重複 ID |
| 七組真實 API → 元件 | 全過；另四種未知／缺時辰回 400 且無結果，不以空神煞假成功 |
| column-order | keyed mapping、原內容、無重複及六種負例全過；來源待核仍阻斷來源認證 |
| 八字基本／契約／交叉 | 81／27／104 全過 |
| PDF／手機滑動回歸 | 既有兩份測試通過；未改 CSS、A4 排版與 PDF 引擎 |
| 正式建置 | 先前版本成功、exit 0；加入外部語音路由後本輪重跑失敗、exit 1，詳見本文末。使用 `.next-production` 隔離目錄，不替換本機服務產物；不得引用先前成功當成本次成功 |
| 全專案型別 | 未過：`tests/michelin-stability-comprehensive.test.ts:263-264`，舊語法錯誤未改 |
| 輸出可用性 | 前三項通過；神煞輸出舊 fixture 已由外部補欄位，但仍在第46行失敗（測試只改舊 gate，沒有更新新後端檢視），不可說已修好 |
| 表單 readiness | 既有第34行「也算得出來」文案斷言失敗；涉及共用表單，未擴修或刪測試 |
| 技能文件 | 原 quick_validate.py 因環境沒有 PyYAML 而未能啟動；改以既有 js-yaml 核對相同 frontmatter 限制、TODO、7個相對引用及19個現行程式／測試接點，全過。沒有安裝套件，也不聲稱原 Python 驗證器通過 |

技能維護版／安裝版兩份檔案逐位元 SHA256 相同：`SKILL.md` 為 `29e1ec1c67f2b1388a77e6be8b591ad9e29bcf36458c747ec0d841c9020b9e1f`；`references/project-map.md` 為 `e93af7a5a972df5bbfe349b74239ff30790111dbbacfd25a7137424253329a6a`。此驗證只證文件有效與副本一致，不證產品運算正確或已發布。

實際獨立瀏覽器：以合成 1995-02-23 女午時排盤，時13／日4／月2／年3，共22項；把日改為24，舊結果區立即變0，重新送出後四柱為乙亥／戊寅／丙戌／甲午，時6／日3／月4／年1，共14項，無舊命盤回填。畫面與功能未重設計。

![新輸入的實際四柱與神煞](../../.tmp/shensha-order-qa/stability-shensha-visible.png)

收尾重新用同組合成資料排盤，14項與四柱仍一致；上圖是本次重新保存、神煞四格確實在視窗內的截圖。較早的 `stability-new-result-details.png` 只拍到命盤上半部，不能單憑該圖證明神煞名稱可見。

測試只讀合成資料，沒更改使用者正在填寫的分頁。瀏覽器回頁後結果區為0，表單可用；30分鐘到期及慢網路競態由處理函式回歸覆蓋，未冒充真機慢網路／bfcache 自動化全驗。

本輪沒有重新輸出 PDF 或做實體送印；沿用本日已驗手機320／375／390／430、平板768、局部雙向平移／點卡、高密度22項彩色2页及黑白1页PDF證據，詳見 `shensha-card-placement-2026-10-08.md`。本次未改任何紙張幾何或輸出引擎；引用舊證據不代表它在新修復上重跑過。

## 保留失敗與尚未證實的風險

最近整站健康以 `node scripts/screen-health-monitor.mjs --mobile-first --no-repair` 重跑，原始檔 `reports/screen-health/latest.json` 完成於 2026-10-08T06:45:05.069Z（台北14:45），48/55、7失敗、exit 1。未復原或重啟服務。既有檢查同步更新 `reports/beast-production/release-summary.json`，該檔本次差異僅 `at` 時間戳；兩份產生紀錄皆保留，不手改為通過。

1. BAZI_OUTPUT_CONSISTENCY：舊 fixture 失敗；最新局部重跑改為上述46行失敗，並未變綠。
2. BAZI_SERVICE_AVAILABILITY：八字老師進階、喜用／配對補強、紅鸞未放行。
3. BAZI_SOURCE_REGISTRY_COMPLETE：來源待核與衝突。
4. BAZI_FEATURE_COMPLETE：上述進階功能未全可用。
5. NO_FABRICATED_COUNTERS：既有計數斷言未過，不屬本卡修復。
6. THREE_CORE_TRADITIONAL_DEFECTS：六項傳統缺陷仍列管。
7. DUAL_CHART_SHENSHA_DISPLAY：送達与現有範圍不等於來源認證，59項來源待核維持。

另外只讀發現，**沒有擴修或宣稱解決**：

- API 結果的 `shenShaVisibility.allowed` 是 Set，JSON 序列化為 `{}`；現行嵌入四卡走 `card.columns` 已通過真實 API 驗證，但其他摘要／來源提示支線不能因此被認證完全無缺。已有畫面來源提示与命中表矛盾，保留待處理。
- `app/api/dual-chart/route.ts` 匯入 `validSession`，本輪檢視未見實際呼叫；頁面 `page.tsx` 有驗會話，不代表 API 本身同樣受保護。本輪未做未登入 API 驗證，不改登入／門禁，需另明確確認安全修復範圍。
- 同命盤四柱與神煞判定穩定，不等於整份 JSON 固定：professional 計算／稽核 ID 每次不同，`lib/iching-shensha-asura.ts` 的結語有 Math.random。既有文案機制保持，不為凍結換算法。
- 沒有新增四個 runtime hash、正式規則庫唯讀、雙人簽核或 shadow migration；沒有這些證據就不能宣稱已建置。亦未全查其餘卡片、未驗所有裝置或所有未知異常。

## 不變的程式檔與交付判斷

本轮 `git diff` 未涉及 `lib/bazi/engine.ts`、`lib/dual-chart.ts`、`lib/dual-chart-iching-shensha.ts`、`app/api/dual-chart/route.ts`、`BaziChart.tsx`、CSS及 `export-pdf.ts`。以下是實體檔 SHA256 記錄，不是運算正確性證明：

| 檔案 | SHA256 |
|---|---|
| lib/bazi/engine.ts | C0B7B1E6B765FE4D49CD820B7226D5D64B4F8FAFDA93ABB4E4FF2002348145FF |
| lib/dual-chart.ts | 1823F8C29FB495AEB5DF18947365DBA0024CC4E8932AE637B87A94F30E5704E0 |
| lib/dual-chart-iching-shensha.ts | 24EAD72F3C3706369BBCCFCB304FC629668B190CA6009726DE1C47AE437B5C55 |
| app/dual-chart/BaziChart.tsx | 4149478DB78DC061A8084C8359EF194D619E03065E7DA01D594961B399100D59 |
| app/dual-chart/dual-chart.module.css | 7F7D9D5E4FFE65777A8AA52FF5BAD144A77A21D0F2DCD79A7BF0196813A5691D |
| app/dual-chart/export-pdf.ts | 2CBA31861C816C577E29440542C85EB1949990E5248C60B8C61A67C82D65C208 |

保留現有 main 與全部他人提交，不刪檔、不清快取、不改發布門檻。本輪未提交／推送，正式站沒有本輪請求狀態修復的部署證據。以下已完成同行提交的唯讀驗收，不再以籠統「尚未審查」作為卡點；實際阻礙是新語音接口建置失敗、工具缺陷與既有7项健康失敗。

## 發布同行提交查核（2026-10-08 台北14:45–14:56）

### 實際 Git／部署狀態

`git ls-remote origin refs/heads/main` 再次回 `fabf679dbbe05e4892c04dd72e38518bd89abaab`；GitHub combined status 為 Vercel success。當次本機 HEAD 為 `590e9d47f019b30b0cce0fd84d8074090eea12d0`，以下6筆未推提交都是其後代，普通推送 main 必然連帶包括它們。沒有執行任何推送、遷移、初始化、備份或還原，沒有改歷史、建立分支／worktree。

Vercel 部署管理頁要求登入，本輪未登入管理帳號，因此不能獨立證實正式 alias 對應的 commit SHA；不以 GitHub success 代替該證據。正式網址實際可排盤，見下節。

| 提交 | 檔案／行為 | 是否影響現行运行及本輪判斷 |
|---|---|---|
| d438fa3 | 輸出測試 fixture 增加2行 specialStars | 不改產品；測試第46行仍失敗，不代表完整修好 |
| fc2f5ba | JSON 名稱／排序資料、stable-version 模組、Jest 測試 | 未接現有運算；只是中繼資料與排序，不是完整規則引擎；型別測試與資料對照發現缺陷 |
| 04f5c98 | export-stable-shensha-pdf、migrate、backup、init | 現行網站未引用這些工具；package、建置、部署未掛啟用命令。腳本有入口副作用，未執行；不代表自動備份／遷移已生效 |
| c8bea2a | SHENSHA_PERMANENT_GUIDE.md | 文件，不是實作證據；永久保證／全部就緒不能採信 |
| dadf341 | shensha-printable-audio、app/api/audio/guide/[cardId]/route.ts | 新 HTML 輸出工具未接原卡／A4；但 app API 會被 Next 自動註冊，不需其他 import，屬新增對外接口；它使本次建置失敗 |
| 590e9d4 | START_HERE.md | 文件中的固定示例不是後端排盤；使用公曆數字當四柱並手寫命中，不能當神煞驗收資料；未執行示例或遷移指令 |

來源聊天的人類訊息可核實「現有功能凍結」「修好後發布」「沿用既有技能」；本輪查閱未找到對新增語音接口、另一套列印模板、遷移／備份啟用或跳過7項門檻的明確人類批准。提交作者／提交說明／其他代理的成功宣稱不是批准證據。

### 可重現的同行缺陷（只讀、純函式，未動客戶資料）

- TypeScript AST 讀現行 `DUAL_SHENSHA_RULES`：65項。新 JSON：66項，多 `taisui`，沒有少 ID，但排序不同、16處名稱不同。其中包含 `ride` 日德→日貴、`rigui` 日貴→日祿、`guoyin` 國印→過隱、`shieDabai` 十惡大敗→生旺納音。此 JSON 不能稱為原運算的原封不動凍結。現行網站未接它，沒有因此改掉當前結果。
- 只在記憶體載入兩份純函式模組：`isVersionValid('toString')` 返回 true；未知 rule ID 的排序驗證返回 valid；物件和 rules 都沒有 Object.freeze。這些不能當永久不可變技術保障。
- 同一命盘的 bazi 物件只改鍵順序，checksum 不同；`validatePublishedCard` 只比外部傳入的 checksum，改卡片內容仍傳原儲存 hash 會返回 valid。獨立 `verifyCardIntegrity` 有重算，但不是前者自動執行的保證。
- 新「PDF」模組實際回 JSON／頁腳字串，不生成 PDF。新列印模組回 HTML 字串和 URL，不生成 PDF檔或音訊；QR URL 仍是 `https://your-domain.com`，模板對傳入字串未做 HTML 跳脫。
- 語音 GET 缺 mp3 時回 `audioStatus: pending` 的 JSON，不是可聽的3分鐘音訊。POST 只 console.log 即回 success，未做持久儲存；未向此 POST 發測試。
- 遷移腳本針對本機 `data/user-cards` 重寫 JSON；不是正式資料庫遷移。備份腳本只查版本／hash欄位存在，未调用已匯入的完整性驗證，還包含清除12個月外目錄的遞迴刪除；本輪完全未執行。初始化只寫紀錄／印指令，未建立排程。文件不能證明定時備份、恢复或永久服務已完成。

### 本輪新測試結果

- `npm run build`：编譯完成6.4秒後，型別阶段 **exit 1**。`.next-production/types/app/api/audio/guide/[cardId]/route.ts:49`：新增 GET 第二參數 `params` 不是所需 Promise。源檔 GET／POST 都採同樣簽名。這是真正發布阻斷，不是單純 warning。
- 對新增模組、3工具及測試執行 `tsc --noEmit`：缺少 `qrcode`，migration 159–168／211 的 Promise 型別用法錯誤，缺 `@jest/globals`。未安裝依賴、未執行有副作用腳本。改好首個路由錯誤也不表示其他錯誤全消失。
- 既有神煞穩定性再跑：9/9 請求測試、8組真後端重算、按鍵對柱及6種負例、PDF回歸、手機觸控CSS回歸均過。它們沒有替新語音／新模板／新版本工具驗收。
- `git diff --check` 過，只有 Windows 行尾警告。健康7項未過維持本報告上方的明確原因，不刪除／弱化。

### 正式網站實際再驗

先前驗收 tab 發生瀏覽器控制逾時，依說明在同一瀏覽器另開獨立頁，不重啟網站、不動使用者表單。以既有密碼正常解鎖正式 `/dual-chart`，輸入合成 1995-02-24 女、午時；四格實際名稱可見：

| 時 | 日 | 月 | 年 |
|---|---|---|---|
| 龍德、六厄、將星、元辰、羊刃、空亡 | 月德、寡宿、病符 | 學堂、紅艷、孤辰、亡神 | 天乙貴人 |

共14項，与本機同測例一致。375×812 手機模式，頁面內容寬360；主表閱讀區寬302、內容680，局部 scrollLeft 可到377.43。主表與神煞連結 computed touch-action 均為 manipulation，手機橫滑修補已在正式頁面生效；本輪以定位觸發局部平移、不是實體手指拖曳測試。視窗已重設回預設。

![正式站四柱神煞可見（合成測例）](../../.tmp/shensha-order-qa/release-production-four-pillars-2026-10-08.png)

手機截圖：`.tmp/shensha-order-qa/release-production-mobile-2026-10-08.png`。這證明當前正式顯示，不證本輪尚未推送的請求修復已上線；來源提示仍有前述已知矛盾，沒有宣稱整站完成。

### 最小交付與下一個決策

本輪產品最小集仍只有 DualChart.tsx 狀態修復；附2份測試、AGENTS／健康維護／既有技能紀錄與本報告。健康重跑的2份產物另列，無神獸內容改動。首頁計數文件保存於專案外，不入本次神煞 commit，首頁程式、統計與資料庫未動。

現有阻礙已具體確定，不能再問籠統「要不要幫其他提交驗收」。安全選擇是先保留全部本機成果、暫不發布；若要修同行提交，需限定為其建置相容性修正，且不啟用新功能、不改神煞規則、不執行遷移。即使建置修好，既有7項健康失敗仍須處理或由業主另作明確、具體的發布例外，不能自行跳過。若要將新增功能移出 main 發布，亦需精確授權，不能擅自刪檔或改寫其他人的提交。
