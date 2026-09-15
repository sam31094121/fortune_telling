# 《技能戰鬥檔案》｜太極命理・三戰兩勝

本目錄與 `public/技能戰鬥檔案/` 同步。正式運行以 `public/` 為準。

- 戰鬥功能、神獸卡片戰鬥功能：演出技能一律讀此檔
- 數值技能：仍只新增 `cards/skills/index.ts`（13 種 EffectType）
- 模式：三戰兩勝（best of three）
- 載入：`lib/beast-skill-archive.ts`、`GET /api/beast-skills?poolId=…`
- 本體：`public/beast-game/skill-bodies/{poolId}.webp`（技能檔對應）；對撞立繪仍優先 `public/beast-game/spirit/` 去背圖
- 文件：神獸卡的規則與演出制度只有一份 `docs/beast-game-skill.md`（十八章），本目錄只放執行期技能資料，不重寫制度
- 易經對手智能讀 易經/易經.json（新人導讀：易經/新人檔案.md；載入層 lib/beast-game/iching-skill-archive.ts）
