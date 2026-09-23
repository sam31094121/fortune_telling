# 卡牌戰鬥 V1（注入／變身）

行動優先（mobile-first）命運占卜站用的注入→變身卡牌戰鬥核心。  
玩家面向元素：**风、空、水、火、地**（絕不顯示 金／木／土）。

## 怎麼跑完整迴圈

```bash
cd /workspace/card-battle-v1
npm install          # 安裝 tsx / typescript
npm run loop         # 等同 npx tsx scripts/run-loop.ts
```

或：

```bash
npx --yes tsx scripts/run-loop.ts
```

腳本會：

1. 斷言隊伍不可重複 `cardId`
2. 斷言玩家標籤僅 风空水火地
3. 斷言變身同時更換外觀 + 數值 + 技能
4. 以 5 友 + 5 敵測試卡跑完整狀態機直到勝利／敗北／回合上限
5. 列印相位轉換與最終 `BattleState` 摘要

型別檢查：

```bash
npm run typecheck
```

## 模組結構

| 路徑 | 職責 |
|------|------|
| `src/config/battle-config.ts` | 所有可調參數（禁止引擎內魔法數字） |
| `src/element-engine/` | 玩家元素 ↔ 內部五行（私有 map） |
| `src/injection-engine/` | 耗能注入，回傳 deltas，不負責變身 |
| `src/transformation-engine/` | 依累積與門檻推進階級；外觀+數值+技能一併換 |
| `src/beast-engine/` | 四大神獸介面＋空登錄（青龍／白虎／朱雀／玄武） |
| `src/reward-engine/` | 結算獎勵 stub |
| `src/battle-engine/` | `BattleState`、`createBattle`、`step` 狀態機 |
| `src/data/test-cards.ts` | Phase 1：5 友 + 5 敵測試卡 |

## 狀態機相位（固定順序）

```
init → player_action → produce_energy → select_inject → resolve_inject
→ check_transform → resolve_skills → resolve_damage → enemy_action
→ resolve_status → check_victory → next_turn →（循環）→ ended
```

UI **只渲染** `BattleState`，數值計算全在引擎。

## 可配置項（`BattleConfig`）

- `inject.maxEnergySpendPerInject` — 單次注入能量上限（可為 `null`＝未設定）
- `inject.maxInjectsPerSlotPerTurn` — 每回合同槽注入次數上限
- `inject.energyToInjectPoints` — 能量→注入點換算
- `transform.tierThresholds` — 各階級門檻陣列
- `energy.energyPerTurn` / `startingEnergy`
- `team.maxTeamSize`（產品＝5）／`disallowDuplicateCardIds`
- `turn.maxTurnsPlaceholder` — 測試用回合上限

`PLACEHOLDER_TEST_CONFIG` 內數值**僅供測試跑通**，不是產品定案。

## 明確尚未決定（請勿當成已定）

- 注入上限的正式數值
- 變身總階級數與正式門檻
- **四大神獸**：倍率、召喚條件、誰最強、獲取方式（V1 僅有鍵名與介面 stub）
- 獎勵掉落表／經驗／貨幣
- 總卡池 60 張的正式資料（Phase 1 僅 10 張測試卡）

## 元素對應（唯一集中層）

| 內部五行（私有） | 玩家標籤 |
|------------------|----------|
| metal／金 | 空 |
| wood／木 | 风 |
| water／水 | 水 |
| fire／火 | 火 |
| earth／土 | 地 |

公開 API 回傳字串若含 金／木／土 會直接 throw。

## 設計約束摘要

- 隊伍最多 5、同 `cardId` 不可重複
- 變身＝外觀 + 數值 + 技能一起換（不是攻擊-only buff）
- 四大神獸與注入／變身分離；V1 不發明數值
- 不依賴 MSI 程式碼；本目錄獨立實作
