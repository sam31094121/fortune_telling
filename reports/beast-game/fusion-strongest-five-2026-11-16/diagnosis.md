# 最強五隻保護：修復前證據

最新要求為保護最強五隻而非任意五隻。現有 fuseCultivation 僅阻擋 protectedIds，replaceCultivationMainTeam 僅驗證五種不同的有效副本。

純記憶體合成案例已重現：五張鎖定卡含加成0的角木蛟，另有同型加成20副本。加成20副本作材料給青龍被允許消耗，較弱的加成0鎖卡留下，總數仍5。未讀寫真實帳戶、未呼叫保存API。故先前剩五張驗收不滿足新增最強保護要求。

現有同種最強排序：HardCampaignEntry / OwnedCampaignPreparation 以 bonus 比較；遠端 four-beasts-view.bestCopy 亦只在相同 cardId 內依 bonus、是否主力、id 排序。沒有核定跨卡型最強五種排序。

lib/beast-guardians.powerScore 註明僅供展示且不參與計算，tests/beast-battle-mode.test.cjs 亦禁止以此宣稱戰力，不能轉用作扣卡守門。兩遊戲 orbAttack / battleAttack 的原始基數不同。

已提出必要單一決策：以累積培養加成、寶石總攻擊或神獸戰鬥總攻擊，選五種不同神獸各最強副本。尚未收到答覆前不新增強度公式或擅選標準，不修改既有保護。

預計必要修改範圍（待標準明確）：lib/beast-game/cultivation.ts 共用後端保護、cultivation-view.ts 後端保護狀態、SharedCultivationPanel.tsx 照印保護及獨立說明、相關培養單元／並發／手機測試；既有鎖定副本工作保留。不得改上限／傳承，也不擴及命理。

本輪未修改產品、未提交推送。上輪健康61/64為歷史證據，本輪不冒充已驗證新的最強保護功能。
