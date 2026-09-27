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

## 特星神煞健康检查与审查（常驻）

每次修改特星神煞或四柱输出后，最终健康检查必须同时核对：

1. 来源登记 gate 与指定版本、页码、取主、查柱范围一致。
2. 八字基本测试、八字与紫微交叉测试通过，确认没有重排四柱。
3. 每项新规则具备独立 HIT、MISS、缺资料与错柱案例；测试总数及结果写入验收报告。
4. 后端 API 的 `byPillar`、`coverage` 与前端时／日／月／年四栏一致。
5. `BLOCKED_SOURCE`、`BLOCKED_VARIANT`、`BLOCKED_CORE`、资料不足与真正未命中必须分开，不得互相冒充。
6. 实际客户流程从填写资料到结果显示可用；手机宽度 ≤430px 不溢出，PDF／列印在整卡完成后验收。
7. 通过记录写入 `reports/dual-chart/shensha-source-ui-2026-09-26.md`；失败必须保留并阻止提交推送。
8. `DUAL_CHART_SHENSHA_DISPLAY` 是阻断式检查：必须使用真实后端命盘与规则闸门完成运算，经 API 回传 `byPillar`／`coverage`，前端只负责显示；本站既定规则集只要仍有 `BLOCKED_SOURCE`、`BLOCKED_VARIANT`、`BLOCKED_CORE`、`BLOCKED_DATA`，或后端命中没有完整显示到对应柱位，就连后端健康状态也不得通过，不能以警告放行。照片或其他体系中未纳入本站规则集的名称只作参考，不列入运行时 coverage，也不为了凑数另造算法。

9. 既定支援範圍須有獨立固定清單；即使後端與前端一起漏掉同一項，健康檢查也必須失敗，不能藉縮小 coverage 通過。缺少算法不等於未命中；「既有結果完整送達」與「全部需求實作完成」分別回報，前者不能替後者背書。

10. 2026-09-27 使用者再次明確範圍：照片只作參考，本次僅將現有八字系統的神煞結果延伸至這張卡，不增補照片項目、不變更四柱／其他卡片／既有取法。當前獨立基準為八項；不可把此範圍驗收宣稱成所有傳統神煞皆已實作。逐柱檢查須從 `specialStars.raw` 對上同源 core／professionalChart，再對 `byPillar`、coverage 命中柱位及前端可見名稱做精確核對；只有字串包含不算通過，漏項、額外項、重複、錯柱、資料副本不一致及截斷欄位都必須失敗。

## 技能
見 Grok Bot 技能「右側螢幕連結健康檢查」。

### 特星神煞客戶結果卡（2026-09-27）

後續更新：使用者再授權補充缺項，並要求優先提供獨立可調整卡片。隔角已採《神峰通考》1929本新增，既有公式不變；傳遞基準由八項擴至九項。新增需求仍有11項未完成，`check:dual-chart-shensha-display` 分別回報 `deliveryOk` 與 `requestedScopeComplete`，後者為false時整卡健康不得通過。使用者可以先在本機查看已算結果，不以整批缺項阻止卡片顯示；不完整狀態仍禁止自動發布。

獨立卡已移出橫向紙本容器、放在八字報表下方，年／月／日／時全展開。以下較早「隔角未實作」及手機位置問題以最新報告為準，不能當成永久現況。

- 只填一份共用出生資料、送出一次，即須自動顯示四柱結果；不可要求額外展開、再次填寫或另按神煞計算。
- 螢幕卡依年／月／日／時逐柱與後端精確一致，不折疊、不在卡下重複列判定名單；後端固定 coverage、來源與命中狀態健康檢查仍保留。原紙本表格維持時／日／月／年。
- 傳遞通過不能代表客戶指出的缺項已完成：外桃花、天德合、隔角尚未實作，桃花與照片結果另有取法差異；這些未釐清前，不得將本卡宣稱完整通過或自動發布。
- 缺資料／受限不能顯示成無命中；不得為去重移除不同柱各自真實命中的同名神煞。
- 原表格與新增卡的SSR驗證通過，只算傳遞通過；仍須獨立合成資料實測填表到結果、320／375／390／430px可見性，以及列印預覽返回。實際PDF與實體列印未測則明列未測，不藉HTTP或單元測試通過背書。


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

## 2026-09-15 戰場體驗五項（慵懶連擊／斷層）
1. 卡預覽空白：preview min-height + front 失敗回退 thumbnail（BeastLegacyGame CardFaceImg）。
2. 連續引導：prepareStep 預設 mode（簡單／中等／困難）；選卡短狀態；免費模式拿掉押注牆。
3. 載入逾時：讀卡失敗可「重新載入」。
4. 揭牌預設自動連揭（可切手動）。
5. 換卡可發現性：sideSwap 金標＋底欄既有換卡。
本機 BattlePace 慵懶連擊（chooseAI）一併保留。
