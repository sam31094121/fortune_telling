# 八項審查修復（2026-11-15）

起點main=019734b；保留既有共同培養及協作差異。使用者已解鎖八項，要求不改已核定素材、技術、玩法與命理公式，不以語意或放寬門檻假通過。

## 修改前根因與必要範圍
1. 來源覆蓋：八字.json reviewedOutputPolicy已明列11/03核定的lib/bazi-reviewed-output.ts；它只包裝核對／放行而無排盤公式，與既有治理工具bazi-traditional-gate同類。範圍tests/iching-source-gate.test.mjs，增加明確核定入口與依據斷言後分類；不改來源狀態或執行政策。
2. 分享：lib/install-shield.ts真實navigator.share送出不帶版本的首頁URL。只沿現有withShareVersion修復URL，追加實際share參數／取消／不支援回歸。
3. 圖片：80cf8bb刪除了舊adult-divine-v2 PNG；lib/nameology-number-reading.ts仍回傳該路徑。現行CatalogBeastCard與2026-10-24共用標準已採同宿beast_aXX的v2圖。範圍該後端引用與tests/nameology-grid-study.test.ts：同宿registry art.front，保留身份、五行、姓名公式與全部素材；不恢復舊設計或重畫。
4. 九宮格：tests/nine-grid-numbers.test.ts以固定換行找/3D而得到-1；實際app/page.tsx的/3D在/nine-grid之前，order15/16。改為解析Link開標籤並驗路徑、相對順序及原class，加入格式變動與錯順序反例；不改首頁。
5. 八字來源：七項未核／衝突須逐項查原證據，不能將核定使用當原典驗證。
6. 三核心：禁止清單三條仍未解；既有研究明言公曆取數與所引梅花原文不同，週次／節氣為hash。查實際呼叫與已有核定版本，不改公式、不停用冒充修復。
7. 太極：相對45b5671並忽略CRLF後，原有差異僅五處字重。施工期間另一筆提交c6bb9fd已恢復這五處原鎖定字重，本輪未再修改CSS；基準檔、hash、動畫、幾何及圖片完全不改。重新執行鎖定測試通過。
8. 神煞：既有技能明定本派59項referenceMethod維持PENDING_POOL；逐條原頁、取主／適用柱與獨立測例未齊。查既有素材及外部原典，不以另一派公式替換。

## 已完成及仍阻擋項目

第1、2、3、4、7項的獨立檢查已通過。九宮格另查明舊home-oracle-3d-emblem已由52aefcc等既有提交換為NineGridHomeArtwork；測試改驗現行scenery、foreground、artwork、title四層與young-16.v2.webp存在，並保留入口順序、原卡片類別、翻譯及數理斷言。沒有更改首頁設計。

第5項最新實跑18項仍11通過、7未通過；與11/03記錄同類缺口，不是本輪新增運算故障。逐筆檢閱現行來源登記：

| Claim | 尚缺證據／不能代替的事項 |
|---|---|
| C-BAZI-CLASSICS | 作者與版本層次有實際差異；三本書仍有不可追溯版本，不能以一般書目代替採用條文。 |
| C-BAZI-VALIDITY | 現有研究不證明八字預測效度；版本／引用權限待核，不能以傳統排盤測試替代。 |
| C-RED-LUAN-SHENSHA | 已核年支定位不覆蓋月份外推、外型與職業；本站詮釋沒有相應古籍條文。 |
| C-BAZI-FIVE-GODS | 原刊本與完整適用條件未齊，喜神選擇差異仍存在；保持既有公式。 |
| C-SHENSHA-RULE-INTEGRITY | 現有兩份自家取法文件可證明工程依據，不能充作三份獨立原典。 |
| C-ASURA-LIFE-STAGES | 約分歲數不是所引古文，統計／心理研究不能證明四柱對應應驗歲數。 |
| C-ASURA-GOLD-WORDING | 本站自撰句庫及草案待審，沒有第三方原典與真實審核簽認；不得虛造。 |

