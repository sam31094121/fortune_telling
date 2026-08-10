# SYSTEM_INVENTORY.md

> Phase 1 產出。這是第一輪掃描結果，範圍是「結構性盤點」（有哪些檔案、誰 import 誰、明顯的重複點）。
> 逐項功能是否「正常運作」需要實際跑過每個流程才能下定論，本輪先誠實標記 `UNKNOWN`，不編造測試結果。

## 0. Phase 1 已完成項目

- ✅ `git tag before-platform-stabilization`（回退點）
- ✅ `git checkout -b feature/platform-stabilization-v1`（所有後續重構都在這個分支做，不動 main）
- ✅ 本檔案（結構盤點）

尚未做（需要你確認範圍再進行，見文件最後）：
- 資料庫 schema 備份（目前專案用 Supabase，尚未列出 schema）
- 環境變數清單匯出
- API 文件
- 操作錄影 / E2E 測試
- 已知錯誤清單（需要你提供，我無法憑空列出使用者實際遇到的 bug）

## 1. 首頁卡片 → 路由 → API → 核心邏輯 對照

| 卡片/模組 | 前端路由 | 主要 API | 核心 lib | 狀態 |
|---|---|---|---|---|
| 太極核心（首頁視覺） | `app/page.tsx` | 無（純前端） | `taiji-core-engine.ts`、`UnifiedTaijiCore.tsx`、`TaijiCoreVisual.tsx` | ACTIVE，但 CSS 有大量重複（見第 3 節） |
| 靈魂配對 | `app/match/page.tsx` | `api/match-generate` | `compatibility-engine.ts`、`match-five-element-engine.ts`、`match-professional-layer.ts`、`match-stability.ts` | UNKNOWN（未實測） |
| 姓名學 | `app/nameology/page.tsx` | `api/nameology-analyze` | `nameology-engine.ts`、`nameologyEngine.ts`（⚠️ 兩個檔名幾乎一樣，需確認是否重複） | **需人工確認是否重複** |
| 數字論吉凶 | 首頁內嵌卡片 | `api/number-fortune`、`api/number/analyze` | `number-fortune.ts`、`number-core-engine.ts` | UNKNOWN，兩支 API 是否都在用需確認 |
| 紫微斗數 | 未在 page 列表中獨立出現，疑似嵌在 `insight` 或首頁卡片 | — | `ziwei-calculator.ts`、`ziwei-sanfang-engine.ts`、`annual-fortune-engine.ts` | **UNKNOWN，需確認實際入口路由** |
| 八字命盤 | `app/bazi/page.tsx` | `api/bazi` | `bazi-engine.ts`、`bazi-detail.ts` | UNKNOWN |
| 西洋星座 | `app/zodiac/page.tsx` | 內嵌（見程式碼用 `zodiac-engine.ts`） | `zodiac-engine.ts`、`zodiac.ts`（⚠️ 兩檔同樣需要確認是否重複） | **需人工確認是否重複** |
| AI 音樂 | `app/music/page.tsx` | `api/music-generate`、`api/music-elevenlabs`、`api/music-lyria` | `music-engine.ts`、`music-parameter-generator.ts`、`music-personality-db.ts` + 三個歌曲資料庫檔 | UNKNOWN，三個音樂 API 分工需確認 |
| 塔羅牌 | `app/tarot/page.tsx`（+ `features/tarot/`） | `api/tarot/deck`、`draw-output`、`reading`、`interpret`、`shuffle`、`stats` | `tarot-engine.ts` | ACTIVE（本 session 有實際點開過，畫面正常） |
| 洞察分析 | `app/insight/page.tsx` | `api/insight-analyze` | `insight-engine.ts` | UNKNOWN |
| 數字命理 | `app/numerology/page.tsx` | 疑似共用 number 系列 API | — | **UNKNOWN，需確認跟「數字論吉凶」是否重複** |
| Growth Center | `app/growth-center/page.tsx` | `api/growth-center` | `growth-center-engine.ts`、`growth-center-client.ts` | ACTIVE（已被多個頁面 import） |
| Platform Center | `app/platform-center/page.tsx` | `api/platform-center` | `platform-control-center.ts`、`platform-stability-layer.ts` | **UNKNOWN，跟下面 platform-control-center 頁面關係不明** |
| Platform Control Center | `app/platform-control-center/page.tsx` | `api/platform-control-center` | `platform-control-center.ts` | **⚠️ 疑似跟上面 Platform Center 重複，需確認** |

## 2. 已經存在、且已被多頁面共用的「準核心」模組（不是要從零蓋，是要盤點清楚再決定要不要收斂）

這些檔案的命名和用途，剛好對應到指令裡要求的「唯一核心」概念，代表**部分工作已經做過**，重構重點應該是「收斂、補洞」而不是「重建」：

