# 紫微首頁入口定稿
只改 app/page.tsx 的紫微入口、專用 CSS、背景資產與首頁入口技能。現有斗木獬幼子 young-08.v2.webp 保留原卡；背景依業主明確批准使用圖像生成補景，未生成角色。標題常駐，hover/active/focus-visible 顯示原 CTA，保留 /insight 與 handleZiweiOpen。
原圖曾受全站 saturate(0.38) 影響，現在以入口限定樣式解除。腳掌淡出下移到原圖 89% 以下；背景石台上移承接，按鈕前景保留爪尖。
驗證：320/390/768/1024px 待機隱藏與 hover 顯示、原色 filter:none、點擊到 /insight 通過。npm run build 通過，既有 lint 警告保留。手機尺寸為模擬，真機未驗。截圖 .tmp/ziwei-clear-paws.png 等為本機預覽。
技能已記錄下次點名入口可直接選既有神獸套用，不擴改未點名卡片。其他工作檔案保持未提交。正式部署狀態另核對。
