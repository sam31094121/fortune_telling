# 四柱神煞卡搬移與 A4 驗證（2026-10-08）

## 本批範圍

- 原本四張可互動神煞卡依時、日、月、年排序，整張搬入八字主表「特星神煞」對應欄。
- 隱藏嵌入卡內重複柱位標題與占位；保留主表四柱表頭、原始名稱、來源提示、點擊詳情與返回功能。
- 下方不再重複渲染四卡。後端資料、公式、來源狀態、八字／紫微算法均未修改。
- A4 只調整列印留白和格內間距；沒有移動大運至左下，也沒有縮放整頁、裁切內容或修改神煞數量。
- 初期依要求不提交；後續使用者接受版面並明確要求提交、手機和平板同步使用。啟動時 main 已領先 origin/main 9 個其他工作提交。本批截至以下最終紀錄仍未提交、推送或部署，原因是發布門檻未過與範圍隔離，並非仍在等待重複授權本版排版。

## 已取得證據

### 資料及元件

- `node tests/dual-chart-shensha-column-order.test.cjs`：通過。後端物件不變；四卡內容與搬移前一致，嵌入時只省略 h4；柱位、原詳情連結、唯一返回錨點、下方無重複、紫微 compact 不變。
- 八字基本測試：81 通過；八字／紫微交叉：104 通過；八字 contract：27 通過；traditional gate 通過。這些不是神煞全項來源認證。
- 修改 TSX 及其依賴的定向型別檢查（含 next-env.d.ts）：0 診斷。
- 局部 ESLint：0 error，既有 img 提醒 1 項。
- `git diff --check`：通過。

### 真實瀏覽器（独立 QA 分頁、合成出生資料）

- 1990-01-01 男、卯時：四卡 5／5／4／3 項，總共 17 項。
- 各柱第一個項目均實際點擊，能開啟原本詳情和所屬老師區；「回四柱」返回新位置。
- 320／375／390／430 px：無整頁水平溢出，四卡存在且柱位正確，無卡內文字溢出；點擊高度仍 40 px。
- 卡內重複 h4 為 0，上方四柱表頭為 4。

### 實際 A4 PDF

- 17 項案例已產生彩色、黑白各 2 頁 A4；第 1 頁為八字＋神煞，第 2 頁為既有紫微。逐頁轉 PNG 並目視核對。
- 密集案例 1990-01-01 男、申時：四卡 8／5／4／3 項，總共 20 項。調整前八字頁高 1187.76 px，超過 A4；縮減列印留白後為 1122.52 px（寬 793.70 px），未降低字體大小。
- 只選八字後實際下載彩色及黑白 PDF；pdfinfo 皆為 **1 頁、595.28 × 841.89 pt（A4）**。逐頁轉圖確認四柱、20 項神煞、大運、15 年流年、合沖刑害破及頁腳完整，未截斷、未重疊。
- 密集證據：`C:/Users/DRAGON/Downloads/神煞易經-19900101-shen點-彩色.pdf`、同名黑白檔；轉圖在 `.tmp/shensha-order-qa/dense-color-1.png`、`dense-mono-1.png`。
- 列印正文字體 16 px、天干地支 28 px、神煞名稱 12.5 px，未以整頁縮放硬塞。

## 未通過、既有限制與待核對

