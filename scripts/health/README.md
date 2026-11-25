# 首頁 15 卡健康檢查（scripts/health）

一支指令查首頁＋15 張卡 × 360／390／1280，輸出 `report.json`（機器讀）＋ `report.md`（一頁人讀），米其林分數由數據算出。
只做量測，不改產品程式；預設 **唯讀**：所有非 GET 請求在瀏覽器端攔下並列在報告裡（所以不會寫帳本、投票、FUSE）。

## 三種用法（由省到貴）

| 情境 | 指令 | 建置 |
|---|---|---|
| 已有伺服器在跑（本機 `next start`、預覽站） | `npm run health:cards:url -- http://127.0.0.1:8890` | 不建置 |
| 正式站唯讀抽查 | `npm run health:cards:prod` | 不建置 |
| 要驗目前分支 | `npm run health:cards`（重用同 HEAD 的 .next）／`npm run health:cards:build` | 最多一次 |

常用參數：`--widths 360,390` `--only tarot,13` `--concurrency 2` `--settle-ms 6000` `--shots none|fail|all` `--gates tsc,test:health-toolkit`
`--compare auto|<report.json>`（列出退步／修好／新量到／變成未判定） `--server-sha <sha>`（外部伺服器時註明受測版本） `--out <dir>` `--keep 5`（下限 1）
`--wait-for-builds <分鐘>`（偵測到別的 next build 時等它） `--cards <json>`（自訂頁面清單，測試用）。
參數打錯、`--only` 有不認得的卡、篩到 0 頁 → 直接報錯、exit 2，不會出一份「0 FAIL」的報告。

## 檢查項目與判定

| 群組 | 項目 | PASS／WARN／FAIL |
|---|---|---|
| 穩定 | content | 頁面至少有可見文字、按鈕或圖像；全空白 → FAIL |
| 穩定 | load | 文件 HTTP < 400、60 秒內載入 |
| 穩定 | errors | console.error、未捕捉例外、HTTP≥400、連線失敗（requestfailed；ERR_ABORTED 另列不算）。密碼卡的 401 除外；本機缺後端的 home-trust／guestbook 503 在非正式站降為 WARN；唯讀攔下的寫入只抵銷「那一筆」造成的訊息 |
| 穩定 | homeCards | 首頁入口依畫面位置排序後，與 config.mjs 的 15 張順序一致 |
| 穩定 | earlySwipe | 手機寬度：進首頁 0.4 秒就觸控滑 1500px，6 秒內被程式拉回 >200px 即 FAIL；工具端錯誤標 SKIP |
| 品質 | cls | 載入後再等 6 秒（抓晚到橫幅），web-vitals session-window CLS < 0.05；另列 2.5 秒後的「晚到位移」與位移元素 |
| 品質 | tap | 點擊目標 ≥44px PASS；24–43px WARN；<24px FAIL（句中文字連結依 WCAG 例外） |
| 品質 | font | <14px 字數占比 >15% 或有 ≥4 字的 <12px 文字 → FAIL；有少量 <14px → WARN |
| 品質 | contrast | WCAG AA（一般 4.5、大字 3）。漸層背景取各色標疊在底色上的範圍：全部不足 FAIL、只有部分區域不足 WARN；背景是圖片或無法解析的色彩函式才標「未判定」 |
| 品質 | overflow | 整頁 scrollWidth 不可大於視窗；另逐個文字／按鈕檢查是否被視窗邊緣切掉（body overflow-x:hidden 時整頁寬度看不出來）。可橫捲容器、視窗內容器裁切、動畫中的元素不算 |
| 品質 | images | 已載入完成但沒有像素的圖片（壞檔、格式錯）→ FAIL |
| 品質 | beadSize | 寶珠格 ≥44px 且 4 秒後不縮；盤面要開局才有，唯讀模式不開局 → SKIP |
| 服務 | lcp | ≤2.5s PASS、≤4s WARN、>4s FAIL |
| 服務 | visibleError | 頁面出現「發生錯誤／載入失敗…」等字樣 |

頁面沒載入（HTTP ≥400、連不上、逾時）或是空白頁時，cls／tap／font／contrast／overflow／images／lcp／visibleError 一律 SKIP（不再把錯誤頁算成品質滿分）；報告另列 **涵蓋率**（已判定／應判定）與每項 SKIP 原因。