- **Analysis Task 雛形**：`lib/analysis-job-store.ts`、`analysis-job-client.ts`、`analysis-job-runner.ts` + `app/api/analysis/jobs/route.ts`、`app/api/analysis/jobs/[jobId]/route.ts`、`app/api/analysis/results/[resultId]/route.ts`。已被 `app/page.tsx`、`match`、`bazi`、`zodiac`、`nameology`、`insight`、`music` 等頁面 import。
- **Identity Split 雛形**：`lib/identity-split-client.ts`，已實作 `self` / `guest`（對應指令的 SELF/OTHER），存在 `localStorage`（**注意：不是資料庫，屬於前端本地狀態，跟指令要求的正式 SELF/OTHER 資料隔離有落差**）。
- **Integration Layer 雛形**：`lib/ai-integration-layer.ts`，已被多頁引用。
- **Growth Center**：`lib/growth-center-engine.ts` + `growth-center-client.ts`，已接上 `app/growth-center/page.tsx`。
- **Storage**：`lib/storage.ts` — 需要確認內部是不是還在寫本機 JSON（指令第五節禁止正式環境本機寫檔，這點必須實測，本輪未查證）。

## 3. 本 session 已經確認、實測過的重複/問題（不是猜測，是這幾輪對話裡實際查到的）

| 問題 | 位置 | 狀態 |
|---|---|---|
| `app/globals.css` 同一批 class（`.modal-taiji-3d-core`、`.modal-taiji-orbit-emblem`、`.taiji-light-orbit` 等）被重複定義超過 100 次，夾雜多輪 `!important` 疊加 | `app/globals.css`（17000+ 行） | 已標記，尚未整檔清理，只在檔案最後加了「最終權威」區塊覆蓋 |
| 太極兩儀分裂曾經有兩套並存實作（SVG 內建 + 額外 overlay `taiji-liangyi-precision-split`） | `components/UnifiedTaijiCore.tsx` | ✅ 已移除重複的 overlay，本 session 已修 |
| 每日一次分析限制寫死在單一 flag，暫時關閉中 | `lib/daily-analysis-limit.ts` | 目前 `DAILY_ANALYSIS_LIMIT_ENABLED = false`（開發期間暫停，之後要記得改回 true） |
| `nameology-engine.ts` vs `nameologyEngine.ts`、`zodiac-engine.ts` vs `zodiac.ts` 檔名疑似重複 | `lib/` | **尚未查證誰是 ACTIVE、誰是 LEGACY，需要下一輪確認** |
| Platform Center vs Platform Control Center 兩個頁面 + 兩組 API，用途重疊 | `app/platform-center`、`app/platform-control-center` | **尚未查證** |

## 4. 誠實的落差說明

以下是這份指令要求、但本輪**沒有**做、也不建議在沒有你確認的情況下貿然做的項目，附上原因：

1. **資料庫 schema 變更 / `analysis_tasks` 建表**：專案已連接 Supabase，但我還沒有查證目前的 tables 長怎樣。改 schema 屬於有風險的正式資料操作，需要你確認要在哪個 Supabase 專案/分支上做。
2. **刪除或標記 deprecated 的元件**：指令說「不得直接刪除目前可運作功能」，但「哪些是重複、可以停用」需要先用第 3 節列的 UNKNOWN 項目逐一實測，不能只憑檔名猜測就下架。
3. **Feature Flag 系統**、**E2E 測試（含 LINE/FB 內建瀏覽器、多裝置）**：這些是要新建的基礎設施，工作量本身就是好幾天的獨立專案，不是這一輪可以一次生出來的。
4. **Server 端錯誤格式統一（`success/error/requestId`）**：目前 29 支 API 各自的回傳格式還沒有逐一核對，統一格式前需要先看過現況。

## 5. 建議下一步（需要你選擇優先順序，而不是我自己決定）

這份指令的 16 個章節、10 個 Phase，等同於一個多週的平台重構專案。我不會在沒有你確認的情況下：
- 動資料庫 schema
- 下架任何現有頁面/API
- 一次性大改共用的 `globals.css`（風險是牽一髮動全身，這份 CSS 已經被前面很多輪修改疊加）

建議你從下面選一個切入點，我下一輪就直接深入做：
1. 先把第 3 節列的「疑似重複檔案」（nameology、zodiac、platform-center）逐一查清楚誰是 ACTIVE、誰該淘汰。
2. 先查 `lib/storage.ts` 是否還在正式環境寫本機 JSON（指令裡明確禁止的高風險項）。
3. 先處理太極 CSS 的重複清理（風險最高但你已經多次要求，可以排最優先）。
4. 先做「SELF/OTHER 是否真的完全隔離」的實測（讀 code 追蹤 `identity-split-client` 的每個使用點）。
