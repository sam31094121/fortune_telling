# 首頁生成一首歌：玄武全卡背景

日期：2026-11-04。業主指定以快為主，同白虎方式將環境延伸整張卡；之後明確批准與白虎一起正式同步。心月狐追加取消，未改。

必要檔案：app/music-entry.module.css、public/home-entry/xuanwu-environment-ai-v1.png、本報告。原音樂頁、入口、文案和功能不改；實際按鈕既有文字是「輸入密碼」，沒有改為別張卡的「請點我開啟」。只將已有標題與按鈕保持清晰。

正式四大神獸 beast_g_xuanwu，cards/beasts/guardian-xuanwu.ts → BeastCardTile ART_V2 → public/beast-game/front/guardian-xuanwu.v2.webp。前景原檔 Git blob 與 HEAD 均 fc8db92a83dea17e3d7676a0b9fffd24e742440f，龜蛇本體、原色、contain 比例、既有環境遮罩與布局不改。

一次 image_gen 只補無角色的雪夜山景，來源 generated_images/01a1a526-cf03-7e70-9ba1-6f054501ce05/exec-b0a24316-bc43-4183-9cc3-73b36e56d7e3.png；背景覆蓋整卡，按鈕加深半透明底提高辨識。沒有額外生圖迭代。

本機四尺寸（320／390／768／1024）本卡與上下 match／zodiac 卡相同：280×264、350×240、720×240、976×240。標題與原圖約相隔 5.61px（手機）／12.08px（平板），原圖與按鈕相隔 2px，無重疊。390px 點擊及768px Enter進入 /music。初輪1024px記錄一筆 Invalid or unexpected token，重新載入四尺寸後均無 pageerror，保留初次結果，不宣稱從未出錯。

截圖：C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/xuanwu-fullcard-preview-{320,390,768,1024}.png；鄰卡對照 xuanwu-fullcard-neighbors-{320,390,768,1024}.png。

視覺限制：玄武與龜蛇完整清楚、標題及按鈕可辨，但原圖小石台與後景大石台仍有層次銜接痕跡，並非完美無縫。依業主以快為主的限定定稿發布，不追加細修。不宣稱歌曲生成全流程已回歸，只驗證首頁入口。

驗證採 main 純檔案快照加上述白虎／玄武授權變更，沒有建立分支或 worktree；目錄 C:/Users/DRAGON/AppData/Local/Temp/baihu-release-f12f48b3372f4f81b6aa10785f851582。原有其他未提交工作保持。
