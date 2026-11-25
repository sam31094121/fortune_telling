# 首頁 15 卡健康檢查（scripts/health）

一支指令查首頁＋15 張卡 × 360／390／1280，輸出 `report.json`（機器讀）＋ `report.md`（一頁人讀），米其林分數由數據算出。
只做量測，不改產品程式；預設 **唯讀**：所有非 GET／HEAD／OPTIONS 請求在 **瀏覽器層**（CDP `Fetch`，含 sendBeacon、XHR、Service／Web Worker、跨站 iframe、表單送出）攔下並列在報告裡（所以不會寫帳本、投票、FUSE）；攔截不停用 HTTP 快取，量到的載入時間接近真實使用者。

## 三種用法（由省到貴）

| 情境 | 指令 | 建置 |
|---|---|---|
| 已有伺服器在跑（本機 `next start`、預覽站） | `npm run health:cards:url -- http://127.0.0.1:8890` | 不建置 |
| 正式站唯讀抽查 | `npm run health:cards:prod` | 不建置 |
| 要驗目前分支 | `npm run health:cards`（重用同 HEAD 的 .next）／`npm run health:cards:build` | 最多一次 |
| 完整驗收（建置＋全部閘門＋比較） | `npm run health:cards:full`（= `--serve --build --gates all --compare auto`） | 最多一次 |

常用參數：`--widths 360,390` `--only tarot,13` `--concurrency 2` `--settle-ms 6000` `--shots none|fail|all` `--gates tsc,test:health-toolkit`
`--compare auto|<report.json>`（列出退步／修好／新量到／變成未判定） `--server-sha <sha>`（外部伺服器時註明受測版本） `--out <dir>` `--keep 5`（下限 1）
`--wait-for-builds <分鐘>`（偵測到別的 next build 時等它） `--cards <json>`（自訂頁面清單，測試用）。
`--extras none|all|i18n,rm,nav`（預設 all，只在 390 寬跑：五語切換、減少動態、從首頁進卡→慢捲到底→上一頁／下一頁）
`--desktop-profile`（1280 改用桌機提案門檻，見下） `--min-coverage 0.9`（涵蓋率低於門檻就警告） `--strict`（未達業主目標或涵蓋率不足 → exit 1）。
參數打錯、`--only` 有不認得的卡、篩到 0 頁 → 直接報錯、exit 2，不會出一份「0 FAIL」的報告。

## 檢查項目與判定

| 群組 | 項目 | PASS／WARN／FAIL |
|---|---|---|
| 穩定 | content | 頁面至少有可見文字、按鈕或圖像；全空白 → FAIL |
| 穩定 | load | 文件 HTTP < 400、60 秒內載入 |
| 穩定 | errors | console.error、未捕捉例外、HTTP≥400、連線失敗（requestfailed；ERR_ABORTED 另列不算）。密碼卡的 401 除外；本機缺後端的 home-trust／guestbook 503 在非正式站降為 WARN；唯讀攔下的寫入只抵銷「那一筆」造成的訊息 |
| 穩定 | homeCards | 首頁入口依畫面位置排序後，與 config.mjs 的 15 張順序一致 |
| 穩定 | earlySwipe | 手機寬度：進首頁 0.4 秒就用 **真的觸控手勢**（CDP touch 事件，最多 3 次；不動才改滑鼠滾輪）滑 1500px，6 秒內被程式拉回 >200px 即 FAIL；手勢和滾輪都不動、只能用 scrollBy 時最多 WARN（沒模擬到使用者）；報告列出用的方法 |
| 穩定 | reducedMotion | （extras）`prefers-reduced-motion: reduce` 下可見字數 ÷ 一般模式：<0.3 FAIL、<0.7 WARN |
| 穩定 | backForward | （extras）首頁→卡片→上一頁→下一頁，兩邊都要有內容、期間沒有頁面錯誤 |
| 品質 | cls | 載入後 **穩定即止**：至少 2.5 秒，之後網路請求都結束且 1.5 秒內畫面沒有變動／位移就停，最多 `--settle-ms`（預設 6 秒）；晚到的錯誤條仍會因為網路未停或畫面變動而被等到。web-vitals session-window CLS < 0.05；另列 2.5 秒後的「晚到位移」與位移元素 |
| 品質 | tap | 點擊目標 ≥44px PASS；24–43px WARN；<24px FAIL（句中文字連結依 WCAG 例外） |
| 品質 | font | <14px 字數占比 >15% 或有 ≥4 字的 <12px 文字 → FAIL；有少量 <14px → WARN |
| 品質 | a11y | 沒有名稱的按鈕／連結、沒有標籤的欄位、`<html lang>` 缺漏 → FAIL；缺 alt 的圖、重複 id → WARN；樣本附 CSS 路徑與位置 |
| 品質 | scroll | （extras）慢速捲到底：捲動中的版面位移（CLS）與捲後破圖 |
| 品質 | contrast | WCAG AA（一般 4.5、大字 3）。漸層背景取各色標疊在底色上的範圍：全部不足 FAIL、只有部分區域不足 WARN；oklch／oklab／lab／lch／color-mix 等由瀏覽器換算成 sRGB 後再判；背景是圖片或仍無法解析才標「未判定」 |
| 品質 | overflow | 整頁 scrollWidth 不可大於視窗；另逐個文字／按鈕檢查是否被視窗邊緣切掉（body overflow-x:hidden 時整頁寬度看不出來）。可橫捲容器、視窗內容器裁切、動畫中的元素不算 |
| 品質 | images | 已載入完成但沒有像素的圖片（壞檔、格式錯）→ FAIL |
| 品質 | beadSize | 寶珠格 ≥44px 且 4 秒後不縮；盤面要開局才有，唯讀模式不開局 → 直接 SKIP（不開頁面白跑） |
| 服務 | lcp | ≤2.5s PASS、≤4s WARN、>4s FAIL |
| 服務 | visibleError | 頁面出現「發生錯誤／載入失敗…」等字樣 |
| 服務 | tbt | 長任務阻塞時間（TBT 代理值，long task 超過 50ms 的部分加總，載入到穩定為止）：≤200ms PASS、≤600ms WARN、>600 FAIL；瀏覽器沒有資料 → SKIP。這不是 INP（INP 要真人互動），報告「未涵蓋」會寫明 |
| 服務 | i18n | （extras）zh-Hans／en／ja／ko 逐一切換（寫 localStorage `interface-reading-language-v1`）：空白、錯誤字樣、程式值外露（undefined／[object Object]／`{{key}}`／`a.b.c` 鍵名）→ FAIL；`<html lang>` 沒跟著換 → WARN；沒翻到的句子保留繁中是設計，只列比例不扣分 |

