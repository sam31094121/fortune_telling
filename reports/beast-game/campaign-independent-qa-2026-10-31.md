# 困難寶珠 Campaign 獨立驗收（2026-10-31）

使用獨立 native Edge、全新臨時 profile、靜音；未動客戶瀏覽器或真收藏。390px 是桌面瀏覽器手機尺寸，不是真機。產品程式由其他協作者修改，本審查只新增臨時腳本與此報告。

## 已實測

| 項目 | 證據與結果 |
|---|---|
| 新玩家入口 | 四象 4 選 1、28 幼子親選 4、主角不可移除、五張進入 56 珠盤面。 |
| 身分與重載 | self 重載保留；guest 重選回初始主角選擇、不改 self。 |
| 自然勝局 | 新 guest、白虎＋4 幼子，原生滑鼠實際拖珠 9 步擊退 5 敵。沒有注入棋盤、傷害或勝負。wins=1，角木蛟 beast_a01 獎勵與收據各 1。 |
| 勝局畫面 | 親看完整角木蛟卡、已存入文字、查看我的卡片及挑戰下一關；Runtime exception 0。 |
| 保存失敗 | 技術 fixture 攔截 campaign key 的 setItem；選主角確認顯示錯誤、不進戰場、不假存檔；還原儲存後可成功。未把此案例稱為勝局發獎失敗 UI 驗收。 |
| 第八關 | 明示 wins=8 fixture：保留主角也消耗一次選擇，重載不再詢問；換主角只換隊伍第一張、四伙伴不變。不是實打八局。 |
| 第五關強化門檻 | wins=3 fixture 鎖定、沒有材料/目標欄；wins=4 fixture 開放。 |
| 永久強化 | 原生選單選未出戰 beast_y04 消耗，白虎原攻擊 68、提升 3、合計 71；一筆材料扣除和收據，材料從可選卡移除，重載仍為 71。 |
| 真正戰鬥攻擊值 | 唯讀 React Game state，實際 Unit.attack=71，未修改 React state。 |
| 真拖珠傷害 | wins4 強化存檔 fixture，正常生成棋盤，原生連 7 顆空珠；依實際 clear events、攻擊隊員及敵屬性重新呼叫既有 computeHits：預期 87，畫面實際傷害 87；同事件未強化基準 84。未注入棋盤或命中。 |
| 成獸強化 | 真實首勝所得 beast_a01 作目標，另一幼子消耗成功，第二筆強化收據；guest 儲存未受影響。 |
| 平板與桌面 | 768／1280px 四象選擇、完整材料與目標卡、強化數字區無水平溢出，逐張截圖已開啟檢視。768px 第四張主角自然換下一列，可向下捲動。 |
| 純核心回歸 | 獨立執行 `node tests/beast-match3-hard-campaign.test.cjs` PASS：鎖角、獎勵、去重、race/retry、隔離、損壞、無安全鎖等。核心測試不代替未實跑的 UI。 |

## 證據位置

均在 `C:/Users/DRAGON/AppData/Local/Temp/`：

- `match3-campaign-qa-6seB3H/evidence/entry-report.json`：入口與隔離。
- `match3-campaign-qa-MfdJmo/evidence/natural-report.json`、`natural-first-game.png`：新版自然 9 步勝局及可見結算。
- `match3-campaign-qa-GVhN1H/evidence/fixture-report.json`：存檔拒寫、第八關保留與換角。
- `match3-campaign-qa-xYlC8X/evidence/enhancement-report.json`：第五關鎖定與解鎖、扣卡、重載及實際 Unit.attack。
- `match3-campaign-qa-mzd904/evidence/damage-report.json`、`actual-enhanced-hit.png`：87 對 87 真拖珠命中。
- `match3-campaign-qa-Qt1w5p/evidence/layout-report.json`、`four-heroes-{768,1280}.png`、`full-card-enhancement-{768,1280}.png`：寬版畫面。

## 限制與已排除中間證據

- 首次自然 11 步勝局雖已持久化，截圖被另一協作者施工時的 CampaignEnhancement 編譯 overlay 遮住，不列視覺通過；已用上列自然 9 步新版重做。
- 首次 fixture 與首次 entry 各有頁面重載/編譯期點選未前進；後續穩定版本完整重跑通過，不隱藏原失敗記錄。
- 本輪沒有刻意實打敗局、沒有瀏覽器中重送同勝局、沒有實打八場；此部分僅核心測試與明示 fixture。
- 尚未在正式站或真手機執行本輪 campaign；正式部署驗收由主線續辦。
- 審查未提交或推送。Git 仍有全隊 pending 與非本輪素材刪除，本審查未觸碰。
