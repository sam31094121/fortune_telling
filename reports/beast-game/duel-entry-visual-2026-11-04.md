# 白虎朱雀入口本機預覽（2026-11-04）

## 本批提交與發布例外批准

業主在明確詢問「這張戰鬥卡是否也批准沿用前兩批相同的提交、發布例外」後回覆「好，他那三項先暫時先暫停啦，先把這個都把它提交上去」。因此本批v7入口視覺可提交發布，例外僅既有 BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY；不禁用檢查、不偽造全綠、不修命理、不豁免新故障。下方未獲例外及未發布文字為歷史過程。其他未提交工作保留；提交範圍僅 page.tsx、GameModes.module.css、本紀錄。

發布前以 Git index 匯出限定三檔加已提交基線的獨立快照驗證，沒有新分支／worktree。npm run build 完整通過（含 prebuild、型別、51頁產出；保留 lint warnings），雙入口及六十卡原技能 SSR 回歸通過。手機與桌面v7視覺及不重疊驗證沿用下方有效證據；未改已定稿造型。寶珠 JSX 分支與專屬 CSS 保持前次已部署內容。

## 頭部朝向微調 v7 與提交狀態（目前定稿）

業主認可v6間距後指定嘴部更朝朱雀頸部附近；僅把白虎整體旋轉 -34 改 -40 度，位置左5%／上55%及尺度49%不變。不獨立轉頭、不切頭拼接，也不宣稱素材有新增咬頸動作。320/390/768/1024px完整圖像在卡內、不壓標題、無溢出；目視390與1024px兩嘴及本體仍有清楚間隙。最新截圖 duel-neck-aim-v7-{width}.png。

業主已說「好，這樣都可以提交了」，授權僅本批戰鬥入口。核對既有健康紀錄仍59/62，三項 BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY 未獲本批例外（之前三合一及寶珠例外不沿用）。因此未提交、未推送，未擴改其他工作或反覆重跑無關檢查。暫存區無檔案，main 提交仍同步 origin/main，所有其他使用者未提交工作保留；寶珠卡公開部署666cdc7不變。

## 不重疊定稿 v6（最新）

業主指定兩嘴及本體不得重疊，優先於咬頸接觸意象。只將白虎由左12%／上47%退至左5%／上55%，保留 -34 度張口上撲與原完整素材，朱雀不動。六尺寸驗證完整圖像不出卡、不壓標題、無橫向溢出；另外實際目視390px及1024px截圖，確認兩嘴、頭部及相向爪的可見輪廓有空隙，非僅憑 DOM 邊界判斷。最新圖 duel-separated-v6-{width}.png；未提交發布。

## 自主細修定稿 v5（目前交付）

檢視 v4 發現頭部重疊遮住白虎臉，白虎改左12%、上47%，維持 -34 度上撲；朱雀不變。留出面部辨識及爪的接近空間，仍是較低白虎朝較高朱雀的交鋒，不強稱原素材已實現咬頸動作。無拉伸、裁圖、新效果或功能。六尺寸完整圖像矩形在卡內且不碰標題、無橫向溢出及 pageerror；390px 實際點入 battlefield。最新圖 duel-refined-v5-{width}.png，已檢視390px。寶珠公開部署保持成功，本批仍只本機預覽。

## 頸部／爪迎擊構圖（最新 v4）

業主取消臉對臉限制，指定白虎從下往朱雀頸部附近撲抓、朱雀用爪迎擊。白虎現為左15%、上43%、-34度並鏡像，朱雀保持右4%、上22%、-24度；素材、比例與角色資料不變。這是完整原圖的相對位置調整，不是新繪咬頸或肢體動作。六尺寸完整圖片矩形仍在卡內、無溢出，已檢視390px。最新圖 duel-neck-claw-v4-{width}.png，取代前述預覽；未發布。

## 最新上下錯位交鋒預覽

業主追加雙方主動攻擊、朱雀較高俯衝、白虎較低上躍，不同高一直線。沿用兩張完整 pounce-open 原素材，白虎 CSS 鏡像後旋轉 -22 度、位置較低；朱雀旋轉 -24 度、位置較高，爪與頭朝中央。這是既有靜態圖的站位及朝向調整，不重造肢體、不宣稱新增抓擊動作或影片。圖片寬49%，保留中央空隙與完整翼尾、四肢。

最終新截圖 duel-clash-v2-{width}.png，320/375/390/430/768/1024px 逐一確認旋轉後完整圖片外接矩形在入口卡內、無橫向溢出；已目視390px交鋒畫面。沿用本批既有 TypeScript、入口及渲染驗證，後續僅修改 CSS 位置／旋轉／尺度。不發布。

前一批寶珠入口已獨立提交推送 666cdc7fe5df5665a25930518cb8e92db5930a9b，Vercel success。公開站 390/768px 驗證 56 寶石、3 盾牌、無旋轉、無溢出與 pageerror，點擊進 match3-hard。公開截圖 orb-live-666cdc7-{width}.png。

本批另受業主授權僅改上方卡片戰鬥入口：完整白虎與朱雀本體左右對峙、只留主標題，無新動作或玩法。修改 app/star-beasts/page.tsx 的 campaign 分支，以及 GameModes.module.css 新增 campaign 專屬樣式；寶珠分支及樣式不變，未改素材或資料檔。

## 素材核對

- cards/beasts/guardian-baihu.ts：beast_g_baihu，form=GUARDIAN；lib/beast-game/beast-rig.ts 的 BAIHU_RIG 明確登錄 pounce-open.v2.webp。
- cards/beasts/guardian-zhuque.ts：beast_g_zhuque，form=GUARDIAN；ZHUQUE_RIG 登錄 pounce-open（預設檔名 pounce-open.webp）。
- 使用 /beast-game/rig/baihu/pounce-open.v2.webp、/beast-game/rig/zhuque/pounce-open.webp，兩張已目視檢查為完整本體。白虎僅 CSS 水平鏡像朝中央，朱雀保持原圖；object-fit:contain、無裁切、無角色重新生成。

## 驗證

Edge 隔離頁面 320/375/390/430/768/1024px：兩張圖片解碼成功，完整圖片矩形在卡片內、無橫向溢出，初輪無 pageerror。390px 實點進 battlefield；後續只微調左右站位，六尺寸邊界重驗通過。TypeScript 與既有雙入口/六十卡技能渲染回歸通過。已目視最終390px卡面。非實機驗證，未新增測試檔。

截圖目錄 C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/：duel-entry-preview-{width}.png、duel-page-preview-{width}.png。

本批只本機預覽，未提交、未推送、未部署；不沿用前批寶珠卡發布例外。其他使用者未提交工作保留。
