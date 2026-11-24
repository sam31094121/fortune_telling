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
`--compare auto|<report.json>`（列出退步／修好） `--server-sha <sha>`（外部伺服器時註明受測版本） `--out <dir>` `--keep 5`。

## 檢查項目與判定

| 群組 | 項目 | PASS／WARN／FAIL |
|---|---|---|
| 品質 | cls | 載入後再等 6 秒（抓晚到橫幅），web-vitals session-window CLS < 0.05；另列 2.5 秒後的「晚到位移」與位移元素 |
| 品質 | tap | 點擊目標 ≥44px PASS；24–43px WARN；<24px FAIL（句中文字連結依 WCAG 例外） |
| 品質 | font | <14px 字數占比 >15% 或有 ≥4 字的 <12px 文字 → FAIL；有少量 <14px → WARN |
| 品質 | contrast | WCAG AA（一般 4.5、大字 3）；背景是圖片／漸層的文字標「未判定」，全部未判定時整項 SKIP，不算過 |
| 品質 | overflow | 整頁 scrollWidth 不可大於視窗 |
| 穩定 | errors | console.error、未捕捉例外、HTTP≥400（密碼卡的 401 除外；本機缺後端的 home-trust／guestbook 503 在非正式站降為 WARN） |
| 穩定 | load | 文件 HTTP < 400、60 秒內載入 |
| 穩定 | homeCards | 首頁入口依畫面位置排序後，與 config.mjs 的 15 張順序一致 |
| 穩定 | earlySwipe | 手機寬度：進首頁 0.4 秒就觸控滑 1500px，6 秒內被程式拉回 >200px 即 FAIL，附上呼叫 scrollTo／scrollIntoView 的堆疊 |
| 穩定 | beadSize | 寶珠格 ≥44px 且 4 秒後不縮；盤面要開局才有，唯讀模式不開局 → SKIP |
| 服務 | lcp | ≤2.5s PASS、≤4s WARN、>4s FAIL |
| 服務 | visibleError | 頁面出現「發生錯誤／載入失敗…」等字樣 |

米其林分數：PASS=1、WARN=0.5、FAIL=0、SKIP 不計；分數 = 10 × 加權通過 ÷ 檢查數。目標 品質 9.5／穩定 9／服務 8.5。
服務分只代表 LCP 與錯誤字樣，不代表真人體驗；真機 90 FPS 仍需實機。

## 資源防護

- **鎖檔**：`$TMPDIR/mingli-health-check.lock`（可用 `HC_LOCK_FILE` 改），同機同時只跑一個；持有者已結束或超過 2 小時視為過期。被擋時結束碼 75。
- **硬碟**：輸出位置 <0.3G 拒跑；要建置時 <6G 拒建（改用 `--base` 或 `--prod`）。
- **只清自己的輸出**：輸出預設在系統暫存 `mingli-health-runs/`（不在 repo 裡，避免被自動提交掃進去），只刪帶 `.hc-run` 標記的舊結果，保留最近 5 次。不碰 `.next` 以外的建置，也不刪 `.next`。
- **一次建置**：`--serve` 先看 `.next/HC_BUILD_SHA` 是否等於 HEAD 且 app／components／lib 沒改，是就重用；可設 `HC_BUILD_CACHE_DIR` 共用 Next 的編譯快取。伺服器開在 3400–3499 的空埠（跳過 3010、3092、3227、8888、9333），結束即關，不會重啟別人的服務。
- 只用自己啟動的無頭 Chromium；指到 9333 會直接拒絕。playwright 依 `PLAYWRIGHT_MODULE` → repo → `.tmp/shared-qa` 尋找，不做全域安裝。

## 不做的事

不填表單、不輸入密碼、不開局、不投票、不按收藏／強化；表單流程與門後功能仍要用既有的 e2e／人工步驟驗。
