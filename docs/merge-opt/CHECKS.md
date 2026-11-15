# A6 困難模式中途重整接回原戰局：健康／流暢度／安全檢查紀錄

- 分支：`feat/merge-opt`（/workspace/merge-opt）
- 最初受檢版本：HEAD = `6aed922`（下列 1.2、2.2–2.4、3 節）
- 套件修補提交：`c84b71a`（同主版本升級，對齊 21d09907）；下列 1.3、2.1 為修補後重跑
- A6 提交：`818fdd7`（主體）、`9a9dab1`（測試）、`6b004d1`（PLAN-v2 第四節）、`6aed922`（落敗／離開改回 closed 碼）
- 比對基底：`4630af2`（A6 之前），worktree `/workspace/merge-opt-base4630`
- 時間一律為 UTC+8。每完成一項就寫入本檔（防中斷）。
- 證據目錄：`/workspace/beast-merge-plan/opt-2/`（logs3＝先前紀錄，logs4＝6aed922 補跑，logs5＝c84b71a 套件修補後重跑）

## 1. 健康檢查

### 1.1 既有紀錄採用情況（logs3，22:24–22:52）
| 項目 | 跑的版本 | 結果 | 檔案 |
|---|---|---|---|
| tsc（主專案） | 818fdd7（22:25） | 0 錯誤 | logs3/tsc.txt（空）、summary.txt |
| tsc（背景） | 818fdd7 | 0 錯誤 | logs3/tsc-bg.txt |
| jest | 818fdd7 | 7 suites 中 1 失敗；60 項中 53 過 7 敗（皆 tests/ghost-asura-api.test.ts） | logs3/jest.txt |
| jest 基底 | 4630af2 | 同樣 53 過 7 敗，失敗項相同 | logs3/jest-base.txt |
| cjs 測試腳本 | 818fdd7 | 201 支中 31 支失敗 | logs3/cjs.txt |
| cjs 基底 | 4630af2 | 32 支失敗 | logs3/cjs-base-failset.txt、base-*.log |
| next build | 6aed922（22:45，提交後 1 分鐘） | EXIT 0，42 秒 | logs3/build-final.log |

**基底比對（cjs）**：A6 的 31 支失敗**全部**都在基底 32 支失敗清單內（逐行 diff），沒有新增失敗；
基底多出的 1 支是 `beast-qinglong-gate.test.cjs`（基底清單內標 2 次，屬不穩定，A6 這次通過）。
基底就失敗的包括：7 個 ghost-asura 系列、`beast-match3-entry`、`beast-battle-mode`、`beast-orb-api`、`no-old-cards`、`share-version`、`taiji-level-02-24-lock`、`three-core-*` 等（完整清單見 cjs-base-failset.txt）。
A6 新增／相關測試：`beast-match3-battle-resume` 14/14 過、`beast-match3-merge-opt` 過、`beast-match3-feed-chain` 過。

**jest 比對**：A6 與基底失敗的 7 項完全相同，皆為 `tests/ghost-asura-api.test.ts`（阿修羅文案／限流期待值不符，舊有失敗；今天整合版 007ccda4 的阿修羅測試修正不在本分支基底內）。

**缺口**：logs3 的 tsc／jest／cjs 是在 818fdd7 跑的，6aed922 又改了 5 檔（8 行）。另外 build-final.log 沒有記錄是否限制記憶體。→ 下面 1.2 補跑。

### 1.2 本次補跑（logs4，23:13 起，版本 6aed922）
| 項目 | 結果 | 檔案 |
|---|---|---|
| next build（`NODE_OPTIONS=--max-old-space-size=3072`，`NEXT_PUBLIC_M3_FEED_CHAIN=1`、`NEXT_PUBLIC_M3_BATTLE_RESUME=1`，HEAD=6aed9222） | **EXIT 0，74 秒**；含型別檢查；只有既有 lint 警告（no-explicit-any 等），0 錯誤 | logs4/build-6aed922.log |
| tsc --noEmit（限 3072MB） | **0 錯誤**，30 秒 | logs4/tsc-6aed922.txt |
| beast-match3-battle-resume（A6 專屬） | **14/14 過** | logs4/cjs-beast-match3-battle-resume.log |
| beast-match3-merge-opt | 過 | logs4/cjs-beast-match3-merge-opt.log |
| beast-match3-feed-chain | 過 | logs4/cjs-beast-match3-feed-chain.log |
| jest | 未重跑：6aed922 只改 A6 的 5 檔，jest 只測 ghost-asura-api，與 A6 無交集；沿用 logs3 結果（53/60，失敗 7 項與基底相同） | logs3/jest.txt |
| 其他 cjs 全集 | 未重跑全集：沿用 818fdd7 的結果；6aed922 改動範圍內的 3 支已在 6aed922 重跑通過 | logs3/cjs.txt |