第6項最新實跑仍列MEIHUA_GREGORIAN_SUM、GROWTH_WEEK_HASH、SOLAR_TERM_HASH。重新讀取[《梅花易數》卷一〈年月日時起例〉](https://zh.wikisource.org/wiki/梅花易數/卷一#年月日時起例)：年以地支序數取值；現行castHexagramFromBirth直接拆入公曆年、月、日。現有calculateMeihuaTimeNumbers及原典算例未把生辰用途、年界、閏月規則接入全部呼叫端。因此無法同時保留原公式又宣告已符合該原典。週次與節氣字串映射亦仍未有相符來源。未改禁止清單、未停用服務冒充修好。

第8項最新三命例實跑deliveryOk=true、requestedScopeComplete=true、sourceVerified=false，59條待核。重新查閱[《三命通會》卷六〈拱祿拱貴〉](https://zh.wikisource.org/wiki/三命通會/卷六#拱禄拱贵)，其規則涉及虛拱及填實限制；現行lib/dual-chart-iching-shensha.ts的gonglu明載本派不採「四柱不見所拱之祿」條件。這是具體版本差異，不能把該原文貼上即核定整條本派規則。此次所閱為數位轉錄，亦未冒充已逐頁核實刊本。其他58條不能由此一條代為核定。

最小待補：對七項claim補齊其實際主張的可追溯版本、條文及真實審核；對59項本派規則逐條提供匹配本派條件的依據。若選擇改用另一取法，需另行明確指定該公式及範圍；本輪「保持公式」授權不足以自行更換。生辰取卦尤其需先確定版本、年界、閏月及生辰用途，而非再次籠統批准八項修復。

## 本輪回歸證據

- 正式npm run build退出0。
- install-shield編譯與實際函式呼叫：版本網址、取消、失敗、不支援瀏覽器皆通過。真實首頁盾牌按鈕另在模擬iPhone的Edge點擊，攔截OS分享參數確認版本；沒有對外分享，不宣稱實體iOS原生面板實測。
- 手機390與平板768的九宮格入口圖載入與首頁順序通過，保存截圖；首頁設計未修改。
- test:beast-cultivation通過：3600配對檢查、兩階融合、五張主卡保護、原子替換、400位精確數、失敗回滾、同操作重播、舊回應處理。
- 實際Supabase隔離帳戶測試通過：持久保存、競爭／去重、過期版本拒絕；兩遊戲真API的超大數勝利、獎勵單次結算與偽造授予拒絕通過。各測試帳戶已刪除。
- 本輪手機完整旅程通過：寶珠真手勢勝利，獎勵卡到卡牌戰入口融合；卡牌五張實際押注、首動作後重整精確接回、自動真勝利、重送不重發；獎勵反向到寶珠入口融合；平板寬度無橫向溢出，瀏覽器錯誤為零，隔離帳戶已清除。
- 44項固定推送測試逐項通過。執行器另外誤把shell變數字面量$E2E_TESTS當npm任務，該無效任務失敗不算成第45項產品測試，真實test:pre-push-e2e另行執行。

完整健康檢查原始結果60/64：三項來源阻擋，以及STAR_BEAST_SELF_ENTRY_API在45秒時失敗。後者獨立重跑test:star-beast-entry-api在約8秒通過，未修改程式；不能由單次重跑斷定併發逾時根因，也不把原始健康報告覆寫成61/64。test:pre-push-e2e另行退出0（真實Edge 38項，asura-live 4支）。

日誌與截圖已複製至[本輪證據](./eight-gate-repair-2026-11-15/)，health-full.json保留完整失敗結果；自動檢查更新的全域latest.json及release-summary時間戳已恢復本輪前HEAD，避免覆蓋原健康快照。最初UI腳本誤用未掛載HomeInstallCard的selector而逾時，改用實際InstallShield盾牌按鈕後通過，未改產品。

未以HTTP200或部分測試替原典健康門檻背書。仍有三項來源健康阻擋，因此本代理未提交或推送。既有來源／公式、主張核定、卡片素材與太極基準均未修改。
