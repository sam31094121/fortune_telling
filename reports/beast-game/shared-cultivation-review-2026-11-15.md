# 共用培養剩餘審查與再驗收（2026-11-15）

## 授權與修改前證據
使用者明確授權修復上輪三項審查失敗，全部相關門檻與客戶試玩通過後提交推送；不改其他卡片玩法、命理公式。起點 main=36e0930；上輪共同培養未提交工作保留，tests/beast-match3-refill.e2e.mjs 是他人修改，不擅自納入或撤回。

1. test:beast-fairness 重現核心193通過／1失敗：27張256×192 WebP縮圖超過各自高清圖八分之一。只最佳化這27個 public/beast-game/thumb/*.v2.webp，保留圖像、尺寸、構圖與高清；測試門檻不變。記錄壓縮前後與品質。
2. 收藏SSR前26項通過後失敗。測試缺少現行GuideBookProvider、card.id、卡片目錄；且沿用已於3461e61/0e4da49刪除的重複張數文案。既有20張押卡與新得卡限高規則由tests/stake-slot-compact.test.cjs佐證。另發現真實相容缺口：BeastStakeResult對沒有selectedEntries的既有單卡收據產生空押卡列。必要範圍 components/BeastStakeResult.tsx（僅用既有stakes.player呈現單卡）、tests/beast-collection.test.cjs（真實後端手冊、現行卡面與結算契約；保留每副本、每卡種餘量與去重斷言）。
3. 星宿API未知時辰回200，但舊測試要求beastId 1～28。20fbe65及tests/self-four-guardian.test.cjs明確核定四大神獸guardian，前端也已不用beastId。只修tests/star-beast-entry.api.test.cjs：四象、後端原因、未知時辰覆蓋、國農曆一致、重送與輸入拒絕均驗證；不修改任何命理實作或公式。

## 結論
三項原指定故障已修復，神獸相關後續回歸及雙遊戲實玩完成；全站新增凍結範圍的阻擋仍未通過，因此本代理不提交、不推送。

## 已確認修復與驗證

- 27 張縮圖從同一高清母檔等比例重新輸出256×192；總量376,942→338,942 bytes。WebP quality78～93；逐張比對構圖、輪廓、配色未變；相對同尺寸高清的PSNR有26張提高、1張降低0.32dB（人工比對無明顯失真）。沒有重畫、改高清或放寬1/8門檻。每張資料見前份驗收目錄thumbnail-optimization.json。
- 公平性：194/194核心、9/9客戶流程、107前端命名檔及1000局抽樣通過。
- 收藏：50項通過；舊單卡仍顯示正確扣卡卡列，失敗／重播不假報扣卡；SSR補實際後端手冊及卡目錄，依3461e61、0e4da49核定版面驗證。保留每副本、卡種餘量與去重檢查，不恢復已刪重複文案。
- 星宿API通過；既有四大神獸217項通過。未改lib/self-star-beast.ts或任何公式。
- 正式npm run build成功；推送前test:pre-push-e2e成功（真實Edge點擊38項＋登入服務4支），紫微手機表單17/17。
- 共同培養、400位精確戰鬥、客戶端亂序／存檔／跨分頁測試通過；真實Supabase儲存及完整兩遊戲route驗證通過（寶珠5招、神獸9動作），隔離帳戶已清除。
- test:beast-match3全套通過。
- 完整推送守門最初44項39過5失敗。神獸難度的兩個舊字面斷言已依7567116及現行「？」卡改驗證後端notice；入口測試VM補缺少的treasures相對依賴與guest隔離stub，不改玩法，test:beast-difficulty整套已重跑通過。因此當前44項中40項有通過證據，4項仍阻擋，不能宣稱整組全過。

## 新增發布阻擋（僅唯讀查核，等待另行範圍決策）

| 命令 | 具體失敗與根因證據 | 最小建議範圍／需要的決策 |
| --- | --- | --- |
| test:iching-sources | lib/bazi-reviewed-output.ts未列入來源覆蓋；該檔是11/03輸出放行包裝，非另一份排盤算法。測試已把lib/bazi-traditional-gate.ts列治理工具，但新包裝未被涵蓋。 | 先核定這個放行包裝應歸治理工具或哪項既有claim；才能補登記／分類，不能直接加豁免或改VERIFIED，也不改包裝放行政策。 |
| test:share-version | lib/install-shield.ts的openIosShareSheet確實分享window.location.origin+'/'，沒有withShareVersion。不是單純掃描註解誤報。 | 經另行授權後，只包裝分享URL並驗證保留安裝用途與參數；範圍lib/install-shield.ts及對應測試，不動其他入口。 |
| test:nameology-grids | lib/nameology-number-reading.ts:275輸出/star-beasts/adult-divine-v2/06.png，實體檔不存在。 | 核對已核定卡圖資產和實際所有id再修正路徑或恢復原核定檔；不重畫、改姓名算法或以別張圖頂替。 |
| test:nine-grid | 測試要求/3D href與class跨固定換行；現行app/page.tsx兩者同一行，indexOf得到-1。實際/3D仍在九宮格之前，order15/16仍在。 | 只改tests/nine-grid-numbers.test.ts以結構／DOM順序驗證同一位置契約，不搬卡片、不改九宮格運算。 |
| check:bazi-registry-completeness | C-BAZI-CLASSICS／FIVE-GODS為CONFLICT，其他claim為PENDING_POOL，包含版本不可追溯、授權待核、缺原典等明列理由。 | 需要來源證據與核定，非程式修補。保留docs/技能戰鬥檔案/八字/來源登記.json現狀，不能改狀態騙過門檻。 |
| check:three-core-traditional-health | 禁止正式使用清單仍列MEIHUA_GREGORIAN_SUM、GROWTH_WEEK_HASH、SOLAR_TERM_HASH未解。此腳本讀登記狀態，不能僅據這次輸出推論本輪使算法失效。 | 需核對已核定政策、運算呼叫及resolutionEvidence；若需改公式／停用功能，須另行明確決策，本輪不做。 |
| test:taiji-lock | TaijiCoreV7.css、UnifiedTaijiCore.module.css、TaijiSystem.module.css與鎖定基準不同；測試已支援LF正規化，不能當CRLF誤差略過。 | 比對基準至目前提交及業主授權證據後，決定保留核定CSS或修非預期差異；不得直接重錄雜湊。 |
| check:dual-chart-iching-shensha-display | 後端與前端顯示查核仍列多項規則來源PENDING_POOL，健康門檻要求原典核定。 | 來源核定問題；保留既定柱位、神煞取法、顯示與來源狀態，不改公式、不以顯示一致充作原典驗證。 |

完整health:check為59/64，入口路由與CSS可用、未復原服務；第五項失敗是寶珠瀏覽器重播：初跑CDP逾時，重跑卡開戰。其舊測試直接竄改自己的本機勝場／盤面，與新的後端權威存檔不相容。已保留所有原斷言，將純動畫fixture移至隔離guest session，再跑test:beast-match3-replay整套成功。保留原59/64報告，不改寫為全站健康；其餘四項仍失敗。上述命理／太極／九宮格等項目未獲解鎖，依後續指示保持凍結，不提交推送。原始證據見[健康報告](shared-cultivation-review-2026-11-15/health.json)及[44項守門初跑](shared-cultivation-review-2026-11-15/push-gates-initial.json)。

## 協作主線
施工期間其他操作提交並推送019734b，含三項初始修復；本代理沒有執行這次提交／推送，不以其存在代表完成驗收。本輪後續測試修正與報告尚未提交；tests/beast-match3-refill.e2e.mjs原有他人延長啟動等待與等按鈕啟用修改均保留；本代理只改fixture為guest且保留其斷言。另有他人對lib/beast-game/match3/hard-campaign.ts與其測試的首次選主角可用名單修復，已唯讀核對並以零收藏新客開局驗證，不冒稱本代理實作。


## 最後再試玩與自審

- 新一輪390×844真實觸控完整通過：玩家手選五主力、幼子→本體→四象、斷線合體不扣料／同筆重試、指定同卡型副本、寶珠真實勝利入庫、獎卡在神獸入口合體、親選五張押注、出招後重新整理接續相同revision、神獸自動戰鬥勝利、終局重送不重領、神獸獎卡回寶珠入口合體。
- 768×1024無水平溢出；自審發現新副本選單白底淺字，僅調HardCampaignEntry及OwnedCampaignPreparation的選單對比、圓角與邊框。修後入口與押卡測試通過，再次完整手機流程通過，截圖已檢視。這不是更改卡片玩法。
- 主力永久加成最終為+1014（初始合成QA值1000，加上兩段與兩款實獎合體）；兩次新獎材料均真正消耗，卡庫數量與後端一致。沒有伪造回合／勝利回應。初始1000加成為明確測試fixture，不宣稱一般新客一開始有這個成長。
- 另以全新空收藏、獨立瀏覽器啟動我自己模式：試用主角＋四隻幼子成功開局，真實收藏及五主力名單仍為零，未憑空發收藏。該隨機QA帳戶與完整試玩QA帳戶均確認刪除。
- 舊重播視覺fixture刻意注入盤面（有明確標示），改用guest session；320/390/1440及減少動態的5/6/7顆連線、逐段標示、消除、保留珠、音效與離場取消均通過。此測試不充當真實獎卡證據；獎卡由上列實玩與後端交易測試驗證。

證據：[寶珠勝局](shared-cultivation-review-2026-11-15/390-orb-win.png)、[神獸勝局](shared-cultivation-review-2026-11-15/390-card-win.png)、[平板副本選單](shared-cultivation-review-2026-11-15/768-shared-final.png)、[零收藏新客開局](shared-cultivation-review-2026-11-15/390-new-player.png)、[完整手機日誌](shared-cultivation-review-2026-11-15/mobile-review-final.log)、[重播日誌](shared-cultivation-review-2026-11-15/orb-replay-final.log)。

範圍決策：依最新指示，既有已授權素材與技能可沿用；未核來源不因此變成核定，命理公式、其他卡玩法、來源放行政策與太極鎖定不自行修改。上表八項新增阻擋仍等待精確範圍決策。沒有執行commit/push或跳過守門。

最後相關API、兩入口與依賴TypeScript檢查：0 diagnostics；git diff --check無空白錯誤。
