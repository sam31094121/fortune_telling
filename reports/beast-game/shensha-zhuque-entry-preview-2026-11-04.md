# 易經神煞首頁入口朱雀發布驗收

## 最終採用與發布授權

業主知道本機更新尚未發布後，確認尾羽進框定稿並要求「好，把它影像給它用上去」「就這樣一點點就可以了」。連同本次連續視覺發布作業已明確指示「那三項先暫時先暫停啦，先把這個都把它提交上去」，本批採同一限定例外：BAZI_SOURCE_REGISTRY_COMPLETE、THREE_CORE_TRADITIONAL_DEFECTS、DUAL_CHART_SHENSHA_DISPLAY。保留既有59/62健康結果，不關閉或偽造檢查、不修改命理、不豁免新故障。外觀停止迭代；下方未發布敘述為審查歷史。

本批僅app/page.tsx的dual-chart入口、app/dual-chart-entry.module.css、public/home-entry/zhuque-tail-repaired-ai-v1.png及本紀錄。AI圖片單次授權與採用依據見下方，不更改全域政策；原始卡面圖和備選保留。

## 歷程與驗證

本批業主授權首頁「易經神煞」入口加入自然姿態正式朱雀，後續明確允許移除該可見主標題。已核對 app/page.tsx 的 /dual-chart 入口及 lib/interface-languages.ts 繁中名稱，沒有改到其他卡片。

僅修改 app/page.tsx 這個入口的標題／舊圖示主視覺、app/dual-chart-entry.module.css 新增專屬裝飾圖樣式與本紀錄。使用 public/beast-game/spirit/guardian-zhuque.webp；lib/beast-battle-fx.ts 守護獸映射及 scripts/beast-six-second-production.mjs 已使用同一正式本體。雙翼尾羽完整、無裁切、無戰鬥特效、無 AI 重繪，素材不變。

保留 readingCopy.enter 無障礙名稱、全部說明段落與翻譯、原密碼按鈕與 /dual-chart 目的地。沒有變更命理算法、四柱、神煞、來源、輸入、結果、存取權限或列印；原先隱藏的說明仍維持既有樣式。

Edge 隔離頁面320/390/768/1024px：圖像解碼成功、完整矩形在卡內、距按鈕14px、無水平溢出、無 pageerror。390px實點進 /dual-chart；TypeScript檢查通過。已目視390及768px，卡片高度維持240px（320px時264px）。非實機驗證，不宣稱命理健康檢查通過。

截圖 C:/Users/DRAGON/.codex/visualizations/2026/11/04/01a1a526-cf03-7e70-9ba1-6f054501ce05/shensha-zhuque-{width}.png，修改前 shensha-before-{width}.png。

本批僅本機預覽，未授權發布，不提交推送。其他未提交工作保留。前批青龍視覺 ca82998、文件換行修正 da167f6 已推送；公開首頁320/390/768px確認-8度青龍、標題移除、五珠幾何與原版完全一致，入口正常，無 pageerror，截圖 home-qinglong-live-{width}.png。部署終態另於交付訊息回報。

## 最新抓握姿態與原色修正

業主否決初版直立展翼姿態、要求正式原色並追加爪子像要抓東西。最新改選 ZHUQUE_RIG 已登錄 bite-close.webp：閉嘴、雙爪前伸抓握、完整翼尾；不重畫或添加物件、不旋轉偽造肢體變化。先前 spirit 與 run-reach 預覽已被取代。原圖 public/beast-game/rig/zhuque/bite-close.webp 未修改。

偏色實測原因為 app/home-leather.css 共用 > :not(.absolute) 規則強制 saturate(0.38)。僅本卡裝飾圖容器加入 absolute 類別避開該規則，不改共用 CSS；四尺寸 computed style 父層 filter=none、opacity=1、mix-blend-mode=normal，圖片只有黑色 drop-shadow、無色彩濾鏡或旋轉。320/390/768/1024px完整圖片在卡內，已檢視390px，最新 shensha-zhuque-grasp-{width}.png。

