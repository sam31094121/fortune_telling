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

**說「易經」＝打開 `docs/技能戰鬥檔案/易經/`**（業主定案 2026-09-15：易經就是這個技能檔案）。

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
  - 第三階段 3B 待辦：相剋與戰力分析（combatGuideFor／describeMatchup／explainOutcome／elementPercent／elementGuideRows／elementMultiplier，在 BattleArena、BattleCardGuide、BattlePanel、BeastCardTile、ElementMatchupGuide、MatchupSummary）。演出規劃（planTierPresentation／planFusionPresentation）只決定播哪段動畫與音效，屬前端視覺感官，不列入後端化。守門 `test:beast-backend-only` 會逐檔列出。
- 守門：`npm run test:beast-difficulty`、`npm run test:iching-sources`、`npm run test:beast-backend-only`（都在推送閘內）
- 「三合一」的易經卜卦、易經心理學，一樣受這套來源治理。

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
