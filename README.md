# card-battle-v1 Next.js UI 套件

將本目錄內容複製進已有的 Next.js App Router 專案（`tsconfig` path alias `@/*` → 專案根目錄）。

## 放置位置

| 來源 | 複製到專案 |
|------|------------|
| `lib/card-battle-v1/` | `lib/card-battle-v1/` |
| `app/card-battle-v1/` | `app/card-battle-v1/` |

路由：`/card-battle-v1`  
頁面標題：注入變身・測試戰場

引擎為 `card-battle-v1` 的 `src/` 適配版（去掉 import 的 `.js` 副檔名，供 bundler 解析）。**UI 只渲染 `BattleState`，不自行計算傷害／變身。**

## 遊玩方式

1. 開啟 `/card-battle-v1`，開場自動 `createBattle`（測試友／敵卡 + `PLACEHOLDER_TEST_CONFIG`）並 `step({ type: 'start' })`。
2. 在 **玩家行動** / **選擇注入** 相位：
   - 點友方卡選注入槽，選消耗能量（1‥`min(energy, maxEnergySpendPerInject)`）。
   - 「注入」→ `choose_inject`；「跳過注入」→ `skip_inject`。
   - 可切「技能：手動」：點友方攻擊者、敵方目標、技能按鈕；注入／跳過前會先送 `choose_skill`（引擎否則在 `resolve_skills` 自動選技）。
3. 其他相位若卡住，按「自動續行」（`auto_continue`）。
4. 結束後顯示勝利／敗北，按「再戰」重置。

元素標籤僅顯示 风／空／水／火／地（絕不顯示 金／木／土）。

## 依賴

- React / Next.js App Router
- Tailwind CSS（板面使用 slate／amber／cyan 工具類）
