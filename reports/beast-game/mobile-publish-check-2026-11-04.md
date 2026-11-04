# 手機桌面圖示與戰鬥發布查核（2026-11-04）

本輪未修改功能、未提交、未推送、未部署。已恢復本機 8888 開發服務；健康檢查更新 reports/screen-health/latest.json。本文件為本輪新增紀錄。其餘既有未提交工作保留。

## 版本證據

- 本機 main 與遠端 origin/main 均為 e5c5f101e70012d136246c8f368dde8bdeffb5ca（git ls-remote 核對）。整合戰鬥仍在未提交工作中，另有命理相關未提交工作，不可混包發布。
- 本機 /star-beasts 回傳 /beast-game/battlefield 與 /beast-game/match3-hard 兩入口。
- 公開 https://heaven-earth-humanity-pair.vercel.app/star-beasts 回傳 easy、lineup、battlefield、match3-hard 四入口。iPhone 與 iPad user-agent 結果相同，未見按裝置提供不同入口；非實機驗證。
- 寶珠戰獨立頁、manifest、service worker 與註冊元件均無本輪修改。

## 本輪測試

- test:beast-fairness：194 核心項目、9 項流程回歸、對手名稱檢查、1,000 局抽樣通過；抽樣不代表全面平衡證明。
- beast-card-campaign.test.cjs、beast-card-campaign-collection.test.cjs 通過。
- beast-card-campaign.api.test.cjs：合成副本完整 53 次操作，對手勝、留在第 1 關，重送不重複升關，未寫客戶收藏。
- test:star-beast-entry-api 通過。git diff --check 通過。
- 首次全站檢查服務未啟動，37/62；恢復服務後完整重跑 59/62。不得將首次連線失敗當作功能損壞。
- 剩餘 BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY。三項也出現在 HEAD 已提交的健康報告（當時 57/62），不是本輪新增的已證實回歸。
- 未重跑正式建置或真機全流程：健康門檻已實際阻擋發布。既有整合報告中的先前建置與瀏覽器驗收不冒充本輪驗證。

## 桌面圖示更新界線

公開頁 Cache-Control 為 public, must-revalidate, max-age=0；公開 sw.js 僅快取離線說明頁，整頁導覽走網路。manifest start_url=/，沿用安裝來源。沒有證據需要清除快取或修改共用更新元件。

相同來源在成功發布後，重新網路載入頁面應取得該來源的部署版本；已留在背景的頁面不會因此即時換掉正在執行的程式。本輪不強制重載對戰、不清除收藏或戰績。不同網域、區網、本機來源不會互相同步版本或收藏。尚未取得手機桌面圖示的真實來源，不能保證其指向上述公開站；本機未發布更新不能宣稱會自動同步。

依 AGENTS.md「若測試失敗…禁止自動更新」保留阻擋，不改其他凍結卡片、不跳過門檻。主線提交與遠端同步，但工作目錄仍有既有未提交修改及本輪查核報告，不是乾淨狀態。

## 同日續作：僅補齊三入口整合

業主再次限定只整合簡單、中等、困難，不改命理卡片、寶珠戰、神獸卡本體與資料。唯讀發現成長中心收藏區仍連向 /beast-game/prepare，而該入口仍掛載含三難度選擇的 BeastTurnGame。最小修復僅改 app/beast-game/prepare/page.tsx，使其與其他舊入口一致，redirect 到既有 /beast-game/battlefield；未改收藏區、舊元件、引擎或資料。

實際 HTTP 驗證：/beast-game?mode=easy、/beast-game/lineup、/beast-game/prepare 均 307，Location=/beast-game/battlefield；目的頁 200。首輪 easy 請求曾為 404，隨後重新查核全部路由及原查詢網址均通過；未將其歸因於程式修改，也未隱藏初次結果。git diff --check 通過。沿用上輪戰鬥、收藏與 API 驗證，不重跑無關全套；未進行新真機驗收。

本次修改尚未發布。上輪 59/62 的三項來源門檻仍阻擋提交推送；繼續整合不是發布門檻例外。若要在不修改命理模組的前提下發布，須業主明確決定是否僅對這三項已知既有失敗授予本批發布例外；目前沒有此授權。

## 同日發布例外批准

業主在明確列出三項既有失敗與本批範圍後回覆「好了，就推上批准，提交」。授權僅限本批簡單／中等／困難戰鬥整合，豁免 BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY 三項既有失敗；不豁免新故障、衝突或範圍不明。上文未獲授權狀態為此前歷史。健康結果仍為真實 59/62，不改為全綠；其他命理未提交工作不包含在本批提交。

提交前將 Git index 匯出至暫存目錄驗證（非分支、非 worktree），排除其他未提交工作。該快照 npm run build 完整通過，包含 prebuild、型別檢查及 51 頁產出；保留 lint warnings。快照的闖關規則、收藏交易、後端限定 8 項、寶珠六十張原技能 SSR 與兩入口 SSR 均通過。其餘已有效驗證沿用前述結果。提交範圍僅 22 個戰鬥整合、依賴、測試與本紀錄檔案；未包含 AGENTS.md、命理來源及其他命理工作。
