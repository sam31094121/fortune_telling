# 易經神煞逐流年顯示驗收（2026-11-24）

## 最新更正：需求未完成，等待照片核對

外部查證已獲新授權並執行，具體來源、順逆與取主差異記入 `docs/技能戰鬥檔案/八字/年度單一神煞來源查核.md`。它是候選研究，不是核定規則。原掃描下載受429限制，沒有宣稱讀過；產品未接入不明取法。既有兩項基準測試失敗繼續阻擋發布。

### 新增本地歷史／副本／封存查核

- 本地 Git 非 shallow；對所有本地 refs 的八字、易經神煞技能與 bazi/shensha/flow-year 相關路徑搜尋小耗、歲前／岁前、十二太歲／太岁、年度神煞、年神等差異，並查看刪除／改名路徑。沒有定位到完整年度單值表；不是宣稱歷史中絕對不存在。
- `git log --follow lib/iching-shensha-flow-year.ts` 追至 `878fdc7`：原始實作即多項觸動＋歲神落本命各柱；`db2c04f` 是改稱「這一年遇到」及顆數／名稱整理；`3b19d01` 為神煞易經／易經神煞命名變更。未發現這條鏈曾有照片所需單值欄位。
- 個人 `C:/Users/DRAGON/.codex/skills/shensha-rule-integrity` 的參考命盤取法與專案維護版 SHA256 同為 `1F65B99491C5E747D6F0BB2BEF9EBC1FCF07A4190F44AF36E250B1A57E748C3D`；dual-chart-card 技能的十二神指紫微 iztro 宮位分組，不是本卡流年單值規則。
- 相關封存 `.tmp/shensha-delivery`、`.tmp/dual-chart-ui-qa` 的文字／合成資料，以及神煞異君技能與易經神煞原文參考已搜尋。命中的小耗屬紫微 boshi／suiqian，不能跨系統搬用；神煞異君明列共用原神煞鏈，未提供獨立年度表。未掃描無關客戶收藏、計數器備份或密鑰。
- 新途徑仍未找到可證已核定的完整規則，停止無限擴搜。缺口仍為取主、完整位序與方向、適用年界及權威關聯；需求與布局已清楚，不需再確認或重拍照片。未更改產品、未提交／推送。

### 依業主指示補查八字技能來源

### 本地影像補查（全程無網路搜尋／下載）

- 八字原典影像共 10 張：9 張規則頁、1 張版權頁。已逐張目視閱讀規則頁，字跡可辨：命理探原卷上 63（天乙續文／文昌）、64（文昌／華蓋／將星）、65（將星／驛馬）、71（天羅地網續文／咸池）；三命通會 PDF134–135（將星華蓋／咸池）、147（金輿／驛馬）、154–155（天乙）。未見需求所指完整年度單值表。
- 進一步發現既有本地 PDF：`.tmp/shensha-source-20261103/sanming1926.pdf`、`harvard-v6.pdf`，以及 `.tmp/bazi-source/ziping-1926.pdf`、`ditiansui-1947.pdf`；不是本輪下載。Harvard 檔依既有候選腳本是三命通會卷六日德／魁罡來源；另兩份為子平／滴天髓資料，不能僅因同屬命理就當成年度十二神依據。
- 依三命通會本地總目 PDF11–12 定位卷二小運、太歲、總論歲運，實際閱讀 PDF119–123（印頁41–45）：內容為小運起法、太歲與干支歲運關係，沒有該十二名稱單值表或其起算規則。PDF124 已進入十干合，確認章節邊界；不把「太歲」同名當作命中需求。
- 工具環境沒有 pdftotext，已直接渲染並看原圖，未把 OCR 失敗當成全文無資料。渲染頁留在 `.tmp/sanming-index-*.png`、`.tmp/sanming-local-*.png`。
- 目前缺的具體定位是「每年唯一年度神煞」那份本地技能檔名或其來源頁碼，而非客戶出生資料或布局需求。現有已讀章節不足以直接接線；未逐頁盲掃全部 PDF，也未另造規則。