- 全專案 tsc 仍因 `tests/michelin-stability-comprehensive.test.ts` 第 263、264 行既有語法錯誤失敗；未改該檔。
- `test:bazi-output-availability` 前三段通過，最後 `dual-chart-iching-shensha-output.test.cjs` 的既有 fixture 缺 `shenShaVisibility` 而失敗；修改前已重現，未以弱化測試處理。
- **初次驗證失敗，後續已修復：黑白圓環**。融合卡既有 `monochrome={false}` 使五行圓環仍彩色；收到後續明確修復要求後，已接回原有黑白參數，並以最終 PDF 驗證，見下節。
- **初次驗證失敗，後續已修復：下載頁數**。原先以勾選數顯示「3 頁」，實際檔為 1 頁；後續已改讀成品 PDF 的頁數，見下節。
- **既有提示矛盾**：八字頁下方仍有舊的「本次神煞暫未提供」說明，與本派神煞卡有結果並列。本批遵守只搬移／隱藏重複標題／列印留白範圍，未改其他文字或來源狀態。
- 沒有實體送印；没有證明所有出生資料均能放入一頁。遇更密集或文字更長案例仍保留 PDF 超高拒絕輸出，不能悄悄截斷。
- 使用者語音聊天右側另有問題案例；已取得照片（`codex-clipboard-9e5c2d17-5ce3-4c49-a23c-57cd7e928917.png`），確認是深色網頁而非列印預覽，時柱可見至少 10 項且頂部被裁入照片外。本工作對話的瀏覽器清單只有自己的 QA 分頁，不能以合成測例冒充使用者那一筆的 PDF 驗收。

## 結論

本批四卡搬移、重複標題移除、原互動保留及上述 A4 範圍已驗證；不是整站健康檢查全過，也不是神煞規則全項認證。使用者實際問題案例與列出的既有列印問題仍應分開處理，未完成前不宣稱全面完成。

## 同日後續：黑白及頁數兩項最小修復

依明確追加要求修復前述兩項，仍不提交、不推送，不執行尚未定案的大運左移／六格布局。

### 改動

- `DualChart.tsx` 將列印黑白選項傳入融合卡；`BaziIChingShenShaCard.tsx` 再傳給既有 `BaziChart`／`ElementRing`。畫面模式仍維持彩色；五行比例與 SVG 幾何未變。
- 黑白列印的神煞參考星號也改用灰階。
- `export-pdf.ts` 直接輸出已經過選擇的列印 DOM，不再依壓縮後的頁索引重複過濾，避免只選紫微時漏頁。回傳 `{ blob, pageCount }`，pageCount 取自實際完成的 PDF。
- 下載文案採上述頁數；移除會重用已撤銷 URL／舊結果的匯出快取。命盤、語言、選擇或色彩改變均撤下舊下載連結，必須製作新檔。
- 製作期間鎖住兩處既有選擇控制；手機列印不再受目前網頁分頁限制，完整包含所選命盤。未新增列印流程或刪除既有命盤。

### 驗證結果

- `node tests/dual-chart-pdf-export.test.cjs`：通過融合卡黑白參數、八字單頁／紫微單頁／雙頁、色彩選項、成品頁數、零頁與超高拒絕條件。
- `node tests/dual-chart-ring.test.cjs`：通過比例、零值／極小／全占比與五種紋理。
- `node tests/dual-chart-shensha-column-order.test.cjs`：仍通過。
- 三個本輪 TS／TSX 的局部 ESLint：0 診斷；含依賴及 next-env.d.ts 的定向 TypeScript：0 診斷。
- 真實 UI 切換色彩／勾選後，舊下載連結立即移除；沒有重填使用者分頁，全部操作在獨立合成測試頁。
- 320／375／390／430 px：選兩盤時均保留兩張 A4，20 項神煞不漏，整頁無水平溢出；完成後重置視窗尺寸。
- 實際下載及 pdfinfo：八字彩色 1 頁、八字黑白 1 頁、八字＋紫微彩色 2 頁、僅紫微彩色 1 頁；均為 A4，下載連結頁數與成品一致。
- 最終彩色八字：`C:/Users/DRAGON/Downloads/神煞易經-19900101-shen點-彩色 (1).pdf`。
- 最終黑白八字：`C:/Users/DRAGON/Downloads/神煞易經-19900101-shen點-黑白 (2).pdf`。逐頁轉 PNG 目視確認圓環及圖例為五種黑白紋理、20 項神煞與其餘原始資料完整、無截字或重疊。
- 雙頁與紫微單頁證據：同目錄 `神煞易經-19900101-shen點-彩色 (2).pdf`、`神煞易經-19900101-shen點-彩色 (3).pdf`。紫微頁已轉圖目視檢查。
- 最終畫面證據：`.tmp/shensha-order-qa/mono-page-count-screen.png`；黑白紙面：`.tmp/shensha-order-qa/verified-mono-1.png`。

