# CHECKS-fix3｜依 AUDIT-2 修正後的完整檢查

- 分支 `feat/merge-opt`；檢查對象 HEAD `d5b38db`（程式最後一次變更）；基底 `e41f8f1`（`/workspace/merge-opt-before`，fix-3 起點）
- 時間：2026-11-15 01:40–03:40（UTC+8）
- 只在本機；沒有推送、沒有 force。沒有碰受保護檔案；沒有讀 `/home/box/.secrets`；`.env.example` 的內容沒有寫進任何地方。
- 使用埠：3177（基底）、3178、3179（修後／多執行個體），結束時全部關閉。沒有碰 :8888 :3010 :3030 :3091 :3110 :3130 :3140。
- 證據：`/workspace/beast-merge-plan/fix-3/`（`logs/`、`shots/`、`tools/`）

## 總表

| 檢查 | 結果 | 證據 |
|---|---|---|
| tsc（`tsc --noEmit -p .`） | **0 錯誤** | `logs/tsc-final.log` |
| jest（`jest --runInBand`） | 60 項：53 過、7 失敗；**失敗清單與基底逐條相同**（全是 `tests/ghost-asura-api.test.ts` 阿修羅接口既有失敗），沒有新增 | `logs/jest-head.log`、`logs/jest-base.log` |
| cjs 全集（`tests/*.test.cjs`） | 修後 203 支：170 過、31 失敗、2 跳過；基底 201 支：168 過、31 失敗、2 跳過。**失敗清單逐行相同，沒有新增失敗**；多出的 2 支是本輪新增測試（`i18n-match3-copy`、`beast-match3-fallback-lease`），都通過 | `logs/cjs-head/`、`logs/cjs-base/`、`logs/cjs-head-fail.txt`、`logs/cjs-base-fail.txt` |
| 正式建置（`NODE_OPTIONS=--max-old-space-size=3072`，`NEXT_PUBLIC_M3_FEED_CHAIN=1`、`NEXT_PUBLIC_M3_BATTLE_RESUME=1`） | **EXIT 0**（HEAD d5b38db）；有既有 lint／匯入警告（treasures.ts 具名匯出 JSON 等，L6），0 錯誤 | `logs/build-final2.log` |
| `npm audit --omit=dev` | **0 個漏洞** | `logs/npm-audit.log` |
| 三種寬度截圖（390／768／1280，繁中＋英文，選隊頁／推薦後／戰鬥頁） | 6 組都沒有橫向捲動、按鈕沒有裁切；另有 320／390 四語（en／ja／ko／简中） | `shots/h5/final-*.png`、`shots/h5/after-320-*`、`after-390-*`、`logs/h5-i18n-final-3w.json`、`logs/h5-i18n-h5final2.json` |
| 多伺服器降級行為（兩個 `next start` 模擬多執行個體） | 沒有共用儲存時（不論有沒有金鑰、或在 Vercel 宣告單一行程）兩台都回 503 `unavailable`，**沒有任何 409 誤判、沒有 200 重放**；一般模式回合兩台都 200 | `logs/multi/*.json`、`tests/e2e/battle-multi-instance.cjs` |
| 降級時前端實際能打 | 390 實測：點選模式、鍵盤、拖曳三種都能出手（回合 1→2），axe 戰鬥頁 0 違規，0 個頁面錯誤 | `logs/a11y-e2e-final2.json` |

### cjs 跳過說明
`beast-series-api.test.cjs`、`ghost-asura-reading-errors.test.cjs` 把 :8888 寫死、不能用環境變數改網址；照規定不碰禁止埠，基底與修後**同樣跳過**。其餘會連伺服器的測試，網址一律指到沒有人在聽的 `127.0.0.1:3197`（連不上就照實失敗，基底與修後條件相同）。執行器：`fix-3/tools/run-cjs.sh`。

