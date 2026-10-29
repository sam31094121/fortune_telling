# 戰鬥卡面發布檢查回歸（2026-10-29）

## 根因與已提交依據

- `beast_y14: original artwork exists` 是測試把 `/beast-game/front/young-14.v2.webp?v=6` 當作磁碟檔名。實際原圖存在，獨立逐張檢查 60 張原圖：缺漏 0。改以 URL pathname 查檔，加入真正不存在檔案的負向檢查。
- `git blame` 顯示單一 img、256×384、`.art img` / `.portrait` contain 斷言都來自 `16e86145`（2026-09-09）。
- `0bac65d5`（2026-10-24）已把中等、困難及卡面查看改成 `BeastCardFace`；`a513fb6` 同日統一全站完整卡面並保存六十卡基準。現行元件使用一個主圖及一個 aria-hidden 裝飾背景，同獸的三種響應式圖片來源，全卡 63/88、圖窗 4/3。圖窗 cover 是既有等比裁切，不是完整原圖無裁切。
- `c3c713c4`（2026-10-28）已隱藏 Arena 傷害與護盾字，保留生命 aria、血條與命中狀態。
- `6b98bddd`（2026-10-26）已將玩家實際出戰卡移到 BattleDock，Arena 不再重複顯示，因此玩家換卡動作應在 Dock 驗證。

## 本輪修改範圍

僅更新 `tests/beast-battle-mode.test.cjs` 的過期實作斷言；沒有修改卡面、戰鬥玩法、後端傷害、押注或收藏。

現行測試逐張驗證：

1. 一個非裝飾主圖，所有 img / srcSet 均屬同一獸，所有對應檔案存在，原圖仍是響應式來源。
2. 故意增加第二主圖、混入另一獸的圖片都必須失敗。
3. 全卡與共用框維持 63/88，圖窗 4/3，cover 配合既有等比 scale，不改成不等軸拉伸。
4. 回到操控按鈕仍顯示，正常及缺資料兩條路徑的按鈕皆接到 `onClose`。這是靜態渲染與 AST 接線檢查，不冒充瀏覽器實際點閱。
5. 精確損傷、反擊、回血、護盾上限、舊紀錄與換卡不假造傷害的引擎斷言原樣保留；畫面驗證實際剩餘 HP、血條及命中標記。
6. 換卡動作驗證真正的玩家 Dock，且換卡不能播神獸命中動畫。

## 執行結果

- `node tests/beast-battle-mode.test.cjs`：完整通過。
- `node tests/beast-rig-direction.test.cjs`：通過。
- `node tests/beast-rig-motion.test.cjs`：通過。
- `node tests/beast-ritual-rig.test.cjs`：通過（含真實 EASY/HARD 隔離 session、HARD boss、舊 revision 拒絕、正式環境拒絕）。
- `npm run build`：exit 0；前置 6146 項檢查通過，Next 編譯及型別檢查通過，43 頁生成完成；產物使用 `.next-production`，未覆蓋 dev 目錄。存在既有 lint warnings。
- `beast-rig-body.test.cjs`：中途並行變更後，第 85 行 `non-feline running keeps gathered and stretched poses` 曾失敗。負責代理完成青龍同構圖 run 修復，測試改為分獸驗證：朱雀保留收翼／展翼，青龍全程一個不透明的同構圖本體，並檢查爪、軀幹、尾巴連動。最新重跑完整通過。
- 最後一輪使用遇失敗立即停止的串行 runner，依序執行 battle-mode、rig-body、motion、direction、ritual 五檔，整體 exit 0；不是只看最後一個命令的回傳碼。
- 青龍同構圖 run 完成後再執行一次 `npm run build`：exit 0，編譯 6.7 秒、型別檢查、43/43 靜態頁及 build traces 全部完成；前置 6146 檢查通過，仍有既有 lint warnings。這是最新版程式建置證據，實際畫面與實戰驗收由主線另列。

沒有提交或推送；Git 保持 main，工作樹有本輪及其他代理的未提交變更。
