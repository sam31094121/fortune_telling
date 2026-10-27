# 西方生命密碼：獨立接手與發布候選查核（2026-10-27）

## 結論與範圍

西方生命密碼的正式編譯、公式、來源界線、API 與生命週期檢查通過；正式站 API 仍是 404，尚未發布。本輪未提交或推送，也未變更來源核定、八字取法或凍結卡片的執行程式。

五項整站紅燈不能稱為五個新卡故障：對照 `origin/main`，來源登記、三核心舊取法及相應守門邏輯沒有差異。修復這些涉及不同核定／取法範圍，不能將業主一般發布批准改寫成全部來源已核實。

## 五項的獨立證據

| 健康項目 | 查核結果 | 此輪處理界線 |
| --- | --- | --- |
| BAZI_SERVICE_AVAILABILITY | 既有進階判讀、補強、配對受來源／能力門檻限制 | 不以欄位存在或 HTTP 200 宣稱可用 |
| BAZI_SOURCE_REGISTRY_COMPLETE | origin/main 的同一份登記亦是 18 個 claims、11 過、7 未過 | 保留原典、版本、權限、評分與適用範圍的待核狀態 |
| BAZI_FEATURE_COMPLETE | 沒有本輪西方生命密碼造成的八字執行碼差異 | 不新造算法或更動凍結結果契約 |
| THREE_CORE_TRADITIONAL_DEFECTS | 所涉易經、老師、生長中心、節氣等既有檔與 origin/main 相同 | 已由前一位代理驗證的文字雜湊舊路徑修正，不代表其他舊取法通過 |
| DUAL_CHART_SHENSHA_DISPLAY | 實際結果 deliveryOk=true、requestedScopeComplete=true、sourceVerified=false；59 個來源警告，沒有其他警告 | 已選版本的資料可送達，不等於原典已核；不改前端或放寬來源條件 |

本機整站最新 57/62 是前一輪健康檢查結果；本候選未另外執行完整整站監控，不能把個別通過寫成候選整站全綠。

## 可重現的新增修復：兩個舊 E2E 契約

原本 `test:pre-push-e2e` 額外失敗的兩項已定位，不是上述五項：

1. `ghost-asura-nature-api-regression` 使用 10/09 的舊欄位快照，拒絕 10/24 已加入的 `goldWording`。
2. `ghost-asura-skill-forbidden-terms` 將新欄位的核准「依據」句與資料狀態「時辰」視為戲劇話術禁詞，與已存在的專項契約矛盾。

依據是 `docs/技能戰鬥檔案/鬼魅阿修羅/話術含金量技能.md` 第三節第 3 項的「已實作（業主批准 2026-10-24）」、第九節 API 欄位說明，以及 `tests/ghost-asura-gold-wording.test.ts` 既有的 32 項專項測試。來源登記的學術核定與上述輸出契約是不同問題，本修復沒有替學術核定背書。

只改測試：保留舊欄位的順序和值斷言；新欄位的 label/text/basis 逐一精確比對該客戶後端結果；舊區域與 HTML 繼續掃描禁詞。核准依據與「時辰」例外只適用於先通過精確契約驗證的新欄位。新增反例證明任一欄加上禁詞、錯人內容、多欄位、缺依據均被拒絕，其他區域的「時辰」仍被抓出。沒有改 runtime 話術或未知時辰取法。

變更檔：

- `tests/ghost-asura-nature-api-regression.test.cjs`
- `tests/ghost-asura-skill-forbidden-terms.test.cjs`
- `tests/helpers/asura-gold-contract.cjs`
- `tests/asura-gold-contract-boundary.test.cjs`

## 實際發布候選

使用一般暫存目錄，由 HEAD 的 archive 組裝，不建立分支、worktree 或第二個 Git repository。

