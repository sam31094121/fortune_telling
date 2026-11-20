# 寶珠入口與自由組隊補驗（2026-11-20）

範圍：HardCampaignEntry 首屏尚未掛載事件時的過早點按，以及 hard45 一至五人入口測試；不修改其他模式、人數算法或客戶資料。

延遲載入 JavaScript 的正式站重現中，舊入口已可按但點擊未開啟選角。修復為互動就緒前停用入口並顯示準備狀態。after.json 本機與 production-after.json 正式站均證實：未就緒時停用，掛載後首次有效點按可選角並進入戰場。正式紀錄攔住 25 個腳本。修復已由共用工作區其他操作包含於 5b0dcbe；該版 Vercel 狀態 success，不據此推定正式 alias 精確 SHA。

依業主最後要求直接移除過時限制，不保留待用條文：實際移除的是 tests/beast-match3-entry.test.cjs 中「五人移除一人後就緒提示必須消失」的舊斷言，換成四人仍可開戰。現行執行碼與 docs/技能戰鬥檔案/寶珠阿修羅/自由組隊.md 原已允許主角加零至四位夥伴，未冒稱刪掉不存在的執行限制，亦未刪歷史或其他模式規則。

防回流驗證：同一入口逐一驗證一、二、三、四、五人皆可手動開始，不自動開戰；第六人不加入。beast-match3-entry.test.cjs 與 beast-party-size.test.cjs 實際通過，後者包含各人數開戰／保存與零人、超額、重複、缺主角、未知卡拒絕。

此補驗更新 orb-focus 報告中仍記載入口舊斷言失敗與 hydration 待驗的時間點；保留原始紀錄。全站最近一次仍為 66/68，BAZI_SOURCE_REGISTRY_COMPLETE、DUAL_CHART_SHENSHA_DISPLAY 未通過，未獲門檻例外，不自行提交推送。
