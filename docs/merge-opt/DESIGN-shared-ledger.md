# 共用戰局儲存：接口、設計與上線順序（AUDIT-2 X1–X3、X5）

> 狀態：**接口與安全預設已做好；資料庫尚未選定**（依使用者指示，不自行決定）。
> 在接好共用儲存之前，正式站的 `NEXT_PUBLIC_M3_BATTLE_RESUME` 保持關閉。就算誤開，伺服端也會回「暫停」，前端自動改走一般模式。

## 一、為什麼一定要共用儲存
A6「中途重整接回」每一步都要核對「這張收據是不是伺服端記得的最新一號」。原本這個「最新一號」存在單一伺服器行程的記憶體裡：
- Vercel 是多執行個體，同一位玩家的請求會落在不同台 → 別台沒有紀錄。
- AUDIT-2 實測：沒共用金鑰時正常玩家被判「被修改過」（X1）；有共用金鑰時 A→B→A 被誤擋成「別的分頁在打」（X2）；而且逃輸局、重放舊收據在別台會被接受（X3）。

## 二、這一輪已經做好的安全預設（程式）
| 項目 | 位置 | 行為 |
|---|---|---|
| 儲存接口 | `lib/beast-game/match3/battle-ledger-store.ts` 的 `BattleLedgerStore` | `get(battleId)`、`put(entry, expect)`（原子比對後寫入）、`kind: 'memory' \| 'shared'` |
| 啟用判斷 | `battleLedgerReadiness()` | 正式環境（`NODE_ENV=production`）只有在「已註冊 `kind:'shared'` 的儲存＋`M3_BATTLE_SECRET` ≥32 字元」時才通過；否則回 `no-shared-store`／`no-secret`／`vercel-memory` |
| 單一行程例外 | `M3_BATTLE_SINGLE_INSTANCE=1` | 只限自架單一行程；偵測到 `VERCEL` 一律無效；仍須設金鑰 |
| 開發環境 | `NODE_ENV` 不是 production | 允許記憶體儲存（本機 `next dev`、node 測試） |
| API | `orb-battle-record`、`orb-turn`（帶收據時） | 不通過就回 **503 `unavailable`**，訊息照實寫「改用一般模式」；`action:'status'` 可查原因（不含任何秘密） |
| 前端 | `Match3Board.tsx` | 開局或接回收到 `unavailable` → 清掉舊快照，這一局用一般模式開打，畫面上方照實提示 |
| 不再從收據重建 | `orb-battle-ledger.ts` `loadEntry()` | 找不到紀錄一律 **`lost`**（照實說紀錄不見了，不說成被竄改）；舊收據不能在別台逃輸局或重放 |
| 金鑰 | `secret()` | 正式環境沒設金鑰時拒絕簽章（不再默默用每台不同的亂數金鑰） |
| 冪等（H4） | `runBattleTurn(requestKey)` | 同一 actionId＋同一份請求的重送 → 回上一次的結果，不前進序號 |
| 頻率限制（M2） | `lib/beast-game/match3/rate-limit.ts` | 每台各自計算（共用儲存接好後可改全域） |

## 三、共用儲存要實作的事（選定資料庫後）
1. 寫一個轉接器，實作 `BattleLedgerStore`，`kind: 'shared'`：
   - `get(battleId)`：讀一筆紀錄（JSON），不存在回 `undefined`。
   - `put(entry, expect)`：**原子**比對後寫入。
     - `expect === null`：只有不存在時才寫（開局）。
     - 否則：只有目前 `seq === expect.seq` 且 `status === expect.status` 時才寫；回 `true`／`false`。
   - 每筆設 TTL＝`BATTLE_RESUME_POLICY.expireMs × 2`（目前 48 小時，暫定值）。
2. 在伺服端載入時呼叫 `setBattleLedgerStore(adapter)`（例如在 orb-battle-record／orb-turn 兩支 route 開頭 import 一個 `register-shared-ledger.ts`）。
3. 候選做法（**請使用者選，不由我決定**）：

| 選項 | 原子比對寫入的做法 | 需要 | 備註 |
|---|---|---|---|
| Supabase（Postgres） | `update battle_ledger set … where battle_id=$1 and seq=$2 and status=$3`，看影響列數；開局用 `insert … on conflict do nothing` | 一張表＋service role（專案已有 `SUPABASE_SERVICE_ROLE_KEY` 欄位） | 和首頁信任計數同一個服務；延遲比 Redis 高一點 |
| Upstash Redis／Vercel KV | Lua 腳本或 `WATCH/MULTI`：讀 seq/status，相同才 `SET … PX ttl` | Redis 連線網址與權杖 | 延遲最低，TTL 原生支援 |

4. 每筆紀錄大小：核心約 10–30 KB（含盤面、雙方卡、上一次回應）。5,000 場同時進行約 150 MB 上限（暫定估算）。

## 四、上線順序（照這個順序，不要跳）
1. 合併強化：`NEXT_PUBLIC_M3_FEED_CHAIN=1` 可以先開（不依賴共用儲存）。
2. 使用者選定資料庫並授權；建立資料表或 Redis；寫轉接器＋測試（多執行個體測試：兩個 `next start` 行程共用同一個儲存，跑 A→B→A、逃輸局、重放）。
3. 在 Vercel 設定 `M3_BATTLE_SECRET`（`openssl rand -hex 32`，不提交到 git）。
4. 預覽環境打開 `NEXT_PUBLIC_M3_BATTLE_RESUME=1`，重新部署；用 `POST /api/beast-game/orb-battle-record {"action":"status"}` 確認回 `{"ok":true,"mode":"shared"}`。
5. 真機試玩：重新整理接回、雙分頁、斷線後按「重新接回」。
6. 都通過才在正式站打開。

## 五、誠實限制
- 共用儲存還沒接，所以正式站目前**不能**開中途接回；開了也只會降級。
- 頻率限制在多執行個體時是每台各算。
- 伺服端仍然不知道玩家真正的勝場與強化（進度在瀏覽器），開局數值只能擋「不可能的數字」，見 `DECISION-persistence.md`。
