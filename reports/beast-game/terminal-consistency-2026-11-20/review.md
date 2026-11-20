# 寶珠連線終局一致性核對（2026-11-20）

## 範圍與可重現問題

基準 c32fdce。正式模式 hard45；技能檔的雙方真實終局條款已包含在基準提交。未改其他卡片或新造認輸、跳關、復活契約。

修前 `orbOutcome([{hp:NaN}],[{hp:1}])` 回傳 lose：無效生命值被當成耗盡。修後無效、缺漏、負值或非有限生命回 unavailable，雙方對等。此為可重現漏洞，未證明是客訴當時的唯一原因。

本人戰局改沿同一 orbOutcome 檢查是否可繼續，API 回應明確覆寫為本次實際保存隊伍的 outcome；親友簽章戰局也以同一結果供回應、收據與進度使用。

## 鏈路查核

- 普通連線：resolveOrbTurn 結算技能、治療、反擊後讀完整 counter.team / counter.foes；前端 endStep 同時套用隊伍、敵方與後端 outcome。
- 能量／連結攻擊：resolveCardAttackTurn；法寶：resolveTreasureUse。本人／親友保存層以最終狀態統一判定，前端只接收結果。
- 恢復戰局：後端從保存隊伍產生 outcome。hard45 前端 confirmedOutcome 不以本地 HP 或回合數猜勝負；缺 outcome 拒收，unavailable 顯示無法確認。
- 保留完整五張敵方含後備；未把 foeAvailable 的當下可出手子集合當作整隊。
- 現行退出是 RELEASE，解除 pendingBattle 並記 closed，不計敗局、不發勝利、不扣卡。未發現獨立認輸／跳關判敗指令；不新增此契約。過期憑據拒絕操作，不宣判敗局。
- 非 hard45 舊模式仍有本地運算，不在此輪授權內。

## 實測結果

- `node tests/beast-orb-terminal.test.cjs`：雙方五個位置各剩 1 HP、懸殊血量、真正耗盡、雙方耗盡、無效生命、後備等待與進場均通過；本人 CAS 替身與親友簽章百萬步仍有血繼續、重送／並發／舊指令拒絕、退出不判敗通過。百萬步為設定狀態，非實際連續操作百萬次。
- `node tests/beast-orb-authority.test.cjs`：23/23；真實本機 HTTP、390×844 Chrome 手機模擬。包括雙方 1 HP 百萬步仍對戰、真實扣至零才勝敗、缺回應不猜勝負、改寫前端 HP 不生效、重送收據、重整及離頁舊回應隔離。
- `node tests/beast-match3-comeback-save.test.cjs`、`node tests/beast-orb-request.test.cjs` 通過。
- 回合不變量 1000 固定種子、後備首領測試、普通回合測試通過。
- `npm run test:beast-fairness` 通過（核心194項、流程9項、1000局）；不能替代正式客戶戰局驗證。
- `git diff --check` 通過。

## 發布阻擋與限制

既有 `beast-match3-entry.test.cjs:199` 仍失敗（預期無 team-ready-hint，實際有），本次未修改該入口或斷言。`npm run screen:health` 66/68，失敗為 BAZI_SOURCE_REGISTRY_COMPLETE、DUAL_CHART_SHENSHA_DISPLAY；同名失敗在基準健康報告已存在。完整新結果另存 health.json，不修命理來源。

因提交門檻未過，本輪不提交推送。本人保存驗證使用隔離 CAS 替身，未寫客戶資料庫；手機為瀏覽器模擬，未宣稱實體手機或正式站全情境驗收。未重現使用者原始客訴戰局，不能保證所有提前結算原因已排除。

新增「上方攻擊寶珠集中呈現」需求尚待處理：現行九盾法珠技能第28行與 card-attack.ts 已有逐擊至少半血的下限，與新要求不固定半血存在契約歧義，已詢問保留既定逐擊規則或取消下限，未擅改傷害、落珠或下方武器。
