# 共用培養剩餘審查與再驗收（2026-11-15）

## 授權與修改前證據
使用者明確授權修復上輪三項審查失敗，全部相關門檻與客戶試玩通過後提交推送；不改其他卡片玩法、命理公式。起點 main=36e0930；上輪共同培養未提交工作保留，tests/beast-match3-refill.e2e.mjs 是他人修改，不擅自納入或撤回。

1. test:beast-fairness 重現核心193通過／1失敗：27張256×192 WebP縮圖超過各自高清圖八分之一。只最佳化這27個 public/beast-game/thumb/*.v2.webp，保留圖像、尺寸、構圖與高清；測試門檻不變。記錄壓縮前後與品質。
2. 收藏SSR前26項通過後失敗。測試缺少現行GuideBookProvider、card.id、卡片目錄；且沿用已於3461e61/0e4da49刪除的重複張數文案。既有20張押卡與新得卡限高規則由tests/stake-slot-compact.test.cjs佐證。另發現真實相容缺口：BeastStakeResult對沒有selectedEntries的既有單卡收據產生空押卡列。必要範圍 components/BeastStakeResult.tsx（僅用既有stakes.player呈現單卡）、tests/beast-collection.test.cjs（真實後端手冊、現行卡面與結算契約；保留每副本、每卡種餘量與去重斷言）。
3. 星宿API未知時辰回200，但舊測試要求beastId 1～28。20fbe65及tests/self-four-guardian.test.cjs明確核定四大神獸guardian，前端也已不用beastId。只修tests/star-beast-entry.api.test.cjs：四象、後端原因、未知時辰覆蓋、國農曆一致、重送與輸入拒絕均驗證；不修改任何命理實作或公式。

## 驗證進行中
尚未宣稱所有門檻通過；完成後補上真實結果、試玩與Git狀態。
