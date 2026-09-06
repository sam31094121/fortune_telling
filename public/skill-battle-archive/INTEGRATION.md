# 《技能戰鬥檔案》｜太極命理・三戰兩勝

公開路徑（Windows 相容）：`public/skill-battle-archive/`
顯示名稱仍為「技能戰鬥檔案」。

- index：`/skill-battle-archive/index.json`
- 單卡：`/skill-battle-archive/cards/{poolId}/skills.json`
- 本體：`/beast-game/skill-bodies/{poolId}.webp`
- 載入：`lib/beast-skill-archive.ts`
- API：`GET /api/beast-skills?poolId=beast_a01`

六秒生產流程：`npm run sync:beast-production` 將每隻的 `production.canonicalReference`、原圖 SHA-256、時間軸、聲音候選與審查工作單連至兩份單卡技能檔及總表。`body` 是既有技能展示圖；六秒影片以 `production.canonicalReference` 為外形判準。

六十隻製作登錄總表在 `/skill-battle-archive/production-catalog.json`，由 `index.json` 的 `production.registrationCatalog` 連入。每隻 `skill_charge.production.registrationStatus=registered` 表示已列入戰鬥技能檔案；實際影片數、缺片數、聲音候選數分別計算。

- `production.candidate`：已核對檔案存在、來源雜湊及六秒時長的目前可審查版本；包含對手 ID、候選與預覽雜湊。`workspaceFile` 是工作區審查檔案，並非公開影片 URL。
- `production.sourceScene`：起始圖片、完整提示詞／細修提示詞紀錄及來源雜湊，僅在登錄資料與雙方本體都吻合時加入。此欄不是影片，不能增加 `candidateMovies` 或建立影片播放欄位；沒有送出影片時 `latestAttempt` 維持 0。
- `production.review`：連到對應版本的獨立畫面記錄、具體細修原因與待確認部位。模型 pass 不能代替聲音聆聽或完整聲畫驗收；過期雜湊的審查不引用。
- `production.voice`：每隻登錄原聲、來源／候選雜湊與製作來源紀錄；技術轉檔通過與聲畫表演通過分開記錄。
- `production.latestAttempt` 與 `production.candidate.attempt` 分開保存。新版本受限時，舊候選仍可查回，但保留舊版本自己的對手與配方，不套用新任務的身分。
- `production.blocker`：目前生成限制的種類與供應商回報時間；不把付費授權、使用者完成調整的通知或技能登錄當作供應商已恢復服務。

同步不寫入影片播放欄位、不更改 `release`。60 隻都已登錄，不代表 60 支影片已完成。再次執行同步會核對來源與檔案，沒有變動時不重寫技能檔。

單純存在 `video` 不會在實戰播放。`lib/beast-charge-release.ts` 要求 `release.status=approved`、6000ms、當局玩家和對手身分完全相符、逐部位全數有結果及玩家聲音通過；有通用陪練對手的候選只能用於技能展示。

`npm run check:beast-releases` 交叉驗原圖與影片雜湊、審查證據、MP4／WebM 聲畫解碼及容量。預設可報 pending；要求整批完成時執行 `npm run check:beast-releases -- --require-all`。候選及靜態備援不計入 approved。