前批青龍部署 da167f68949b69b28aa381dc2f81c0c7533f7a6b 已取得 Vercel success，連結 https://vercel.com/sam31094121s-projects/heaven-earth-humanity-pair/2536PpKZem1fVkobyxT7xm3S3rkr 。本批朱雀仍未提交或發布。

## 神韻構圖微調（目前最新）

業主授權自主細修。僅入口專用 CSS 將圖片容器上下留白由10/82px改8/78px，呈現高度增加6px（390px約4%），整張右移6px，為朝左的頭部與前伸爪留更多前方空間；無旋轉、無改姿態／色彩／素材，不加光效。四尺寸完整圖片在卡內，距按鈕10px，無溢出或pageerror，390px點擊仍到dual-chart。已目視320/390px，翼尾完整、雙爪不受遮擋。最新 shensha-zhuque-refined-{width}.png。本體為固定bite-close正式姿態，沒有新增抓握動作。仍僅預覽未發布。

## 收藏卡質感與略豐厚展示（最新 premium）

業主指定細緻收藏卡感，並追加身形微微豐厚。僅入口專用CSS加入深色低對比細紋、暖色暗部層次、雙層靜態細金屬邊框與按鈕細邊；隱藏本卡原共用角落符號及hover掃光，不增加價格、稀有度、徽章、文字或動畫。正式bite-close素材與原色不變，展示整體橫向微增2.5%，非重畫胸腹或改造解剖。

四尺寸320/390/768/1024px檢查完整圖在卡內、與按鈕間距10px、無橫向溢出及pageerror、父層filter=none；390px實點正確進dual-chart。邊框四尺寸display=block、animation=none；已目視320/390/768px。最新截圖shensha-zhuque-premium-{width}.png。沒有變更共用CSS或其他卡片，沒有修改原圖檔；本批仍未提交發布。

## 神獸辨識收尾（premium-final）

業主要求避免紅色老鷹觀感。再次核對 cards/beasts/guardian-zhuque.ts 正式四象朱雀原圖，以及 ZHUQUE_RIG 已登錄 bite-close 展示素材，並非其他角色。現用素材有固定鉤喙側面，與正面原始卡圖呈現角度不同；單靠CSS無法改頭型或真正昂首，不宣稱去除全部鷹感。保留現有冠羽、長尾、展翼及前伸雙爪。

僅微收展示尺度並增加上下左右留白（容器12px 22px 82px）、右移由6降3px，保留已核定2.5%橫向比例、不再加胖。邊框色從#9c8055降#756345，內框與邊緣反光同步降低，使原色主體突出。無新增造型、調色或光效。四尺寸320/390/768/1024px完整、距按鈕14px、無溢出或pageerror、無降飽和；390px點擊正確。已目視320/390px。最新shensha-zhuque-premium-final-{width}.png，本批未發布。

## 實際四大神獸卡面來源重新核對（僅比對，未替換）

業主明確要求使用四大神獸卡片本身素材，先展示比對。來源鏈：app/star-beasts/page.tsx 四大神獸區 → CatalogBeastCard name=朱雀、young預設false → guide-book回傳 beast_g_zhuque/form四象 → BeastCardFace → BeastCardTile 的 ART_V2[beast_g_zhuque]。最終srcset為thumb 256w、thumb v2-480 480w、front v2 720w。公開390px、DPR2實測currentSrc=/beast-game/thumb/guardian-zhuque.v2-480.webp?v=41e9ff104e64。高解析同系列為public/beast-game/front/guardian-zhuque.v2.webp，畫面為立岩長頸展翼朱雀。

目前入口public/beast-game/rig/zhuque/bite-close.webp是側身伸爪戰鬥圖，與卡面原圖不同。先前僅以正式戰鬥素材判定符合業主所指原圖不準確；資料art.high指向的star-beasts/four-guardians/zhuque.png也不是目前renderer最終用圖。此次以公開DOM currentSrc核實，不假稱同圖。

備選原樣保留，無改入口或素材；快照zhuque-entry-alternative-backup.json包含當前入口JSX、CSS、來源與截圖引用，存於既有visualizations目錄。公開卡面截圖zhuque-four-guardians-live-source.png。對照左圖bite-close.webp，右圖front/guardian-zhuque.v2.webp。未修改收藏或玩家資料，未發布。