**手機合併**：360 與 390 同一頁的同一項取較差者合併成一列再算分（同一個問題不重複扣兩次）；報告另列未合併的分數供對照。

**桌機 1280 門檻（待擁有者決定）**：預設 1280 與手機同標準（點擊 44px、字 14px）。`config.mjs` 的 `DESKTOP_PROFILE`（點擊 24px、正文 12px、硬下限 10px）是提案值，`enabled:false`；用 `--desktop-profile` 或改 `enabled:true` 才套用。不論套不套，報告都有「桌機 1280 門檻試算」一節，列出另一套標準下每頁 tap／font 會變成什麼、品質與整體分數會變多少。

頁面沒載入（HTTP ≥400、連不上、逾時）或是空白頁時，cls／tap／font／contrast／overflow／images／lcp／visibleError 一律 SKIP（不再把錯誤頁算成品質滿分）；報告另列 **涵蓋率**（已判定／應判定）與每項 SKIP 原因。

分數：PASS=1、WARN=0.5、FAIL=0、SKIP 不計；分數 = 10 × 加權通過 ÷ 已判定數。名稱對應實際量到的東西：
**品質（頁面量測）**、**穩定（頁面層）**、**服務（技術代理）**，另有 **整體（所有已判定項目）**。
業主米其林定義裡本工具量不到的部分（真機 90 FPS、服務的文案與下一步、唯讀時的寶珠大小）會列在「不完整，未含…」，
這時 `meetsTarget` 是 null——**不完整的分數不能拿來說「已達標」**。

**閘門（gates）接進穩定分**：`--gates all` = tsc（`tsc --noEmit -p tsconfig.json`）＋ test（`npm test`）＋ audit（`npm audit --omit=dev`：critical／high → FAIL、moderate → WARN）；加 `--serve --build` 時再加 build（next build 成功並以 next start 起來、身分核對通過才 PASS）。
也可指定任意 npm 腳本，例如 `--gates tsc,test:health-toolkit`。有跑的閘門（PASS／WARN／FAIL）算進穩定分；沒跑的列「未跑」、判不出來（例如 package.json 沒有 test 腳本、沒有 --serve 卻要 build）列「未判定」，穩定分維持不完整。報告有「閘門（gates）」表。

報告另有「本工具未涵蓋」一節（真機 FPS、INP、真人讀文案、門後流程、螢幕報讀器實測…），避免把分數讀成全面保證。

## 資源防護

- **鎖檔**：`$TMPDIR/mingli-health-check.lock`（Linux 多半是 /tmp；Windows 是 `%TEMP%`，例如 `C:\Users\<你>\AppData\Local\Temp`；可用 `HC_LOCK_FILE` 改到共同位置）。同機同時只跑一個，被擋時結束碼 75。
  - 鎖裡記 pid＋**行程啟動時間**；pid 還活著但啟動時間不同（PID 被重用）視為過期，不會誤擋。
  - 持有者每 30 秒更新鎖檔時間（心跳）；沒有身分資訊或別台機器的鎖，心跳超過 10 分鐘才回收。
  - 回收過期鎖要先拿到 `.reclaim` 互斥檔，在互斥中重讀確認仍過期才刪；建立新鎖一律原子 `wx`。多個行程同時搶只會有一個成功（測試用 8 個行程驗證）。
