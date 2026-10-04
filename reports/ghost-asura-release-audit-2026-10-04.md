# 新版鬼魅阿修羅：發布驗收（未通過、未發布）

日期：2026-10-04。這份報告接續同日 layout／stability 報告，不覆蓋先前階段的紀錄。

## 當次授權與範圍

- 任務為新版 `/ghost-asura` 整批穩定性驗收，全部必要檢查通過才提交、推送。
- 已核對來源語音聊天中的人類指示：「幫我全部驗完就提交」。用戶在得知舊雙命盤阿修羅元件型別阻塞後，同意以穩定為先處理該點。
- 此次舊檔例外僅限 `components/IchingShenShaAsuraSection.tsx` 必要相容修復。不是全面更改舊阿修羅、神煞公式、其他卡片或三核心的授權。
- 收尾時使用者再次明確指定：「神獸卡片先不用理，我們現在只針對阿修羅。」神獸元件沒有修改，沒有需撤回的新修補；以下相關方案僅留作阻塞紀錄，不繼續跨卡追修。
- 新版保持自己的固定稱號與話術來源；共用八字後端繼續使用，不另排四柱、不改來源狀態、不把新版接回舊映射。
- 歷史「特星神煞卡」訊息曾被誤作本輪工作方向，已更正。本輪僅重新讀取該接點及執行現有 API／顯示測試，沒有新增神煞取法、改卡片或修改後端；其結果不能代替新版驗收。

## 這輪修復

### 新版首頁入口的舊引用

`components/GhostAsuraHomeEntry.tsx` 原本仍從 `lib/asura-name-map.ts` 匯入。現改用新版 `features/ghost-asura/language.ts`，移除無效的重複存在判斷，保留已接受的範例「五陰纏影」、標題、目的地與版面。

`tests/ghost-asura-home-entry.test.cjs` 實際記錄模組載入：修前因載入舊名稱檔失敗，修後通過；不是只搜尋檔案字串。

### 已授權的舊元件相容例外

`components/IchingShenShaAsuraSection.tsx` 改為遵循真實 `DualChartResult.specialStars.asura` 契約：

- 保留可為 null 的 tone，不以自造窄型別取代後端型別。
- 每柱直接使用自己的 lines，不先攤平再按原名跨柱回填；同名多柱不重複或串錯話術。
- 不再讀取後端未提供的 id／matched／group.label；READY 的分組本來就是實際命中的內容。
- 陣法本文讀取真實 `narrative`，不讀不存在的 `content`。
- 不更動舊公式與 CSS；沒有 any、忽略型別、停用測試或改放行旗標。

新增 `tests/legacy-asura-view-contract.test.cjs`：獨立同名多柱反例修前失敗，修後通過；另使用兩組合成資料呼叫真實後端，核對每柱、每筆命中、陣法與輸入不變。這證明資料呈現契約，不證傳統取法正確性。

## 測試結果

| 檢查 | 結果／範圍 |
|---|---|
| `node tests/ghost-asura-stability.test.cjs` | 通過；版本／ID／柱位／来源保留、同資料穩定、300 個合成延伸、別名／排序／新增項隔離、新舊 runtime 隔離 |
| `node tests/ghost-asura-page-flow.test.cjs` | 通過；連按、取消、過期回覆、舊成功／錯誤／finally、鎖定、返回與卸載 |
| `node tests/ghost-asura-layout.test.cjs` | 通過；四欄順序、只顯真命中、同名多柱、印記折疊與局部橫移契約 |
| `node tests/ghost-asura-customer-copy.test.cjs` | 通過；前台阿修羅稱號／話術，原始資料不改，未知／不足提示保留 |
| `node tests/ghost-asura-home-entry.test.cjs` | 通過；首頁正式來源、標題／連結／範例不漂移 |
| `node tests/dual-chart-form-readiness.test.cjs` | 通過；新頁可選文案不影響既有呼叫者、未知時辰及子時限制 |
| `node tests/legacy-asura-view-contract.test.cjs` | 通過；獨立反例及兩組真後端合成資料，null tone／跨柱同名／陣法／不可变資料 |
| `npm run test:ghost-asura-wiring` | 本輪前段通過；65 個來源項及 220 個合成項 |
| `npm run test:ghost-asura-viewport` | 本輪前段通過；360／768／1440 資料契約，不是瀏覽器幾何驗證 |
| `npm run test:bazi` | 本輪前段 81 通過、0 失敗；未改原始核心 |
| 八字與紫微交叉檢查 | 104 通過；最後健康掃描亦通過此項 |
| `npm run test:iching-shensha-live-api` | 七組合成輸入、四種未知／缺時辰拒絕通過；真 API → 實際元件一致，不冒充瀏覽器驗收 |
| 局部 ESLint | 新版及例外舊元件通過 |
| `npx tsc --noEmit --pretty false` | 失敗：神獸首頁三個英文欄位缺失，另有獨立舊話術測試錯誤。原舊阿修羅元件型別錯誤已消失 |
| `npm run build` | 失敗：編譯成功後，在型別檢查卡於 `components/StarBeastHomeCard.tsx:81` 的 badge 缺失 |
| `npm run test:bazi-output-availability` | 失敗：`tests/dual-chart-iching-shensha-output.test.cjs:292` 的舊鬼魅 hook 斷言；不是已修的 asura 資料契約 |