**健康檢查結論（6aed922）：通過（以「不新增失敗」為準）。** tsc 0、build 0、A6 相關測試全過；jest 與 cjs 的既有失敗都和基底 4630af2 相同，A6 沒有新增任何失敗。
注意：既有失敗本身（7 項 jest、31 支 cjs）仍存在，不是 A6 造成，也不在本次範圍內修。

### 1.3 套件修補後重跑（logs5，23:21–23:23 UTC+8，版本 `c84b71a`）
| 項目 | 結果 | 檔案 |
|---|---|---|
| tsc --noEmit（限 3072MB） | **0 錯誤**，28 秒（23:21:28–23:21:56） | logs5/tsc.txt |
| next build（`NODE_OPTIONS=--max-old-space-size=3072`，`NEXT_PUBLIC_M3_FEED_CHAIN=1`、`NEXT_PUBLIC_M3_BATTLE_RESUME=1`） | **EXIT 0，74 秒**（23:22:00–23:23:14）；Next.js 15.5.29；含型別檢查；Compiled successfully；只有既有警告（treasures.ts named export 等），0 錯誤 | logs5/build.log |
| beast-match3-battle-resume（A6 專屬） | **14/14 過** | logs5/cjs-beast-match3-battle-resume.log |
| beast-match3-merge-opt | **15/15 過** | logs5/cjs-beast-match3-merge-opt.log |
| beast-match3-feed-chain | **36/36 過** | logs5/cjs-beast-match3-feed-chain.log |

**健康檢查結論（c84b71a 修補後）：通過，無退步。** tsc 0、build 0、A6 與合併強化相關測試全過，與修補前相同。jest 與其他 cjs 全集未在此次套件升級後重跑。

## 2. 安全檢查

### 2.1 npm audit --omit=dev
- 先前（6aed922，logs4）：**未通過：6 個漏洞（2 嚴重、4 高）**：next 15.5.22（多項 RCE／快取污染／DoS 公告）、next 內附 postcss、sharp、source-map-js、以及 dompurify、nanoid。檔案：logs4/npm-audit-omit-dev.txt。這 6 個不是 A6 新增：A6 只改 package.json 的 scripts，沒動任何相依套件；基底 4630af2 是同一份 lockfile。
- 本次（`c84b71a`，23:23 UTC+8，logs5）：**通過：0 個漏洞。** 提交 `c84b71a` 以同主版本升級套用與 21d09907 相同的修法：next 15.5.29、dompurify 3.4.17、nanoid 3.3.20、postcss 以 overrides 升到 8.5.23、source-map-js 1.2.2、sharp 0.35.5。`package.json` 只新增 `overrides.next.postcss = ^8.5.23`；lockfile 基底與 21d09907 的父提交相同，故直接套用同一份 lockfile。檔案：logs5/npm-audit-omit-dev.txt、logs5/dep-versions.txt。

### 2.2 竄改／重放／雙分頁（HTTP，對 6aed922 正式建置 :3177，22:47）
`tools/tamper-http.cjs` → logs3/tamper-http.json：**21/21 通過**
- 開局竄改（敵血 1、我血 9999）→ 400 invalid
- 回合竄改（我方血×3＋灌滿能量、敵血 1、關卡 wins 2→9）→ 409 tampered；自選種子 → 400；接回時敵人全滅 → 409 tampered；結算竄改關卡 → 409 tampered
- 偽造收據簽章 → 409 stale
- **重放**：拿第 0 號收據送第 1 步、第 1 號收據送第 2 步 → 皆 409 stale
- **雙分頁**：第二分頁拿舊收據接回只會拿到伺服端最新狀態，不能回到舊狀態（200 但為最新）；別台裝置代打 → 409 device
- 未全滅就結算 → 409 not-finished
- 放棄後用舊快照接回（逃輸局）→ 409 closed；落敗後繼續出手 → 409 closed
- 正常回合伺服端回應 8.6–9.3ms，開局 43.7ms

### 2.3 邏輯測試（node --test，6aed922 重跑）
`tests/beast-match3-battle-resume.test.cjs` 14/14：竄改（血量／能量／盤面／關卡／種子／偽造收據）、重放、兩分頁同收據只收第一個、別台裝置、結算核對、逃輸局、24 小時過期、伺服器重啟後簽章仍擋竄改＋換金鑰作廢、快照損毀退路、旗標關閉時 API 404 且舊回合照舊。

