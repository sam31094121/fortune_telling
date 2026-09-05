# 太極命理・資料總覽（整理更新）

> 更新時間：2026-09-06 01:16 (UTC+8)  
> 用途：把神獸決鬥／技能戰鬥檔案／8888 接線／站立指令收成一份可維修總覽。

---

## 1. 專案座標

| 項目 | 值 |
|---|---|
| 品牌 | 太極命理／天宿命理 |
| 本機專案 | `C:\Users\DRAGON\Desktop\命理` |
| 本機開發 | http://localhost:8888/ |
| 線上站 | https://heaven-earth-humanity-pair.vercel.app/ |
| 核心口號 | Analyze once, companion for life |
| 溝通 | 繁體中文 |

主要前台路由：`/match` `/music` `/nameology` `/numerology` `/insight` `/bazi` `/zodiac` `/red-luan-heartbeat` `/tarot` `/star-beasts` `/growth-center` **`/beast-game`**

---

## 2. 神獸決鬥現況（已完成）

- 模式：**三戰兩勝**（既有 Game Core `playSeries`）
- 卡池：**60**（`beast_a01–a28` + `beast_y01–y28` + 四象）
- 客戶試玩審查：通過
- 本機 8888：已接入，健康檢查通過

### 技能共存（不可互相取代）

| 種類 | 來源 | 用途 |
|---|---|---|
| 數值技能 | `cards/skills/index.ts` + Effect Engine 13 種 | 結算傷害／增益 |
| 演出技能 | 《技能戰鬥檔案》`skill_charge`／`skill_hit`／`skill_ready_battle` | 本體衝鋒／命中／隨時戰鬥 |

`/api/beast-game` 同時回傳 `skills` + `battleSkills`；詳情頁兩區塊並排。

---

## 3. 檔案地圖（共用）

### 公開資產
- `public/skill-battle-archive/` — 《技能戰鬥檔案》（Windows 相容英文路徑；顯示名仍為技能戰鬥檔案）
  - `index.json` 總表
  - `cards/{poolId}/skills.json` 單卡
- `public/beast-game/skill-bodies/{poolId}.webp` — 60 張戰鬥本體
- `public/beast-game/spirit/` — 去背立繪（對撞優先用此）

### 程式接線
- `lib/beast-skill-archive.ts` — 讀取技能戰鬥檔案
- `lib/beast-battle-fx.ts` — 演出音效／立繪；再匯出 archive helpers
- `cards/skills/battle-presentation.ts` — 演出技能登錄對照
- `cards/skills/index.ts` — 數值技能 + 再匯出演出對照
- `app/api/beast-skills/route.ts` — `GET ?poolId=`（`force-dynamic`）
- `app/api/beast-game/route.ts` — 卡池／決鬥；共存欄位
- `components/BeastDuelRitual.tsx` — 預載演出技能、交鋒顯示

### 文件／站立指令
- `docs/STANDING-ORDER-右側螢幕連結健康檢查.md`
- `docs/skill-battle-archive/` — 技能檔文件副本
- `docs/beast-game-skill.md` — 既有遊戲技能規格（含技能戰鬥檔案段落）

### 我方電腦輔助
- 技能： [右側螢幕連結健康檢查](sand-workflow:skill-1788628138735)
- 看板：`http://127.0.0.1:8899/health-8888-board.html`（維修時用）

---

## 4. 站立指令（以後一律）

觸發：**開啟**／**健康檢查**／要看連結／精準維修

1. 先連結目標服務做真實檢查  
2. 開啟右側螢幕顯示證據  
3. 畫面上必須有流程箭頭：`後端 → 看板 → 右側螢幕`  
4. 截圖交給使用者（不可只回文字）

---

## 5. API 速查

| 路徑 | 說明 |
|---|---|
| `GET /api/beast-game` | 60 卡＋數值技能＋battleSkills |
| `GET /api/beast-skills` | 技能總表 |
| `GET /api/beast-skills?poolId=beast_a01` | 單卡演出技能 |
| `/skill-battle-archive/index.json` | 靜態總表 |
| `/beast-game` | 組陣台／三戰兩勝 |

抽樣（整理時）：角木蛟 `skills=3`、`battleSkills=3`（charge／hit／ready_battle）、`coreVersion=1.3.0`

---

## 6. 待辦（未完成）

1. **封鎖公開後台** `/platform-center`、`/platform-control-center`  
2. **Commit／推上線**（本機改動尚未部署到 Vercel）  
3. （可選）區網讓我的電腦直連本機 8888，嵌入真頁而非僅看板

---

## 7. 維修原則（濃縮）

- 後端先算，螢幕後證  
- 數值技能不進演出檔；演出技能不進 Effect Engine 亂結算  
- 對撞立繪優先 `spirit` 去背；`skill-bodies` 是技能檔戰鬥素材  
- 不另造第二套戰鬥引擎  

---

## 8. 變更摘要（相對整理前）

- 60/60 戰鬥資產與技能戰鬥檔案已進本機 public  
- 8888 共存接線完成並健康檢查通過  
- `/api/beast-skills` poolId 靜態快取 bug 已修  
- 右側螢幕連結健康檢查已列技能＋站立檔案  
