# 現在年齡段靜態提示與原音源查核

授權範圍：後端 isCurrent 標出的現在年齡段，不固定第五段或44–53。僅修改 features/ghost-asura/components/AsuraAgeTimeline.motion.module.css，停止現在段及其文字／提示的縮放、位移、透明度脈衝，沿用靜態高亮與原點閱功能。其他段、五寶珠、資料、後端與 API 不改。

修改前手機實測 35 次取樣：現在段高度約222.379–225.043px，透明度約0.880–1.000，asuraAgeCurrentBreathe 為無限循環。外層整卡在既有 CSS 已禁止浮動，未重複修改外層。
修改後：390/1280px、current=0/4、no-preference/reduce 共224次取樣，transform=none、opacity=1、卡片動畫數0；hover/click仍靜態。當前段切換依後端標記，沒有新增年齡判定。

原音源查核：
- 原始 d72548a 音效提交與目前 978784c 版本都使用 assets.example.com/sounds 的五個示意網址；d72548a 已包含於 origin/main，不能說它未推送。
- 檢查工作區、所有Git引用的音效歷史、stash檔名清單、本機音訊資產與相關技能，未找到可確認屬於使用者所指神秘音樂的原曲。沒有套用stash或替換其他功能音檔。
- 隔離瀏覽器載入原模組，在真實click事件呼叫原 cardReveal：Howler AudioContext=running、全域音量1，但音源state=unloaded、playing=false。cleanup後Howler資源0。這不是播放成功證據。
- 直接請求原 card-reveal-mystical.mp3 得 ENOTFOUND。既有頁面是在結果effect中播展開音效，並沒有現在段點閱的專用神秘背景音樂接線；靜音函式存在，但未找到此頁使用者靜音控制。
- 音訊部分尚未完成，沒有新增曲目或假裝有聲；待取得另一工程師剛加入的原音源檔名／路徑／聊天，才可只接到isCurrent段的使用者點閱，並驗證防疊播與停止。

測試：check:ghost-asura:types、ghost-asura-effects-lifecycle、ghost-asura-layout、git diff --check 通過。手機桌面現在段動態驗證通過。五寶珠原verify另重跑。完整健康最近證據為19:39台北64/66；本輪重新執行八字來源及神煞來源門檻仍失敗，未改來源規則、未提交推送。

證據目錄：C:/Users/DRAGON/Desktop/命理/.tmp/asura-comfort/
- before-motion.json / after-motion.json / verify-motion.cjs：前後實際取樣。
- current-static-390.png / current-static-1280.png：現在段畫面。
- audio-probe.json / probe.cjs：隔離原音效模組點擊與清理證據。
- bazi-source.txt / shensha-source.txt：來源門檻。

直接預覽：http://localhost:8888/internal/asura-age-review （合成資料，點火色寶珠到本測例現在段）；?current=0 可驗證現在段在第一段。正式入口仍是 /ghost-asura 。原音樂媒體路徑尚未確認，不能提供不存在的媒體成果。
