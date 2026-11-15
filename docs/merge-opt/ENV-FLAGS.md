# 寶珠闖關功能開關與金鑰（AUDIT-2 X5）

> 本機 `.env.example` 被 `.gitignore`（`.env*`）排除、不會進版控，所以把寶珠闖關這一段另存成這份文件。
> 這裡只有變數名稱與說明，沒有任何真值。

```dotenv
# ========== 寶珠闖關（神獸卡牌戰）功能開關（AUDIT-2 X5）==========
# 兩個 NEXT_PUBLIC_* 開關都是「建置時寫死」：改值後要重新建置（Vercel 要重新部署）才會生效。
# 未設定＝關閉，行為和舊版完全相同。只有字串 '1' 代表開啟。
#
# 1) 合併強化（待餵區、一鍵吃到封頂、共鳴格、強化帶進戰場）。可以先開。
NEXT_PUBLIC_M3_FEED_CHAIN=
#
# 2) 困難模式「中途重整接回原戰局」。正式站請保持空白（關閉），直到下面三件事都完成：
#    (a) 選定並接好共用戰局儲存（尚未決定；接口見 lib/beast-game/match3/battle-ledger-store.ts）
#    (b) 在 Vercel 設定 M3_BATTLE_SECRET
#    (c) 依 docs/merge-opt/DESIGN-shared-ledger.md 的上線順序驗收
#    沒做完就打開也不會傷害玩家：伺服端會回「暫停」，前端自動改走一般模式並照實提示。
NEXT_PUBLIC_M3_BATTLE_RESUME=
#
# 3) 戰局收據簽章金鑰（只在伺服端使用，不可加 NEXT_PUBLIC_ 前綴，不可提交真值）。
#    至少 32 字元，所有伺服器執行個體必須相同。產生方式：openssl rand -hex 32
M3_BATTLE_SECRET=
#
# 4) 僅限「自架、確定只有一個伺服器行程」時使用：設 1 代表允許用記憶體保存戰局紀錄（仍須設金鑰）。
#    在 Vercel（偵測到 VERCEL 環境變數）上這個設定無效。正式站一般請留空。
M3_BATTLE_SINGLE_INSTANCE=
```

## 上線順序

1. `NEXT_PUBLIC_M3_FEED_CHAIN=1` 可以先開（只動瀏覽器存檔；舊存檔相容）。
2. `NEXT_PUBLIC_M3_BATTLE_RESUME` 正式站保持空白，直到：共用戰局儲存選定並接好 → Vercel 設 `M3_BATTLE_SECRET`（≥32 字元，所有執行個體相同）→ 依 `DESIGN-shared-ledger.md` 驗收多執行個體。
3. 提早打開也不會誤傷玩家：伺服端回「暫停」，前端自動走一般模式並照實提示（fix-3 實測見 FIX-LOG）。
