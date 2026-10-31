# 寶珠戰連續操作與選卡缺字修復

## 範圍及先行故障證據

- 業主要求持續遊玩穩定性、音畫一致，以及「寶珠戰鬥／選五張卡片」底部技能與攻擊數字完整清楚。僅修相關生命週期與選卡呈現，不改卡片數值、技能、連珠、進度或音色。
- 正式版連續 16 次原生拖曳，四獸均出招；第一場自然勝利，升關、敗北重試、選卡、首頁均正常。敗北支線使用明示 1 HP 測試資料，非客戶資料。無瀏覽器例外。
- 可重現故障：回合結束後仍保留 359 個計時器識別碼，其中至少 173 個回呼已完成。這證明記錄未清理，不能據此斷言手機卡頓。
- 舊 `/beast-game/match3` 選卡頁在 320、390 像素寬均有 32/60 卡缺整個技能與攻擊 DOM（28 成獸、4 神獸）。`BeadBattle` 未傳入原卡第一技能，而共用卡面以技能名稱控制該列。新困難入口同 60 張完整。舊入口每張手機卡面約 65 像素，字級約 4.7 像素，也不利閱讀。

## 最小修復

- `Match3Board` 改以 Set 管理待執行計時器；回呼執行前移除，卸載仍取消並清空。所有延遲、攻防及動畫時序維持原值。
- `BeadBattle` 的候選卡及已選卡都直接帶入 `getSkill(c.skills[0])` 的既有名稱與說明；不新增技能、不改卡檔攻擊力。
- 此選卡頁完整卡面改用與新版相同的手機兩欄、平板三欄、電腦四欄，僅解決內容閱讀空間；五張上限、移除及開戰流程不變。

## 已驗證與限制

- 計時器修後：10 次原生拖曳，完成後 pending Set 均為零；勝負分支用明示測試資料。攻擊中離頁的 13 個待執行項目清空，兩秒後仍零，無延遲動畫或例外。
- 正式版音效唯讀審查：落珠、合成、命中及反擊與對應動畫約差 1–26 ms；切換分頁後活動聲部 10 ms 內淡出，未開始聲部取消，後續 6.5 秒無新聲。未找到需改音效的故障，保留短尾音。
- 後續原生音效測試一律加 `--mute-audio` 隔離硬體輸出，不變更客戶或系統音量。先前測試可能曾出聲，但未證實就是使用者聽見的來源。
- Windows WebKit 18 的首頁、選卡、56 珠、拖曳、反擊、回首頁及靜音 UI 通過；此 build 無 AudioContext，不能拿來驗 iPhone 音訊。
- Android 與 iPhone 實體手機皆尚未連接。桌機瀏覽器／視窗尺寸驗證不代表真機發熱、幀率或主觀長時間聽感已通過。
- 選卡修後：320／390／768／1366 各 60 張技能、攻擊、說明均完整，原缺漏 32 張補齊，與正常卡檔資料逐張相符；手機攻擊字約 13.3／16.6 像素，未超出卡片。四神獸＋一成獸選五張、移除、重選、開戰通過，舊入口既定 35 珠未改。
- 本批編譯與完整發布檢查均通過（包含手動 pre-push E2E）；新增選卡 SSR 後，已重跑完整寶珠測試通過。發布檢查結果在 `guardian-stability-picker-gate-20261031/gate-result.json`，failures 為空。
- 新增真實選卡 SSR 回歸，沒有圖鑑 Provider 時逐張核對 60 張技能、說明、攻擊，已納入寶珠測試。一次性記憶體負向對照恢復舊呼叫方式，確實重現 32 張缺漏；不把該實作字串替換留作永久測試條件。

## 本機證據

證據均在 `C:/Users/DRAGON/AppData/Local/Temp/`，是隔離測試，不是客戶紀錄：

- `prod-guardian-continuous-13bdd8fa/continuous-result.json`
- `prod-guardian-timer-retention.json`
- `guardian-timer-after-20261031/continuous-result.json`
- `guardian-timer-cancel-20261031/cancel-result.json`
- `picker-missing-detail-20261031/legacy-result.json`
- `picker-missing-detail-20261031/legacy-after-result.json` 及各尺寸截圖
- `match3-audio-timeline-muted-official-20261031/sound-result.json`
- `match3-audio-hide-muted-official-20261031/sound-result.json`
- `match3-webkit-20261031/result.json`

完成後恢復凍結；其他既有未提交變更不屬此批。

## 後續限定：只保留困難寶珠入口

- 業主最終更正只針對寶珠：保留 `bead-hard`「寶珠戰・困難」，隱藏 `bead`、`orb`；非寶珠 `easy`、`medium`、`hard` 戰鬥入口維持原狀。路由、共用引擎、資料及六十張神獸卡不刪除。
- 實際元件 SSR 及原生畫面均核對入口依序是 `easy`、`medium`、`hard`、`bead-hard`，四個連結保留原值；點進困難→親友→56 珠→回首頁正常，無例外。六十張技能／攻擊回歸仍通過。最終證據 `beast-menu-orb-only-20261031/result.json` 及 `menu.png`。
- 「整個模式區只剩一張」候選及 `beast-menu-hard-only-20261031` 證據已隨業主更正撤回，未提交，不作目前版本的驗收依據。
- 同一來源檔已有實驗 ORB 入口的未提交變更，維持原狀；此次只將基於 HEAD 的選單篩選單行提交，不包含實驗入口。
- 此入口批次完整發布檢查已通過，`beast-single-entry-gate-20261031/gate-result.json` 的 failures 為空；最終篩選版本再次編譯通過。完整入口圖 `beast-menu-orb-only-20261031/menu-complete.png` 已由業主確認。
