# 阿修羅引導追問第一版

## 同日追加：穩定優先的固定三步

業主選定「結論 → 依據 → 行動」，取代第一版任意重複追問選項。此次只修改本引導後端、契約、元件、測試及對應技能說明；保留所有排盤公式與來源核定狀態。

- 後端回傳步驟與下一步選項；第三步結束後只能切換其他時段，從結論開始。
- 「依據」不再沿用原「看白話」內容：以本段 guidance.related 的穩定 ID 與柱位，對回當份卡片及段落項目。沒有引用、缺卡或 ID 不符時不編造依據。
- 所列內容是解讀的實際引用，不是新增古籍核定或統計效度證明；原有來源範圍與提醒完整保留。
- 各次回答保留自己的範圍提示，避免後續回答遮掉之前的限制。行動仍為整體提醒，沒有時段專屬資料時不假稱有。
- 保留六次本頁歷史上限、換客戶清除、連點去重與過期回應隔離。

本輪後端、元件生命週期、技能頁流程、6146項技能覆蓋、依賴邊界、TypeScript、限定 ESLint 與差異檢查通過。獨立 Chrome 320px 真 API 測試通過現在／過去的三步、主題重啟、六輪上限及舊回應隔離。測例未來無對應印記時正確顯示 UNAVAILABLE，後續行動標明為整體提醒。詳見 `ghost-asura-conversation-mobile-qa-2026-11-03.md`。

本輪正式建置 `npm run build` 退出碼 0，日誌 `.tmp/asura-three-step-build.log`，既有警告保留。以下為第一版實作歷史；選項順序以本節為準。未進行實體手機驗收，尚未提交或部署。

業主批准補齊對話接線缺口。範圍僅既有 `/ghost-asura/skill` 讀盤結果後的選項式追問、其後端端點、契約、測試及技能索引。三位代理分工後端、前端、獨立瀏覽器驗收，主代理複查與建置。沒有修改八字、紫微公式或既有來源狀態。

## 實作

- 讀盤成功後由使用者按下開始，預設看現在；可切過去／現在／未來、看重點、看白話、可用時看整體行動提醒。
- 後端重新使用本次原始出生資料經既有顯示引擎取得段落；行動沿用既有修羅斷語並標明非時段專屬。
- 前端不算命、不選解讀句子、不接受自填命盤為真；只顯示後端答案與選項。
- 換資料、重新解讀、離頁取消舊請求；身分檢查阻擋過期回應。最多六次本頁歷史，不存長期記憶。
- 同源、輸入長度、枚舉、國曆臺灣時區、日期性別時間、年齡限制、限流與no-store保留。未知時辰不提供新追問，不改原讀盤功能。

## 驗證

通過：
- `npx tsx tests/ghost-asura-conversation.test.mjs`：實際後端資料來源、偽造忽略、換人再返回、原文與行動、未知時辰、年齡、同源、限流與輸入邊界。
- `node tests/ghost-asura-conversation-flow.test.cjs`
- `node tests/ghost-asura-skill-reading-flow.test.cjs`
- `node tests/ghost-asura-conversation.e2e.mjs`：隔離Chrome、320px、真API、三時段及所有追問、六輪上限、無橫向溢出、快速點擊去重、延遲真回應時改資料、無未捕捉錯誤。
- `node tests/ghost-asura-skill-coverage.test.cjs`：6146項。
- `node tests/ghost-asura-dependency-boundary.test.cjs`
- `npm run test:bazi`：81項。
- `npm run test:bazi-ziwei-cross`：104項。
- `npm run test:bazi-output-availability`
- `npx tsc --noEmit`、前端限定ESLint、`git diff --check`。
- `npm run build`：退出碼0，日誌 `.tmp/asura-conversation-build.log`；保留原有警告。

後端測試需使用tsx處理專案TypeScript與server-only測試替身；直接node執行曾因載入方式失敗，未藉此移除正式後端保護。

## 限制與發布

這是選項式追問，不是任意自由聊天；未新增工作／感情專屬判讀、未啟用百句候選、長期記憶、外部智慧自動決策或LLM。沒有真機Android/iPhone及Safari驗收。未重新宣稱全站健康通過。

三類既有來源／取法稽核仍未通過，詳見 `three-audit-repair-2026-11-03.md`。依專案門檻，本輪程式與檔案僅保存在本機，未提交、未推送、未部署；其他既有未提交工作保留。
