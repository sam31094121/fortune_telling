# 寶珠戰 米其林複審：測試環境說明（2026-11-15）

這份文件記錄 2026-11-15 複審用的量測環境與限制，方便下次重跑、也避免把本機數字誤當真機數字。

## 伺服器
- 正式建置：`node scripts/build.mjs`（輸出 `.next-production`），啟動：
  `NEXT_DIST_DIR=.next-production node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3150`
- 必須用 `http://localhost:3150` 開頁面（共同卡庫 API 會比對 Origin 與 request.url 的主機；用 127.0.0.1 會得到「來源不符」）。
- 「我自己」模式需要共同卡庫（Supabase）。本機沒有正式金鑰時，量測用一個**只存在本機、從未提交**的記憶體版 repository
  （環境變數 `M3_TEST_MEMORY_REPO=1`，另設 `BEAST_BATTLE_SECRET=localtest-secret` 讓寶珠戰票據可簽章）。
  這個補丁只在量測時套用，提交前一定還原；正式站仍走 Supabase。
- 需要用 m3debug 快速推進到「擊倒魔王／爆炸／結算」的情境，改用「親朋好友」模式（本分頁 sessionStorage 進度、瀏覽器端結算），
  因為「我自己」模式的回合由伺服器驗證，前端除錯鉤子改血量不會被伺服器接受。

## 瀏覽器
- Playwright 內建 headless Chromium（chrome-headless-shell），軟體 GL（SwiftShader），沒有實體 GPU。
- 拖曳幀時間：`--disable-frame-rate-limit --disable-gpu-vsync`（不鎖幀）＋ CDP `Emulation.setCPUThrottlingRate` 4×，
  以 CDP trace 的 PipelineReporter「已呈現幀」間隔算 p95。headless 預設鎖 60Hz，**90Hz 是否穩定必須用真手機確認**。
- 首頁捲動：滑鼠滾輪每 120ms 捲 300px 到底，Long Task 觀測器記錄；「捲動中」與「停下後」分開統計。
  停下後一次性的 4K 太極貼圖上傳在 SwiftShader 是 CPU 軟體上傳（約 0.95s），實體 GPU 應遠低於此，需真機確認。

## 視窗
- 360×780（DPR 2）、390×844（DPR 2）、768×1024（DPR 1）、1280×800（DPR 1）。手機寬度用 isMobile＋hasTouch。

## 不在這次量測範圍
- 真機 90Hz、實體 GPU 上傳時間、iOS Safari。
- 正式站 Supabase 帳本的併發（本機記憶體版只驗證流程與文案）。
