# 神獸卡統一細修方法 UNIFIED-v1（2026-11-08）

適用：全部 60 張神獸卡（幼子 28、成獸 28；四大神獸僅作參考，不處理）。三位工程師一律用同一支腳本、同一組步驟與固定參數；每張卡只允許在 `card-params.json` 調整遮罩／位置類「稽核」參數，不得改步驟、門檻或強度。
依據：`.codex/skills/home-beast-entry-blending/SKILL.md`（修圖技能檔案，含鐵律：禁止冒充、HD 底線、禁止放大湊尺寸）。

## 檔案
- 腳本：`_tmp_beast_retouch/retouch-unified.mjs`（Node + 專案內 sharp；MSI 無 Python）
- 原稿備份：`_tmp_beast_retouch/_backup-retouch-20261108/front/`（56 張 front）＋ `thumb/`（112 張）；雜湊 `SHA256SUMS.tsv`（欄位：來源路徑、SHA256、位元組、備份 SHA256）。不在 public/ 之下，不會被網站提供。
- 候選輸出：`_tmp_beast_retouch/candidates/<card>.cand.webp`、`<card>.compare.png`（左舊右新）、`<card>.report.json`、`guardian-envelope.json`

## 執行
```
cd C:\Users\DRAGON\Desktop\命理
node _tmp_beast_retouch/retouch-unified.mjs young-11 young-12 ...
```
腳本永遠從備份讀原稿並核對 SHA；不寫 public/、不改卡片數值或卡框、不重啟 :3010/:8888、不 git。

## 固定步驟（每張完全相同）
- S0 讀備份原稿 → SHA 必須等於 SHA256SUMS.tsv，否則中止。
- 基準（系列包絡）：由四大神獸 v2（白虎＝核准樣本、青龍、朱雀、玄武）即時量測：白點 p99 最小值、銳利度（亮度拉普拉斯變異數）最小值。
- S1 色調包絡：僅當本卡 p99 < 0.95 × 神獸最小 p99 時，對 R/G/B 同一線性 `a=min(1.25, 目標/p99)`、黑點固定 `b=-p1(a-1)`；保持原色相，不改配色。否則不動。
- S2 細節：僅當拉普拉斯變異數 < 神獸最小值時，L 通道 USM `sharpen({sigma, m1:0.4, m2:1.0, x1:3})`，sigma 依固定階梯 0.5→0.6→0.7→0.8 取最小可達者。否則不動。
- S3 幾何：不縮放、不裁切、不移位、不生成、不重畫。構圖／接地／出框問題只稽核並回報，不用移動或繪製「修」。
- S4 輸出：有變動才以 webp q95 重編；無變動則原位元組複製（SHA 相同）。
- S5 門檻：讀實際輸出寬高，對照 HD 底線（長邊 ≥1280、短邊 ≥720）。未達＝FAIL，不得交付、不得覆蓋 public/。
- S6 系列人工核對（逐張記錄於報告）：光向、調色、石台、構圖入框、邊緣處理，對照四大神獸；另查使用者硬規則：武器為天生身體部位非手持、繪製元素不得發光、幼子 9–28 深色背景且可愛、幼子 1–8 保持原貌。
- S7 交付：只有 S5 PASS 且 S6 全過，並經手機 320/390/768 實際顯示核對後，才可取代 public/ 檔（另需當輪授權）；同時重出 thumb。

## 已知限制（2026-11-08 實測）
現行 60 張 front v2（含四大神獸與白虎樣本）全部 720×540，低於 HD 底線；專案內找不到同一版畫作的高解析原檔（`.claude/worktrees/.../star-beasts/*young-divine.png` 950×1656 是舊版不同畫作，不可替用）。依鐵律不得放大湊尺寸，故目前所有候選 S5 必為 FAIL，只能作內部候選，原稿保留。需業主決定（見報告）。

## 2026-11-08 18:48 業主決定（取代上方「已知限制」的交付結論）
卡面 720×540（與四大神獸同尺寸）視為通過尺寸底線；腳本 S5 以 `CARD_FRONT_EXCEPTION` 記為 PASS（owner exception）。其他尺寸仍照 HD 底線。

## S8 縮圖（腳本已內建）
僅有變動的卡：由候選 front 以 lanczos3 產生 `thumb/<card>.v2.webp` 256×192 與 `.v2-480.webp` 480×360，webp q90；輸出在 `candidates/thumb/`。

## S7 站上驗收（實際做法）
`node _tmp_beast_retouch/site-check.cjs`：用 Playwright 攔截圖片請求、只在測試瀏覽器內換成候選檔（不動 public/），在 :3010 /star-beasts「神獸幼子」以 360/390/768 寬截卡片與詳細卡，舊／新各一套；腳本內 `TOUCHED` 改成本批有變動的卡。站上實際用 thumb（360→256、390/768→480）。通過後才把 front＋兩張 thumb 複製進 public/，覆蓋前先核對 public 現檔 SHA 仍等於備份，覆蓋後寫入 `REPLACED-SHA256-20261108.tsv`。
注意：`components/battlefield/BeastCardTile.tsx` 的 ART_V2 `?v=` 是檔案 SHA256 前 12 碼的快取版本號；換檔後舊版號仍可載入新檔（伺服器直接讀磁碟），但瀏覽器快取可能顯示舊圖，需由整合者更新版號並重建。