## 已選定四大神獸實際卡面原圖（最新）

業主確認右側public/beast-game/front/guardian-zhuque.v2.webp並授權替換；要求忠實原圖等比完整、小幅提亮、不遮羽毛。本次只替換入口src與圖像CSS，移除scaleX及平移，width/height auto、max-width/max-height100%、object-fit:contain。保留4:3原比例及原圖本有背景，brightness(1.08)僅為整體8%亮度微調，不宣稱局部修圖或重畫暗部。原始素材檔未修改，戰鬥方案備選快照保留。

320/390/768/1024px實測顯示比例皆1.333333等於原圖720/540；transform none、父層filter none、完整圖像矩形在卡內，距按鈕14px；無橫向溢出、無pageerror；390px實點到dual-chart。已目視390/768px，呈現原圖完整範圍，沒有額外裁切（不另補畫原圖邊界外的羽毛）。最新shensha-zhuque-card-original-{width}.png。仍僅本機預覽、未發布。

## 羽毛斷層核對：原圖邊界限制

直接目視720x540原始front/guardian-zhuque.v2.webp與入口截圖，冠羽上方有留白，側翼未被入口額外裁切，但下方數束長尾羽延伸到原圖底邊，在y=539邊界被截斷，原圖沒有其後續像素。四尺寸雖完整顯示整張4:3圖片，不等於神獸所有尾羽天然完整；先前完整性說法限定圖片範圍，不可當作尾羽全貌保證。

實測img與父層mask-image/clip-path皆none；圖層父元素overflow visible，只有外卡overflow hidden且完整圖片矩形已在卡內，距按鈕14px。原生img overflow clip未裁出額外內容，無分割／覆蓋漸層或陰影。此斷尾無法靠縮小或CSS恢復。未偷偷補畫、未改換使用者指定素材；需要同一原作包含完整尾羽的未裁切來源，才能滿足整隻羽毛全部完整。此次只補記核對結果，不進一步改圖，不發布。

最終等比收尾：容器調為10px 12px 78px、移除內層框，增加原圖展示空間；四尺寸比例精確4:3、整張圖在卡內、距按鈕10px，390px入口正常。最新shensha-zhuque-original-fit-{width}.png，已目視390px。原圖下緣截尾限制仍存在，沒有新增裁切或補畫；未發布。

## 已採用 AI 補尾羽候選：本機實裝（目前版本）

業主在確認原稿缺尾羽後明確要求AI優化，隨後審閱候選並指定「就以你現在用的這一隻，把它放上去，一比一調整好」。此為單次朱雀尾羽圖像修補及採用授權，不改全域政策、不授權AI命理解讀或其他卡片生成。

來源：C:/Users/DRAGON/.codex/generated_images/01a1a526-cf03-7e70-9ba1-6f054501ce05/exec-ffae1845-6a4e-498b-8781-5d5a3ba2335a.png，內建image_gen產出、業主已接受。原圖為public/beast-game/front/guardian-zhuque.v2.webp；候選不冒稱未裁切原稿，包含AI補繪且既有細節及亮度亦有變化，審閱時已告知。提示詞與紀錄保留於同生成目錄zhuque-tail-repair-prompt.txt。

新獨立資產public/home-entry/zhuque-tail-repaired-ai-v1.png與選定檔SHA-256一致；未覆蓋原圖、未改其他卡片、原備選保留。首頁/dual-chart入口改引用新檔，撤掉brightness、scaleX、平移及舊premium背景/金框/按鈕改色，既有文字與目的地不變。僅關閉本卡會覆蓋圖片的裝飾偽元素與掃光。

320/390/768/1024px：顯示比例均4:3等於候選原比例，transform/filter/父層filter均none，完整圖像在卡內、與按鈕距10px、無水平溢出或pageerror。390px實點到dual-chart，npx tsc --noEmit通過，已目視320/390px，尾羽尖可見。最新shensha-zhuque-ai-installed-{width}.png。尚未提交、推送或發布，不沿用前批健康例外；其他未提交工作保留。

## 黑金周邊與下移4px（最新）

