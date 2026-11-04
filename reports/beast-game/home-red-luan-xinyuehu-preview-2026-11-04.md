# 首頁桃花紅鸞心動：心月狐本機預覽

日期：2026-11-04。狀態：使用者已確認 AI 背景版並批准限定發布，發布紀錄見文末；下方未提交敘述為歷次預覽狀態。與玄武 9fe8a2f 分開提交。

## 授權與範圍

使用者指定二十八宿神獸本體「心月狐」，原場景一起自然融合首頁紅鸞入口；後續明確指定移除獨立「桃」字裝飾。最新口述更正「是心臟的心，心動」，因此完整置中顯示六字「桃花紅鸞心動」，取代過程中的「星動」。圖片適度放大但外卡不可加長；這次文字更正不授權發布。

僅改 `app/page.tsx` 的 `/red-luan-heartbeat` 入口、`app/red-luan-entry.module.css` 及本報告。沒有改路由、aria-label、說明文字、按鈕、後端、API、命理來源或其他入口。移除桃字裝飾容器以免留下空框，沒有移除原圖桃花背景。

## 素材核實

`cards/beasts/xin-yue-hu.ts`：id `beast_a05`、name 心月狐、form ADULT。`app/star-beasts/page.tsx` → `CatalogBeastCard` → `BeastCardTile` 的 ART_V2 對應：

- thumb `/beast-game/thumb/adult-05.v2.webp?v=f0dfa11f7d92`
- mid `/beast-game/thumb/adult-05.v2-480.webp?v=cb33ca4f57fe`
- front `/beast-game/front/adult-05.v2.webp?v=7daf27fb1153`

已在公開 `/star-beasts` DOM 核對相同 srcset；不是四大神獸或幼子。入口使用既有 `public/beast-game/front/adult-05.v2.webp`（720×540），未生成／修改素材。保留原始完整畫面、比例及色彩，包含桃花、山景與岩石；原圖下緣已有尾毛接觸畫布邊界，不宣稱補出原圖未有內容。環境外圈以寬鬆、不規則曲線遮罩漸淡，右下尾部區保持不透明，沒有沿本體描形或圓形背光。

## 驗證

`npx tsc --noEmit` 通過。320／390／768／1024px 的上下相鄰 `/tarot`、本卡及 `/numerology` 尺寸相同：分別 280×264、350×240、720×240、976×240px。原圖 4:3，標題至圖片間距約 5.61～12.08px，圖片至按鈕約 2.02px，沒有重疊或頁面錯誤。390px 點擊及 768px Enter 均到 `/red-luan-heartbeat`；未呼叫命理運算測試，不把入口操作稱為後端全功能通過。

已人工檢視 390px，六字標題完整、狐狸與原場景可見。近照：`C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/red-luan-xinyuehu-final-{320,390,768,1024}.png`；鄰卡對照同目錄 `red-luan-xinyuehu-neighbors-{320,390,768,1024}.png`。

## 另行授權的工程技能

新增 `.codex/skills/home-beast-entry-blending/SKILL.md`，已檢查專案技能目錄無同類重複技能，依 skill-creator 流程建立；這是視覺工程技能，不是命理權威檔。官方 `quick_validate.py` 返回 `Skill is valid!`。驗證器缺 PyYAML 時只安裝至暫存驗證依賴目錄，沒有改專案依賴。技能與本預覽都保留本機，未混入玄武提交。

## 本張限定 AI 周邊接景（最新預覽）

業主另行明確授權「只生成旁邊背景，本體神獸不要動」。使用內建 image_gen，僅生成無狐狸、無動物的 3:1 夜色桃花山水背景。不是全專案 AI 或命理內容解鎖。原圖獨立前景層繼續引用 `/beast-game/front/adult-05.v2.webp`；AI 背景以另一 div 放在後層，未用 AI 獸替換原獸。

