# 血型生日配對分析

輸入兩人的血型與生日，由 Google Gemini AI 扮演命理老師，分析雙方的配對程度。

## 技術

- Next.js 14（App Router）+ React 18 + TypeScript
- Tailwind CSS
- Google Gemini API（`@google/genai`，模型 `gemini-2.0-flash`）

## 快速開始

### 1. 安裝套件

```bash
npm install
```

### 2. 設定 API Key

到 [Google AI Studio](https://aistudio.google.com/apikey) 申請一組免費 API Key，
然後打開專案根目錄的 `.env.local`，填入金鑰：

```
GEMINI_API_KEY=你的金鑰
```

> `.env.local` 已列入 `.gitignore`，不會被上傳到 Git。

### 3. 啟動開發伺服器

```bash
npm run dev
```

打開瀏覽器前往 http://localhost:3000

## 功能說明

| 項目 | 說明 |
|------|------|
| 輸入 | 兩人的姓名（可選）、血型（A/B/AB/O）、生日 |
| 自動計算 | 由生日即時推算十二星座 |
| AI 分析 | 個性、愛情、溝通、未來四項評分 + 整體分數 + 總結建議 |
| 輸出 | 圓形總分、四項進度條、命理老師總結 |

## 資料流

```
前端表單 → POST /api/analyze（server-side）
        → 驗證輸入 → 呼叫 Gemini（responseSchema 強制 JSON）
        → 回傳結構化結果 → 前端渲染分數卡
```

API Key 僅存在於 server-side，前端不會接觸到。

## 專案結構

```
.
├── app/
│   ├── layout.tsx            # 全站版型
│   ├── page.tsx             # 主頁面（表單 + 結果）
│   ├── globals.css          # Tailwind 全域樣式
│   └── api/analyze/route.ts # Gemini API 呼叫（後端）
├── components/
│   ├── InputForm.tsx        # 單人輸入卡片
│   ├── ResultDisplay.tsx    # 結果區塊
│   └── ProgressBar.tsx      # 單項分數條
├── lib/
│   ├── gemini.ts            # Gemini 封裝與 prompt
│   ├── zodiac.ts            # 星座計算
│   └── types.ts             # 共用型別
└── .env.local               # GEMINI_API_KEY（需自行填寫）
```

## 部署到 Vercel

1. 將專案推上 GitHub
2. 於 [Vercel](https://vercel.com) 匯入該 repo
3. 在 Vercel 專案的 **Environment Variables** 加入 `GEMINI_API_KEY`
4. Deploy

## 注意事項

- 免費額度由 Google AI Studio 提供，超量會被限流，請留意用量。
- 命理分析僅供娛樂參考。
