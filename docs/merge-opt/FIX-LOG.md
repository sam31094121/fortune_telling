# FIX-LOG｜依 AUDIT-2 修正（第三輪 fix-3）

- 起點：分支 `feat/merge-opt`，HEAD `e41f8f1`（2026-11-14 23:59，UTC+8，使用者語音指示開工）
- 備份：`/workspace/beast-merge-plan/fix-3/backup/merge-opt-e41f8f1.bundle`＋本機分支 `backup/pre-fix3-e41f8f1`
- 規則：只在本機提交，不推送、不 force；不碰受保護檔案；平衡數值維持「待平衡暫定值」；只用新正式卡。
- 證據：`/workspace/beast-merge-plan/fix-3/`

## 進度（依時間順序）

| # | 項目 | 狀態 | 提交 | 說明 |
|---|---|---|---|---|
| 1 | H6 Match3Board.tsx 換回 CRLF | 完成 | `001e223` | 對基底 050f398 的差異從 2,267 行降為 235 行（187 增 48 刪），全檔 1,203 行皆 CRLF |
| 2 | X1–X5 上線阻斷（安全預設） | 完成 | `78560c7` | 沒有共用戰局儲存＋金鑰就自動降級（伺服端回暫停、前端走一般模式並照實提示）；不再從收據重建、找不到紀錄照實回 lost；`battle-ledger-store.ts` 儲存接口；`scripts/build.mjs` 打開 RESUME 時提醒；DESIGN-shared-ledger、DECISION-persistence（X4 給鈺勝選：單機休閒或伺服端帳號） |
| 3 | H4 冪等＋重新接回 | 完成 | `78560c7` | 同一 actionId 重送回傳同一份結果；被擋時顯示「重新接回」按鈕，stale 文案分成另一分頁／連線中斷 |
| 4 | M1 開局上限 | 完成 | `78560c7` | 伺服端套成獸天花板（tierAttackCap）與全隊開局能量上限 |
| 5 | M2 頻率限制 | 完成 | `78560c7` | `rate-limit.ts`：orb-turn、orb-battle-record 依 IP 限流（行程內；共用儲存後再搬） |
| 6 | M3 進度變更文案 | 完成 | `78560c7` | 勝場與快照不一致時改說「進度已變更（例如匯入備份）」，不再說被修改 |
| 7 | L1 頁內離開確認、L2 清理順序 | 完成 | `78560c7` | 取代 window.confirm；超量時先清已結束的紀錄，不刪進行中的 |
| 8 | X5 文件：開關說明進版控 | 完成 | （本筆提交） | `.env.example` 被 .gitignore 排除且含疑似真實管理密碼，**不強制加入版控**；改把寶珠闖關段落存成 `docs/merge-opt/ENV-FLAGS.md` |
| 9 | test:beast-match3 前置建置型別錯誤 | 完成 | `1603645` | 78560c7 的 `battleLedgerStatus` 在非嚴格 tsconfig.beast-game 下 TS2339，整串 test:beast-match3 跑不起來；改成明確收窄 |
| 10 | H1 寶珠掃光 | 完成 | `1196802` | 改 transform 平移＋只在原本 11 秒週期最後 1.54 秒掃光窗掛動畫（useSweepClock 依原三組相位切換）；靜止外觀 390／768 每種元素逐像素 0 差，1280 只有欄位小數像素位置造成的次像素差、肉眼一致（`fix-3/shots/h1/`）；靜止主執行緒忙碌 18–20% → 約 8.5% |
| 11 | H2 按下／放開長幀 | 完成 | `1196802` | 拖曳狀態外部化（只重畫盤面格子／拖曳線／提示）、按下時一次量格子位置、常駐拖曳線節點、選取改屬性、戰鬥頁退出 body class 切換、音訊閒置預建；按下→畫面最長 82–100ms → 26–36ms |
| 12 | H8 無障礙（第一部分） | 完成 | `1196802` | role=row、roving tabindex、方向鍵／Enter／Esc、點選模式＋確認出手／取消；axe 盤面 0 違規（原 57 處嚴重）；實測點選、鍵盤、拖曳三種都能出手（`fix-3/logs/a11y-e2e-after.json`） |
| 13 | H3 新指標修前修後 | 完成 | （本筆提交） | `PERF-H3.md`：拖曳 p95 33.3 → 16.7–16.8、拖曳 >50ms 2–8 次 → 0、按下到畫面最長 ≤36ms；**出手後結算動畫段仍有 >50ms 幀（修前 10–22、修後 8–19），未達**，列剩餘 |
| 14 | H9 選隊頁長度＋一鍵推薦捲動 | 完成 | `d5fd03f` | 320×691 實測：12 勝頁高 6,812 → 4,042px、100 勝 8,741 → 3,801px；按一鍵推薦後原本往下捲 5,924／7,851px 越過強化區，現在強化區仍在畫面上（只因按鈕消失位移 269px）；開戰列固定底部（全站 body overflow-x:hidden 使 sticky 失效，改 fixed＋佔位）；提示文字與按鈕一致（`fix-3/logs/h9-positions.json`、`shots/h9-*`） |
| 15 | M5 選隊卡朗讀攻擊 | 完成 | `d5fd03f` | aria-label 改用 campaignBattleStats 出戰攻擊，與畫面「攻 X ▲N」一致 |
| 16 | H8 頁面地標 | 完成 | `d5fd03f` | 困難寶珠頁包 role="main"（不用 <main>，避免套到全站 lx-cards.css 規則）；axe 選隊頁、戰鬥頁 landmark-one-main 消失（`logs/axe-picker.json`） |
| 17 | H5 五語（寶珠闖關） | 完成 | （本筆提交） | 新增 `lib/i18n-copy/match3.ts`（160 句＋43 個動態句型，en／ja／ko），只在神獸戰鬥頁、排在既有字典之後；簡中在戰鬥頁補大陸用語（伺服端→服务器、纪录→记录、存盘→存档、备份档→备份文件）；動態句改成單一文字節點以便對照；守門測試 `tests/i18n-match3-copy.test.cjs`。390 實測可見中文節點：選隊頁 en 482→5、ko 427→5（只剩五元素單字；ko 用既有「풍(風)」）、ja 只剩日文漢字；戰鬥頁 en／ko 21→1（只剩敵方卡名，專有名詞保留）。320／390 四語皆無橫向捲動、按鈕無裁切（`fix-3/logs/h5-i18n-h5final2.json`、`shots/h5/`）。**未收錄**：卡面（BeastCardTile 受保護）、玩法長篇說明、五元素單字（en／ja）、法寶名、伺服端內部驗證錯誤碼 |
| 18 | M7 舊卡守門測試誤判 | 完成（剩 1 處真違規） | （本筆提交） | `tests/no-old-cards.test.cjs`：`beast_g_` 只在 `startsWith('beast_g_')` 時認作正式四象前綴；字串相加的圖片路徑先還原再檢查（結尾不是 .v2 照擋）；業主驗收過的兩張修補圖只認檔名＋內容證明（`adult-01.tail-leaf-v3.webp` 必須與 `adult-01.v2.webp` 逐位元組相同；`young-01.hind-paw-v1.svg` 內嵌底圖必須等於 `young-01.v2.webp` 且無腳本／遠端來源）；加自我檢查，真舊卡寫法一定要被抓。誤判 9 → 剩 1：`app/beast-game/asura-death-preview/AsuraDeathPreview.tsx` 用 `<img>` 直接畫卡圖，這是真的違規且屬阿修羅死亡動畫檔（受保護），**沒有放行、沒有改**，列剩餘。突變測試：修補圖改 1 byte、放一張舊檔名都會被擋（`fix-3/logs/m7-no-old-cards.log`） |
| 19 | M14 合入首頁捲動修正 | 完成 | `4039b8e`、`7086640` | 從 `/workspace/perf-sec-fix` 以 `git am -3` 帶入 8a5ae3b0、d5648ea3（只改 `components/TaijiSystem.tsx`，本分支的該檔與 perf-sec-fix 基底 e6ab4647 逐字相同，無衝突；合入後與 d5648ea3 版逐字相同）。不改外觀、不關手機粒子。修前修後首頁捲動量測見 CHECKS-fix3.md |
| 20 | M4 重複朗讀 | 完成（補記） | `1196802` | 隨 H2 一起改：提示字不再設 aria-live，只留戰鬥紀錄一個 live 區；點選／鍵盤另有只播連線狀態的 live 區（`Match3Board.tsx` HintText 註解） |
| 21 | M10 文件與程式不一致、L3 暫定值標示 | 完成 | （本筆提交） | `feed-chain.ts` 檔頭改寫：鏈加成已接進戰鬥（campaignBattleStats 唯一來源）、匯入卡不當材料是定案；PLAN-v2 B3 更正為「瀏覽器存檔鎖內重新規劃，不是伺服端」（repo 內 docs 與 beast-merge-plan 兩份）；`battle-resume.ts` 快照上限、紀錄上限補標【待平衡暫定值】（24 小時本來就有標） |
| 22 | M9 多執行個體 E2E 收進 repo | 完成 | `b60dc10` | `tests/e2e/battle-multi-instance.cjs`：用環境變數指定兩個 `next start`（不寫死埠、不讀寫金鑰）；`M3_E2E_EXPECT=degraded` 時判定兩台都安全降級（503 unavailable、一般模式回合 200）。未設定時 SKIP。瀏覽器 E2E（playwright）仍依賴 repo 外的 `/workspace/accept-boss-v4`，沒有收進來 |
| 23 | M14 後續：太極離屏暫停守門測試 | 完成 | `c2596d3` | d5648ea3 把 `frameloop` 改成「在視窗內或暖機中」，原測試只認舊字串而失敗（perf-sec-fix 本身也一樣紅）。改成：舊寫法照過；新寫法必須同時證明暖機有界（最多 8 幀、done 後不再啟動、結束時 setTaijiWarmupRunning(false)）。突變把上限改成 8000 幀會失敗 |
| 24 | L4 沒有 Web Locks 的瀏覽器 | 完成 | （本筆提交） | `battle-snapshot-store.ts` 新增 localStorage 心跳退路租約（新鍵 `match3-battle-lease-fallback-<owner>`，不動既有存檔鍵；3 秒心跳、9 秒過期【暫定值】），第二個分頁會看到正確的「另一個分頁在打」而不是 stale；儲存不能用時照舊放行。測試 `tests/beast-match3-fallback-lease.test.cjs`。屬盡力而為，伺服端序號仍是最後防線 |
| 25 | 完整檢查 | 完成 | （本筆提交） | `docs/merge-opt/CHECKS-fix3.md`：tsc 0；jest 7 項失敗與基底相同；cjs 31 支失敗與基底逐行相同、沒有新增；建置（3072MB）EXIT 0；npm audit 0；三種寬度截圖；多伺服器降級四種設定 |
