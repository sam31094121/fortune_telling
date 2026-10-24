# 首頁「存到桌面」盾牌特殊配色 — 2026-10-24

## 目標與實際來源
業主指定字體大小左側的「存到桌面」盾牌，要求沿用檔案特殊配色，呈現珍稀收藏品般的低亮度色彩層次。此為視覺目標，不新增真實稀有度、價值、價格或等級宣稱。

該按鈕由 InstallShield080.tsx 掛載至 HomeToolsCard 的 data-install-shield-slot；圖片固定 public/pwa/save-shield-080.png。黑底、金框及彩色8是同一張圖片的不同層。另有 scroll-top-080-shield.png / scroll-top-080-shield-up.png 供其他位置使用，本輪未改。

## 實作與配色
僅在 components/HomeToolsCard.module.css 加入 .shieldSlot 下 .tap 的顯示樣式。原PNG與安裝元件未改。
- 來源：app/globals.css 的 --shield-080-eight-gradient；既有記錄明定由盾牌8字自上而下取六段色：#909c00、#fd722a、#fdb303、#5d8c96、#019999、#fcac01。
- 以原PNG透明輪廓作遮罩，color混色38%強度，保持黑底／金屬明暗，避免整張單色覆蓋。
- 原圖顯示採0.85飽和、0.95亮度與微量暗陰影；沒有新增高亮金光或動畫。
- 色層pointer-events:none，44×44不變，原標籤、事件、安裝引導與其他位置盾牌均保持原樣。

## 驗證
- 桌機實際點擊「儲存本站到主畫面」，顯示既有「把太極命理安裝到電腦」對話框；點「知道了」正常關閉。未執行系統安裝，也未改不再提醒偏好。
- 320、390、430、1280寬度：盾牌44×44，文字無溢出，頁面無水平溢出；已檢視桌機與手機截圖。
- 實際計算樣式確認使用六段既有漸層、38%color混色、PNG輪廓遮罩、pointer-events:none。
- 手機為視窗尺寸驗證，不宣稱已在各手機作業系統完成PWA安裝。
- 15張圖示對齊及其他未提交工作保留；本輪未觸及其樣式。既有六項健康失敗仍保留。

## 本機交付
截圖：
C:/Users/DRAGON/Documents/Codex/2026-10-24/realtime-voice-chat-2/outputs/save-shield-special-desktop.png
C:/Users/DRAGON/Documents/Codex/2026-10-24/realtime-voice-chat-2/outputs/save-shield-special-mobile.png

未提交推送；歷史撤回的整卡美化方案沒有恢復。

最終驗證：npm run build通過（41/41，exit0），保留原有lint warnings；git diff --check通過。