### 2.4 真瀏覽器（Playwright，三種寬度，22:47–22:51）
- 390／768／1280：重整後我方血量能量、敵血、盤面、回合、關卡、與伺服端核心六項比對**全 true**；重整後還能繼續打（4→5 回合）。
- 第二分頁：顯示「這場戰鬥正在另一個分頁進行…」並提供重試接回／返回。
- 竄改存檔、損毀存檔：照實提示作廢（不發獎勵、勝場不變），重開新局。
- 離開：先跳確認「離開會記為落敗」，離開後用舊收據接回被拒並照實提示（a6-390-07/08）。
- 勝利結算：勝場 0→1，快照清空，重整後不會再接回已結算的局。
- 主控台唯一錯誤是預期中的 409（被拒的那一次請求），1280／768 無錯誤。
- 檔案：a6-390.json、a6-768.json、a6-1280.json、a6-390-leave.json、a6-390-w45.json 與對應截圖。

**安全檢查結論：A6 範圍（竄改、重放、雙分頁、逃輸局）全部通過；npm audit --omit=dev 在 `c84b71a` 通過（0 個漏洞）。**

## 3. 流暢度

### 3.1 寶珠戰拖曳 FPS（正式建置，A6 對基底，同一台、同一工具，22:53–23:09，perf3/）
工具 `tools/perf-a6-final.mjs`，第 1 關一般盤面，拖 3 顆同色珠，rAF 計幀。
| 寬度 | 版本 | 次數 | 平均 FPS | 最低 | 最長幀 ms | 平均掉幀比例 |
|---|---|---|---|---|---|---|
| 390 | A6 | 6 | **51.1** | 48.5 | 100 | 0.148 |
| 390 | 基底 | 6 | 51.6 | 48.4 | 116.7 | 0.140 |
| 768 | A6 | 2 | 54.3 | 53.4 | 83.2 | 0.095 |
| 768 | 基底 | 2 | 57.0 | 54.9 | 83.3 | 0.051 |
| 1280 | A6 | 2 | **60.0** | 60 | 16.8 | 0 |
| 1280 | 基底 | 2 | 58.1 | 56.3 | 50 | 0.030 |

### 3.2 補跑：沿用整合版量出 104.8 FPS 的同一支工具（23:15，perf4/）
`tools/perf-a6-stage45.mjs`（由 ship-1114 的 run-health-perf.mjs 抽出，只跑寶珠戰 390、CPU 降速 4 倍）。
進到第 45 關成功，但本分支沒有「只留最後一隻大卡」的測試鉤子（lastAllyShown=false），所以量的是第 45 關滿隊盤面，**不是**整合版 104.8 FPS 那個場景：
- 第 1 次 43.2 FPS（最長幀 200ms，當時機器負載 load≈4）
- 第 2 次 51.9 FPS（最長幀 83.3ms）
- 主控台 0 錯誤、0 個 4xx

### 3.3 判定
- **「手機拖曳約 100 FPS 以上」：本分支沒有量到，照實記為未達成。** 本機無頭瀏覽器在這個分支、這些場景下約 43–52 FPS，基底同條件也是 48–54 FPS；同場景無法重現整合版的 104.8 FPS（缺測試鉤子，且整合版另有首頁／太極效能修正 d5648ea3 不在本分支）。
- **A6 相對基底沒有退步**：390 平均 51.1 對 51.6（差 1%，在兩次量測的誤差內），1280 反而 60 對 58.1。

### 3.4 每回合存檔成本（實測）
- 瀏覽器端快照（localStorage 寫入）：三種寬度共 30 筆，**中位數 0.1ms，最大 1.6ms**；快照大小 4,341–6,050 字元（約 4–6KB）。來源：a6-390.json、a6-768.json、a6-1280.json、a6-390-w45.json。
- node 端序列化：5,587 字元，中位 0.013ms、p95 0.015ms（logs4/cjs-beast-match3-battle-resume.log）。
- 伺服端每回合多一次收據簽章／核對：正常回合 HTTP 回應 8.6–9.3ms（tamper-http.json）；開局 43.7ms。
- 結論：每回合存檔成本 < 2ms，不在 16.7ms 一幀的預算內造成壓力。

**流暢度結論：A6 無退步、存檔成本可忽略；但「約 100 FPS」門檻本次未量到，不宣稱通過。**

## 總表
| 檢查 | 結果 |
|---|---|
| 健康（tsc／build／測試不新增失敗） | **通過** |
| 流暢度（無退步、存檔成本） | **通過** |
| 流暢度（手機拖曳約 100 FPS） | **未達成／未能同場景重現**（43–52 FPS，基底同級） |
| 安全（竄改／重放／雙分頁／逃輸局） | **通過**（HTTP 21/21、邏輯 14/14、瀏覽器三寬度） |
| 安全（npm audit --omit=dev） | **通過**：0 個漏洞（`c84b71a`，同主版本升級） |
