# 雙命盤關機交接

目前修改已保存，尚未提交或推送；main 領先 origin/main 4 個既有提交。先前自動審核因三項健康檢查失敗拒絕推送，未取得針對失敗項目的明確例外，不可繞過。

## 已完成
- 手機摘要標籤和值分行；320/375/390/430 寬度驗證無頁面水平溢出。
- 已授權的八字 A4 字級、間距及剩餘高度分配修改保留。
- 命局合沖刑害破標題與關係名稱加粗放大、參與字與柱位分層；資料順序與重複關係完整保留。
- 六筆實際資料樣本：1974-06-28 17:30 男；六筆全部可見，未合併。三筆長名稱手機案例四種寬度皆無溢出；四個柱位案例完整顯示。六筆專用手機截圖未完成。
- npx tsc --noEmit --pretty false、npx eslint app/dual-chart/BaziChart.tsx、git diff --check 均通過；沒有重跑完整健康檢查。
- 正常四筆樣本（明安，1974-07-28 09:30 男）的新版彩色及黑白 PDF 均為 2 張 A4；四張渲染圖已目視檢查。
- dual-chart-relations-color.pdf、dual-chart-relations-monochrome.pdf 為最終本機 PDF。
- output/screenshots/dual-chart-relations-before.png 與 after.png 為相同比例的原生 PDF 區域截圖，內容是四筆樣本，不是六筆。

## 未完成／限制
- 六筆樣本 A4 在本輪關係區修改前已高 1150.57px，修改後 1140.24px，仍超過 A4 1122.52px。左側五行長小數圖例換行撐高版面；七筆樣本同樣受此限制。
- 六筆樣本不可宣稱 PDF 驗收通過。既有匯出溢出保護未改，未裁切或隱藏資料。修左側需要另行釐清範圍。
- 未檢查實體列印，未提交／推送任何本輪修改；沒有修改健康檢查、hooks、憑證或四個既有未推送提交。
- 下一步：先處理六筆 A4 左側高度問題及既有健康檢查失敗，再依專案規則提交推送。

## 後續限定嘗試（尚未核定、未提交）
A4圓環與圖例並排、關係區上間距12→4px後，六筆案例兩頁DOM均1122.5179px。實際製作並下載彩色與黑白各2頁PDF，保存為dual-chart-six-spacing-color.pdf與dual-chart-six-spacing-monochrome.pdf；未渲染目視，不列為最終核定產出。tsc、BaziChart eslint與diff check通過。最新使用者澄清目標是平板小卡片，已暫停修改和提交；本輪新增CSS僅末尾elementSummary grid及relations margin-top，等待確認是否保留。三项舊健康門檻一次性例外由來源任務通知已獲批准，但本輪範圍尚待釐清，仍不推送。

## 平板指定卡片收斂
已精準撤回誤擴A4的圓環圖例grid與relations margin-top4px。最新修改僅一般螢幕541–1100px的relations卡片字级/留白：標題20px、名稱19px、參與字15px、柱位13px，內距14/16px、條目上距9px；保留原block排列及全部六筆順序。不影響手機或printPreview規則。768/1024實際DOM六筆逐項scrollWidth=clientWidth、頁面無水平溢出；390維持原字級18/17/13/11且無頁面溢出。截圖工具出現縮小/重複畫面，無法據此聲稱清晰視覺驗收；未重試拖延。原六筆A4高度限制仍存在，six-spacing兩PDF為已撤回方案的中間產物，不是最終版本。未提交推送，由來源任務確認狀態後統一發布。