依業主要求，僅此入口外底色改#090909配暗金#514332細邊，參考候選圖四周像素約RGB8–12，消除原灰色卡底的突兀色塊。圖片像素／原色不動。業主更正輸入區保留後，沒有保留任何CTA背景／邊框覆寫，既有密碼入口樣式沿用。再依指示只將圖像舞台下移4px（inset14px 12px 74px），尺寸不變。四尺寸圖片保持4:3、整張在卡內、距按鈕6px；已目視390px。最新shensha-zhuque-unified-lower-{width}.png；未發布。

## 尾羽層次、放大與解析度驗收（最新larger）

業主允許尾羽搭在密碼入口上緣，後認可位置並要求稍放大。此首頁是連結按鈕，真正密碼輸入在dual-chart內。裝飾容器z-index2、pointer-events:none、mix-blend-mode:lighten，避免黑色矩形覆蓋下層按鈕；圖片不修改。主圖舞台最終17px 12px 59px，向上增加12px高度，底部位置保持。四尺寸圖像4:3、在卡內，圖片矩形跨按鈕上緣9px，但仍在文字矩形上方（手機約0.97px；實際尾尖周圍另有圖內留白），未蓋文字。可點擊上緣、連結可聚焦且Enter進入；實測密碼輸入可聚焦及輸入後清空，未提交密碼。

最新shensha-zhuque-larger-{width}.png，已目視390px。解析度唯讀核對：原PNG1448x1086，currentSrc直接/home-entry/zhuque-tail-repaired-ai-v1.png、沒有srcset或Next縮圖；320px顯示248x186，390/768px顯示216x162，即DPR3最高需求744x558，源圖已足夠，建議維持不upscale、不再生成。仍未發布，其他工作保持。

尾羽層次最後微調：業主要求再搭下緣一點，僅整圖再下移2px至inset19px 12px 57px，尺寸/比例不變，無新生成或延長羽毛。四尺寸完整4:3、pointer-events none；實際320/390截圖尾尖僅搭按鈕上緣，文字未被羽毛覆蓋（圖像矩形含暗色底留白，不能等同羽毛實際輪廓）。390px點擊進入後密碼欄可聚焦輸入並已清空，未提交。最新shensha-zhuque-tail-final-{width}.png。畫質建議維持1448x1086來源，不upscale。未發布。

## 霧感實查與極少量搭邊（clear-tail）

對照源圖及DPR3實裝截圖，從img到html的filter/backdrop-filter均none、opacity均1、transform均none；只有裝飾父層lighten混合用於黑底越界，不是blur。高密度截圖冠羽與羽軸可辨，背景柔暗霧是源圖內容，縮小後的密集紋理仍有限制，未宣稱發現或修復不存在的CSS模糊故障，未銳化／重生成。依一點點尾羽要求只上收1px，舞台18px 12px 58px，來源和比例不變。四尺寸DPR3圖像完整4:3、無pageerror，390px進密碼頁可聚焦輸入並清空；最新shensha-zhuque-clear-tail-{width}.png，已目視390px。截圖密度提升用於如實呈現，並非增加網站原圖細節。未發布。

## 首頁按鈕內側極少量紅尾羽（已實作）

確認用戶所稱輸入框即首頁寫「輸入密碼」的入口按鈕，不涉及dual-chart內表單。僅圖層由18/58改21/55px下移3px，尺寸、原圖、背景及文字不變。已放大檢視zhuque-tail-inside-border-390.png，可見紅色尾尖確實進到按鈕上緣內側，與文字留有空隙，非僅圖像矩形跨線。四尺寸完整4:3、pointer-events none、按鈕內側hit test正確；320px實點與390px鍵盤Enter正常開啟。最新整卡zhuque-tail-inside-{width}.png及局部zhuque-tail-inside-border-{width}.png。未發布。

發布前限定index快照正式建置npm run build完整通過：prebuild6146項、編譯、型別、51頁產出，保留lint warnings；雙入口與60卡技能SSR回歸通過。首頁排除唯一dual-chart入口區塊後與HEAD逐字相同。快照沒有.git，首次git差異比對因執行目錄失敗，已回原repo重跑通過；非產品測試故障。未改外觀定稿。
