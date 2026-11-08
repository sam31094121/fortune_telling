# 計數歸零重建與功能拆除（2026-11-08）

## 最新業主範圍

- ①認同、不認同、瀏覽：改為從 0 重新正式啟用；取代前一輪「尚未啟用」要求。
- ②功能瀏覽計數、③改善建議計數：移除入口、API 與保存程式。
- ④太極音效偏好：只移除統計，保留太極球及播放音效。
- ⑤數字論吉凶：完整保留，包含原有資料庫連線與原先缺表的狀況，不擅自修復。
- 備份只刪三個計數與本輪拆除功能的備份；其他功能備份不動。使用者明確要求不保留、不匯入歷史資料。

## 本機實作

- 首頁及 /trust 重新使用資料庫確認的三個數字；載入或失敗不假顯示 0。
- 新 epoch home-20261108-v2；舊版請求無有效 epoch 不得寫入，新版不讀舊數字快取及舊待送佇列。
- GET 只讀資料庫；POST 使用事件 UUID 和單一資料庫交易，事件唯一鍵去重、原子累加及遞增 revision。
- 客戶端只採用已確認的數字，忽略舊 revision。回應遺失後沿用相同事件 ID 重試。
- 音效偏好與兩類舊計數不再呼叫；太極音效程式、第⑤項 API 及共用 client 未改。
- 新遷移先移除指定舊表與函式，再以三個 0 建立新表；沒有匯入、地板補數或本機備援，沒有 CASCADE。
- 表啟用 RLS，anon/authenticated 無讀寫或 RPC 權限；只有後端 service_role 可使用。

## 驗證

- 隔離 PostgreSQL（PGlite）實際執行兩份 SQL：初始 0/0/0、重複事件不加一、20 個不同事件逐筆累加、非法 epoch 拒絕、交易失敗無孤立事件、匿名/一般登入角色無權限，均通過。
- API 測試：GET 無寫入、缺資料回 503 不造零、舊版事件及跨站操作拒絕、新事件正確傳入 RPC，通過。
- 手機 Chromium 390×844（API 模擬、正式資料庫寫入 0 筆）：認同/不認同/瀏覽各增加 1，遺失回應重送同一 ID、不重複計數，舊回應不覆蓋新數字，通過。
- 退休功能測試、太極介面測試及 TypeScript 檢查通過。
- npm run build 通過，含 prebuild；有 lint warnings。
- 全站健康檢查 58/62；下述 4 項在修改前已失敗，未擴改。

## 既有發布阻擋

1. BAZI_SOURCE_REGISTRY_COMPLETE：來源 CONFLICT/PENDING_POOL。
2. BEAST_CARD_GAME_CORE：角木蛟幼子縮圖比例及縮圖合計 3.95MB 超標。
3. THREE_CORE_TRADITIONAL_DEFECTS：MEIHUA_GREGORIAN_SUM、GROWTH_WEEK_HASH、SOLAR_TERM_HASH 待解。
4. DUAL_CHART_SHENSHA_DISPLAY：神煞來源 PENDING_POOL。

業主於收到上述 4 項既有失敗與發布例外說明後再次明確指示「正式啟用」。本輪依此批准限定發布例外，只發布計數重建及 ②③④ 拆除，不修正或掩蓋其餘健康檢查結果。發布及雲端啟用結果於本次完成回覆記錄。

## 備份刪除實際狀態

使用者已授權刪除，但自動審查拒絕 Remove-Item，僅回報 blocked by policy。未改用其他方式繞過，以下仍存在：

- C:/Users/DRAGON/.codex/backups/database-retirement-2026-11-08T05-03-59-932Z/
- data/counter-history/
- data/ai-like-counter.json 與 data/ai-like-counter.backup.json

前一輪已從使用路徑刪除的 visitor、suggestion、taiji-sound 本機 JSON 不再使用；本輪不再新增歷史資料備份。其他功能備份未動。

## 共用工作區

本輪開始時已有 HomeInstallCard、InstallShield080、install-shield 與 install-ios-share-sheet 測試等其他修改，保持原樣，不納入本輪成果。
