# 鬼魅阿修羅本機預覽驗收 — 2026-10-04

## 本次範圍

主體為 `/ghost-asura` 的顯示、資料填寫體驗和本頁文字映射；使用者後續另授權首頁對應單一入口改名、美化與對齊。不修改八字、紫微、神煞取法及其他卡片。
依使用者最後要求，先本機調整供檢視，**不提交、不推送、不發布**。
既有工作區另有雙命盤未提交修改與一筆未推送提交，均保留，不納入本頁完成宣稱。

## 已完成

- 年、月、日、時四欄共用格線，柱頭和命中印記逐柱對齊。手機僅卡內左右滑動。
- 柱頭列出該柱第一個實際命中稱號及小字数量，不代表強弱排名；真實多柱命中仍重複列於對應柱。
- 本頁不展示原始干支，資料本身和柱位不變。列表只顯示命中項，點名稱以原生 details 展開。
- 兩句原標語、實際統計與統計說明移至四欄列表下方、橫向捲動區之外；不寫死 65/17/48/0。
- 新增本頁 CSS 模組，墨黑、暗紅、暖金統一表單與結果。輸入框取消藍光、送出鈕取消閃爍；選中與焦點仍清楚。
- 維持 44px 以上印記點擊高度，展開文字增加行距；下方組合與戰局保持內容、統一邊界和層次。
- 四個本頁直白名稱：蛻變新生、魅力引力、界外吸引、逆風破局。敘事、組合及戰局用同一映射；原始規則名、編號、命中、柱位、批次均不改。
- 保留原命名版本以免影響其他穩定延伸名稱；本頁文案另有版本。
- 修改表單實際值即清除舊結果；無變動輸入不清除。送出期間鎖定欄位，避免舊請求配新輸入。
- 表單只填一次，沒有額外神煞表單；本頁文字使用選用參數，其他共用表單預設不變。
- 保留未知／未確認／失敗狀態，未拿說明文字或假項目填滿。解讀為文化象徵與自我反思，不做心理診斷或必然預言。
- 追加：下方每張補充卡預設收合，點標題展開、再點或按 Space 收合，獨有內容全保留。1974-06-28 男命酉時實際四張為「德星化煞」「魅力匯聚」「外來的風浪」「命魂戰局」；其他資料的張數仍隨實際組合變化，不硬補四張。
- 追加：首頁真正使用的是 `GhostAsuraHomeEntry`，只將此入口主標改為「鬼魅阿修羅」，單一 Link 仍連 `/ghost-asura`，局部 CSS 對齊上下卡片；未更動未使用舊元件或全域樣式。

## 實際瀏覽器檢查

使用本機正常登入、真實 `/api/dual-chart` 流程和測試資料；不以固定假卡代替回傳。

- 測試資料：1990-02-09、男性、卯時。年/月/日/時分布 5/2/6/3，15 種命中、16 個顯示位置；其他為 50 種未命中、0 待校核。
- 更換日期／時辰能產生不同結果；例如 1990-01-01 卯時為 3/4/5/5，1990-02-07 卯時為 0/4/7/6。空年柱保留位置。
- 最終 320、375、390、430、768、1200px：四欄對齊、順序正確、44px 點擊高度、名稱未裁切、全頁無橫向溢出；前五寬度卡內可橫向捲動。
- 最終標語統計皆在列表下方，手機滑到時柱也不會把標語統計帶出螢幕。
- 點擊展開、Enter 展開、Space 收合均可用。測試頁重新載入後出生欄位及結果清空，重新填入後正確產生新版。
- 未知時辰、未選子時跨日段、缺出生日期不產生假結果；可修正後重試。
- 正常登入逾時恢復已驗證，未變更登入驗證設定或繞過存取。
- 最終表單輸入框實際樣式為 16px 字、深墨底、無外光暈；時辰卡選中與未選中背景和框線不同。
- 1974-06-28 男命酉時仍為 65/17/48/0；四張補充卡逐張開啟可讀、Space 收合通過，上方四柱與統計不受影響。

## 程式檢查

通過：

- `node tests/ghost-asura-layout.test.cjs`
- `node tests/ghost-asura-customer-copy.test.cjs`
- `node tests/ghost-asura-page-flow.test.cjs`
- `node tests/ghost-asura-home-entry.test.cjs`
- `node tests/dual-chart-form-readiness.test.cjs`
- `npm run test:ghost-asura-wiring`（含 220 筆不截斷、65 項映射、編號／柱位／批次完整性）
- `npm run test:ghost-asura-viewport`（資料一致性，非瀏覽器幾何測量；幾何另實測）
- `npm run test:bazi`：81/0
- `npm run test:bazi-ziwei-cross`：104/0
- `git diff --check`

