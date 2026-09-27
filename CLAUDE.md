# CLAUDE.md

使用者說「幫我開啟8888」時，執行：

1. 確認 http://localhost:8888 有沒有被占用
2. 沒有占用 → 直接開啟；有占用 → 先清除，再開啟
3. 同時開啟：Google Chrome，以及 Claude Code 內建瀏覽器（Browser pane）
4. 確認網頁有沒有正常運行（畫面正常渲染、無錯誤），沒有的話要處理到正常為止


## 口令：「三合一」

使用者說「三合一」＝**八字命盤、紫微斗數、易經卜卦**三核心一起查。
收到即依 `docs/three-core-cross-validation-skill.md` 〈六、三合一執行程序〉執行：
跑 `npm run test:three-core` → 同一組生辰實跑三層逐項核對 → 三大核心對照 → 附實測值回報。
**不得只報結論不附數據。**

### 三合一整合層（缺一不可）

完整結果 = 八字完成 && 紫微完成 && 易經完成 && 八字紫微四柱核對通過。
四項缺一，完整結果禁止成立。入口 `lib/three-in-one.ts` 的 `runThreeInOne()`。

八字與紫微的年、月、日、時四柱必須**逐字完全一致**——不是相近、不是三柱、不容錯。
對不上就停在核對關：不顯示紫微、不進入易經、不成立三合一，
並把哪一柱不同、兩邊各是什麼原封不動報出去。

**禁止自動把其中一套改成另一套**——那是把「抓錯」變成「藏錯」。

守門：`npm run test:three-in-one`（70 項）、健檢第 21 項。

## 口令：「神獸卡遊戲」／「戰鬥卡片」／「卡片對打」

**神獸卡的一切只有一份檔案：`docs/beast-game-skill.md`（十八章）。**
規則、卡片正統規格、戰鬥演出、本體聲音、卡圖生產規格、交付清單、公平性實測
全部在裡面。**不得再開第二份神獸卡文件，也不得建立第二套遊戲核心。**

沿用 `lib/beast-game/` 的 BeastCardGameCore。新內容只能補入
Card Registry（`cards/beasts/`）、Skill Registry（`cards/skills/`）、
Effect Registry、Game Mode——加卡加技能都不必改引擎。

每新增一張卡必須通過 `npm run test:beast-game`：
id 唯一、圖片存在、元素合法、數值合法、技能存在、平衡在預算帶內。
不合格就進不了正式牌庫（registry 真的會擋下，不是印警告）。

卡片一律走正統規格 63×88mm（`components/BeastCardFrame.module.css` 是唯一來源），
守門 `npm run test:beast-card-spec`。

**對手目前只有電腦。真人對戰尚未開放**——畫面上不得出現「線上對戰」
之類的字眼，也不得用電腦冒充真人。要做之前先看技能檔案〈六〉。

### 戰鬥演出（技能檔案〈八〉）

**動畫不得決定戰鬥結果**（規格第十二條）：後端已經把整場算完，
演出層只決定什麼時候把哪一段揭給你看。快轉、自動翻、重播，結果一樣。
守門 `npm run test:beast-ritual`——它會擋住演出層匯入任何
會決定結果的函式，也會擋 `Math.random`。

揭牌**預設手動**、一張一張交替翻（我一張、對方一張），
按「➤ 自動翻牌」才切自動。神獸本體立繪在
`public/beast-game/spirit/`（二十八成獸＋二十八幼子），
新增卡片要跑 `gen-beast-spirits.mjs` 補本體，
並以 `npm run check:beast-spirits` 確認去背成功——去背失敗會變成
一塊白方塊衝過去，這種事不能靠肉眼看。


## 口令：「易經」

**說「易經」＝打開 `docs/技能戰鬥檔案/易經/`**（業主定案 2026-09-15：易經就是這個技能檔案），**並一併帶出八字、紫微斗數，融會貫通**（2026-09-16 業主定案：八字、紫微、易經融會貫通，列為技能檔案，口令《易經》）。

