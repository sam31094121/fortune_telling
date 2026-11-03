# 阿修羅粒子與音效生命週期修補

範圍僅 `lib/ghost-asura-particles.ts`、`lib/ghost-asura-audio.ts` 及專用測試；不改排盤、來源或其他卡片。

## 可重現的修改前證據

以 `git show HEAD:<module>` 載入同一個受控瀏覽器生命週期測試環境：

- 粒子在 60 FPS 約 1117ms 結束，在 20 FPS 約 3350ms 結束。原因是每幀固定扣生命值，低幀率拖長存活時間。
- 同時呼叫兩次音效初始化，建立兩個外部 script。
- 連續呼叫同一音效 40 次，建立 40 個 Howl；設定 `autoplay:true` 同時又呼叫 `play()`。
- 音效延遲回呼沒有可供頁面離開或換結果時使用的清理入口。

上述是模組缺陷的重現，不代表已證明它們是使用者實機停頓的唯一原因。

## 最小修正

- 粒子改用實際經過時間推進；背景停止 rAF，返回後接續；結束無空轉；destroy 後的舊回呼不能重新啟動；解除 visibility listener、ResizeObserver 及粒子引用。
- 音效初始化共用同一個 Promise，完成／失敗移除 script；每種音效重用一個 Howl，關閉 autoplay，只明確 play 一次。
- 新增 `cleanupAudio()`，取消延遲音效並 stop／unload 已建立物件；後續新結果仍可正常建立音效物件。

## 驗證

`node tests/ghost-asura-effects-lifecycle.test.cjs` 通過：

- 60／20 FPS 粒子持續時間約 1117／1150ms，差距在一個低幀率畫格附近。
- 背景無排程、返回只有一條迴圈、destroy 後無復活；15 次進出清理後沒有殘留 rAF、listener 或 observer。
- 40 次同音效播放僅一個 Howl、無 autoplay 雙重啟動；30 個待播回呼可全部取消，清理可重入，下一次播放可恢復。
- `npx tsc --noEmit` 通過。

## 已量測但未改動的邊界

獨立瀏覽器驗收在 390px 手機模擬寬度讀到 canvas backing 為 390×6234，約 243 萬像素；閒置 4 秒 rAF 為 0。完整高度畫布仍保留，未因推測瓶頸改變座標或畫質。

原音效設定仍含 `assets.example.com` 示意 URL；此次未新增或替換素材，不宣稱實際音色播放成功。以上為受控生命週期測試及瀏覽器模擬證據，不是各品牌真機驗收。