正式建置寫入隔離 `.next-production`，未覆寫正在使用的 `.next`；沒有為規則失敗重啟服務或清除快取。

## 實際畫面

- 新版結果頁保留四欄、已選案例仍為年 3／月 4／日 4／時 6，共 17 種命中；這是測例結果，未寫成產品常數。
- 本輪重新讀取真實右側結果並截圖，17 個印記與 4 張補充卡仍預設收合。舊 dual-chart 頁面僅查看，沒有送出或更改原輸入。
- 先前同批手機 390px 與桌面幾何／展開操作證據沿用 stability 報告；本輪沒有冒称再次重做所有手機尺寸。
- 本機截圖：`.tmp/ghost-asura-layout-qa/release-home-2026-10-04.png`（首頁）、`release-final-2026-10-04.png`（新版四欄結果）。截圖未納入 Git，不包含出生表單。

## 最後整站健康掃描

紀錄：`reports/screen-health/latest.json`；UTC 2026-10-04 02:53:24.241–02:53:42.567（台北 10:53）。55 項中 45 通過，10 列為失敗：9 項執行失敗及 1 項未執行，未稱全過。首頁／就緒端點可用，沒有服務復原。

此次執行的是既有 monitor 的受限制診斷流程，**不是未經改動的完整 health:check**：臨時 `.tmp/asura-audit-ui-guard.mjs` 僅阻止內含原始 Chrome CDP 操作的 `test:ziwei-form-fill`，因本會話 UI 操作只允許經 cua_repl；該項明列 `NOT_EXECUTED_UI_CHECK` 並保持失敗，其餘命令原樣執行。未將跳過當通過。

| 未通過項 | 實際原因與界線 |
|---|---|
| BAZI_OUTPUT_CONSISTENCY | 舊鬼魅 hook 斷言；測試預期初始頁同時含鬼魅內容，但目前卡片依所選頁籤才顯示，須按真實狀態契約另外修測試／核對 UI，不能刪斷言 |
| BAZI_SERVICE_AVAILABILITY | 進階老師、五神、紅鸞仍受既有來源條件限制 |
| BAZI_SHENSHA_LIVE_FLOW | monitor 呼叫不存在的 `test:shensha-live-api`；正確 `test:iching-shensha-live-api` 已獨立執行通過，未改監測設定 |
| BAZI_SOURCE_REGISTRY_COMPLETE | 來源登記仍有 5 個未通過主張，未升狀態 |
| BAZI_FEATURE_COMPLETE | 10 個客戶功能中 7 可用；其餘不是新版呈現修復可解禁 |
| NO_FABRICATED_COUNTERS | 舊計數測試靜態字串斷言未過；尚未診斷實際計數，不能僅憑測試名稱指稱數字造假 |
| THREE_CORE_TRADITIONAL_DEFECTS | 6 個既有原典／取數問題未結案，不因工程測試通過而解除 |
| ZIWEI_FORM_FILL | 本轮未執行原始 CDP 腳本；需要受支援瀏覽器途徑實測，未聲稱正常 |
| HOME_TAIJI_LEVEL02_24_LOCK | 四個太極檔案與既定 hash 不符；未擅改檔案或刷新基準 |
| DUAL_CHART_SHENSHA_DISPLAY | 傳遞與支援範圍通過，但 59 個參考規則來源仍待核，整項保持失敗 |

## 來源限制與不能宣稱的事

實際來源契約有 65 項，6 項來源已登記核定、59 項參考待補。上列 17 種命中的測例為 3 項已登記核定、14 項參考；新轉譯保留這些差異。傳遞完整、guard PASSED 或正確重算不能替代原典核定，沒有「全部權威」「公權力認證」或永久不出錯的結論。

## 未執行的阻塞處理方案（本輪不擴大範圍）

1. `components/StarBeastHomeCard.tsx`：补上英文字典 badge／subtitle／time 三鍵，核對中英文 DOM。保留版面及神獸規則。
2. `tests/asura-wording.test.ts`：使用專案實際可執行的測試介面，修正第 122 行以未初始化的 cardContent 當路徑之錯誤；不得只加假全域宣告、略過檔案或刪測試。
3. 舊鬼魅測試與健康監測命令：按真實頁籤狀態測顯示，修正失效測試命令，不能以兩張卡同時呈現代替現行行為。
4. 計數／太極鎖定／三核心取法與來源核定是獨立問題；即使前述建置與測試接線修好，仍不能保證全站健康全過。不可借「全部驗完」擴為改算法、刷新基準或強制放行。

## Git 與全域技能

- 停在 main，已有未推送提交 `f5b6935692d3809833c3f495192f61a6e4f5f573`（四柱分組標籤修正）。本輪沒有新 commit／push。
- 其他既有工作與本批修改仍留在工作區；未全選 stage、未回退他人修改、未建立分支或 worktree。`lib/` 沒有本批 diff。
- 健康掃描帶出的無關神獸報告時間戳已復回原值，沒有動其內容或基準。
- 全域 `C:/Users/DRAGON/.codex/skills/ghost-asura-integrity/` 技能在 repo 之外，不冒稱已進 Git；副本交付與先前格式驗證見 stability 報告。
- 因建置與健康門檻未通過，依 AGENTS 規則不提交、不推送。按使用者最新限定，本輪在阿修羅範圍收尾，不再詢問或擴修神獸，不重複索取已存在的提交授權。