- **口令《易經》先後順序（業主批准，不可顛倒）：① 填寫資料 → 八字命盤 → ② 紫微斗數命盤 → ③ 易經心理學、洋蔥心理學、權威心理學大數據**
- 公信力話術（大數據・公信力・權威性）：`docs/技能戰鬥檔案/易經/公信力話術.md`——**後端運算、交叉比對**（`lib/credibility-wording.ts` 用來源閘門重算狀態組句，`GET /api/credibility`）；**前端只負責視覺感官**（照印＋WCAG／老年視覺／Fitts／完形等視覺心理學規則）；只有 VERIFIED 能說「已通過交叉比對」，前端不得寫「大數據將…」「判定準確度」等誇大句，守門 `npm run test:credibility-wording`（推送閘內）
- 融會貫通總覽：`docs/技能戰鬥檔案/易經/三核心融會貫通.md`（三層資料線、貫通點、來源總表、公信力三分法、守門一覽）
- 三個技能資料夾：`docs/技能戰鬥檔案/八字/`（第一層核心）、`docs/技能戰鬥檔案/紫微斗數/`（第二層）、`docs/技能戰鬥檔案/易經/`（第三層＋易經洋蔥心理學＋神獸卡對手智能）；三份來源登記共用同一個閘門

- 全球權威來源與大數據總覽：`易經/來源治理.md`〈八〉（易經原典書目、APA／PubMed／PMC／OSF 心理學大數據、心理學證據上限）；紫微斗數見 `紫微斗數/新人檔案.md`〈三〉〈四〉。

**鐵律：凡有「易經」兩個字，都要有交叉比對的來源、權威性的檔案、大數據的來源**——易經洋蔥心理學一樣列入。

- `來源治理.md`：五級來源閘門（A 原典／研究圖書館書目、B 大學出版與學術、C 公開數位文本、D 以下只進候選區）、SOURCE_PERMISSION_GATE 必填欄位、三方交叉（VERIFIED／CONFLICT）、通過標準（授權 PASS、可信度 ≥ 90、交叉 ≥ 3、原典 ≥ 1、版本可追溯、重大衝突 0）；沒過只能放「待驗證資料池」，不得學進《易經》核心。公開網站不等於可以大量抓資料。
- `來源登記.json`：全站每個掛「易經」的功能都要登記；狀態由 `lib/iching-source-gate.ts` 算，不得手填 VERIFIED；外部條款未經人工確認一律「待查核」。
- `易經.json`＋`新人檔案.md`：神獸卡對手智能正式檔與導讀；制度章在 `docs/beast-game-skill.md`〈二十四〉（遵守「神獸卡只有一份制度檔、不得第二套核心」）。
- 程式：`lib/beast-game/interactive.ts`（`chooseAI` 三級、首領反制、`bossNotice`）、`lib/beast-game/series.ts`（`chooseSeriesOpponent`）、`lib/beast-game/iching-skill-archive.ts`（讀 `易經.json`，網頁與伺服器共用，不得用 node:fs）、`lib/iching-source-gate.ts`
- 對手鐵律：只變聰明、不改數值；不偷看玩家決策、陣容與種子；不假裝真人；首領反制先預告、畫面看得到。
- **後端運算、前端只顯示（米其林分工）：後端負責品質穩定與服務——技能、易經判斷、勝負、押注結算、來源治理全部在後端算完再送出；前端負責視覺感官與價值——把結果與有權威來源的易經洋蔥心理學好好呈現，不做任何運算。**
  - 困難戰場運算在 `app/api/beast-game/battlefield/route.ts`（每回合回傳 HMAC 戰局票 `lib/beast-game/battle-session.ts`，任何一台機器都能接續；網頁端不得匯入）；簡單的自動下一招走 turns API `AUTO_STEP`。
  - 第二階段完成：可出招、暴怒合體能否使用與原因、合體搭檔、合體教學由後端 `lib/beast-game/battle-view.ts` 的 `battleViewFor` 算好，隨困難戰場 API 與 turns API 送出；BattlePanel／BattleArena／BeastTurnGame 只照印。
  - 第三階段 3A 完成：困難頁開局的洗牌、發牌、易經自動佈陣由困難戰場 API 的 DEAL 在後端做，回傳簽名牌桌票；開戰（START）核對玩家只用發到手上的卡，易經陣容一律採用牌桌票裡後端排好的（前端送什麼都不採信）。
  - 第三階段 3B 完成：相剋與戰力分析由後端 `lib/beast-game/guide-book.ts` 算好——出戰基礎與五元素攻守表走 `/api/beast-game/guide-book`（頁面外層 `GuideBookProvider` 載入一次），戰況中能力、主戰對位、戰果解說隨 `view.guides` 送出；元件不得再呼叫 combatGuideFor／describeMatchup／explainOutcome／elementPercent／elementGuideRows／elementMultiplier。演出規劃（planTierPresentation／planFusionPresentation）只決定播哪段動畫與音效，屬前端視覺感官，不列入後端化。守門 `test:beast-backend-only` 掃全部元件，不看 'use client' 標記。