已列舉並搜尋 `docs/技能戰鬥檔案/八字/` 全部文字檔，詳細核對 `八字.json`、`來源登記.json`、`神煞逐條對照.md`、修復紀錄、維護技能的 `source-index.json`、`project-map.md`、`參考命盤取法.md`、`特星神煞擴充.md`，並追到 `易經神煞/易經神煞.json`、`常用神煞對照.md` 及 `lib/bazi/engine.ts`。

- `八字.json` 定義唯一四柱引擎與大運等輸出，未登記每年唯一神煞表。
- 來源登記的 `S-SITE-SHENSHA-REFERENCE` 指向本命取法表；`S-SITE-SHENSHA-EXTENSION` 指向特星擴充紀錄。這些不是照片單值年度欄位的完整規則。
- `lib/bazi/engine.ts` 的 annualLuck 只有 year、ganZhi、stemTenGod、branch，無單值年度神煞。
- 搜尋專案 docs／lib／.codex 的「小耗」與十二歲神等詞，只見另屬紫微的星曜文本，未發現可直接沿用的八字單值規則。原典影像未逐頁人工釋讀，不能聲稱所有影像都沒有。
- 具體缺口是：年度單值究竟以哪個本命欄位起算、完整十二項名稱與位序、順逆方向、年界適用及可追溯的已核定規則登記。現有多項歲神的部分位數不能代替完整規則；照片不能作公式來源。未新增猜測程式。

照片已檢視：只用來辨識每個年份／干支下方單一「神煞」格，不收錄圖片、個資、年份答案或黃金測例。照片文字是「歲破」，不是口述的「破碎」。查核既有 `docs/技能戰鬥檔案/易經神煞/易經神煞.json` 與 `常用神煞對照.md`：原特星範圍明列太陽、太陰、福德未做；未找到照片所指每年單一值的完整權威取法及後端欄位。此記錄不推翻既有定案，也不從照片推導循環。

已撤回本輪錯加的 15 年 `touched` 清單、`annual.shenSha` 後端擴充、其專用回歸斷言與 A4 擴欄／壓縮樣式；`lib/dual-chart.ts` 與 recalculation 測試已回到 HEAD，原今年／明年分析保留。剩餘產品差異僅圓圖隱藏與本命干支元素小標。撤回後型別檢查與 diff check 通過；先前含錯清單的畫面與 PDF 僅為歷史證據，不是目前版或正確交付。

後續最小範圍：先核定該單值年度神煞的取主、名稱表、方向／年界及權威來源，再決定本卡後端逐年欄位與前端／列印的一格顯示。尚未核定前不新增公式、不選陣列第一項、不提交推送。

業主否決多項特星清單畫面。需求是每個年份／干支下方僅一個年度神煞名稱（口述例：五鬼、小耗、破碎），不是本輪接入的 `touched` 多項清單。本報告下列測試只證實錯誤理解下的工程行為，不能代表需求驗收通過。未提交、未推送；停止新增實作，保留已認可的圓圖移除、五行比例與本命元素標示，待照片對照後再確定欄位與取法。

唯讀發現：既有 `FlowYearShenSha.suiShen`／`ShenShaFlowYear.suiShen` 是流年歲神落入本命各柱的多項陣列，並非每年唯一名稱；目前表列太歲、喪門、五鬼、龍德、白虎、披麻、天狗、病符，沒有小耗或破碎。來源為本站既有太極紫微易經派登記，原典頁碼待補；不能自行拿此陣列第一項代替需求。其他紫微資料雖有同名星，不表示可搬用到本卡。尚未確認與業主照片相符的年度單值欄位及權威取法。

## 範圍與結果

