# 四大神獸・點擊直接強化 — 設計方案（2026-11-15，分支 fourbeast-1115，基於 main ec138627）

## 1. 現況盤點（Phase 1）
- 進遊戲首屏 = `/star-beasts`（app/star-beasts/page.tsx）`<nav data-beast-chooser>` 內 `GAME_MODES` 兩張卡：「神獸戰鬥」(/beast-game/battlefield)、「寶石捷連線」(/beast-game/match3-hard)。手機一欄、≥900px 三欄格。
- 既有合體強化（伺服器端，已上線）：
  - 規則 `lib/beast-game/cultivation.ts`：`cultivationTarget` 同宿幼子 → 本體；本體 → 所屬四大神獸（`lib/beast-guardians.ts`，四季分七宿）。四大神獸是最大卡，不當材料。
  - 交易 `fuseCultivation`：主力須鎖定五隻、主力不能當材料、合體後至少保留五種卡型；加成 = floor(材料原始攻擊/10)，最少 1。
  - API `POST /api/beast-game/cultivation` PREVIEW / FUSE（CAS + operationId 重送安全）。UI 只在寶石捷連線「我自己」選單裡的 `SharedCultivationPanel`（文字為主）。
- 卡片來源（伺服器發卡時寫在副本 id）：`duel:*` 神獸戰鬥勝利；`orb-win:*` 寶珠連線勝利；舊進度帶上的寶珠獎卡 = sha256('orb-reward'\0matchId)（可由 orbLedger.rewards 還原）；另有 `starter:*` 首戰禮、`growth:*` 成長卡、`shard:*` 碎片兌換、`reward:*`。

## 2. 入口卡
- 位置：同一個 `<nav>` 裡，兩張玩法卡 `<ul>` 正下方，**全寬獨立一列**（手機、平板、桌機都在兩張卡下方）。
- 內容：左側四象縮圖（青龍、朱雀、白虎、玄武，既有 /beast-game/thumb/guardian-*.v2.webp），右側標題「四大神獸 ↗」＋金色膠囊「點擊直接強化」（高 44px）。
- 點擊 → `/beast-game/four-beasts`（直接是強化頁，不經過選單）。

## 3. 強化頁版面（/beast-game/four-beasts）
1. 頂列：返回（44px 圓鈕）｜「四大神獸」｜**可強化張數徽章**（卡疊圖示＋數字，伺服器 enhanceableCount）。
2. 來源列：⚔ 神獸戰鬥張數、●●● 寶珠連線張數（伺服器 sources）。
3. 四象分頁：四張守護獸縮圖，右上角數字點 = 該象可強化張數。
4. 層級樹（一象一頁）：最上大卡（四大神獸）→ 一排 7 張本體 → 一排 7 張幼子。層與層之間是 ↑ 箭頭；有可強化材料時箭頭上下浮動發光（小往大流）。未擁有 = 灰階＋虛線框；已強化 = 左下「+N」；多張 = 右下「×N」；可被吃進的大卡 = 外框呼吸光＋右上數字。
5. 材料匣（橫向捲動）：只列「神獸戰鬥／寶珠連線」贏得的卡；左上來源圖示（⚔／●），右下狀態圖示：↑可強化、🔒主力鎖定、□沒有大卡、⏳戰鬥未結算、⊘試算不通過。
6. 底部固定列：選了材料 → 小卡 → ↑ → 大卡＋「+N」（伺服器試算值）；金色「✓ 強化」鈕。確認後播「小卡往上飛進大卡、縮小淡出」動畫，畫面重讀伺服器結果。
- 不放任何規則說明文字；只有狀態用 aria-label（讀屏）與兩個必要的行動鈕（「先鎖定五隻主力」「回到未結束的戰鬥」）。
- 動畫只用 transform/opacity；`prefers-reduced-motion` 全部靜止（飛入動畫不播）。卡片尺寸用 aspect-ratio 固定，載入用骨架，避免 CLS。

## 4. API 契約（前端零計算）
`GET /api/beast-game/four-beasts`（header `x-beast-wallet`，唯讀，no-store）→
```
{ ok, view: {
  revision, enhanceableCount, materialCount, sources:{duel,orb}, mainTeamReady, pendingBattle,
  guardians:[{ key, element, cardId, thumb, owned, bonus, ready, waiting,
               mansions:[{ mansionId, cardId, thumb, owned, bonus, ready, waiting,
                           young:{ cardId, thumb, owned, bonus, ready, waiting } }×7] }×4],
  materials:[{ copyId, cardId, thumb, source:'DUEL'|'ORB', tier:'YOUNG_TO_ADULT'|'ADULT_TO_GUARDIAN',
               targetCardId, targetCopyId, status:'READY'|'LOCKED'|'NO_TARGET'|'NO_MAIN'|'PENDING'|'BLOCKED', addedBonus }]
} }
```
- 計算全在 `lib/beast-game/four-beasts-view.ts`：誰吃誰用既有 `cultivationTarget`；READY 與 addedBonus 用既有 `fuseCultivation` 試算（不寫入）。**沒有新增任何規則或公式。**
- 扣料仍走既有 `POST /api/beast-game/cultivation {type:'FUSE'}`（同一個伺服器交易）。

## 5. 待業主決定
1. 「合體」與「強化」是否要分兩種？目前伺服器只有一種操作（FUSE），畫面用兩層箭頭表現：幼子→本體、本體→四大神獸。
2. 來源只有兩種：這頁只把神獸戰鬥／寶珠連線贏得的卡列為材料；但伺服器 FUSE 和舊的合體面板仍接受首戰禮、成長卡、碎片兌換的卡。是否要改成伺服器也只接受這兩種？（屬規則變更，未動）
3. 同卡型有多張時，預設強化「加成最高那張」（只是顯示預設）。要不要讓客戶自己點選大卡？
4. 主力未鎖定五隻時無法強化（既有規則）。是否要在這頁直接加「鎖定主力」功能，而不是跳回寶石捷連線？
