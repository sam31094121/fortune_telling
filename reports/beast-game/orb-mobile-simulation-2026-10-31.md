# 寶珠戰手機模擬驗收（2026-10-31）

## 範圍與環境

- 正式站版本：`245f2408f873c994ccd0d0b75f80a93a9a108fed`；正式首頁 → `/star-beasts` → `/beast-game/match3-hard`。
- Android 模擬：Windows Edge Chromium、Android Chrome UA、390×844、CDP 原生 touch；獨立暫存 profile、靜音、全新測試存檔。不是 Android 作業系統或實體手機。
- iPhone 模擬：協作者執行 Windows Playwright WebKit 2070，iPhone UA、isMobile/hasTouch；390×844、320×667。按鈕 tap、連珠 mouse pointer，不能當成實機 Safari／原生觸控拖曳通過。
- 未碰客戶存檔或阿修羅；本驗收代理未修改產品。以下「本機備份位置」是後續尚待發布的小改，不混稱正式站已更新。

## Android 完整主線

首頁點入口、選「我自己」、選白虎與四幼子，連續自然遊玩兩局，未注入棋盤、生命或傷害。

| 項目 | 結果 |
| --- | --- |
| 第一局 | 6 次觸控連珠勝利；wins 0→1，獲成獸 a01 一張 |
| 第二局 | 16 次觸控連珠勝利；wins 1→2，獲成獸 a02 一張 |
| 掉落與防重複 | 22 次連珠後均補滿 56 格；忙碌時額外拖動未增加回合 |
| 背景返回 | 實際切隔離分頁，hidden→visible 後正常完成 |
| 收藏與重入 | 每局查看我的卡片→回首頁→重入，完整存檔相等、receipt 不重複；最後已進第三關 |
| 執行錯誤 | 本次完整流程 Runtime error 0 |

**入口觀察未定位：**主流程首次「我自己」觸碰未前進，第二次原生觸碰成功；首次事件與命中座標未完整記錄，不能判定產品原因。另兩個全新正常 profile、一個 4×CPU profile 重測冷首次，均單次成功，pointerdown/up/click 命中 play-self，當時已 hydrated。保留此觀察，不寫成首次入口可靠性全部通過。

本輪兩局均勝，未走自然落敗與重試分支。音效因靜音未做人耳驗收；未驗硬體溫度、電池或真機觸控。

## WebKit 範圍

協作者提供並留存兩尺寸重測：首頁→困難入口→親友→白虎與四幼子→連三珠→56 格補滿且 busy=false→回首頁重入。

- 390：敵方 HP 96→55，等待完成約 8,008ms；scrollWidth 390、pageerror 0。
- 320：敵方 HP 98→83，等待完成約 6,155ms；scrollWidth 320、pageerror 0。
- 初次 320 固定等待 12 秒仍 busy 的紀錄保留。後續 bringToFront 並等實際解鎖可通過，但不是同一盤，**不能宣稱已修復該觀察**。
- 這不是完整 WebKit 自然勝局／發獎驗收，也不代表真 iPhone 通過。

## 本機備份位置小改

使用者指定身份頁不顯示「存檔備份」。320px 獨立本機實測：

- 初始身份頁及重新選擇身份時，備份區塊數均為 0。
- self、guest 均能選四象、四夥伴、進 56 格戰場，再開我的卡片。
- self 我的卡片仍有一個可展開備份區塊；guest 沒有備份區塊。
- `node tests/beast-match3-entry.test.cjs`、`node tests/beast-match3-backup.test.cjs` 通過。現有測試沒有要求身份頁必須顯示備份，不需放寬斷言或修改儲存規則。

## 本機證據索引

根目錄：`C:/Users/DRAGON/AppData/Local/Temp/`。以下為暫存操作證據，不是客戶資料：

- `match3-campaign-qa-q45Vpw/evidence/android-flow-report.json`：完整兩局、存檔、入口觀察與限制；同目錄有各局 result/collection、final-progress-reentry 截圖。
- `match3-campaign-qa-DZmRuf/evidence/cold-tap-report.json`、`match3-campaign-qa-S99sGb/evidence/cold-tap-report.json`：正常冷首次重測。
- `match3-campaign-qa-ENIwSp/evidence/cold-tap-report.json`：4×CPU 冷首次重測。
- `orb-webkit-iphone-20261031/report-390-recheck.json`、`report-320-recheck.json`；初輪 `report-320.json` 保留。
- `match3-campaign-qa-AAhHVu/evidence/backup-placement-report.json`、`identity-no-backup.png`、`self-my-cards-backup-retained.png`：本機備份位置驗收，截圖已親看。

本代理的隔離瀏覽器已關閉。沒有以尺寸模擬取代實體 Android/iPhone 驗收，也沒有因未定位觀察擅改玩法。

## 追加本機 320／390 手機尺寸穩定性

身份頁備份隱藏後，以兩個獨立靜音 Edge profile、Android UA 與原生 CDP touch 完成首頁→神獸入口→寶珠身份首點→白虎及四夥伴→開戰→一輪實拖→我的卡片→首頁→重入。兩個尺寸首點皆成功，身份頁備份為 0，自己的我的卡片備份為 1；各實拖四顆珠，回合僅前進一次、補滿 56 格且恢復操作，返回重入後完整 campaign 存檔相同。Runtime errors 均為 0，瀏覽器已關閉。這是本機新版本，不是正式部署或真機證明；重入保留的是存檔，不是未結算棋盤。

- 320：`match3-campaign-qa-DYuLEA/evidence/local-mobile-stability-report.json`。
- 390：`match3-campaign-qa-mVwBUI/evidence/local-mobile-stability-report.json`。
- 同目錄含 `one-drag-filled.png` 與 `final-progress-reentry.png`；320 補滿與390重入畫面已親看。
- 實際網址仍為 `/beast-game/match3-hard`，目前本機第一關標示「簡單·3顆可攻擊」，不將路由字面當成較高關卡已驗。這輪不另重打完整勝局，沿用前述正式兩局證據並分開版本。
