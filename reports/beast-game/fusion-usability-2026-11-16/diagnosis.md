# 修復前證據與範圍

入口 /star-beasts 的神獸合體強化實測導向 /beast-game/cultivation，沒有 data-orb-owned-copy。使用者提供的 DOM 對應 HardCampaignEntry.tsx 出戰副本區；無原右側分頁控制權，不能認定該分頁路由錯誤的原因。

已重現：合成 9 張實際收藏、protectedIds=[]，初始頁沒有前置條件提示；選目標、材料後後端拒絕「請親選五隻仍持有、卡型不同的可出戰主力」，確認停用。before/result.json 與 blocked.png 留證；9 張未變，測試帳戶清除。此前兩區驗收預設已鎖定五張，漏掉首次設定路徑。

另卡面呼叫只傳 cardId，忽略後端 view.cards.orbAttack；先前成功兩次的 saved.png 仍顯示原攻擊 56，後端已為 62。

必要修復範圍：SharedCultivationPanel.tsx 的既有前置狀態提示、主力設定返回與該副本攻擊顯示；隔離 E2E 與報告。不修改公式、來源、其他模式；不操作真實收藏、不解除五隻保護。

工作開始 Git main ahead2/behind13，多人 staged/unstaged 與未完成合併保留；本輪不推送。

## 修復與驗證結果

主畫面現在直接顯示後端 view.reason 與「設定五隻主力」入口，仍由玩家親選並確認；保存後返回合體。卡面直接顯示該副本後端 orbAttack，不前端加算、不改公式。

after/result.json：passed=true、cleaned=true、errors=[]。從兩張遊戲卡下入口進入，確認沒有出戰副本 select。首次五隻設定、owned 目標、合法材料、預覽不寫入、取消不扣卡、兩次確認同目標、刷新保留加成、返回入口、說明均通過。角木蛟攻擊 56→59→62，戰鬥攻擊 46→49→52，卡面確實更新為 62。

第一次確認連點兩次，後端完成後故意丟失回應：僅送出一次 FUSE，重試同一 operationId，沒有二次扣料。另繼續合法操作至剩 5 張，五張主力 ID 全數保留；直接嘗試消耗保護材料被後端拒絕，快照不變。

npm run test:beast-fairness 通過（含核心、9/9 客戶流程與 1000 場抽樣）；fairness.log 保留。此次未修改 API。E2E 腳本 tests/beast-fusion-usability.e2e.cjs，須明確設 BEAST_CULTIVATION_STORAGE_TEST=1。

截圖：before/blocked.png（首次流程故障）、after/01-entry.png、after/02-prerequisite.png、after/03-preview-0.png、after/04-saved.png（卡面 62）、after/05-five-retained.png。

限制：這是隔離瀏覽器、合成收藏的實測，不是使用者右側原分頁。原分頁 URL 與 DOM 不符的原因尚不能確認；不能宣稱原分頁已恢復。v2 公式授權矛盾、既有來源檢查失敗及慢裝置性能限制不在本輪修復；未重跑全站檢查、不推送。
