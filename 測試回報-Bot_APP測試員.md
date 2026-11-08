# 測試回報（Bot_APP測試員）

---

## 問題單：/ghost-asura 表單填的姓名沒有送到後端（2026-11-06 15:00，UTC+8，Bot_APP測試員）

**狀態**：只回報，未修（依使用者 14:53 指示）。不影響生辰排盤；影響阿修羅頁的姓名個人化（目前畫面一律改稱「你」）。

**重現步驟**（localhost:8888，Chrome 無頭，390×844）
1. 開 `/ghost-asura`，點「我自己」。
2. 在第一個文字輸入框（id 類似 `_R_3iatpet2lb_`，無 placeholder／aria-label）輸入「測試」。
3. 民國年 1974、月 6、日 28；點「男性」→「我知道出生時辰」→ 選「酉」。
4. 點「開啟命魂戰局」。
5. 攔截 `POST /api/ghost-asura/reading` 的 request body。

**實際**：body 的 `"name":""`（完整 body：`{"name":"","gender":"male","birthDate":"1974-06-28","calendarType":"solar","country":"","city":"","birthTime":"17:30","birthHourBranch":"you","timeUnknown":false,"birthPlace":"","identityTarget":"self","timezone":"Asia/Taipei"}`）；畫面 viewerLine 為「你今年 52 歲（虛歲 53），正走在 44–53 歲這段。」，沒有姓名。
另一次在送出前再填一次姓名，結果等不到時間軸、120 秒逾時（原因未查）。

**預期**：body 帶 `"name":"測試"`；後端回 `viewer.name = "測試"`，viewerLine 為「測試，你今年 52 歲…」。

**對照證據（後端正常）**：直接打 API 帶 `"name":"  阿勝  "` → `viewer = {"name":"阿勝","age":52}`、viewerLine「阿勝，你今年 52 歲（虛歲 53），正走在 44–53 歲這段。」。
- 檔案：box `/workspace/ghost-asura-48/final3/live-1974-name.json`（MSI `C:\Users\DRAGON\ga-stage\live-1974-name.json`）
- 表單送出攔截腳本：`C:\tmp\name-shot.cjs`；截圖 box `/workspace/ghost-asura-48/final3/390-04-guide-bar-name-field-not-sent.png`

**懷疑的檔案**
- `components/UnifiedBirthForm.tsx`：姓名輸入框 onChange 與 profile 合併（後續欄位更新時是否用舊 profile 覆蓋 name）。
- `app/ghost-asura/GhostAsuraPageClient.tsx`：`updateForm()`（約第 302 行）與 `calculate(profile)`（約第 319 行）、`submittedInput = { ...profile, ... }`（約第 357 行）；也要確認「我自己」按鈕是否重設 name。
- 也可能是測試腳本選到的第一個文字框不是姓名欄（該框無標籤），修正前先用人工實測確認。

**另記**：後端舊欄位 `targetName`（只要求 ≥2 字）未過禁詞，例如姓名「天同」會原樣顯示為〔本人：天同〕；新欄位 `viewer.name` 已擋（含禁詞＝null）。

