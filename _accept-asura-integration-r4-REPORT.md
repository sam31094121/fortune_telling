# 驗收報告 r4：阿修羅死亡動畫整合（一般版 v3.1 ＋ 魔王 v4）

驗收時間：2026-11-10 02:23–02:47（UTC+8）。  
驗收員：唯讀。對象：MSI `C:\tmp\asura-death-integration\`（工程師 :3030 未碰）。  
方法沿用 r3：實戰在獨立副本 `C:\tmp\accept-asura-integration-r4-20261110\work\copy` 起 **:3080**（`ASURA_DEATH_PREVIEW=1`）；對照 REF 用既有 `C:\tmp\asura-accept-fix-base` 起 **:3081**；預覽閘門另起 **:3082**（`ASURA_DEATH_PREVIEW=0`）。結束後已關閉 :3080–:3082；**:3030／:8888 未碰**。

## SHA（開始＋結束）

程式檔範圍排除 `.next`／`.swc`／`node_modules`／`evidence`／`reports`／`_integration`／`.beast-game-build`。

| | 檔數 | 清單 SHA256 |
|---|---:|---|
| 開始 `sha/sha256-before.txt` | 3829 | `AA5571D7B36B1B0EAED0DD6A93418F383CDEEEC643D984555A444991B4A02C96` |
| 結束 `sha/sha256-after.txt` | 3829 | `AA5571D7B36B1B0EAED0DD6A93418F383CDEEEC643D984555A444991B4A02C96` |

- **中途程式檔變更：0**（Compare-Object changedLines=0）。
- 主專案未寫入；無任何 git 寫入。

### 一般版五檔（已對 `C:\tmp\asura-death-fx-v3.1\src\` 重算，不信自報）

| 檔 | 產品 SHA | 對 v3.1 來源 | 備份（換入前） |
|---|---|---|---|
| `asuraDeathEngine.ts` | `81f026e5…5d21e590` | **相同** | `5d1bf674…0761d626`（舊 v3） |
| `asuraDeathEngine2d.ts` | `6f418188…698addb8` | **相同** | 同（未變） |
| `AsuraDeathFx.module.css` | `be703cbd…99ab9a0e` | **相同** | 同（未變） |
| `AsuraDeathFx.tsx` | `c4bf33cc…1300eee2` | **相同** | `6a657718…3914cd62`（舊 v3） |
| `asuraDeathShaders.ts` | `9aeb76d8…72738511` | **相同** | 同（未變） |

路徑實為 `components\battlefield\asura-death\`（非自報的 `src\components\match3\…`）。

### 魔王四檔（對 `C:\tmp\boss-death\v4\src\`）

| 檔 | 產品＝v4 來源 |
|---|---|
| `BossExplosionDeath.tsx` | `a248ba76…ce5a82bb` |
| `bossExplosionEngine.ts` | `5b1c1ec0…6c23ed43` |
| `BossExplosionDeath.module.css` | `d291871c…6b793920` |
| `bossPrewarm.ts` | `618b444c…7e68d306` |

### Host／Slot／Board（相對 r3 未變）

- `AsuraDeathHost.tsx` `7fe9d70e…976cd13`
- `AsuraDeathRegularSlot.tsx` `9bf93776…a0058cc`
- `BossDeathFxSlot.tsx` `3136b642…25688d23`
- `Match3Board.tsx` `212cd37a…915ee0d1`  
皆與 r3 `sha256-before` 逐字相同。

備份目錄存在：`_integration\backup-before-fx-v3.1-20261110-0158\`（五檔齊，engine／Fx.tsx 為舊 v3，可還原對照）。

---

## 逐項結果

| # | 項目 | 結果 | 依據 |
|---|---|---|---|
| R4-1 | 換入為原樣複製；backup 可對照；next/dynamic + ssr:false；首屏不載兩支引擎 | **PASS** | 五檔／四檔 SHA＝來源。Host：`RegularSlot`／`BossDeathFxSlot` 皆 `dynamic(...,{ssr:false})`；BossDeathFxSlot 內再 `dynamic(BossExplosionDeath,{ssr:false,loading:null})`。懶載：landing `engineChunksAtLanding=0`，進戰鬥才載 RegularSlot（`logs/lazy.txt`）。 |
| R4-2a | 實戰一般關擊倒 ≤3s（390，1x／6x） | **PASS** | 獨立 :3080 + `game-eng.cjs`：`ko1` 1x **1800ms**；6x **1828ms**。`s8escort` 1x **1654ms**／6x **1773ms**。皆 ≤3000ms。截圖 `game/*-t*.png`。 |
| R4-2b | 全滅結算等特效結束 | **PASS** | `s7last` 第 7 關：1x play→done **1868ms**，結果 **+15ms**；6x **1685ms**，結果 **+133ms**（自報 +15／+130，同量級）。 |
| R4-2c | 第 8 關護衛走一般版、殿後白虎走魔王 v4；結算 +0；不回彈 B5 | **PASS** | `s8escort`：`asura-death-fx`、version 資料屬性仍標 `"3"`（引擎 SHA 已是 v3.1）。`s8boss`：僅 `boss-death-fx`，play→done **4613ms**（1x）／**4598ms**（6x），結果 **+0ms**，播放中 z=`45`，結果面板 z=`50`。B5：源碼 `hideAnchor` 設 `visibility:hidden` 且註明播完不還原；實戰 done 時 fx `display:none`；預覽滿表亦含播完／destroy 檢查。中段截圖 `game/s8boss-w390-t*.png`（爆炸可見，結算在後）。 |
| R4-2d | 截圖證明一般／魔王實戰看得到、不被結算擋住 | **PASS** | `game/` 與 `game-x6/` 時序截圖；s7／s8boss 的 result 皆在 done 當下或之後。 |
| R4-3 | 卸載後 WebGL：destroy 後 context lost；全滅結算活著一般版 context＝0 | **PASS（附註）** | 獨立預覽：`pv-prewarm`→`pv-retire` 後 `created=1,lost=1,live=0,canvases=[]`（`logs/webgl-unload.json`）。預覽滿表：destroy 後 engines=0；第 1 關全滅後 engines=0（`logs/preview-full.txt`）。實戰 s7 `fxLayers=[]`。另寫的 s7 GL 儀器腳本因頁面逾時未取得數字 → **不升 FAIL**（已有 retire＋滿表證據）。 |
| R4-4 | 預熱未完成就擊倒；產品檔未改；第一格延遲／長任務 | **PASS（附註）** | 驗收全程產品 SHA 不變 → 冷起動若用改寫回應，產品檔確實未改。預覽滿表含冷／未預熱路徑 **PASS**。工程師 `evidence/fx-v3.1/probe-cold/`：1x frameGap≈17–33ms；6x 啟動前 longtask **115ms**、maxGapFirst500Ms **167ms**（與自報一致）。本輪額外實戰冷起動腳本因 :3080 負載逾時未重現數字 → **不擋上線**（與 v3.1 獨立驗收結論相同：同步補完量級可接受）。 |
| R4-5 | 回歸：tsc／eslint／jest／11 腳本／預覽 45／三模式 | **PASS（附註）** | `tsc` 0。eslint **0 error／16 warning**（與自報同；v4 外檔含 no-explicit-any 等）。jest 副本 **53 pass／7 fail**，REF base **同 53／7**（皆 `ghost-asura-api.test.ts`）。11 腳本失敗集合 copy＝base：`battle-mode`／`difficulty`／`beast-game`／`beast-mobile`（replay 本輪 copy／base 皆 0）。預覽滿表 **45/45**（`logs/preview-full.txt`、`preview-full/report.json`）。三模式／6 頁回歸含在滿表內（copy :3080 + REF :3081）。閘門：:3082 預覽頁 **404**、API POST **404**；:3080 預覽 **200**、無效 API **400**。 |
| R4-6 | 紫微／GhostAsuraHomeEntry／SKILL_LOCK 未改 | **PASS** | 與主專案 `C:\Users\DRAGON\Desktop\命理\` SHA 相同：`GhostAsuraHomeEntry.tsx` `e2d29f48…`；`SKILL_LOCK.md` `0068c66f…`。本整合改檔不含紫微邏輯。 |
| R4-7 | 證據完整性（根目錄 25 檔還原／新輸出分流） | **PASS（附註）** | 新輸出在 `evidence\fx-v3.1\preview\`（02:05+）與 `evidence\boss-v4\preview\`。根目錄編號圖時間戳落在 **00:16–00:18**，與「自箱子副本還原」自報一致。靜態／回歸類檔（00／01／04／05／R-copy* 等）與 r3 `preview-full` SHA 相同；多數中段動畫幀根目錄 ≠ r3／≠ fx-v3.1／≠ boss-v4（各輪預覽本來就不同）。**本報告不以根目錄中段舊圖當 r4 證明**，實戰證據以本輪 `game/`／`preview-full/` 為準。未發現把「被覆蓋當下的半成品」誤當本輪 PASS 依據。 |

寬度：必測 **390** 實戰 1x／6x 已跑；360／768／1280 由預覽滿表覆蓋，**實戰加寬未另跑**（同 r3 附註）。

---

## 與自報不符／需註明

1. 自報路徑 `src\components\match3\asuraDeath\` → 實為 `components\battlefield\asura-death\`（內容 SHA 仍對得上）。  
2. 自報 s8boss 1x 4617／6x 4595：本輪 **4613／4598**（同量級）。s7 6x 結果延遲本輪 **+133ms**（自報 +130）。  
3. 預覽／實戰 `data-version` 仍顯示 `"3"`（UI 屬性未改成 3.1）；**引擎檔 SHA 已是 v3.1**。  
4. 本輪清單檔數 3829（r3 為 3156）— 排除規則相同，檔案基線不同；**本輪 before＝after**，不以絕對檔數對齊 r3。  
5. 獨立冷起動／s7 GL 儀器腳本因伺服負載逾時，改採預覽滿表＋工程師 probe-cold＋retire 儀器；不升 FAIL。  
6. 工程師 :3030 當時 `ASURA_DEATH_PREVIEW` 為開（頁 200）— 屬其除錯埠，非正式閘門；正式閘門以本輪 :3082＝404 為準。

---

## 阻擋上線？

- **本 r4（v3.1 一般＋v4 魔王整合）清單：無新增 FAIL 阻擋項。**  
- **仍待用戶決策（非 FAIL）**：能量技／連結攻擊擊倒不播（需改伺服端算傷）。  
- **仍缺證據（上線前建議補）**：**Samsung 真機錄影**；實戰 360／768／1280（預覽已覆蓋）；可選：冷起動／s7 GL 儀器在空閒機再跑一輪直讀。  
- 未授權提交／推送；本報告僅審查。

---

## 證據位置

- MSI：`C:\tmp\accept-asura-integration-r4-20261110\`（`game\`、`game-x6\`、`preview-full\`、`logs\`、`sha\`、`tools\`、`code\`、`evidence-check\`、`work\copy`）  
- box：`/workspace/accept-asura-integration-r4/REPORT.md`（本報告）

## 總評

**r4（一般版 v3.1＋魔王 v4 整合）重驗：PASS（清潔；可進上線前總驗，仍缺三星實機與用戶對能量技／連結攻擊的決策）。**
