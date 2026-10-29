# 中等神獸本體接線與隔離驗收

範圍：`BeastDuelRitual`，保留既有三局 `PairResult`、押注、結果與原音色；僅把真實玩家有傷害的節拍接上四獸 rig。對手動作、零傷害、缺結果、獸 ID 不符不播放玩家咬擊；素材未就緒／減少動態仍有原展示。

## 可重現驗收

- `/beast-game/ritual-review?beast=baihu|qinglong|zhuque|xuanwu`：僅 development，真實後端 `playSeries` 固定 seed 29，四獸各搭兩張低費幼獸；不讀寫收藏、不押注、不產獎勵。
- `/beast-game/combat-review`：僅 development，後端 `newMatch/advance` 真正 EASY/HARD，HARD 含首領反制；正式 Arena、Dock、Panel。Server Action 保留隔離場次並拒絕過期 revision，無正式場次 token 或獎勵。
- 以上是使用正式戰鬥元件的隔離測試，不能寫成正式押卡或部署驗收。

## 已完成證據

- `node tests/beast-ritual-rig.test.cjs`：真實四獸系列不修改後端結果；玩家/對手/零傷害/missing/獸不符門檻；EASY/HARD 真實後端初始化、首領、過期 revision、production 拒絕皆通過。
- `npx tsc --noEmit --pretty false`：通過。
- 白虎桌面、390×844 手機：親點前鋒→中軍→自動第三局→3:0→重看入口。
- 青龍390×844：親點前鋒落敗0:1→中軍1:1→手動決勝→2:1→重看入口。
- 朱雀390×844新素材：親點至3:0結算；發現朝向反向後回報共用rig負責代理修正，再截圖確認頭朝上咬卡、羽尾位於來源卡方向。
- 玄武390×844：親點前鋒→中軍→2:0自動第三局；另外重跑自動揭牌全場，確認3:0結算與重看入口。修正後截圖確認頭朝上、硬殼與蛇身在頭後，實際對手圖像參與撕裂。
- 既有 `tests/beast-battle-mode.test.cjs` 全檔仍在 `beast_y14: original artwork exists` 失敗，非本輪四獸接線造成；未移除或放寬。

截圖在本目錄 `medium-*-mobile-*.png`。`impact-refined` 為朝向修正後；`third-round` 只到第三局不能當作完成結算。`return-refined` 是收招後無殘留，不能冒充撕裂瞬間；單張命中圖不能證明完整閉顎動作。

## 尚須由整合驗收確認

- 真 EASY/HARD 使用 `combat-review` 已親自點選四獸並按後端自動合法行動打完；進度與結果補在下表。這是隔離實戰，不是正式押注驗收。
- 音色保留既有事件，瀏覽器播放狀態不等於實際聽感；未宣稱人工聽音全通過。
- 中等隔離頁不會檢查正式收藏/押卡結算，正式入口由主線另驗。
- 截圖是一個時間點，不取代動畫連續自然度、閉顎與撕裂多幀審查。

未提交；交主線統一健康檢查、整合與發布。

## 真實 EASY/HARD 瀏覽器矩陣

同一真實 seed 29，一對一主獸；後端真 HARD 初始化有 boss（另有單元測試）。白虎 HARD 首次為手動普通攻擊，其餘由頁面「自動打完本場」逐次呼叫 server action，使用正式 Arena/Dock/Panel 播放並等待每次動作完成後才前進。

| 主獸 | EASY | HARD |
| --- | --- | --- |
| 白虎 | 第6回合 player 勝，已顯示結算 | 第6回合 player 勝，已顯示結算 |
| 青龍 | 第6回合 opponent 勝，已顯示結算 | 第6回合 opponent 勝，已顯示結算 |
| 朱雀 | 第4回合 player 勝，已顯示結算 | 第4回合 player 勝，已顯示結算 |
| 玄武 | 第8回合 opponent 勝，已顯示結算 | 第8回合 opponent 勝，已顯示結算 |

結算截圖：`easy-<beast>-complete.png`、`hard-<beast>-complete.png`。
八場均實際見到後端難度與結算文字。最後瀏覽器錯誤紀錄為空。玄武第一次驗收遇到多人開發熱更新使隔離server Map重建，已修成開發環境global保留、上限24場；重開後兩場均完整完成。這是測試工具的熱更新修復，不改正式後端戰鬥或收藏。
本矩陣使用一對一，不具備相生後備，不能當作暴怒合體或所有出招分支已驗收。手機尺寸是390×844瀏覽器模擬，不是真機觸控測試。
子代理 IAB `visibility.set(true)` 被工具明確拒絕（`IAB visibility is not supported in a subagent thread`）；以上背景瀏覽器驗收不能宣稱已在使用者右側展示。使用者可見動作展示需要主線執行。

## 追加三獸方向審查

使用者要求頭部朝對手咬，不能朝左卻往右滑。獨立數值審查發現：之前僅白虎使用固定嘴路徑，其他三獸仍受舊 `biteShift` 影響；以中等上下卡同中心幾何，750→900ms同一個run-reach姿勢的嘴接點朝右，而精靈仍朝左上18.3度。青龍x150.3→199.6、朱雀139.6→182.5、玄武140.6→188.4。1120ms最後命中點正確，不能因此宣稱整條突進合理。

已回報共用rig負責代理；其將各獸固定嘴路徑、跨姿勢原點統一後，新增 `tests/beast-rig-direction.test.cjs` 通過：

- 三獸×上下同中心、對手偏左、對手偏右鏡射共9組幾何。
- 750→900ms頭前向與移動方向一致，沒有朝臉背後滑。
- 650ms切換兩種奔跑姿勢，嘴的世界位置不跳動。
- 1120/1250ms嘴接點和敵卡實際撕裂拉扯接點一致。
- 原中等真實傷害守門測試與TypeScript再次通過。

此追加回合開始時工具已回收背景browser2，CUA inventory沒有browser，重建IAB亦回傳不可用。**上述方向修正尚未由本子代理重新畫面驗收**；先前12場結算代表接線可用，不冒充這次最新方向自然度已目視通過。主線需要繼續可見畫面驗收。