兩項追加缺陷已修复。既有全專案型別／輸出回歸失敗、舊提示矛盾、未實體送印及使用者另一問題案例的實際 PDF 未取得等限制仍維持上節紀錄，不以本輪結果冒充全站通過。

## 同日密集追加與左移方案只讀評估

- 現有後端真實運算的合成命例 1995-02-23 女、午時 11:30：時／日／月／年為 13／4／2／3，總 22 項。實際彩色與黑白 PDF 均 1 張 A4，已轉 PNG 目視核對；13 項、四柱、完整 8 格大運及 15 年流年保留。
- 證據：`C:/Users/DRAGON/Downloads/神煞易經-19950223-wu點-彩色.pdf`、同名黑白 PDF；`.tmp/shensha-order-qa/thirteen-color.png`、`thirteen-mono-1.png`。這不是「單柱最多 13 項」或所有命盤皆一頁的保證。
- 另測 1991-07-01 女、寅時 03:30：11／5／3／2，總 21 項，與照片類似的單欄長、其他欄短分布。初次實際彩色 PDF 為 1 A4、神煞與 8 格大運完整，但部分流年年齡小字比預覽寬而接近鄰欄。已限定列印的年齡小字使用 Arial／Microsoft JhengHei、字重 500、零字距，沒有縮小字級或改數值；重製彩色 `(1).pdf` 與黑白 `.pdf` 均 1 A4，轉圖目視確認小字無重疊。黑白版本由 390 px 手機視窗實際製作下載。
- 「命局合沖刑害破」是右欄大運下方的整張卡；左側已有五行、命身宮等摘要和 15 年流年。上述 21 項測例左欄底部餘約 8 px（約 2 mm），關係卡高約 103 px（約 27 mm）、寬約 457 px；左欄寬約 264 px。直接搬到更窄左欄會增加換行，未必節省整頁高度。沒有另獨立的「命格卡」可以直接搬。
- 使用者澄清為詢問意見後，未實作左移、未改網頁布局、未刪大運格數；新方案停在評估。

## 最終驗證與發布決策（2026-10-08 13:50，台北時間）

### 可交付部分

- 年齡字型修正後，再用 768×1024 平板視窗實際下載 1995-02-23 午時的 13／4／2／3 項命盤：`C:/Users/DRAGON/Downloads/神煞易經-19950223-wu點-黑白 (1).pdf` 是 1 頁 A4；同名 `彩色 (1).pdf` 是 2 頁 A4（八字＋神煞一頁、紫微一頁）。三頁均已轉 PNG 目視確認：神煞、8 格大運、15 年流年及頁腳完整；黑白圓環及圖例為灰階紋理，彩色保留原色。視窗覆寫已重置，沒有送實體印表機。
- 最終紙面圖片：`.tmp/shensha-order-qa/thirteen-mono-final.png`、`thirteen-color-final-1.png`、`thirteen-color-final-2.png`；下載介面截圖：`final-tablet-download-screen.png`。皆為合成 QA 命例，不冒充使用者照片那一筆。
- 正式建置 `npm run build` **成功**，沒有重啟或停止本機服務。
- 三項排版／PDF／圓環定向測試及 `git diff --check` 通過。
- 健康檢查的卡片擷取還在讀舊布局：已將 `scripts/dual-chart-iching-shensha-display-check.cjs`、`tests/iching-shensha-live-api.test.mjs` 改為實際嵌入版＋下方不重複四卡的組合，按時日月年及可見 `<li>` 連結名稱核對。不是移除驗證。新增六種反例（漏項、重複、改名稱、改識別、錯柱、折疊）皆會失敗，來源待核仍會失敗。
- `npm run test:iching-shensha-live-api` **通過**：6 組換時辰、1 組不同生日與 4 種缺失時辰輸入；後端原有結果、預期名稱、柱位及新布局一致。