未通過／限制：

- 整站正式建置已編譯，但型別檢查在既有 `components/IchingShenShaAsuraSection.tsx:144` 失敗；不是整站建置通過。
- 全站型別檢查另有該元件、`StarBeastHomeCard.tsx`、`tests/asura-wording.test.ts` 的既有錯誤。本頁範圍外，未擅自修改。
- `dual-chart-iching-shensha-output.test.cjs` 前十項通過，之後在其他雙命盤鬼魅卡「完整內容折疊」舊斷言失敗；未為本頁美化改另一張卡。
- 未重新跑跨全站 `health:check`，不宣稱所有卡片健康或傳統取法已全面認證。
- 使用者要求先預覽，且全站檢查尚有阻礙，本輪無 Git 提交／推送。

## 實景檔案

位於 `C:/Users/DRAGON/Desktop/命理/.tmp/ghost-asura-layout-qa/`：

- `desktop-final-2026-10-04.jpg`：新版四柱與印記。
- `desktop-footer-final-2026-10-04.jpg`：下移標語、實際統計、下方卡片對齊。
- `desktop-form-final-2026-10-04.jpg`：本頁表單。
- `mobile-open-final-2026-10-04.jpg`：手機名稱點開閱讀。
- `mobile-right-final-2026-10-04.jpg`：手機移至後方柱位。
- `mobile-footer-final-2026-10-04.jpg`：手機標語統計與下方卡片。
- `mobile-form-final-2026-10-04.jpg`：手機時辰選擇。

## 追加：17 項與日／時柱查核

依使用者最新要求，先核對資料與取法，不繼續加強解讀話術。本次沒有改任何後端公式或輸入資料。

- 現有 calculateDualChart 實算後沿 coverage → adapter → registry → 實際元件核對完整 ID：年3／月4／日4／時6，17種唯一命中，無漏映射、額外項目、錯柱或過度去重。
- 使用者提供的日柱清單逐項相同：tiangou → 噬天之影、zaisha → 劫境之門、yuepo → 碎月之痕、jiangxing → 鎮軍之魂。原名不加入客戶頁。
- 時柱為 longde / liue / yuanchen / yangren / taohua / waiTaohua，對應天龍護命／六劫之關／幽辰之障／血刃之鋒／魅力引力／界外吸引。
- 1200px 四欄柱頭與列表 x／width 完全相同；390px 後兩柱維持卡內橫移。核對頁保留17項，其他輸入測試頁另行關閉。
- `tests/ghost-asura-layout.test.cjs` 增加同筆後端→元件回歸；這是傳遞測試，不是獨立取法驗證。

**來源限制：** 17項內僅 yima / yuanchen / yangren 在既有來源登記為 VERIFIED；其餘14項為 PENDING_POOL + referenceMethod，日柱4項全屬參考取法。既有 reference() 在 coreReady 時允許輸出；adapter「待校核0」按 MATCHED/NOT_MATCHED 分類，不代表原典待補為0。guard PASSED 不證正統。

實際版本為 DUAL_SHENSHA_REFERENCE_CHART_V4 / REFERENCE_CHART_1974_V1，與個人技能所寫袁本單一版本存在既有差異；元辰另引用《太黅》卷六。本輪只記錄，不覆寫核心、改來源狀態、刪結果或降低門檻。既有原頁未於本次重新逐頁核讀，不宣稱新增原典核定。

## 追加：品牌書法與首頁

- 首頁與內頁主標題共用 AsuraBrandTitle.module.css，本站提供 Yuji Boku 五字 WOFF2（4288 bytes），附來源與 SIL OFL 1.1；內文、表單字體不變。
- 志莽行書缺繁體「羅」，已排除；最終字體 cmap 五字皆有 glyph，沒有用簡體替代。
- 字體網址實測200 / font/woff2，瀏覽器 pageAssets 已列出本機字體資源。
- 320px首頁標題寬158.25px、可用176px；內頁221.55px、可用273px，無全頁橫溢。390及1200px亦檢查。首頁入口點擊仍到 /ghost-asura。
- 新實景：home-brush-mobile-2026-10-04.jpg、page-brush-mobile-2026-10-04.jpg、reference-17-final-2026-10-04.jpg、supplements-mobile-final-2026-10-04.jpg。
- 保留本機預覽，不提交／推送；整站型別／正式建置原有失敗並未解除。
