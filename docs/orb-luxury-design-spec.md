# 寶珠奢華設計規範（Orb Luxury Design Spec）

適用：正式站 `/beast-game/match3`（`components/battlefield/bead/BeadPolish.module.css`）與 `/beast-game/motion-preview`。
基準：正式站 match3 的質感為下限，新畫面不得低於它。**只規範視覺**，不涉及遊戲邏輯、數值、卡資料、卡圖、存檔。

## 1. Token 檔
- CSS：`styles/orb-luxury-tokens.module.css`，class `.lux` 內宣告 `--ol-*` 變數。
  在 CSS Module 根 class 第一行寫：`composes: lux from '<相對路徑>/styles/orb-luxury-tokens.module.css';`
- TS：`components/battlefield/orbLuxuryTokens.ts`（`ORB_LUXURY`），同值，給 inline style／canvas 用。
- match3 目前保留自己的 `.lux` 區塊（值完全相同），本次不重構以保證像素一致；日後要改值時兩處一起改或改為 composes。

## 2. 色彩
| token | 值 | 用途 |
|---|---|---|
| `--ol-ink` | `#14121a` | 頁面底、最暗陰影 |
| `--ol-board` | `#1c1922` | 盤面、面板、卡底 |
| `--ol-leather` | `#3a2a20` | 敵人牌、按鈕底 |
| `--ol-gold` | `#d6b86a` | 細框、卡框主金 |
| `--ol-gold-deep` | `#8a6c33` | 金框暗端、徽章描邊 |
| `--ol-gold-pale` | `#f6d98f` | 金框亮端、內髮絲 |
| `--ol-mgold` | `#ffe3a1` | 魔法珠、強調字、焦點 |
| `--ol-bone` | `#e8e1d3` | 主文字 |
| `--ol-ivory` | `#d9cfbb` | 次文字 |

元素色一律取 `lib/beast-game/element-palette.ts`；其他色調用 `color-mix()` 由上表衍生，不新增 hex（血條紅為唯一例外）。

## 3. 框線
- 面板／盤面：`inset 0 0 0 1px var(--ol-hair)` 外框 + 內縮 3–4px 的 `--ol-hair-soft` 第二道髮絲線（雙線＝收藏盒感）。
- 卡片：2px 金屬漸層框 `var(--ol-rim)`（padding-box/border-box 技法）+ 內 1px 淡金髮絲 + 底部暗角。
- 圓角：大面板 14px、卡／敵人 10px、按鈕 6px。

## 4. 寶珠（寶石珠）
- 三層：金屬金邊（`--ol-rim`）→ 寶石本體（元素色與墨色 52% 混合，左上 34%/26% 高光徑向漸層，內下陰影）→ 斜 24° 橢圓光澤（opacity .26–.34）。
- 色＋形雙重編碼：風＝圓、空＝菱、水＝水滴、火＝三角、地＝圓角方（色弱可辨）。
- 字：600 字重、骨白混元素色、1px 墨色陰影。
- 魔法珠：金邊換 `--ol-rim-magic`；疊 conic 金箔切面（screen 混合），強度隨威力；外圈 1.5px `--ol-mgold` 光環；右上徽章金漸層、墨色數字。
- 選取／連線：放大 + 元素色 drop-shadow，光澤加亮；不改形狀。

## 5. 字體
- 標題、敵人名、群組標：`--ol-font-title`（襯線，字距 .04–.06em）。
- 介面字：`--ol-font-ui`；數字用 `tabular-nums`。
- 最小字 10px（徽章），內文 12–14px。

## 6. 卡框（厚重收藏卡）
- 比例 3:4，2px 金屬框 + 內髮絲 + 外墨描邊 + 6–14px 落地陰影，元素色只做微弱外光。
- 元素標、技能標：金／元素漸層小牌，1px 深金描邊。
- 能量條：墨底 + 深金描邊，填色元素色→淡金。
- 卡圖只用正式卡 `playableCards()/getCard()`，禁止舊卡。

## 7. 動態
- 只動 `transform`／`opacity`／`filter`；時長 160ms（互動）～420ms（攻擊），呼吸類 ≥1.4s。
- `prefers-reduced-motion: reduce`：所有動畫與過渡停用（魔法珠保留靜態光環與切面）。

## 8. 間距與行動裝置
- 基本間距 8px；觸控目標 ≥44px（珠格）／按鈕 ≥32px 高。
- 底部預留 `calc(120px + env(safe-area-inset-bottom))`。
- 390／768／1280 三寬度不得有橫向捲動；寬 ≥768 時加大標題與卡距。