原圖 Git blob hash 與 HEAD 均為 `36d5084334025126f1f0fe101903fe795d2f6103`，確認原檔未更動。前景及父層 filter 均 none，contain 等比例，保留原頭臉、身形、毛色、尾巴細節；CSS 只融合環境外緣。新背景已人工檢視無角色、文字或光圈。兩層是場景融合，不宣稱由生成器保證逐像素保留角色。

生成原檔：`C:/Users/DRAGON/.codex/generated_images/01a1a526-cf03-7e70-9ba1-6f054501ce05/exec-239b8944-a699-45b9-ac54-7a5616be5868.png`。供專案預覽引用的副本：`public/home-entry/xinyuehu-environment-ai-v1.png`（2172×724）。完整提示詞：`C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/xinyuehu-background-prompt.txt`。提示核心為只延展匹配原圖的夜色桃花、岩石、溪流環境，不生成狐狸或其他角色、文字、框、聚光圈。

最新標題為「桃花紅鸞心動」。重新檢查 320／390／768／1024px，與上下卡尺寸相同、原圖 4:3、無重疊／頁面錯誤；390px 點擊、768px Enter 入口通過。近照 `red-luan-xinyuehu-background-ai-{320,390,768,1024}.png`，鄰卡對照 `red-luan-xinyuehu-background-ai-neighbors-{320,390,768,1024}.png`，皆位於上述 visualizations 絕對目錄。此 AI 背景、心月狐預覽與技能仍未提交／發布。

## 玄武獨立發布實證

玄武提交 `9fe8a2f613309e7dab3a6eb9b00ed5ec9a676e6b` 已推送，HEAD 與 origin/main 相同。Vercel 已 success：<https://vercel.com/sam31094121s-projects/heaven-earth-humanity-pair/YV4pvJgXSCEj7jqaR3FUahzNadPx>。公開首頁 320／390／768px 重新核對玄武來源、文字與卡片尺寸（280×264、350×240、720×240），無頁面錯誤；320／768 點擊、390 Enter 均到 `/music`。390px 其他 14 個入口文字、寬高、背景與圖片來源與發布前紀錄完全一致。截圖 `xuanwu-live-9fe8a2f-{320,390,768}.png`。先前青龍及朱雀提交亦已查得 Vercel success。其他未提交命理工作保持原樣。

## 心月狐定稿發布批准與檢查

使用者看過 `red-luan-xinyuehu-background-ai-390.png` 後明確說「可以發布，直接發布」，並批准同批收錄首頁神獸融合工程技能。提交範圍僅五檔：`app/page.tsx`、`app/red-luan-entry.module.css`、`public/home-entry/xinyuehu-environment-ai-v1.png`、`.codex/skills/home-beast-entry-blending/SKILL.md`、本報告。原神獸圖、其他卡片、命理檔案與 API 未改。

獨立主線加限定差異快照 `C:/Users/DRAGON/AppData/Local/Temp/xinyuehu-release-07d7ddf0487d461dbb345892d9e9aeb5` 的正式 `npm run build` 通過，含 prebuild 6146 項與 51 頁產出，保留既有 lint warnings；skill-creator 官方 quick_validate 返回 Skill is valid。

完整健康檢查如實為 57/62，同五項既有失敗：BAZI_SERVICE_AVAILABILITY、BAZI_SOURCE_REGISTRY_COMPLETE、BAZI_FEATURE_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY。原主線與加入心月狐的同環境比較，八字服務可用性及八字功能完整兩項皆 exit 1、stdout/stderr 完全相同（快照 release-baseline-comparison.json）。無新增失敗。

依使用者本輪明確「圖片更新與八字切開、八字不能動」及本次直接發布授權，保留同五項失敗作本輪純視覺例外，未修改永久門檻、未停用檢查、未修命理，不泛化到下一個未授權任務。白虎入口選擇僅唯讀盤點與意見，不含任何候選卡修改。推送後須另核對公開部署終態與手機／平板入口。
