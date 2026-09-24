# 太極手機控制基準審查（2026-09-24）

使用者授權：保留手機功能，驗證第 1／24 層、反向返回、離開頁首的原生捲動，再更新可信基準。

歷史差異：`git diff 3e2d1fd^ 3e2d1fd -- lib/taiji-journey-depth.ts` 僅新增觸控增益 `0.02`、頁首容差 `8`、`shouldDriveTaijiFromPageScroll`；既有時間、相機與分層常數未變。

此次不改正式運算與手機控制程式。只更新 `LEVEL_02_TO_24_BASELINE.json` 中 `lib/taiji-journey-depth.ts` 的 SHA-256：

- 舊：`3d7dc730494b3d241718476ee0d335418311fdd5e404c504528ee6b5c215be06`
- 新：`36edb7b37b1d5dd8403dfc4f8eeb529802effe8bbd6085feb1571c5f5c8964e5`

其餘檔案指紋、層級時間、分層狀態、來源標記與隔離檢查全部保留。

`taiji-first-screen-scroll.test.cjs` 現在轉譯並執行正式 TS 程式與 React hook 註冊的事件處理器，不再重寫政策。測試涵蓋層級端點、過量滑動夾限、向前／向後、頁首容差、離開頁首不 preventDefault、輸入框／縮放／多指保護與事件清理，並核對所有受保護常數和分層狀態。

`taiji-level-02-24-lock.test.cjs` 每次執行都先跑此行為測試，因此重新更新指紋不能略過行為驗證。

已通過：滑動行為、第 2–24 層鎖定、第 1 層物理、iOS 可見性、第 1 層 UI 邊界測試。事件測試採模擬 DOM，並非 iPhone 真機觸控驗收。
