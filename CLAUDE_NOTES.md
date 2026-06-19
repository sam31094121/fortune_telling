# 操作筆記 — 給所有 AI 閱讀

本文件記錄這個專案的開發規則，**所有 AI 助手都必須遵守**，避免每次對話都重新踩坑。

---

## 1. 本機 Dev Server 規則 ⚠️ 最重要

### Port 永遠是 3000，不允許 3001/3002

```
專案目錄：C:\Users\DRAGON\Desktop\命理
啟動指令：npm run dev
本機網址：http://localhost:3000
```

### 啟動前必做：先清舊 process

`npm run dev` 遇到 port 佔用會自動跳到 3001、3002，**這是錯的**。
原因：上一次的 server 沒有被關掉，殭屍 process 還佔著 3000。

**正確流程（PowerShell）：**
```powershell
# Step 1：清掉所有佔用 3000-3005 的 process
3000..3005 | ForEach-Object {
    $port = $_
    $conn = netstat -ano | Select-String ":$port " | Select-String "LISTENING"
    if ($conn) {
        $processId = ($conn -split '\s+')[-1]
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2

# Step 2：用 cmd 啟動（PowerShell 的 Start-Process 在這裡不穩定）
Start-Process -FilePath "cmd" -ArgumentList "/c npm run dev > C:\temp\next-dev.log 2>&1" -WorkingDirectory "C:\Users\DRAGON\Desktop\命理" -WindowStyle Hidden

# Step 3：等 15 秒，確認 3000 上線
Start-Sleep -Seconds 15
netstat -ano | Select-String ":3000" | Select-String "LISTENING"
```

### CSS 黑白（只有文字，沒有樣式）的診斷

原因通常是 dev server 有問題，CSS 靜態檔案回傳錯誤。

**修復步驟：**
1. 清掉所有 300x port 的 process（見上方）
2. 刪掉 `.next` 資料夾（`Remove-Item -Recurse -Force .next`）
3. 重新啟動 dev server
4. 驗證：`Invoke-WebRequest http://localhost:3000/_next/static/css/...` 要回傳 200 且 > 5000 bytes

---

## 2. 架構概覽

```
app/
  page.tsx              — 主頁面（InputForm → PreviewDisplay → ResultDisplay）
  api/
    preview/route.ts    — 免費天地預分析（生日 + 血型）
    analyze/route.ts    — VIP 完整分析（生日 + 血型 + 姓名）

lib/
  gemini.ts             — Gemini AI 呼叫、Prompt 建構
  personality-engine.ts — enrichPreview / enrichAnalysis（文字摘要生成）
  music-engine.ts       — 音樂親和力矩陣計算（統計學）
  types.ts              — 所有型別定義
  personality.ts        — DIMENSION_META（12 個人格維度 metadata）
  zodiac.ts             — 星座判斷

components/
  InputForm.tsx         — 生日 + 血型輸入
  PreviewDisplay.tsx    — 免費預覽結果
  ResultDisplay.tsx     — VIP 完整結果
  MusicProfile.tsx      — 音樂人格圖譜（含 MusicPlayer）
  MusicPlayer.tsx       — YouTube 自動播放器
  ProgressBar.tsx       — 維度分數進度條
```

---

## 3. 三合一權重系統（核心邏輯，不可更動）

| 層次 | 輸入 | 權重 | 說明 |
|------|------|------|------|
| 天   | 生日 / 星座 | 15% | 人格骨架（base_scores） |
| 地   | 血型 | 15% | 行為模式（blood_adjustments，上限 ±12） |
| 人   | 姓名 | 70% | 個體差異（name_adjustments，上限 ±18） |

**鐵律：後面的資訊只能補充，不能推翻前面。**

---

## 4. 音樂偏好引擎

- 10 種音樂類型 × 12 個人格維度的親和力矩陣（`lib/music-engine.ts`）
- 計算方式：加權點積 + 每類型正規化到 0-100
- 自動播放：`MusicPlayer.tsx` 用 YouTube iframe `mute=1&autoplay=1` 繞過瀏覽器限制
- 免費版（preview）和 VIP 版都會顯示音樂圖譜

---

## 5. 環境變數

```
GEMINI_API_KEY=...    # 在 .env.local
```

---

## 6. 部署

- 本機開發：http://localhost:3000（永遠是這個）
- 線上：Vercel（https://080fortune-telling.vercel.app 或類似）
- GitHub：https://github.com/sam31094121/fortune_telling
