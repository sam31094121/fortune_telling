# 寶珠能量攻擊集中呈現與手機驗證（2026-11-20）

## 實作與界線

正式 hard45 上方能量寶珠：後端 resolveEnergyBatch 依原 resolveEnergyAttack 逐擊結算，保留既有至少半血下限、護盾、技能觸發、封鎖及資格扣除。只合併同施放者同目標，死亡、受控、資源不足與終局停止，最多256擊；剩餘資格保留，不自動轉打後備。連結攻擊仍只執行既有一次計算。

後端 presentation 提供目標、實際擊數、參與者元素及有效傷害；前端只顯示，最多五組，命中傷害不重複列在寶珠下面。資料缺失拒收並走既有核對流程，不自行加總。每張卡原本的一顆操作寶珠仍保留；不是把棋盤落珠減少，也不是修改下方武器。

短特寫共用 ElementTreasureOrb，420ms清理、pointer-events:none，只有 transform/opacity 動畫；減少動態靜態呈現。此類點按不再重播完整神獸撲擊，普通連線演出未改。靜態寶珠局部 memo，busy畫面更新採 transition；同步 refs 仍立即防重複指令，連珠 release 也檢查 turnRequest。特寫清理不延長240ms既定無rig操作鎖。

## 傷害、終局與資料驗證

- beast-orb-energy-batch：60卡 × 3階段 = 180組，逐擊與批次的完整隊伍、HP、護盾、每筆命中與技能事件、剩餘資格均相同；不改輸入。另核對256資格僅用兩擊擊倒本目標、剩254、不轉打下一目標、非整隊死亡不判勝、1/2/5組展示總量。
- beast-match3-orb-drop：原落珠物理、17盾256珠、半血與反擊封鎖測試通過；只更新已授權的一次點按可執行逐擊批次斷言，未減弱傷害檢查。
- beast-orb-authority：23/23，包括真實HTTP終局與390px Chrome手機模擬，缺權威結果、重送、舊回應、實扣至零及雙方1HP百萬步仍可戰。
- beast-orb-terminal、beast-orb-energy-tap、beast-orb-request、beast-match3-comeback-save 通過。局部完整TypeScript相依編譯通過（.tmp/orb-focus-types.json，包含next-env.d.ts）。共用寶珠材質及成長狀態回歸通過。
- 新終局與批次測試納入 package.json 的 test:beast-orb-authority，使既有健康檢查入口可持續執行。

## 手機與畫面

390×844、Chrome headless、CPU 4倍降速，獨立親友戰局，不寫客戶本人卡庫。能量點按用真實簽章HTTP。2/5組特寫使用測試在HTTP意圖層改為多人link，由真實後端計算；這驗證畫面資料契約，不冒稱手機已有一次選五人的手勢。連點只送一筆指令、特寫正常清理、不橫向溢出。

320/375/390/430/1366寬度的2/5組邊界均通過並目視查看320px五珠與1366px兩珠。靜態審圖在完成效能量測與實際清理檢查後，僅於隔離測試把特寫暫留20秒並停止動態；正式420ms未延長。截圖不充當實際動畫時長證據。

| 場景 | 改前下一畫面 | 單獨驗證後下一畫面 | 改前可再操作 | 單獨驗證後可再操作 |
|---|---:|---:|---:|---:|
| 2卡／減少動態 | 162.9ms | 12.0ms | 2005.4ms | 966.2ms |
| 5卡／一般動態 | 186.1ms | 13.6ms | 2430.1ms | 909.4ms |

原始資料 before.json、isolated-final.json。單次樣本、開發服務及模擬CPU，不是實體手機INP或統計保證；改前一次點按只結算一擊50萬，改後結算兩次原擊共100萬並擊倒同一目標，所以完整耗時並非完全相同終態的嚴格效能基準。數值等價以180組逐擊測試為據。與全站檢查並跑時 after/final 記錄有較大伺服器等待，完整保留，不挑掉。單獨驗證仍有60–147ms長任務，不能宣稱完全無卡頓。

## 健康門檻與正式站

health-before-fixture-update.json 為65/68：新增presentation後，舊敗局播放fixture缺欄位，造成BEAST_ORB_AUTHORITY逾時；已補回新契約欄位，獨立23/23通過。health-final.json 為66/68，僅既有 BAZI_SOURCE_REGISTRY_COMPLETE 與 DUAL_CHART_SHENSHA_DISPLAY 失敗，STAR_BEAST_SELF_ENTRY_API首次逾時重試通過（flaky=1）。另既有 beast-match3-entry.test.cjs:199 仍失敗，未擅修入口功能或命理來源。

共用工作區有其他操作在驗證中提交並推送：7d7ce7b、2cb3660、3584553包含本輪階段成果。這不是本執行者在所有門檻通過後進行的推送。已確認origin/main包含3584553；GitHub Vercel對2cb3660回success，3584553首次查為pending，後續狀態另以交付時查詢為準。

既有正式網址 https://heaven-earth-humanity-pair.vercel.app/beast-game/match3-hard 已實測HTTP200，390×844獨立親友流程選主角、組隊、開戰成功，無pageerror或橫向溢出，見production-guest.json。僅證明當時正式入口可玩，未獨立核定正式alias精確SHA或所有正式戰鬥結果。全站門檻仍未過，因此本執行者不追加提交／推送／部署；最後待提交清單以git status為準。

最終追加確認：3584553 的 GitHub Vercel status 已由 pending 轉為 success，部署記錄 https://vercel.com/sam31094121s-projects/heaven-earth-humanity-pair/CmeTFiizFyEWK9Gox9Gxkg9deeoC 。成功後再次執行正式手機親友開戰流程，在pick-hero等待30秒逾時；先前production-guest.json通過紀錄不能當成此部署後重測通過，另行記錄診斷。新增的 package.json 組合測試命令亦實際執行通過（終局、180組批次等價與23項API／手機驗證），未以此略過全站失敗。

部署後追加診斷：同一正式入口另一次載入可正常到選主角，無pageerror（production-recheck.json）。DOM剛載入即點擊的重測兩次等不到pick-hero；改為等待networkidle後，完整親友選角／組隊／開戰再次通過（production-guest.json更新為該次結果）。因此確認「載入完成後能開戰」，但首屏尚在載入時過早點按的穩定性仍未證實；沒有修改前後重現比較，不將此歸咎於本次終局或特寫修改，也不宣稱所有手機首次點按情境已通過。
