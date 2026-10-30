# 三消：「我方沒有地／火屬性主卡可出手」誤報（10/30）

## 重現步驟（修正前）
1. 以 NEXT_PUBLIC_BEAST_MATCH3=1 啟動，開 /beast-game/match3。
2. 隊伍含地卡、火卡；連走 3 步，讓敵方第 3 步反擊。若被打的是地（或火）卡且 hp 歸 0，卡面變灰（KO）。
3. 再拖 3 顆地珠放開 → 紀錄顯示「地珠連 3 顆，我方沒有地屬性主卡可出手」，但地卡明明在隊上。
4. 另一情況：拖隊上沒有的顏色、但落下連鎖消到其他顏色有傷害時，訊息顯示「造成 N 點傷害」掛在錯的顏色上。

## 根因
Match3Board 的訊息只用本步「所有顏色總傷害 dealt>0」判斷；eligibleAttackers 會排除 hp=0 的卡，
所以「卡被打倒」和「隊伍沒有該屬性」被混成同一句「沒有…主卡」，且連鎖其他顏色的傷害會遮蓋判斷。
傷害引擎（computeHits）本身正確：地 3 顆、火 3 顆都有傷害。

## 修正
新增純函式 lib/beast-game/match3/outcome.ts（attackOutcome／attackOutcomeText）：
依拖曳顏色各自加總傷害；分成 hit／ko（已倒下）／absent（隊伍沒有）。其他顏色連鎖傷害另列「追加」。
回歸測試：tests/beast-match3-outcome.test.cjs（已加入 npm run test:beast-match3）。
