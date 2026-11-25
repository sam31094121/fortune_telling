# 首頁三項非保護檔修正：給威諺的審查報告

- 分支：`home-nonprotected-1125`（從 `origin/main` `609b15fe` 分出）
- 程式提交：`b5a005fdeb18cd050c409e795fb988ed11ceefa4`
- 圖檔提交：`c6dbc9c79ec0edf0843d985c0da4f11adadbcd37`（`pounce-open.home.webp` 175,540 B、`scroll-top-080-shield.sm.webp` 7,832 B）
- 分支目前 HEAD：`c6dbc9c79ec0edf0843d985c0da4f11adadbcd37`
- 倉庫：github.com/sam31094121/fortune_telling
- 作業時間：2026-11-25 18:53–19:22（台灣時間，Asia/Taipei）
- 範圍：只改非保護檔；未推主線、未部署、未動 `C:\Users\DRAGON\Desktop\命理`、未啟動/重啟 :8888
- 本機驗證伺服器：`127.0.0.1:3095`（`NEXT_DIST_DIR=.next-dev-3095`，不是 8888）

請先看結論與數字，圖放在絕對路徑，可對照前後畫面。

---

## 結論（先看這裡）

1. **青龍撲擊圖已壓縮**：首頁卡改用新檔 `pounce-open.home.webp`（800×710、含透明、175,540 B）。原檔 `pounce-open.v2.webp`（1331×1182、734,626 B）保留不動。遊戲 rig／manifest 仍指向 v2，沒有改玩法或戰鬥素材。實際顯示尺寸與卡片高度不變（差距 < 0.2px）。
2. **回到頂部小圖不再走 3840 後援**：底部裝飾盾牌改為靜態小圖 `/scroll-top-080-shield.sm.webp`（128×128、7,832 B）。瀏覽器請求的 URL 不再是 `/_next/image?...&w=3840`（該後援在 PNG 來源時為 **437,495 B**）。畫面仍是 `h-11 w-11`，360/390 顯示 55×55、1280 顯示 44×44（與修改前相同）。原 1254×1254 PNG 保留。
3. **首頁日文**：介面層在翻譯穩定後，可見的繁中 UI 字元比例約 **0%**（不含訪客留言原文）。先前審查看到的「約 40%」與本機在翻譯層尚未套完時測到的 **36.92%** 相近，屬 SSR 先出繁中、客戶端再翻譯的時間差，不是缺了大半字典。此次仍補了兩處實際缺口：把硬編碼「正在開啟紫微…」接上既有日文譯文；並為留言板「N 天前／小時前…」與「匿名的○ #1234」加上顯示層句型。留言本文維持原文，未翻譯。

未改保護檔。未推送、未部署。請威諺看完這份報告後決定要不要再改、或請業主點頭後再推主線。

---

## 1. 青龍撲擊圖

| 項目 | 修改前 | 修改後 |
| --- | --- | --- |
| 檔名 | `/public/beast-game/rig/qinglong/pounce-open.v2.webp`（保留） | `/public/beast-game/rig/qinglong/pounce-open.home.webp`（新增） |
| 像素 | 1331×1182 | 800×710（等比） |
| 通道 | RGBA／有透明 | RGBA／有透明 |
| 位元組 | **734,626 B**（717.4 KiB） | **175,540 B**（171.4 KiB，約原檔 23.9%） |
| 編碼 | 既有 WebP | sharp 重編碼，quality 80、alphaQuality 90、effort 6 |

引用只改 `components/StarBeastHomeCard.tsx` 兩處 `<img src>`（非保護檔）。`lib/beast-game/beast-rig.ts`、`manifest.json` 與戰鬥頁仍用 v2。

### 實際顯示尺寸（本機 :3095，devicePixelRatio = 2）

最大視覺框出現在 360 寬（旋轉＋1.06 倍縮放後的 bounding box）：

| 視窗 | 卡片 CSS | 圖 CSS（未算 transform） | 視覺框（含 transform） | 2× DPR 需求 |
| --- | --- | --- | --- | --- |
| 360 | 320×264 | 185.38×164.63 | **218.87×200.15** | ≈ 438×400 |
| 390 | 350×240 | 158.89×141.11 | 187.60×171.56 | ≈ 376×343 |
| 1280 | 976×240 | 180.97×160.72 | 213.67×195.40 | ≈ 427×391 |

新圖長邊 800，約為最大視覺寬 219 的 **3.65 倍**，高於 2× DPR，且遠低於 200KB。修改後 360 視覺框為 218.99×200.17（差 0.12×0.02 px），卡片仍是 320×264，版面與 CLS 條件沒有可察覺的變化。