- **硬碟／記憶體**：輸出位置 <0.3G 拒跑；要建置時硬碟 <6G 或可用記憶體 <2G 拒建（改用 `--base` 或 `--prod`）。
- **建置衝突**：`--serve` 前列出 node 行程（Windows 只看 node／bun／deno，不會把 cmd.exe 外殼重複算）；有別的 `next build` 在跑就拒建（exit 2），同 repo 有 `next start/dev` 正在用輸出資料夾也拒建（`--wait-for-builds <分鐘>` 可等它結束再繼續）；只是重用時，同 repo 正在建置也會擋。Windows 讀不到別的行程的工作目錄，用相對路徑啟動的 next 「不知道是不是同 repo」：這時看輸出資料夾 60 秒內有沒有被寫入來判斷，並在記錄裡註明。長得像但不是 next 的行程（例如路徑或參數裡有 next 字樣）不算。
- **輸出資料夾**：預設 `.next`；可用 `HC_DIST_DIR`／`NEXT_DIST_DIR` 改（next.config.mjs 讀 `NEXT_DIST_DIR`），不會碰 `npm run build` 用的 `.next-production`。
- **不留孤兒行程**：工具啟動的 next build／next start 都帶看門狗（`NODE_OPTIONS=--require scripts/health/watchdog.cjs`，每 1.5 秒確認工具本身還在，不在就自己結束）。正常結束、Ctrl+C（exit 130）、被強制結束都不留 next 行程。
- **伺服器起不來**：`--serve` 失敗時在這次的資料夾寫 `error.json`（階段、原因、build 閘門 FAIL／SKIP），不會留空殼也不會冒充 build PASS；exit 2。
- **一次建置**：`--serve` 先看 `.next/HC_BUILD_SHA` 是否等於 HEAD 且工作區乾淨（除了 reports／docs／logs／tests 與 .md 之外的改動都算，含 features、cards、data、public），是就重用；髒工作區建出來的不寫標記。可設 `HC_BUILD_CACHE_DIR` 共用 Next 的編譯快取。
- **伺服器身分**：開在 3400–3499 的空埠（跳過 3010、3092、3227、8888、9333）。選埠到綁定之間若被別人搶走，自己的 next start 會結束——工具會看到「自己的行程已結束」並報錯，而且要求 `/_next/static/<BUILD_ID>/_buildManifest.js` 回 200 才算是自己的伺服器。next start 的輸出最後 20 行寫進 report.json；量測途中伺服器結束會在報告標「不可信」。結束即關，不會重啟別人的服務。
- **只清自己的輸出、依範圍保留**：輸出預設在系統暫存 `mingli-health-runs/`（不在 repo 裡，避免被自動提交掃進去），只刪帶 `.hc-run` 標記的舊結果；資料夾名稱用 **本機時間＋時區**（例如 `20261125T141530+0800-…`），同一秒重複時加 `.2`。保留依「範圍」分組＝目標（remote／local-start／local-existing）＋站名 label＋頁面範圍（全部／`--only`／`--cards`）＋寬度＋唯讀與否，每組各留 `--keep` 份（含這次，下限 1）；只量一頁或部分寬度的試跑不會擠掉完整跑。完整範圍（全部頁面＋360/390/1280）每個目標＋站名最新一份永不自動刪。沒有 report.json 的資料夾（中斷、失敗留下的）超過 2 分鐘就清；Ctrl+C 中斷時這次自己的資料夾當場刪掉。`--compare auto` 只拿同範圍的上一份。
- 只用自己啟動的無頭 Chromium；指到 9333 會直接拒絕。playwright 依 `PLAYWRIGHT_MODULE` → repo → `.tmp/shared-qa` 尋找，不做全域安裝。
- **部署版本**：正式站會記錄每個請求上的 Vercel `dpl_…`；同一次量測出現兩個版本（部署到一半）會標注意並 exit 1。
- **負載**：報告記錄並行數與開始時的系統負載；Linux 負載過高時加註「時間類數字可能偏慢」。

## 測試

`npm run test:health-toolkit`：純函式＋迷你假網站（`scripts/health/fixture-server.mjs`：正常、空白、500、漸層底、被切掉、被攔寫入、真的連線失敗、壞圖；另有 `EXTRA_CARDS`：各種寫入管道＋快取、晚到錯誤條、oklch／color-mix、無障礙缺漏、五語、減少動態變空白、捲到底才跳、桌機小字小鈕、只有畫布）端到端，約 2 分鐘。需要 playwright（設 `PLAYWRIGHT_MODULE`）；找不到時端到端那段會印出 SKIP。

## 不做的事

不填表單、不輸入密碼、不開局、不投票、不按收藏／強化；表單流程與門後功能仍要用既有的 e2e／人工步驟驗。
