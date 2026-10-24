
> **已撤回，勿套用：** 業主檢視後表示「不行啦，還是之前這樣子會比較好」。2026-10-24 已精準移除本輪 globals.css 限定樣式，恢復前版。以下保留為歷史試作與驗證紀錄；歷史截圖不代表現行畫面。本輪從未提交或發布。已發布的三張難度入口與其他既有工作均保留。
# 首頁十五張入口卡質感 — 2026-10-24

## 定位與授權範圍
業主提供古老塔羅牌 tarot-entry-emblem DOM，確認同一首頁群組十五張小入口卡的視覺優化；保留本機預覽，不提交推送。
定位為 app/page.tsx 的 #home-eight-card-route .home-feature-stack；塔羅使用 features/tarot/components/TarotEntryCard.tsx，阿修羅使用 components/GhostAsuraHomeEntry.tsx，神獸使用 components/StarBeastHomeCard.tsx；其他入口直接在首頁 JSX。共同樣式為 app/globals.css，部分另有 CSS modules。

實際十五張：古老塔羅牌、桃花・紅鸞心動、易經論數字、易經紫微斗數、易經靈魂配對、生成一首歌、易經西洋星座、鬼魅阿修羅、易經八字命盤、易經姓名學、姓名學 × 八字、易經神煞、星宿神獸卡片、立體太極模型、九宮格靈動數字。

## 實作
僅在 app/globals.css 新增限定上述首頁群組的樣式。細金邊、內層描框、深色材質、浮雕徽章底座、少量分類色及清楚焦點。保留塔羅金字塔、各入口專屬圖示、標題文案、排序、href、密碼與功能邏輯。既有隱藏小字依原定案繼續隱藏。沒有新增售價、稀有度宣稱、寶可夢素材或玩法。完成此視覺範圍後恢復凍結。

## 驗證與限制
- 320、390、430、768、1280 像素寬度均檢查十五張卡，標題／按鈕無文字溢出，頁面無橫向溢出。按鈕至少48px高。
- 手機及桌機實際截圖檢視；金字塔與各原有圖示保留。3D卡右側原有裝飾跨出卡面內容區，由原有 overflow hidden 裁切，不是文字溢出。
- 鍵盤焦點金色外框實測可見。
- 十五個原有 href 及事件程式未修改；實際點擊塔羅抵達 /tarot，紫微抵達 /insight，阿修羅重測抵達 /ghost-asura。返回頁面後曾有一次快速點擊落到 /match，先定位並確認點擊中心後重測正常；未把此單次現象當成已修正的產品故障。未逐一實測其他十二個目的頁內部功能。
- npm run build 通過（41/41，exit 0）；保留既有 lint warnings。
- test:mobile-zoom-pan：50項通過；test:locked-cards：18項通過。
- git diff --check 通過。reduced-motion 規則程式檢查完成，未模擬系統偏好；hover/active 未另做完整動態錄影驗證。
- 六項既有健康失敗仍保留，最後全站結果49/55；本輪不重跑、不宣稱已修復。

## 交付
截圖：C:/Users/DRAGON/Documents/Codex/2026-10-24/realtime-voice-chat-2/outputs/home-entry-polish-desktop.png
手機圖：同目錄 home-entry-polish-mobile.png。
本輪保持未提交，其他九宮格等既有工作保留。

上一輪三張難度入口提交 2a63529ecf2e9b085caf8fc66264a0ced0c5bdb8 已正常推送，遠端SHA一致；Vercel已回報success：
https://vercel.com/sam31094121s-projects/heaven-earth-humanity-pair/FdAeHNgSGURwVUf7xQn5C2ogMcT3
此部署不含本輪十五張首頁入口樣式。

撤回偏好補充：業主表示「字是會有一點刺眼」，已確認恢復原版「好，好，謝謝」。保留原先較舒適的呈現，不另做替代設計或部分調暗。撤回後瀏覽器實測十五張入口存在，塔羅背景與施工前相同，新增 --entry-accent 不再存在；globals.css 與 HEAD 無差異。