- 守門：`npm run test:beast-difficulty`、`npm run test:iching-sources`、`npm run test:beast-backend-only`（都在推送閘內）
- 「三合一」的易經卜卦、易經心理學，一樣受這套來源治理。

## 口令：「紫微斗數」

**說「紫微斗數」＝打開 `docs/技能戰鬥檔案/紫微斗數/`**（業主定案 2026-09-16：另開資料夾，歸納權威檔案、軟體、大數據與公信力）。

- `紫微斗數.json`：正式檔——排盤引擎、所用套件與授權、守門測試、鐵律。
- `新人檔案.md`：導讀＋權威來源總覽＋公信力說明（古籍權威、排盤正確性、科學效度三件事分開講）。
- `來源登記.json`：走同一個來源閘門 `lib/iching-source-gate.ts`、同一份規格 `易經/來源治理.md`；狀態由程式算，外部條款未人工確認一律「待查核」。
- 公信力鐵律：紫微斗數可以有古籍權威與排盤正確性，**不得寫成科學已證實**；排盤結果以三合一交叉核對為準（四柱來自 `lib/bazi/engine.ts`）。
- 守門：`npm run test:iching-sources`（兩份登記表都檢查；名稱含 ziwei／紫微 的檔案沒登記就擋）、`npm run test:ziwei`、`npm run test:three-core`。

## 口令：《神煞易經》／「特星神煞」

**說這個口令＝打開 `docs/技能戰鬥檔案/神煞易經/`**（獨立門派資料夾：正式檔 `神煞易經.json`＋`新人檔案.md`；維護技能在 `docs/技能戰鬥檔案/八字/shensha-rule-integrity/`）（業主定案 2026-09-27：特星神煞列為檔案功能、檔案技能；八字、紫微、神煞、易經有邏輯地融會貫通以後，叫做《神煞易經》，以後獨立門派）。
- 常用神煞總覽（業主提供，D 級候選資料）已融入：原文 `docs/技能戰鬥檔案/神煞易經/參考/`，對照與擴充路線圖 `常用神煞對照.md`（總覽列出的神煞（逐名計）：本派已算 30 個，暫停 5 個（太極、福星與紙本衝突；詞館、天羅地網、血刃查表分歧）；2026-09-27 三批擴充＋2026-09-28 第四批（總覽以外：月德合、飛刃、金神、八專、九醜、六秀），第五批（喪門、白虎、病符、披麻，本派提醒與轉化讀法），第六批（歲破、月空、截路空亡、天轉、地轉、十靈、日德、日貴），全卡共 60 項）；傳統三分類與本派三類並列顯示；「神煞是形容詞，格局看五行生剋與十神」為本派解盤原則；恐嚇、醫療、涉法、性別定論的說法不照搬。
- 洋蔥心理學層：`lib/shensha-onion.ts`，每個神煞剝三層 殼→心→禮物；心理學名詞只掛已登記 A 級原始文獻（10 項），出處由程式從登記表讀出；來源登記 `C-SHENSHA-ONION`，不診斷。

