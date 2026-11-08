# 易經神煞來源閘門唯讀核對

日期：2026-11-03。範圍：健康檢查 `DUAL_CHART_SHENSHA_DISPLAY`，只核對既有程式、技能政策與實際檢查結果；本報告不修改公式、來源狀態、放行政策或前端。

## 本次結果

執行 `node scripts/dual-chart-iching-shensha-display-check.cjs`，輸出保存在 `.tmp/shensha-review-current.log`。

三個固定命例使用真實 `calculateDualChart`、來源閘門及 `PillarGrid` 伺服器端渲染，結果為：

```json
{
  "ok": false,
  "deliveryOk": true,
  "requestedScopeComplete": true,
  "sourceVerified": false
}
```

摘要：`SUMMARY: 3 個命例，神煞列失敗 59 項（阻斷健康放行）`。59 項警告全為規則來源仍為 `PENDING_POOL`；本次未發現命中傳遞、柱位、顯示或既定需求範圍缺失。這是後端與 SSR 核對，不是真機觸控、瀏覽器版面或列印驗收。

## 失敗原因及現行政策

- `lib/dual-chart-iching-shensha.ts` 的 `reference()` 建立本派規則時固定回傳 `status: 'PENDING_POOL'`、`referenceMethod: true`，在核心核對通過時允許 `READY`。來源版本為「本站自家一派，以業主提供參考命盤核對」，`sourceUrl` 空白，`printedPage` 為「原典待補」。本次59項待核規則均走此參考取法路徑。
- 既有四柱神煞技能的 2026-09-27 定案允許「算出來就顯示並標註」，無原典頁碼者維持 `PENDING_POOL` 與 `referenceMethod`，不得當作已通過原典交叉比對。
- 同技能 `references/project-map.md` 的 2026-10-08 維護基準同時要求保留來源待核的健康失敗；顯示一致與來源全部核定分開記錄。
- `scripts/dual-chart-iching-shensha-display-check.cjs` 的 `inspectShenShaSourceVerification()` 正是逐項檢查來源狀態，總結果合併傳遞、範圍及來源警告，因此整體 `ok` 為 false。這不是漏同步成功標記。
- `tests/dual-chart-shensha-column-order.test.cjs` 明確斷言：傳遞成功不得認證待核來源。該測試為本次閱讀證據，本次未另行重跑。

## 為何只改來源登記不會使這59項通過

現行 `reference()` 不依來源登記的 claim 狀態計算 VERIFIED；它按既定本派政策固定產生待核結果。部分規則呼叫 `legacy()`，僅取原有登記的 `comparisons` 作版本對照，不取該 claim 的核定狀態作正式放行。因此即使把舊版登記補成 VERIFIED，也不能證明目前本派取主、柱位與條件一致，更不會自動更新這59項的來源狀態。

羊刃、元辰及部分核心規則另沿用已選版本的來源閘門，與上述參考取法路徑不同；不得混為全體皆無來源。

## 可行修正邊界

若要真正完成來源驗證，需對目前實際採用的各項本派規則補齊原頁定位、取主、適用柱位／條件與獨立期望測例，再接入逐規則證據計算。證據未補齊前保留待核；不能為取得綠燈把本派公式換成另一版本，或直接把 aggregate `ok` 改成只看傳遞成功。

報告可清楚區分「顯示完整」與「取法來源待核」，但這只是避免誤讀，不會自動解除目前的發布門檻。本報告沒有宣稱59項原典已核定，也沒有修改任何來源或運算檔案。
