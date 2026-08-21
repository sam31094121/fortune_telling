# Platform Core Architecture V6 Execution Contract

本文件是天地人和 AI 平台的最高工程執行規則。它把使用者提供的「唯一核心、九張卡片逐張強制驗證、手機優先、共用核心修改例外」落成專案內固定契約。

## 最高原則

從本版本開始，禁止以零散補丁作為主要修復方式。所有卡片必須逐步收斂到同一個 Platform Core。

Platform Core 的固定方向：

1. Platform Core
2. Taiji Core
3. Identity Core
4. Analysis Task Core
5. Dictionary Core
6. Integration Layer
7. Growth Center
8. 九張功能卡片

所有卡片必須透過同一套核心邊界交換資料，不得各自建立第二套 Analysis、第二套 API、第二套 Store、第二套 Integration。

## 九張卡片固定佇列

CARD_01: AI 姓名學，路徑 /nameology
CARD_02: AI 紫微斗數，路徑 /insight
CARD_03: 數字論吉凶，路徑 /numerology
CARD_04: AI 靈魂配對，路徑 /match
CARD_05: AI 生成歌曲，路徑 /music
CARD_06: 八字命盤，路徑 /bazi
CARD_07: 西洋星座，路徑 /zodiac
CARD_08: AI 塔羅牌，路徑 /tarot
CARD_09: AI 個人成長中心，路徑 /growth-center

每張卡片只能依序通過：

LOCKED -> READY -> SCANNING -> INPUT_TESTING -> SUBMIT_TESTING -> BACKEND_TESTING -> ENGINE_TESTING -> RESPONSE_TESTING -> MOBILE_TESTING -> PERFORMANCE_TESTING -> REPAIRING -> RETESTING -> PASSED -> COMPLETED

## 共用核心修改例外

雖然九張卡片必須逐張驗證，但若 CARD_01 發現問題位於共用核心，允許修改共用核心。

共用核心包含：Platform Core、Analysis Task、Identity Core、Storage、API Client、Integration Layer、共用表單、共用錯誤處理。

修改後必須遵守：

1. 先重新完整驗證 CARD_01。
2. 確認 CARD_01 為 HEALTHY。
3. 再進入 CARD_02。
4. 後續每完成一張卡片，重新回歸測試所有已完成卡片。
5. 不得因共用核心修改，直接批次宣告其他卡片通過。

## 三層健康掃描

第一層：視覺呈現層。檢查首頁、九張卡片、表單、按鈕、結果畫面、太極圖騰、3D 動畫、光影、粒子與手機響應式。

第二層：互動控制層。檢查卡片切換、表單狀態、按鈕狀態、載入狀態、錯誤狀態、任務順序、API 呼叫、防止重複送出、返回與清理。

第三層：核心資料層。檢查 API、後端驗證、核心分析引擎、統一分析矩陣、資料儲存、結果格式化與錯誤紀錄。

鐵律：視覺層不得計算後端核心分析；互動層不得直接修改永久資料；核心資料層不得直接控制前端動畫。

## 手機優先驗收

手機版是第一驗收標準。桌面版正常但手機版異常，仍視為未完成。

最低驗證寬度：320px、360px、375px、390px、412px、430px。

最低瀏覽環境：Android Chrome、Android WebView、iPhone Safari、LINE/Facebook 內建瀏覽器情境。

## 最終狀態規則

未實際取得專案程式碼、未執行建置、未完成測試時，不得輸出 COMPLETED_AND_VERIFIED。

只能輸出 NOT_COMPLETED，並列明：尚未取得的權限或資料、尚未執行的測試、目前阻塞位置、下一個可執行動作。

## 本機稽核入口

執行：

```bash
npm run platform:v6:audit
```

輸出：

- reports/platform-core-v6/latest.json
- reports/platform-core-v6/latest.md

稽核腳本只提供證據與狀態，不會替代九張卡片的真實手機 E2E 驗證。