- 基準 main：`8ea4abc6d3a6538af64847dfb5d286902bbb45dd`；未建立分支或 worktree。未提交、未推送、未驗證正式部署。
- 只隱藏本卡五行圓圖及其占位；五項比例、黑白圖例、摘要與原分析保留。ElementRing 預設行為不變，零尺寸 SVG 僅保留圖例使用的 pattern 定義。
- 原 15 年流年格各增加該年神煞。後端逐年呼叫既有 buildFlowYearShenSha / buildShenShaFlow；不改公式、來源政策或本命神煞判定。下方既有今年／明年分析仍取相同兩年資料。
- 最終依業主澄清撤回新增的流年天干／地支五行標籤與相關後端欄位；流年保留原干支、十神，只新增神煞。本命四柱旁已認可的元素小標保留，直接取後端 core.pillars 的既有欄位。
- 沒有新增或重複掛載本命「特星神煞」區塊；四柱主表的既有神煞列、下方既有神煞易經分析保留。前後依據見 `.tmp/ring-only-removal-20261124/bazi-color.png` 與本輪 PDF 圖片。
- 本卡螢幕／列印局部間距與 A4 左右欄配置調整；其他卡片不變。既有流年來源待補頁碼提示保留，不能解讀為來源全部核實。

## 實際操作與證據

- 先前 localhost:8888 拒絕連線時依健康技能啟動既有 Next dev 服務，未清快取。首頁、`/internal/health/ready`、`/dual-chart` 可用；本輪結束保持運行。
- 曾在使用者 Chrome 已解鎖頁實填合成案例並送出得到結果，未重新輸入密碼。最後修改後的證據來自隔離 Edge 瀏覽器，不冒充使用者同一頁已更新。
- 合成測例包括午時女性的密集神煞案例與酉時男性長姓名案例；不使用客戶資料、不寫收藏或成長中心、不發獎。
- `.tmp/annual-shensha-20261124/annual-detail.png`：最終流年局部，無額外流年元素標籤；保留五行比例／摘要。
- 同目錄 `screen-{320,375,390,430,768,1200}.png`：模擬尺寸畫面；`bazi-color.png`、`bazi-mono.png`：實際下載 PDF 渲染，已目視確認無圓圖、五行數值與逐年神煞保留、無內容裁切。
- 該目錄及 `.tmp/annual-shensha-standard-20261124/` 各有八字／紫微 × 彩色／黑白 × 瀏覽器列印／實際下載，共 16 份 PDF。密集案例 8 份經 pdfinfo 確認各一頁 A4；兩組瀏覽器均驗證內容落於紙張範圍。既有 print-fit 密集案例縮放約 2%，標準案例原 A4 大小。

## 通過項目（各自範圍，非全功能保證）

- `npm run health:check`：2026-11-24 08:46:18–08:48:08 UTC，68/68 檢查通過，warnings 0、flaky 0；其中 18 個卡片入口路由通過。不能稱為 68 張卡全流程通過。
- 健康檢查含真的 Chrome 390px 紫微逐鍵輸入／焦點／改日期／送出測試，以及神獸 fairness、本人入口 API、drop-render-stability、match3-replay、layout-stability。神獸使用 320／390／768／1440px 模擬尺寸；非實體手機／平板／筆電或長時間實玩驗收。
- `npx tsc --noEmit --pretty false`、`git diff --check` 通過。
- `node tests/dual-chart-recalculation-stability.test.cjs`：8 組後端重算一致，含 15 年逐年資料綁定、原兩年分析一致、獨立期望流年神煞。
- request-lifecycle、touch-scroll、pdf-export、iching-shensha-output、ring 五份 node test：13/13 通過。
- `npm run test:bazi` 81 項、`test:bazi-contract` 31 項、`test:bazi-ziwei-cross` 111 項、`test:bazi-traditional-gate` 通過。
- `node --env-file=.env.local tests/iching-shensha-live-api.test.mjs`：7 個合成實際 API 案例及 4 個未知時辰案例通過；未知時辰不補值。
- `tests/dual-chart-single-print.e2e.cjs`：密集／長姓名兩組，6 種螢幕尺寸、15 個流年格、五項圖例、摘要、無橫向溢出，八字／紫微彩色黑白實際下載通過。使用本機既有 Playwright 1.65.1；舊 1.47 曾在完成下載後關閉瀏覽器時 TargetClosedError，未當成應用程式回歸。
- 既有 element-switch 流程以 `.tmp/annual-element-switch.cjs` 執行 5 輪換人／返回／國農曆等值，畫面與列印摘要通過；只將過期 placeholder 定位改為目前具名日期欄位，未更改產品。此檢查不是逐年神煞的獨立算法證明。

