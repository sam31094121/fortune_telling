# 補珠觀測超時最小修復

2026-11-21。產品程式、玩法、動畫時長與門檻未改。修改只在 tests/beast-match3-refill.e2e.mjs。

## 證據與界線

原失敗發生於第407行，以每150ms的CDP輪詢要求瞬時 data-refilling=true。動畫結束即移除此屬性，單顆落程最低約90ms，因此輪詢可能漏看。原始那次未保留掉珠觀測資料，無法排除其他原因，不宣稱已唯一歸因。

本輪以真實瀏覽器及真實拖曳，刻意延遲測試觀測10秒，重現同一行超時：瀏覽器已記錄14個有實際transform的掉珠畫面、無例外、盤面已落定，舊輪詢仍失敗。reproduction.json保留原始畫面觀測資料。這是受控延遲重現，不冒充原事故環境。

修復改為等待本輪RAF已捕捉的掉珠紀錄；紀錄每輪清空。仍必須超過2個實際畫面、有CSS動畫及非none transform、錯開落下、忙碌時禁止操作、56珠落定、無橫向溢出。20秒門檻與所有既有斷言保留。截圖名稱改為observed，避免把延遲截圖稱為移動中。

診斷選項 MATCH3_REFILL_ONLY=1 僅單獨跑補珠範圍；MATCH3_REFILL_OBSERVER_DELAY_MS=10000 重現延遲觀測。預設完整流程不受影響。

## 驗證

- 修復前：受控10秒延遲重現超時。
- 修復後：相同延遲下320/390/820/1440補珠、減少動畫、中途離場完整通過。
- 修復後不帶上述選項的 npm run screen:health 完整68項：66通過，warnings=0、flaky=0，BEAST_ORB_REPLAY通過。
- 剩餘失敗僅 BAZI_SOURCE_REGISTRY_COMPLETE 與 DUAL_CHART_SHENSHA_DISPLAY 既有來源問題，不改動其狀態。
- git diff --check 通過。不符合全綠提交門檻，本代理未提交或推送；共用工作區期間HEAD由其他作業更新到a418ae9，不將其提交歸為本代理成果。
