# 首頁鬼魅阿修羅白虎預覽

日期：2026-11-04。狀態：僅本機 8888 預覽，未提交／發布；不混入心月狐發布。

## 最新授權與範圍

白虎放在現有鬼魅阿修羅首頁卡，保留整卡與 `/ghost-asura` 路由，並非隱藏入口。依先後澄清：直接移除首頁「18 歲禁忌｜未滿 18 歲禁止進入」提示節點與「修」裝飾小方塊及容器；隱藏首頁其他說明與修字浮水印；保留「鬼魅阿修羅」紅色毛筆主標題，且恢復可見的「請點我開啟」與箭頭。只動呈現，不刪除或改寫內頁／實際存取限制。

必要檔案：`components/GhostAsuraHomeEntry.tsx`、`components/GhostAsuraHomeEntry.module.css`、`public/home-entry/baihu-environment-ai-v1.png`、本報告。主標題沿用既有 `AsuraBrandTitle.module.css` 的 Asura Brand Brush／Yuji Boku；授權文件 `public/fonts/asura-brand/OFL.txt`，字體及全站字型設定未改。顏色 #ef6969 配深紅細陰影，沒有稀有度文字或額外光圈。

## 正式本體與背景分層

核對四大神獸 `beast_g_baihu`；`cards/beasts/guardian-baihu.ts` → `CatalogBeastCard` → `BeastCardTile` ART_V2 front `/beast-game/front/guardian-baihu.v2.webp?v=f7b4bba225f1`。前景直接使用既有 `public/beast-game/front/guardian-baihu.v2.webp`（720×540），原色、姿態、臉部、肢體及尾巴不重繪；與 HEAD 的 Git blob hash 都是 `f7211e98c4f380002260b40bd367f77d189a5d5a`。

使用者另明確授權本張「一樣用 AI 銜接」背景，僅限周邊接景。內建 image_gen 生成無白虎／無其他角色的暮色山水、楓葉、垂柳與石台，前景仍是原始白虎圖。新背景原檔 `C:/Users/DRAGON/.codex/generated_images/01a1a526-cf03-7e70-9ba1-6f054501ce05/exec-b741bb56-8c8a-410c-8a5c-f86d5277ca36.png`，專案副本 `public/home-entry/baihu-environment-ai-v1.png`，未覆蓋原素材。完整提示詞：`C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/baihu-background-prompt.txt`。此限定授權不是全站 AI 或命理生成解鎖。

## 實測結果

- TypeScript `npx tsc --noEmit` 通過。
- 8888 重新載入後，四尺寸可見文字皆為「鬼魅阿修羅／請點我開啟／➜」。`data-asura-age-gate` 和 `data-home-entry-icon` 節點數均 0，未以 CSS 偽元素補回提示。
- 毛筆字型實際 computed font 為 Asura Brand Brush，document.fonts.check 通過；標題上方居中，與圖間距手機 3.61px、平板 10.08px；圖與按鈕間距 2.02px，無重疊。
- 原圖 4:3 contain，原圖及父層 filter none；AI 圖僅後層背景。人工檢視 390px，白虎完整、標題與按鈕清楚，無年齡提示或修字小框。
- 本卡、上方 `/numerology`、下方 `/insight` 尺寸相同：320px 視窗各 280×264；390px 各 350×240；768px 各 720×240；1024px 各 976×240。未加長卡片或修改鄰卡。
- 四尺寸無 pageerror；390px 點擊與 768px Enter 均進 `/ghost-asura`。只測入口，不宣稱內頁所有運算或限制已完整回歸；`app/ghost-asura`、`features/ghost-asura` 無本輪差異。

最新近照：`C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/asura-baihu-ai-preview-{320,390,768,1024}.png`。

鄰卡對照：同目錄 `asura-baihu-ai-neighbors-{320,390,768,1024}.png`。公開站白虎仍是舊版本，因本批尚未批准發布；不可把本機成功當成公開已更新。

## 心月狐已獨立發布