### cjs 既有失敗（基底就有，31 支，本輪未新增也未處理）
bazi-reading-boundary、beast-battle-mode、beast-card-campaign.api、beast-difficulty、beast-exact-stake、beast-field-resume、beast-match3-entry、beast-opponent-name、beast-orb-api、beast-orb-energy-tap、beast-qinglong-candidate-geometry、beast-qinglong-gate、credibility-wording、ghost-asura-home-entry、ghost-asura-nature-api-regression、ghost-asura-nature-card、ghost-asura-page-flow、ghost-asura-present-guide、ghost-asura-skill-forbidden-terms、ghost-asura-supplement-forbidden-terms、ghost-asura-three-tiles-selection、install-completion、install-shield、michelin-stability-comprehensive、no-old-cards、share-version、star-beast-entry.api、taiji-level-02-24-lock、three-core-exact-time、three-core-reading-routes、western-life-code-api。
其中 `no-old-cards` 從 9 處降到 1 處（M7），剩下的是阿修羅死亡動畫預覽頁真的用 `<img>` 直接畫卡圖（受保護檔，沒有放行）。

## 多伺服器降級：四種設定

| 設定 | status（A／B） | 開局 | 一般模式回合 | 判定 |
|---|---|---|---|---|
| A 沒金鑰、沒共用儲存 | 503 unavailable（no-shared-store） | 503 ×3 | 200／200 | 通過 |
| B 有臨時金鑰、沒共用儲存 | 503 unavailable（no-shared-store） | 503 ×3 | 200／200 | 通過 |
| C 有金鑰＋`VERCEL=1`＋宣告單一行程 | 503 unavailable（vercel-memory） | 503 ×3 | 200／200 | 通過（Vercel 上宣告無效） |
| D **錯誤設定**：兩台都宣告 `M3_BATTLE_SINGLE_INSTANCE=1` | 200 single-instance | 200 | 200／200 | 只觀察：換台就回 409 `lost`（逃輸局、重放都擋得住，但正常玩家換台會被判這場作廢）。所以 `M3_BATTLE_SINGLE_INSTANCE` 只能用在真的只有一個行程的自架環境，ENV-FLAGS 已寫明 |

臨時金鑰只存在那兩個伺服器行程的環境變數，沒有寫進任何檔案，行程已關閉。D 是在 d5b38db 之前的建置（b60dc10 起的程式）跑的；A 在 d5b38db 建置上重跑一次，結果相同。

## 首頁捲動（M14 合入後；修前 e41f8f1 :3177、修後 :3178，同一腳本 `fix-3/tools/home-scroll.mjs`，各 4 輪）

| 寬度 | 修前最長卡頓 (ms) | 修後最長卡頓 (ms) |
|---|---|---|
| 手機 390（CPU 降速 4 倍） | 3,033／3,167／3,033／3,350 | 217／**1,233**／183／283 |
| 平板 768（降速 2 倍） | 2,800／2,983／2,667／2,733 | 267／283／283／283 |
| 電腦 1280 | 2,517／2,250／2,700／2,583 | 167／133／133／133 |

手機 4 輪中有 1 輪出現 1.2 秒長幀（推測是撞上進頁後的暖機空檔，和 perf-sec 報告寫的「第一刀」量級相同），照實列出。其餘 3 輪都在 0.3 秒以內。量測檔：`logs/home-scroll.json`、`logs/home-scroll-2.json`。這輪量的是 d5b38db 之前的建置（L4 只改寶珠戰的分頁租約，不影響首頁）。

## 五語（H5）
- 390 可見中文節點：選隊頁 en 482 → 5、ko 427 → 5（剩五元素單字；ko 沿用既有「풍(風)」）、ja 只剩日文本來就用的漢字；戰鬥頁 en／ko 21 → 1（剩敵方卡名，專有名詞保留）。
- 卡面文字（182 個節點）由受保護的 BeastCardTile 繪製，**沒有翻譯**。
- 320／390 四語都沒有橫向捲動、按鈕沒有裁切；被量到超出寬度的 3–5 個節點都在 `.srOnly`（螢幕報讀專用、1px 裁切）裡，繁中原文也一樣，畫面上看不到。

## 誠實限制
- 都是本機無頭 Chromium；沒有真手機數據。
- 多執行個體是同一台機器兩個 `next start`，不是真的 Vercel。
- 三種寬度截圖與首頁捲動是在 d5b38db 前一版的建置上跑；d5b38db 的建置、降級 E2E 與點選／鍵盤／拖曳出手已重跑確認。