### 全站門檻：尚不能發布

最新 `npm run screen:health`（standard、no-repair）在 `2026-10-08T05:49:34.908Z` 完成，**48/55 通過、7 失敗**。最初是 47/55；修正上述檢查接點後真實 API 顯示項已通過，未刪任何失敗標準。完整原始報告在 `reports/screen-health/latest.json`。這不是全站手機實測，也不是神煞來源認證。

| 未過項 | 實際原因 | 本輪界線 |
|---|---|---|
| BAZI_OUTPUT_CONSISTENCY | `tests/dual-chart-iching-shensha-output.test.cjs:21` 的旧 fixture 缺 `shenShaVisibility`；舊測試仍假設前端從 gate 建結果 | 要把 fixture 接回既有後端 builder，逐條保留原断言並處理已變更的老師頁籤。不是加空物件便能證明全過；本輪未改 |
| BAZI_SERVICE_AVAILABILITY | 八字老師進階判讀、喜用／配對五行補強、紅鸞尚未放行 | 不在排版工作中解除來源守門 |
| BAZI_SOURCE_REGISTRY_COMPLETE | 16 個 claim 中 5 個仍 CONFLICT/PENDING_POOL | 不手填 VERIFIED |
| BAZI_FEATURE_COMPLETE | 10 項中 3 項未放行：進階老師、五神、紅鸞 | 與前兩項重疊，但仍是独立未過檢查 |
| NO_FABRICATED_COUNTERS | `tests/no-fabricated-counters.test.mjs:88` 的真實紀錄計數斷言失敗 | 涉及九筆其他首頁統計工作，本輪不改 |
| THREE_CORE_TRADITIONAL_DEFECTS | 六項既有取数／AI 排盤／文字雜湊起卦問題列為 UNRESOLVED | 要另定算法修復範圍，不能用排版發布偷改 |
| DUAL_CHART_SHENSHA_DISPLAY | 三組逐柱顯示與所需規則接入現在通過；59 項來源仍 PENDING_POOL | `deliveryOk=true`、`requestedScopeComplete=true`、`sourceVerified=false`；顯示成功不等於來源核定 |

另有全專案 `npx tsc --noEmit --pretty false` 失敗：`tests/michelin-stability-comprehensive.test.ts:263-264`。此檔工作目錄／HEAD／最新 origin/main 的 blob 都是 `f66fe7b0d68a0727f06bb7057f6e951d2b3c814f`，不是本輪或九筆本機提交新引入，換乾淨基線也仍存在。

### 舊測試最小修復判斷

- **已安全完成**：神煞健康檢查讀取實際嵌入位置、保留名稱／ID／柱位嚴格比對，補負面反例；沒有更動產品算法或來源狀態。
- **可以明確列出的機械問題**：michelin 檔末端括號／方法／class 未闭合；正則式 `/??.../` 未跳脫問號。但只補這兩處仍不能讓測試正確執行，因此未作局部修正後宣稱完成。
- **必須確定測試設計的部分**：該檔把自製 `runAll/testP0` 類別與 Jest `describe/test/expect/beforeAll` 混在一起；呼叫的 `testP1/testP2/testIntegration` **是尚未定義的測試方法，不是已證實缺失的產品方法**。專案沒有對應 Jest runner；也沒有實際啟動該 class。修復須選定既有 node/assert runner 或配置框架，逐項移植斷言、證明所有案例確實執行，不能刪空缺方法／放寬正則式就稱通過。
- `dual-chart-iching-shensha-output.test.cjs` 需要以真實後端 view builder 建 fixture（包含 visibility、byPillar、card），再逐條保留漏顯／受限／老師頁籤斷言。既有「前端不造句」檢查也可能揭露其他既有文案問題；若遇到，不得為本版排版修改老師功能或刪斷言。
- 所以「只修兩份測試工具」是可獨立驗收的一批：兩份都真的執行原要求、無刪減 assertion；但即使通過，仍不代表其他來源／計數／三核心缺陷已解決。