- 基底：`6b98bdddaa11a72d5772767f4ef6c1ed316ee9fe`。
- 目錄：`C:/Users/DRAGON/AppData/Local/Temp/life-release-review-P6Dpyo/candidate`。
- 精確 overlay 清單與雜湊：`reports/independent-release-candidate-2026-10-27.json`，共 33 檔（17 個生命密碼、8 個已完成計數修復、8 個測試契約／檔案列舉修復）。本機組裝資訊另存 `.tmp/life-release-review.json`。
- 不包含工作區未提交的神獸改動；但 HEAD 已有兩筆尚未推送的神獸提交 `6b98bdd`、`e0bdb9c`，正常推送 main 會一起發布，不能聲稱只發生命密碼。
- 計數 migration 先前已套用，不重跑；本次候選包含版本控制檔供追溯。
- 忽略的 `data/visitor-counters.json` 僅複製至候選作本機歷史查核輸入，不列入 overlay，不提交、不上傳。乾淨 archive 缺這份私有本機檔時，相關查核不能直接當成程式失敗。

驗證：候選正式 build 成功（既有 lint 警告）；1233 個公式／來源／顯示檢查通過；API 實測與生命週期檢查通過；計數四項獨立檢查、確認測試及真實來源檢查通過。API 測於候選自己的正式模式 `127.0.0.1:8891`，不是以原本 8888 服務代替候選。後續僅加入測試檔，沒有重編相同 runtime。

最終驗收：工作區 E2E 通過後，另外在候選目錄執行完整 `npm run test:pre-push-e2e`，exit 0。候選自己的真實 Edge 點擊 38 項通過，候選私有測試伺服器上的 forbidden-terms、nature-api-regression、three-tiles、nature-page 四支全過，沒有以工作區結果替代。使用既有測試產生的隨機登入，未修改正式密碼或安全設定。

另在候選執行 pre-push hook 所列全部 42 個 npm 守門腳本：首輪 40 過、2 項因 archive 沒有 `.git` 而在 `git ls-files` 中止。保留這次失敗紀錄，不計為功能錯誤或直接略過。最小修復是將這兩支測試的來源列舉改為實際檔案列舉，限定原來源目錄與副檔名，排除依賴、編譯輸出、備份；所有既有斷言保留。新卡未追蹤檔也納入檢查，不以 Git 狀態決定是否掃描。實際比對原 762 個受追蹤來源全部保留，候選掃到 765 個，沒有漏掉舊範圍。

修復後候選 `test:true-solar-time`（3 組含 40 筆逐毫秒對照）、`test:credibility-wording`（7 組）均過；檔案列舉反例亦過，證明無 Git 的新檔中違規匯入與誇大用語仍能被掃出、私有檔與非來源目錄不掃、缺來源目錄不會默默通過。42 個腳本最後均通過；未重跑未受影響的 40 項與 E2E，runtime 沒有再改動，不重複 build。

新增的四個純測試檔變更：`tests/true-solar-time.test.mjs`、`tests/credibility-wording.test.cjs`、`tests/helpers/source-file-inventory.cjs`、`tests/source-file-inventory.test.cjs`。原失敗與最終重跑結果記入候選 JSON。逐項執行的是 hook 內相同腳本，不是執行 `git push` 或略過 gate；五項整站政策／來源限制仍照前述保留，不能把 42 個腳本通過寫成 62 項健康全過。

自有正式模式候選服務 8891 已停止；查核只剩原 8888 監聽，未停止或更動原服務。候選檔保留供復核。

## 正式發布與最小決策界線

現有 Vercel 專案 `heaven-earth-humanity-pair` 已連結；正式站 `https://heaven-earth-humanity-pair.vercel.app` 的 `/nine-grid` 回 200，`/api/western-life-code` 回 404。main 推送才會觸發既有正式發布；`ci.yml` 僅監聽 develop，不能代替 main 驗證。未新建專案、未改部署設定。

既有 pre-push hook 要求正式 build 及多項腳本，且另要求手動執行 `test:pre-push-e2e`。本輪沒有使用 SKIP_PUSH_GATE，也沒有執行 git push。

若業主選擇先發布本候選，所需最小例外必須明列：這一批 33 檔及兩筆既有提交、上述五項 origin/main 既有限制仍未通過、相同警告／不可用狀態保留、不得假核來源或修改來源守門。這是一次發布決策，不是永久降低健康標準。若不批准此限定例外，就需另行指定各凍結卡片的取法與來源核定範圍後處理，不能以目前一般批准自行推送。
