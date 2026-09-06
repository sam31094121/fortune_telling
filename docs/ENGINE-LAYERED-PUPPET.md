# Engine Layered Puppet（分層傀儡引擎）

## 為什麼用引擎而不是 mp4

人審（human gate）連續判定「整身 Ken Burns／假動態」失敗：

- v2：pose crossfade + Ken Burns，咬擊不像咬
- v3：full_body 墊底 + 整身縮放，jaw/limb/tail 獨立動幾乎不可見

引擎路徑（`engine_layered_puppet_v1`）在瀏覽器以 **rAF + CSS transform** 驅動各層，讓顎／肢／尾各自可見地動。`full_body.png` **僅存檔**，禁止拿來做 Ken Burns。

mp4（`chargeVideoFor`）仍保留為 **資產缺失／404 時的 fallback**。

## 資產路徑

專案根：`C:\Users\DRAGON\Desktop\命理`

| 用途 | 路徑 |
|---|---|
| 傀儡根 | `public/beast-game/puppets/` |
| 樣張 a01 | `public/beast-game/puppets/beast_a01/*.png` |
| Manifest | `public/beast-game/puppets/beast_a01/manifest.json` |
| 舞台 | `public/beast-game/stage/default/circus_arena.jpg` |
| 元件 | `components/BeastLayeredPuppet.tsx` + `.module.css` |
| 接入 | `components/BeastDuelRitual.tsx` |

公開 URL：

- `/beast-game/puppets/{poolId}/manifest.json`
- `/beast-game/puppets/{poolId}/{layer}.png`
- `/beast-game/stage/default/circus_arena.jpg`

## Manifest 層順序

`torso` → `rear_limb` → `tail` → `front_limb` → `head_upper` → `jaw_mouth`

## 6.0s 時間軸

| 段 | 秒 | 行為 |
|---|---|---|
| build | 0–1.8 | 呼吸 scale≤1.03、顎閉、尾輕擺 |
| rush | 1.8–3.8 | 上／前平移、肢交替 ≥12% 寬、尾 ±20°+ |
| bite | 3.8–6.0 | 顎 scaleY→~1.8 再 snap 1.0、頭前衝、白閃、hold |

## UI 觸發

三戰兩勝儀式 → 逐張揭牌 → 某一對 `pairClash` 開始衝鋒時：

1. 若玩家該卡 `poolId`（如 `beast_a01`）有 puppet manifest → 顯示 `BeastLayeredPuppet`
2. 否則 → `chargeVideoFor` 播 webm/mp4

## 安裝

MSI 重連後執行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Install-EngineLayeredPuppet.ps1
```

（腳本預設目標 `C:\Users\DRAGON\Desktop\命理`，可由參數覆寫。）