檔名不用 `.v3.`：`tests/beast-qinglong-body.test.cjs` 禁止 `public/beast-game/rig/qinglong/` 出現未過關的 v3 候選檔。`.home.webp` 不與該守門衝突。

### 對照圖（絕對路徑）

- 原圖 vs 新圖，以 2× 顯示尺寸並排：`/workspace/home-nonprotected-1125/evidence/compare/pounce-v2-vs-v3-2x.jpg`（檔名是編碼試驗留下的，內容即 v2 vs 最終 800×710／175,540 B 檔）
- 首頁卡片 360：`/workspace/home-nonprotected-1125/evidence/compare/dragon-card-360-before-after.jpg`
- 首頁卡片 390：`/workspace/home-nonprotected-1125/evidence/compare/dragon-card-390-before-after.jpg`
- 首頁卡片 1280：`/workspace/home-nonprotected-1125/evidence/compare/dragon-card-1280-before-after.jpg`

---

## 2. 回到頂部小圖

可見的是主頁底部那張 44 邏輯像素的裝飾盾牌（`app/page.tsx`，非右下角已隱藏的回到頂部按鈕）。

| 項目 | 修改前 | 修改後 |
| --- | --- | --- |
| 標記 | `next/image`，`src="/scroll-top-080-shield.png"`，`width/height=44`，`sizes="44px"` | 原生 `<img src="/scroll-top-080-shield.sm.webp" width={44} height={44} className="h-11 w-11 object-contain">` |
| HTML 後援／實際請求 URL | 後援 `src` 為 `/_next/image?url=%2Fscroll-top-080-shield.png&w=3840&q=75`；支援 srcset 的瀏覽器會改抓 `w=96` | `/scroll-top-080-shield.sm.webp`（沒有 w=3840） |
| 後援 URL 位元組 | **437,495 B**（Accept: PNG 時的 w=3840） | 不再請求此後援 |
| 瀏覽器實際抓到的檔 | w=96 AVIF **2,979 B** | 靜態 WebP **7,832 B** |
| 來源檔 | 原 PNG 1254×1254、1,742,901 B（保留） | 新檔 128×128、RGBA WebP 7,832 B（新增） |
| 畫面尺寸 | 360/390：**55×55**；1280：**44×44** | 相同（既有字級／版面，不是這次改出來的） |

說明：`sizes="44px"` 在現代瀏覽器本來就會選 w=96，但 Next Image 的 `src` 後援固定寫最大檔 3840。不支援 srcset、或直接抓 `src` 的情況會下載 437KB。改成已縮好的靜態小圖後，請求 URL 與位元組都穩定在 8KB 以下。128px 覆蓋 55 CSS 像素的 2× DPR（需 110px）。比「約 5.7KB 的 w=96 PNG」（實測 5,666 B）稍大，換的是足夠的 2× 清晰度。

右下角隱藏的「回到頂部」按鈕仍用 `/scroll-top-080-shield-up.png`＋Next Image，這次沒動（`{false && …}`，畫面上不可見）。

---

## 3. 首頁日文

### 怎麼算「還剩多少中文」

- **嚴格（翻譯穩定後）**：可見文字中，含繁體特徵字、且沒有假名／韓文的字元比例。裝飾單字「米田共」、語言選單「日本語／日本」、本來就相同的「特大」，以及全是漢字的日文詞（紫微斗数、易経神殺、共感、累計閲覧数等）不算「未翻譯的中文 UI」。
- **本機 :3095、留言 API 為 503**（沒有線上留言資料）：翻譯穩定後，360／1280 日文首頁 **0%**（0／1,512 字元）。
- **翻譯尚未套完時**（同一套腳本、390 寬、約 2.5 秒內取樣）測到 **36.92%**（357／967 字元），清單含「易經靈魂配對」「字體大小」「加 LINE 好友…」等其實字典裡已有的句子。這與先前「約 40%」非常接近，應是 SSR 固定輸出繁中、`I18nDisplayLayer` 與閱讀語言狀態在 hydration 之後才套上的時間差，不是缺了四成詞條。
- **正式站**（翻譯穩定後、有留言）：未譯 UI 仍接近 0%；可見繁中主要是訪客留言原文（例如「很好用，又精準」）以及當時尚未翻譯的「4 天前」「匿名的龍 #9709」。留言本文本次不翻譯。

### 這次實際補上的內容

- `app/page.tsx`：`ziweiOpening ? '正在開啟紫微…'` 改為 `<HomeTranslatedText text="正在開啟紫微…" />`。`lib/home-japanese-copy.ts` 本來就有「命盤を開いています…」，只是硬編碼繞過了它。
- `lib/i18n-copy/home.ts`（只在首頁顯示層生效）新增句型，繁中原文與後端計算不變：
  - `剛剛` → たった今
  - `N 分鐘前` → N分前
  - `N 小時前` → N時間前
  - `N 天前` → N日前
  - `N 個月前` → Nか月前
  - `N 年前` → N年前
  - `匿名的○ #1234` → 匿名の○ #1234  
  同期為 en／ko 補了對應句型，避免首頁英／韓文也漏掉這批動態字。