### 排版隔離與九筆舊提交

- 最新遠端 `origin/main=92bb504ca4015b6eb241fc379fe33b0968900953`；本機 `HEAD=b2635ba6747a989c1073017af3a72cba886bb915`，領先 9 筆首頁信任統計修改。
- 本輪產品檔只有 `app/dual-chart/BaziChart.tsx`、`BaziIChingShenShaCard.tsx`、`DualChart.tsx`、`dual-chart.module.css`、`export-pdf.ts`；必要檢查是 `scripts/dual-chart-iching-shensha-display-check.cjs`、`tests/iching-shensha-live-api.test.mjs`、新建的兩份定向測試及本報告。
- 這些既有路徑在 origin/main→HEAD 沒有差異；本輪沒有新套件需求。九筆提交中的 `@electric-sql/pglite` 及首頁測試指令不屬於排版依賴，不能一起帶上。
- 可以抽成僅包含本輪檔案的 patch；**不能在目前 main 直接普通 push 並同時排除它的九個祖先提交**。不使用 force push、不重設／遺失他人提交。
- 隔離發布需要人明確允許一次性基於遠端的臨時 branch/worktree（現行 AGENTS 禁止自行建立），或先完成九筆工作的獨立驗收並允許合併發布；本輪未做任何一種，也未部署未提交目錄。

### 實際阻止更新的規則

- `C:/Users/DRAGON/Desktop/命理/AGENTS.md`：**「若測試失敗、存在未解衝突、修改範圍或風險尚未釐清，禁止自動更新；先停止並向使用者回報。」**
- 同檔：**「不建立或保留功能分支、整合分支、臨時分支或驗證用 worktree，除非使用者明確要求。」**
- `C:/Users/DRAGON/.codex/skills/dual-chart-card/SKILL.md` 驗證節要求 **「npx tsc --noEmit --pretty false 與 git diff --check」**；畫面／列印節要求实际瀏覽器與成品 PDF，不以 HTTP 200 代替。
- `C:/Users/DRAGON/.codex/skills/shensha-rule-integrity/SKILL.md`：**「失敗紀錄不得刪除、弱化或用口頭完成取代。」** 因此不能將來源 pending 改為通過來促成這次發布。

### 正式管線與上線狀態

- `.vercel/project.json` 連結到 Vercel 專案 `heaven-earth-humanity-pair`；專案既有文件列的正式站為 `https://heaven-earth-humanity-pair.vercel.app/`。本次對 `/dual-chart` 唯讀 HEAD 請求回 200、Server=Vercel，只證明現站可連，不證明含本輪修改。
- `scripts/hooks/pre-push`（以及本機 `.git/hooks/pre-push`）記載 main push 會進 Vercel，腳本先正式 build 再逐項測試。本輪沒有略過它。未取得 Vercel 控制台部署 ID，不能聲稱已核實目前 Git 自動部署綁定或某次部署成功。
- `.github/workflows/ci.yml` 實際只监听 `develop` 的 push/PR，**不能當作 main 的 CI 已過或已部署證據**。
- **本輪狀態：本機修復與 PDF 成品已存在；未提交、未推送、未部署。手機／平板若看正式網址仍不是本輪新版本。**

### 最小下一步決策

1. 若只允許本卡排版：保留本輪 patch／PDF，本機可用；正式發布保持停止，不能以部分綠燈忽略上述失敗。
2. 若要先解除測試工具失效：只授權修復上列兩份測試工具與其 fixture，不改算法／來源／老師文案；驗收為實際執行原斷言並分開列出尚未修復的功能失敗，不承諾因此就能上線。
3. 排版單獨上線另需允許隔離九筆工作的方法；即使允許一次性隔離，也仍須解決或由業主明確重新界定既有發布政策，不會自動繞過失敗測試與來源門檻。