## 發布阻擋與限制

下列完整測試於本輪程式與修改前 HEAD 的 lib/dual-chart.ts 均同樣失敗。基準比對僅將 HEAD 版本 transpile 至 `.tmp/dual-chart-full-review/lib/dual-chart.js`，未覆蓋工作目錄、未建立 worktree。依 AGENTS 提交門檻不略過、不修範圍外規則。

1. `tests/dual-chart.test.ts`：編譯後第 16 行，預期 false、實際 true 的存取設定測試失敗。
2. `tests/dual-chart-iching-shensha-extension.test.ts`：編譯後第 696 行，預期本命卦「地澤臨」、實際「天火同人」（神煞 17 項、合看 3 組相同）。未改起卦或測試期望來取得綠燈。

尚未實測實體手機、平板與紙張印表機；正式站未發布／驗證。完整測試失敗仍待另行釐清範圍，不能以健康檢查綠燈宣稱全功能全通過。

## 檔案歸屬

本輪：`app/dual-chart/{BaziChart.tsx,ElementRing.tsx,dual-chart.module.css}`、`lib/dual-chart.ts`、`tests/dual-chart-{recalculation-stability.test.cjs,single-print.e2e.cjs}`、本報告與健康檢查索引追加。

既有修改保留：`reports/beast-production/release-summary.json`、`reports/screen-health/latest.json`；後者本輪健康檢查再次更新。未將它們納入本輪提交。`.tmp` 截圖、PDF、編譯輸出及合成測試 session 為本機驗收產物，不提交、不公開 session。

## 最新限定施工稽核：僅十五格年度單值

依業主最新規範，不新增專案檔案、不啟動全站健康或發布。此次僅更新本既有紀錄，沒有改產品程式。

必要產品檔案範圍（規則完整後才修改）：lib/dual-chart-iching-shensha.ts（原檔年度單值邏輯）、lib/dual-chart.ts（既有annual資料接線）、app/dual-chart/BaziChart.tsx（原3×5格顯示）、app/dual-chart/dual-chart.module.css（僅必要原樣式）。不新增模組、表檔、套件、測試檔或版型。

實際稽核：calculateDualChart原annual有year/age/ganzhi/stemGod/branchGod，無annualShenSha。buildFlowYearShenSha的suiShen按流年支順布到本命四柱，原表八位；buildShenShaFlow檔頭明載2026-09-28本派取法為查落在哪一柱，並非年度唯一神煞。現行只對annual前兩年呼叫。來源登記S-SITE-SHENSHA-EXTENSION的十項流年追蹤敘述不構成完整十二位單值取主規則。BaziChart原3組各5年reverse顯示，原年份順序保持。

不能合法直接接上的缺口：本命取主未核定（年支或命宮不能自選）；現有歲神表缺太陽/太陰/小耗/歲破四位，第10位為披麻而非新欄所需福德。既有多筆函式不改、不取首筆、不複製本命清單。外部研究的同位名稱證據不能替代本卡取主的定案。

本項狀態未完成。十五年逐年正確性、此次手機及列印新增欄位驗收未執行，因尚無經驗證單值可顯示；未把先前圓圖或舊清單驗收當作本項通過。所有先前檔案及既有他人變更保留。