### 未改、或刻意跳過

- 未改任何繁中原文、版面、玩法或命理公式。
- 未動保護檔：太極／ModelLab／UnifiedTaijiCore 與所有 taiji 檔、TodayDirectionQuest、AiTrustFeedback、ZiweiChart.tsx 與八字／紫微算法、BeastCardTile.tsx、阿修羅檔（含 GhostAsuraHomeEntry）。
- 這些保護元件若已走 `HomeTranslatedText` 或 DOM 字典，既有譯文仍會套用；本次沒有在保護檔裡新發現「只能改該檔才能翻譯」的硬編碼句子需要列出為跳過。命盤解讀依站方說明本來就保留繁中。
- 本機沒有留言資料，無法在 :3095 重拍「N 日前／匿名の龍」的實圖；句型已用正規式對過樣例（`4 天前` → `4日前`，`匿名的龍 #9709` → `匿名の龍 #9709`）。

---

## 驗證

- **tsc --noEmit**：通過（exit 0）。未在盒子上跑 `next build`。
- **npm test**（`node scripts/run-tests.mjs --jobs 2`）：
  - 第一次全跑時，曾誤用檔名 `pounce-open.v3.webp`，觸發 `test:beast-qinglong-body` 對 `.v3.` 候選檔的禁令，並讓 `test:beast-qinglong-gate` 在缺 `reports/` 的稀疏工作區先失敗。已改名為 `pounce-open.home.webp`，並補 checkout `reports/` 僅供本機測試（不進本次提交）。
  - 改名後單獨重跑：`test:beast-qinglong-body` 33 checks passed（exit 0）；`test:beast-qinglong-gate` 17 通過／0 未通過（exit 0）。
  - 已知失敗（主線既有，不計入 exit code）：`test:taiji-lock`、`test:mobile-zoom-pan`、`test:battle-reward`、`test:iching-sources`、`test:red-luan-audit`。
  - 第二次全跑（檔名已改為 `pounce-open.home.webp`）：`npm-test-summary: pass=113 fail=2 known=5 env-only=14 total=120`，exit code 1。
    - 通過 113 組；已知失敗 5 組如前，不計入 exit code。
    - 非預期失敗 2 組：`test:beast-bridge`、`test:beast-combat-guide`，皆為 runner 5 分鐘上限送出 **SIGTERM**，沒有測試斷言輸出。這兩支都會先跑 `scripts/beast-build.mjs`，在本盒同時有多個 next-server、記憶體吃緊時被超時殺掉。與本次首頁三項修改無關，也不是主線 KNOWN_FAILING 清單裡的項目。
- **米其林條**：未改字級、對比或點擊區域 CSS。卡片與盾牌量到的顯示框與修改前一致，預估 CLS 不變；此次沒有另外用 PerformanceObserver 重打 CLS 分數，不捏造數字。
- 本機首頁截圖（viewport JPEG，zh-TW / ja × 360 / 390 / 1280）：
  - 修改前：`/workspace/home-nonprotected-1125/evidence/local-before/`
  - 修改後：`/workspace/home-nonprotected-1125/evidence/local-after/`
  - 修改後截圖時盾牌已是小圖；青龍檔名在部分截圖裡仍顯示為當時的試驗檔名，圖檔位元組與最終 `pounce-open.home.webp` 相同（175,540 B）。

---

## 提交內容（請審這一包，不要推主線）

預計納入提交的檔：

- `components/StarBeastHomeCard.tsx`
- `app/page.tsx`
- `lib/i18n-copy/home.ts`
- `public/beast-game/rig/qinglong/pounce-open.home.webp`（新增）
- `public/scroll-top-080-shield.sm.webp`（新增）
- `REPORT.md`（本報告）

不提交：`evidence/`、`backups/`、`.next-dev-3095/`、測試時 checkout 出來的既有 `reports/` 檔。原 `pounce-open.v2.webp` 與 `scroll-top-080-shield.png` 未刪、未改。

bundle 預放：`/workspace/healthcheck-opt/home-nonprotected-1125.bundle`

---

## 請威諺決定的事

- 這三項可否給業主看、是否建議推主線（本次依指示**尚未推送**）。
- 是否要另案處理「日文首屏仍先閃繁中」的 hydration 時間差（這次沒改架構）。
- 隱藏的右下角回到頂部按鈕若日後恢復顯示，它的盾牌圖仍是大 PNG＋Next `w=3840` 後援，需要的話可再用同一方法縮。

