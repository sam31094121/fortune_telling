# contrib/motion：寶珠動效＋暗黑奇幻戰場外觀

這是一層獨立的原創 CSS、SVG 和 JS，給 `game.html` 用。它**不修改** `game.html`、`engine.js`，也不改任何數值，沒有複製任何參考美術。拿掉兩個標籤，畫面就完全回到原樣。

| 檔案 | 用途 |
|---|---|
| `motion.css` | 所有樣式都在 `.bm-on` 之下，包括多切面寶石、敵人站的元素環、金色卡槽、落下與補珠、連線、碎晶和橫幅。 |
| `motion.js` | 只監聽既有的掛鉤，負責連線（順序號、跟手尾線、徽章）、碎晶飛向敵人，以及五珠技和魔法珠的排隊顯示。 |
| `make-demo.cjs` | 讀取 `../../game.html`，產生一次性副本 `demo.html`，並加上掛載標籤。它只讀 game.html，不會寫回。 |
| `demo.html` | 測試用副本。可以隨時重新產生，請不要直接改它。 |

## 掛載方式（兩個標籤）

```html
<!-- 放在 </head> 之前 -->
<link rel="stylesheet" href="contrib/motion/motion.css">
<!-- 放在 </body> 之前，要在 game.html 的主腳本之後 -->
<script src="contrib/motion/motion.js"></script>
```

如果要調參數，在 `motion.js` 之前加上：

```html
<script>window.BeastMotionConfig = { shardsPerGem: 2, shardsMax: 18, badgeOffsetY: 54, sealMs: 900 };</script>
```

## 用到的掛鉤

這些掛鉤 game.html 和 engine.js 都已經有了，不需要新增。

game.html 的 `hook(name, detail)` 會呼叫 `window.BeastHooks.on<Name>`，同時在 `window` 上派發 `CustomEvent('beast:<name>')`。motion.js 只用 `addEventListener` 監聽，**不會佔用** `window.BeastHooks`，所以其他外掛照樣能用。

| 事件 | 來源 | detail | motion.js 用途 |
|---|---|---|---|
| `beast:clear` | `doDrag()` | `{ type: 'dragClear', path: [[r,c],…] }` | 記下本步寶珠的位置，當作碎晶的起點 |
| `beast:attack` | `playEvents()`，對應引擎 `attack` 事件 | `{ attacker, target, element, chain, damage, … }` | 碎晶飛向 `[data-enemy=target]`。飛行時間是 `max(220, 60 + chain×140)` ms，和 game.html 傷害數字出現的時間對齊 |
| `beast:skill5` | 引擎 `skill5` 事件 | `{ element, … }` | 顯示「五珠技」金色橫幅 |
| `beast:magicOrb` | 引擎 `magicOrbSpawn` 事件 | `{ element, power }` | 顯示「魔法珠・威力 N」橫幅。和五珠技同一步發生時會**依序排隊**（`sealMs` 加上 `sealGapMs`），不會重疊 |
| `beast:refill` | `doDrag()` 補珠之後 | `{ chains }` | 清掉碎晶的起點 |
| `#dragLine` 的 `points` 屬性 | `drawPath()` | 每顆珠子中心的座標 | 用 MutationObserver 重畫連線、順序號節點和分級徽章 |
| `.gem.drop`、`--fall`、`.gem.clearing`、`.gem.inPath`、`.enemyCard.hit/.target` | `render()`、`flash()` | 是 CSS class，不是事件 | 落下帶回彈、消除、敵人受擊 |

motion.js 只讀 `BeastEngine.CONFIG` 的 `magicOrbMinLength`、`SKILL5_LENGTH`、`NORMAL_POWER_CAP` 和 `cols`，用來標示分級（3 一般、4 魔法珠、5 五珠技、10 上限）。它**從不寫入** CONFIG，也不呼叫任何會改變狀態的引擎函式。

## 設計

- **配色**：沿用 bead-polish 的低調奢華色票（墨 `#14121a`、骨白、金三階）。元素色使用 game.html 既有的 `--wind`、`--space`、`--water`、`--fire`、`--earth`，一律用 `color-mix` 調和，飽和度和 bead-polish 的 `BODY_MIX_PCT = 30` 一致。
- **連線**：手指離開格心時，尾線用 pointermove 加 rAF 直接寫入 SVG 屬性。徽章放在連線頭上方 54px，靠近上緣時改放到側邊，所以不會被手指擋住。
- **減少動態**（`prefers-reduced-motion`）：不顯示碎晶，沒有旋轉環和流動虛線，落下和消除瞬間完成，橫幅靜態顯示。
- **行動優先**：沒有新增固定寬度，在 390px 寬時不會出現橫向捲動。

## 測試

```
node contrib/motion/make-demo.cjs      # 重新產生 demo.html
# 用瀏覽器開啟 contrib/motion/demo.html?seed=4242
```
## v3 新增（事件、聲音、bead-sound.js）
- 事件：`beast:linkAttack`（連線攻擊光束，攻擊卡上浮 ≤3px、不縮放、不出托盤）、`beast:skill`、`beast:chain`（連鎖段數升級特效）。reduced motion 下不畫光束、只保留狀態變化。
- 聲音：跟隨 `window.BeastSound`／`beast:sound` 事件，motion 不自帶開關。AudioContext 只在第一次 pointerup／keydown 之後、且未靜音時，於 idle（requestIdleCallback，後備 setTimeout 250ms）建立；靜音中不建立，直到第一次取消靜音。
- `bead-sound.js`：寶珠音效核心（與 bead-polish 的 bead-sound.ts 同步）。可用 `window.BeadSoundConfig = { persist, muted }` 設定；預設 `persist:false`、`muted` 跟隨宿主。
- 版面：`.bm-on .enemyCard { padding-top: 26px }`（≤420px 為 21px），所有寬度 DEMO／⏳ 都在光環外框之上。

## v5（2026-10-30）一致的視覺語言・米其林精神
- 共用 token：`--bm-ease-out/io/spring/in`、`--bm-t-fast/mid/slow`、光層 `--bm-glow-1/2/gold`（全由既有色票 + color-mix，無新色碼）、印章字體 `--bm-seal-font`。JS 共用規範 `window.BeastMotionFX`（五元素同一份：每次爆發 ≤18、同時 ≤40 粒子、三層景深）。
- linkAttack：出手卡依序 `rageFusionRush`（卡槽內 ≤2px，不縮放）→ 雙層光束 → 金色三層命中光。
- skill：`cardCharge` → 光束 → 元素色命中光。enemy hit：阻尼震動 + `impactGlow` 白光。
- chain：連鎖數蓋章落定。魔法珠：「魔法珠・威力 N」N 放大。五珠技：元素色印章 + 同元素卡 `bmSkill5` 光框。
- 無神獸可出手：寶珠化光點飛向棋盤邊緣消散 + 「<元素>・無神獸可出手」安靜印章。
- 選取神獸：亮框 + 浮起 1px + 底部金線；切換時 `bmSwitchIn`。倒下：淡出下沉 + 敵方靜態灰階。
- 勝負畫面：遮罩 → 框 → 標題蓋章 → 數據（數字由 0 數到引擎值，最後必為原字串）→ 按鈕 依序。
- 所有特效座標裁切在 #actionBar 上緣之上（修正 v4 前光束在 768/1280 壓到動作列）。減少動態：只淡入淡出。
- 只動 transform/opacity；不改音效、game.html、engine.js、數值、卡圖。備份：C:\tmp\orb-motion-work\backup-v5-pre\
