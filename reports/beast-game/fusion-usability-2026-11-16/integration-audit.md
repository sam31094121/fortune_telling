# 現有技能與另一工程師成果整合核對（2026-11-16）

## 權威與引用

既有產品規範為 docs/beast-game-skill.md，第 6 行及 2338 節「共同卡庫持續合體」；技能入口 C:/Users/DRAGON/.codex/skills/beast-game-fairness/SKILL.md 要求遵守該規範。沒有建立第二份技能規則。

目前呼叫鏈：SharedCultivationPanel → beast-cultivation-client/sharedRequest → api/beast-game/cultivation → cultivation-transaction/fuseSnapshot → cultivation/fuseCultivation → cultivation-rules/feedGain。合法關係沿 cultivationTarget → guardianOf；後端 cultivation-view 提供 preview、feedback、reason、orbAttack，前端照印。FoodChainFeedback 與 CardStarBar 是另一工程師的既有元件，仍沿用。原子交易、版本、同操作重送及保護卡檢查保留。

## Git 整合狀態

本機 HEAD 5afce77；未完成合併的來源為 300f7aa。origin/main 已是 5501e90（ahead 2 / behind 13），其最新新增兩筆尚未在目前工作檔中：

- d9bce15：取消吃卡前必須鎖五張；原本不足五種的新玩家也可吃卡，原先已有五種則仍保底；純圖示確認鈕黏底與新玩家測試。
- 5501e90：神獸戰鬥 iconOnly 空材料槽、封頂不可點、載入／錯誤圖示與取卡入口。

本輪不覆蓋 SharedCultivationPanel，也不 cherry-pick 整筆：包含當前未授權的五隻政策變動與另一戰鬥頁的 UI。既有 staged 食物鏈實作已保留；本輪兩區 UI、首次設定引導、後端攻擊值顯示疊加在同一元件上。若未來合法整合 d9bce15，其 view.reason 為 null 時，當前條件式引導自然不顯示，不需另外建判定公式。

## 最小待核衝突

1. 攻擊：技能檔明寫不另造上限、不轉移材料加成；目前 cultivation-rules v2 固定 50% 攻擊上限、50% 本體加成傳承，攻擊封頂仍可扣料加星、五星後停止。工程註解聲稱有時間點核准，但未取得原始人類確認；不據此推翻技能檔，也不擅改現行公式。
2. 首次合體：技能檔／本輪要求保留五隻門檻；遠端 d9bce15 允許未鎖主力與原本不足五種的收藏合體。需要確認是否授權取代既有前置與最低收藏政策，不能僅以整合優化視作同意。

## 已驗證與限制

本輪修復仍是顯示後端 reason 引導主力設定、保存後返回合體、卡面印後端 orbAttack。after/result.json 已實測入口、首次設定、預覽取消、連續強化 56→59→62、刷新、連點、回應遺失重送去重與五張保護；帳戶清除成功，fairness.log 通過。不把此結果當作上述政策差異已獲核准。

本次僅唯讀核對並新增此審查紀錄，沒有再改產品程式、技能檔或公式；因此不重跑相同測試。未操作使用者右側原分頁。既有合併與發布門檻未解除，未提交／推送。


## 追加執行：卡片版整合

使用者明確要求直接整合並改為卡片主流程後，已實際整合以下相容成果（取代上方「本次僅唯讀」的階段狀態）：

- 從 d9bce15 / 5501e90 沿用 sticky 確認樣式、預留空間與後端五星封頂不可選；只落在本合體兩區版，不整筆覆蓋其他戰鬥頁。
- 重用既有 FoodChainFeedback 的 IconFeedback，新增 concise 選項只省略重複卡圖；數字、星級、傳承及上限提示仍取後端。原 iconOnly 呼叫預設不變。
- 首次五張設定改為五個空卡槽、收藏卡選取標記、0/5 數字與鎖定勾勾；無自動挑卡。移除主流程可見標題、主力管理術語與說明段落，ⓘ 才開說明，錯誤仍顯示中文原因。
- 最新卡面攻擊沿用後端 orbAttack；上方單張目標、下方材料、材料只預覽、獨立確認、取消與成功保留目標維持。
- 現有 docs/beast-game-skill.md 追加同一介面整合章節，未建立重複技能規則。培養公式與五隻政策衝突仍按前述保留，不擅自核准。

首次卡片版回歸完成吃卡／重試／刷新／五張保護後，在最後返回步驟發現本機 nextjs-portal 蓋住左上小圖示；失敗紀錄 cards-only/first-run-return-overlay.json 保留，測試帳戶清除。只把本頁返回圖示移至右上，不隱藏開發工具或改全站，再重跑完整流程。


最終卡片版實測：cards-only/result.json passed=true / cleaned=true / errors=[]。從 0/5 與五個空卡槽開始，未預設主力；親選五張確認，再選目標、合法材料、預覽取消、連續確認、回應遺失同操作重送、刷新 62、五張保護與返回入口全數通過。最新畫面 cards-only/02-prerequisite.png、03-preview-0.png、04-saved.png。曾有第二次起始入口空頁與 Unexpected end of JSON input，保留 second-run-entry-response.json；其後唯讀請求兩路由皆 200 且具正確入口標記，未重啟或清快取，完整重跑通過，未將瞬斷推論為公式／資料故障。既有全站門檻與合併仍未解除，未推送。