提交 `77c789106a9d28435cf5808e0286758ea05a5e94` 已推送 main，包含心月狐定稿與工程技能，Vercel success：<https://vercel.com/sam31094121s-projects/heaven-earth-humanity-pair/72XyBjCQLHGvCde6TyyFD7RtAJBv>。公開 320／390／768px 已確認六字「桃花紅鸞心動」、原始狐狸前景、AI 後層環境及同尺寸；點擊／Enter 入口正常，無頁面錯誤。390px 其他 14 個入口的文字／尺寸／背景／原圖來源與發布前完全相同。公開證據 `xinyuehu-live-77c7891-{320,390,768}.png`。白虎不在該提交中。

## 全卡背景接景收尾（v3，本機待審）

最新使用 `public/home-entry/baihu-environment-ai-v3.png`（1536×1024）；v1、v2 為未使用的試稿，均未提交。v3 來源為 generated_images 同聊天目錄 `exec-9f26ac45-6b56-40ef-a34a-cd6d9c59e68d.png`。背景現在鋪滿整張卡、標題後方及按鈕周圍；原始白虎前景不替換。使用環境邊界遮罩，不對白虎加模糊。

最新截圖：visualizations 同聊天目錄 `asura-baihu-continuation-v3-{320,390,768,1024}.png`。四尺寸頁面無 pageerror；可見文字維持鬼魅阿修羅、請點我開啟、箭頭。390px 點擊進入 /ghost-asura。卡片尺寸依序 280×264、350×240、720×240、976×240。

人工檢視 390px：標題、完整白虎、按鈕均可見；但原始場景左側河面與新背景仍有色差和接景痕跡，右上垂柳也未完全連續。**接景自然度尚未通過，不宣稱無縫完成。** 使用者催辦後停止繼續生圖，保留此具體預覽；目前不提交、不推送。完整發布 build／健康檢查尚未為此候選版重跑，不能以舊批檢查代替新批發布證據。沒有修改命理運算、內頁限制或其他卡片。

## 業主接受第三版並批准發布（2026-11-04）

業主看過 v3 手機畫面及左河面／右上垂柳接景限制後，明確回答「好，先給它提交」，之後追加白虎與玄武兩張「全部同步、推上正式舞台」。因此前述待審／停止發布狀態已由本次明確批准取代；接縫仍如實保留，不宣稱無縫。紅鸞追加已取消，相關程式沒有新增差異。

正式範圍僅白虎元件、樣式、實際使用的 v3 背景及本報告；v1/v2 試稿不提交。玄武以獨立樣式／背景／報告同批發布，沒有修改命理 API、技能來源或內頁存取邏輯。既有其他工作不入提交。

白虎獨立快照 build exit 0；合併玄武後另執行 build。完整健康首輪 55/62：原本五項已知失敗之外，CARD_BEAST_GAME 及 STAR_BEAST_SELF_ENTRY_API 發生 timeout，保留於獨立驗證目錄 health-baihu-first.json，重新掃描確認，沒有改測試或放寬逾時門檻。

## 關機前恢復點

業主要求立即停止並明天接續。白虎與玄武合併快照 build exit 0（prebuild 6146 checks、51頁產生通過）；**尚未 git add／commit／push，尚未發布**。所有修改已寫入磁碟。健康重查程序曾啟動，未等待其最終結果；下次先讀獨立驗證目錄 health-baihu-recheck.log 與 reports/screen-health/latest.json，確認只剩業主批准的五項既有失敗；不得憑先前例外略過其他新失敗。首次兩項額外失敗是頁面/API timeout，真實結果 health-baihu-first.json 已保留。

恢復時只納入七檔：components/GhostAsuraHomeEntry.tsx、components/GhostAsuraHomeEntry.module.css、app/music-entry.module.css、public/home-entry/baihu-environment-ai-v3.png、public/home-entry/xuanwu-environment-ai-v1.png、本報告、home-music-xuanwu-full-background-2026-11-04.md。不要納入白虎 v1/v2 試稿或其他既有工作。四尺寸最新重新載入皆無 pageerror；玄武手機點擊／平板 Enter 正常。紅鸞沒有追加變更。完成必要檢查後限定提交推送 main，再核對 Vercel 終態及公開手機／平板畫面。
