# 手機連珠後掉落穩定性

## 業主指定範圍
針對困難寶珠戰連線放開後的消除、掉落、補滿。寶珠應依前後順序呈現，不可突然冒出或直接跳滿；此處不是弱網需求。不改盤面數量、生成結果、合成、攻擊及獎勵規則。

## 修前證據與影響
舊版一次排入全部絕對時間timeout，CSS掉落從DOM真正commit才開始。隔離瀏覽器650ms主執行緒忙碌後，多段fall/clear在同批執行，settle僅晚0.1ms，尚未呈現便清除動畫。同一DOM的固定動畫名稱在沒有paint的移除/重加中不一定重新開始。
機制證據：Temp/orb-refill-mechanism-20261031/result.json。這是可重現性能壓力機制，不是真Android/iPhone驗收。

## 正式客戶版重現
隔離390px正式版，在明示650ms主執行緒忙碌下，第一個fall DOM僅存在15.2ms便被下一phase清掉；最後56格補滿且busy鎖有效，故為掉落呈現跳段而非永久缺珠。另6次正常／4倍CPU實拖未見卡死。證據Temp/match3-campaign-qa-PqU9tK/evidence/drop-report.json。

## 最小修復方向
逐段呈現確認後才推進計時，掉落使用獨立播放識別；原珠下落與新珠補入順序清楚，落定後才可操作。處理背景暫停、離場取消、音效同步；保留減少動態效果及極端等待上限。重用原核心結果，不重新計算珠子。

## 修後已確認
- 獨立同650ms壓力：首段fall由修前15.2ms改為542.3ms，後續逐phase完成，56格補齊，busy未提前解除。證據Temp/match3-campaign-qa-IuYwbH/evidence/drop-report.json。
- 390px正常/4倍CPU、busy中重複拖曳沒有多送回合；真切瀏覽器背景再返回可完成，reduce-motion可操作，補珠中離頁後無延遲存檔或runtime錯誤。證據Temp/match3-campaign-qa-0KRaNN/evidence/drop-report.json。
- 新runner、既有refill hash/獎勵守恆、TypeScript及完整寶珠測試通過。5秒是正常呈現規劃上限，背景暫停或主執行緒忙碌等待另計。

## 最後洗盤例外與發布前驗證
八顆門檻的seed1/RNG1001技術fixture，舊版收尾48/56格瞬間替換。新增refillDisplaySteps僅附加顯示步，引用核心終盤與magic，不進傷害/能量/events，不重生RNG。獨立同renderer原生拖珠驗證56新珠依序落下約1.11秒，終盤逐格相符，全流程約4.74秒且busy正常解除。證據Temp/match3-campaign-qa-1H1TnK/evidence/terminal-reshuffle-report.json。

單盾原生7珠生成/清場與最新原珠→新珠逐幀實測亦通過，證據Temp profiles wWNCDQ與diQ39T。

完整發布門檻failures=[]，末次洗盤修正後的最終編譯與全套寶珠回歸亦通過；以獨立build目錄避免干擾8888。證據Temp/beast-refill-stability-gate-20261031。部署與正式實測另確認，以上不冒充Android/iPhone真機。

## 後續長幀與捲動畫面修復

正式站12次實拖另外重現：fall開始後650ms忙碌使CSS牆鐘一次跨到落底；部分連鎖縮放後間隔12.318ms不足60Hz一幀。證據Temp/match3-campaign-qa-9ArtLp/evidence/diagnosis-summary.json，不能將前批phase排程通過等同單珠動作全部穩定。

本批將每段有限CSS動畫由可見RAF時間驅動currentTime，fall單次最多推進一個60Hz幀；常見連鎖優先保留至少18ms間隔，調整其他呈現時長維持5秒規劃上限。極端多phase仍採批次縮放，並非宣稱所有珠子永遠逐顆獨佔一幀。背景或主線程等待不計入規劃上限。音效按實際可見落點，阻塞當下不集中回補；核心結果與傷害不變。

本機獨立QA六次原生拖曳至自然勝利：普通珠/盾牌650ms忙碌、4倍CPU、上下捲動與viewport變化、背景返回均補滿56格，busy未提前解除且無pageerror。330ms長幀時呈現時間僅增加16.67ms，尚未輪到珠子位置保持。證據Temp/match3-campaign-qa-9STxHX/evidence/controlled-timing-summary.json及drop-report.json。本次全程靜音，不宣稱聲音聽感驗收；未重跑terminal洗盤fixture，也不冒充實體手機。

本批完整48項發布門檻重跑全過，證據Temp/beast-fusion-visible-frame-gate-retry-1793449864067。首次build在編譯成功後遭Windows讀取tsconfig的瞬時UNKNOWN錯誤，保留Temp/beast-fusion-visible-frame-gate-1793449754132失敗紀錄；可讀恢復後完整重跑，未略過檢查。發布與部署狀態由整合代理另核對。