- 衍生鏈（本站自家一派「太極紫微易經派」，順序不可顛倒）：客戶填寫資料 → ①八字運算 → ②生成紫微斗數，四柱逐字核對（沿用三合一 `runZiweiLayer`＋`verifyFourPillars`）→ ③有邏輯地衍生特星神煞 → ④易經（沿用三合一 `runIChingLayer` 起卦，每一個命中的神煞都逐項延伸進解盤）→ 前端只顯示。對不上就停在核對關，不自動改任一套。
- 第④層：`lib/shensha-iching.ts`，來源登記 `docs/技能戰鬥檔案/易經/來源登記.json` 的 `C-SHENSHA-ICHING`（閘門算狀態，不手填）。導師解盤話術：`lib/shensha-teacher-readings.ts`，22 個神煞各有本派話術（本意→意境→柱位→落地），例：外桃花＝牆外的好人緣（異性緣、外面的貴人）。這是本派自撰，不是古籍原文，卡片照實標「僅作自我反思參考」；凶煞只講提醒與轉化（殼與禮物），禁止「必定、註定、大凶、血光」等字（測試會擋）。
- 老師解盤「字有字的意境」：取姓名學字庫字義（`lib/shensha-char-imagery.ts`＋`data/shensha-char-imagery.json`，由 `scripts/build-shensha-char-imagery.mjs` 抽出）。教育部辭典 CC BY-ND：只挑義項、原文照引、標出處，不改字；找不到合適義項只寫五行。
- 取法與標準答案：`references/參考命盤取法.md`（紙本命盤 1974-06-28 18:00 男，17 項逐柱）。
- **後端只負責運算，前端只負責顯示，前端禁止生成**（業主定案 2026-09-27）：卡片上每一句話（話術、字義說明、爻位、來源說明）都由後端產出，前端只照印；守門 `tests/dual-chart-shensha-output.test.cjs` 掃卡片前端程式碼，含「，。；」的中文句子一律擋下。
- 後端運算、前端只顯示：`lib/dual-chart-shensha.ts`（運算）→ `lib/dual-chart-shensha-card.ts`（卡片檢視）→ `app/dual-chart/BaziChart.tsx` 的 `ShenShaCard`（只照印）。
- 只動這張卡：八字核心、紫微、共用元件與其他卡片一律不動。
- 無原典頁碼的項目標＊、來源狀態維持 `PENDING_POOL`，不得寫成已通過交叉比對。
- 守門：`tests/dual-chart-shensha-extension.test.ts`、`tests/dual-chart-shensha-output.test.cjs`、`npm run check:dual-chart-shensha-display`、`npm run test:shensha-live-api`。

## 推送閘：編不過就不准上正式站

`git push` 會先跑 **編譯 ＋ 七支守門測試**，任何一項沒過就擋下來。
推上 origin/main 等於 Vercel 部署，等於正式站，所以守在出口。

```bash
npm run hooks:install     # 換機器或重新 clone 之後要跑一次
SKIP_PUSH_GATE=1 git push # 真的要跳過（只推文件、或正在救火）
```

**閘門的來源在 `scripts/hooks/`，不是 `.git/hooks/`**——後者不在版控裡，
重新 clone 就消失。改閘門要改 `scripts/hooks/` 再 `npm run hooks:install`。

為什麼編譯排第一：2026-09-06 有一次紅 build 被推上 main
（`beast-battle-fx` 匯出 `chargeVideoFor`，但 `beast-skill-archive` 沒有那個函式）。
**當時的推送閘只跑測試、不編譯，所以擋不下來**——
測試全過、專案卻編不起來，是完全可能的。

## 命盤架構鐵律：八字為核心，紫微為第二輪

順序固定：**先算八字命盤 → 再跑紫微斗數**。一切以八字命盤為主。

任何模組需要年、月、日、時四柱，一律呼叫 `lib/bazi/engine.ts` 的 `createBaziCore()`。
**禁止任何卡片自己再實作一套四柱推算。**

判準素材（專業命理師客訴後永久鎖定，見 `tests/bazi-core.test.ts`）：

```
1974-07-02 03:30 女 → 甲寅／庚午／甲辰／丙寅
  月柱＝庚午：小暑(7/7)前仍屬午月，甲年五虎遁，不是辛未
對照組 1974-07-08 → 辛未（小暑後）
```

完整制度見 `docs/three-core-cross-validation-skill.md`（三核心交叉技能）。

三層順序：**八字命盤 → 紫微斗數 → 易經卜卦 → 前端只顯示**。
易經層負責產出話術交給前端，前端不得自己編結論、自己算數字。

**立下這種鐵律時，必須同時生出一支 CI 測試**——沒有測試的鐵律等於沒有鐵律。
以 `npm run test:three-core` 守住：兩張卡的四柱必須一致，
且紫微卡回應內的 `meta.dayPillar` 與 `ziweiSanFang.bazi.day` 不得矛盾。