分數：PASS=1、WARN=0.5、FAIL=0、SKIP 不計；分數 = 10 × 加權通過 ÷ 已判定數。名稱對應實際量到的東西：
**品質（頁面量測）**、**穩定（頁面層）**、**服務（技術代理）**，另有 **整體（所有已判定項目）**。
業主米其林定義裡本工具量不到的部分（穩定的 tsc／測試／build／真機 90 FPS、服務的文案與下一步、唯讀時的寶珠大小）會列在「不完整，未含…」，
這時 `meetsTarget` 是 null——**不完整的分數不能拿來說「已達標」**。用 `--gates tsc,test:xxx` 與 `--serve --build` 可補上 tsc／測試／build。

## 資源防護

- **鎖檔**：`$TMPDIR/mingli-health-check.lock`（Linux 多半是 /tmp；Windows 是 `%TEMP%`，例如 `C:\Users\<你>\AppData\Local\Temp`；可用 `HC_LOCK_FILE` 改到共同位置）。同機同時只跑一個，被擋時結束碼 75。
  - 鎖裡記 pid＋**行程啟動時間**；pid 還活著但啟動時間不同（PID 被重用）視為過期，不會誤擋。
  - 持有者每 30 秒更新鎖檔時間（心跳）；沒有身分資訊或別台機器的鎖，心跳超過 10 分鐘才回收。
  - 回收過期鎖要先拿到 `.reclaim` 互斥檔，在互斥中重讀確認仍過期才刪；建立新鎖一律原子 `wx`。多個行程同時搶只會有一個成功（測試用 8 個行程驗證）。
- **硬碟／記憶體**：輸出位置 <0.3G 拒跑；要建置時硬碟 <6G 或可用記憶體 <2G 拒建（改用 `--base` 或 `--prod`）。
- **建置衝突**：`--serve` 前列出行程；有別的 `next build` 在跑就拒建，同 repo 有 `next start/dev` 正在用 .next 也拒建（`--wait-for-builds <分鐘>` 可等它結束）；只是重用 .next 時，同 repo 正在建置也會擋。
- **一次建置**：`--serve` 先看 `.next/HC_BUILD_SHA` 是否等於 HEAD 且工作區乾淨（除了 reports／docs／logs／tests 與 .md 之外的改動都算，含 features、cards、data、public），是就重用；髒工作區建出來的不寫標記。可設 `HC_BUILD_CACHE_DIR` 共用 Next 的編譯快取。
- **伺服器身分**：開在 3400–3499 的空埠（跳過 3010、3092、3227、8888、9333）。選埠到綁定之間若被別人搶走，自己的 next start 會結束——工具會看到「自己的行程已結束」並報錯，而且要求 `/_next/static/<BUILD_ID>/_buildManifest.js` 回 200 才算是自己的伺服器。next start 的輸出最後 20 行寫進 report.json；量測途中伺服器結束會在報告標「不可信」。結束即關，不會重啟別人的服務。
- **只清自己的輸出**：輸出預設在系統暫存 `mingli-health-runs/`（不在 repo 裡，避免被自動提交掃進去），只刪帶 `.hc-run` 標記的舊結果，保留最近 5 次（下限 1，目前這次永遠不刪）。找不到 playwright、參數錯誤時不會留下空資料夾。
- 只用自己啟動的無頭 Chromium；指到 9333 會直接拒絕。playwright 依 `PLAYWRIGHT_MODULE` → repo → `.tmp/shared-qa` 尋找，不做全域安裝。
- **部署版本**：正式站會記錄每個請求上的 Vercel `dpl_…`；同一次量測出現兩個版本（部署到一半）會標注意並 exit 1。

## 測試

`npm run test:health-toolkit`：純函式＋迷你假網站（`scripts/health/fixture-server.mjs`：正常、空白、500、漸層底、被切掉、被攔寫入、真的連線失敗、壞圖）端到端，約 10 秒。需要 playwright（設 `PLAYWRIGHT_MODULE`）；找不到時端到端那段會印出 SKIP。

## 不做的事

不填表單、不輸入密碼、不開局、不投票、不按收藏／強化；表單流程與門後功能仍要用既有的 e2e／人工步驟驗。
