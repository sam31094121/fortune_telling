# 健康檢查・常駐素材（手機優先）

更新日期：2026-09-15

## 定位
健康檢查是站內**隨時可用**的常駐能力，與功能檔、技能檔、戰鬥素材同級，不是只有例行排程才跑。

## 觸發詞
- 開啟
- 健康檢查
- 任何太極／命理任務開始時

## 必做（手機優先）
1. 開 Grok **右側螢幕**（1:1 看板），不要用客戶電腦另開瀏覽器當證據
2. 真實連線檢查（本機 `http://localhost:8888/` 與線上分開標示，禁止混版）
3. 畫面上顯示流程箭頭
4. 截圖回報；禁止只回文字
5. 神獸卡任務另加米其林三軸（品質／穩定／服務）誠實評分

## 手機優先鐵律
客戶幾乎全來自手機：驗收寬度以 **≤430px** 為準。老師解盤、鬼魅、調試、戰鬥 HUD 皆以單欄、大觸控、不橫向溢出為合格。

## 老師／調試健康點
| 項目 | 路徑／端點 | 合格標準 |
| --- | --- | --- |
| 八字易經老師 | `/api/bazi/google-reading` | `ok:true`；AI 額度不足時 `source:local-fallback` 仍可讀 |
| 八字鬼魅老師 | `/api/bazi/horror-reading` | 同上 |
| 紫微調試 | `/api/ziwei-debug?debugZiwei=1&…` | `ZIWEI_CHART_CERTIFIED=true` |
| 八字調試 | `/api/bazi-debug?debugBazi=1&…` | `BAZI_CHART_CERTIFIED` 通過 |
| AI 額度探測 | `npm run`／`node tests/ai-teacher-availability.mjs` | 僅狀態探測；失敗不應讓客戶看到英文 429 |

## 技能
見 Grok Bot 技能「右側螢幕連結健康檢查」。


## Michelin polish 2026-09-15
- BaziTeacherModes mobile: touch targets min-h 52px, full-width fallback notices (13px + aria-live), treasure scale 1.35 on phone, overflow-x-hidden.
- Teacher APIs still local-fallback when Gemini Spend capped; UI must show notice (not blank).
- Scores after polish (local): 品質 8.5 / 穩定 8.5 / 服務 8. Ceiling for Service needs Spend raise for cloud oral.
- Verified 2026-09-15 14:07 UTC+8.


## Health check optimize 2026-09-15 (motto wood card)
- Routes 200: / /bazi /insight /match /beast-game /nameology
- Teachers: google/horror local-fallback OK
- Motto card: sun 順天而行感恩的心 + curse 逆天而行＝米田共 (SharedElementSealPaper) + wood-4d frame + bg fallback #5c3218
- Michelin (local): 品質9 / 穩定8.5 / 服務8.5
- Board: http://127.0.0.1:8767/board.html (agent right screen)
