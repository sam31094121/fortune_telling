# 兩項健康檢查失敗複核

日期：2026-11-20。範圍：八字來源完整性、雙命盤神煞顯示檢查；未改公式、來源政策、卡片或測試標準。

## 本輪實際重現

- `checkRegistry()`：19 筆主張，11 通過、8 失敗。完整輸出見 `registry.json`。8 筆的 missingSources 均為空；不是來源 ID 遺失。
- `checkShenShaDisplay()`：3 個實際後端運算及 SSR 命例，deliveryOk=true、requestedScopeComplete=true、sourceVerified=false；59 項來源待核警告。完整輸出見 `shensha-display.json`。這不是瀏覽器互動驗證。
- 沒有變更程式，因此未重跑完整 68 項健康檢查；前輪 66/68 為歷史結果，不冒充本輪全站結果。

## 來源缺件

| 主張 | 尚未解決的證據問題 |
| --- | --- |
| C-BAZI-CLASSICS | 版本、作者與內容增竄衝突；授權、來源等級及可追溯性不足 |
| C-BAZI-VALIDITY | 授權、版本追溯及交叉來源可信度不足 |
| C-RED-LUAN-SHENSHA | 月份、人物外型職業等仍屬本站詮釋；不得以年支定位核對代替整筆核定 |
| C-RED-LUAN-YEAR-BRANCH | 登記明載 S-ZWDS-QUANSHU-RULES 引用授權須人工確認；不能代填 PASS |
| C-BAZI-FIVE-GODS | 五神取法衝突、缺原典及資料來源；不可改已核定算法消除警告 |
| C-SHENSHA-RULE-INTEGRITY | 只有兩份本站來源，缺原典及第三方交叉證據 |
| C-ASURA-LIFE-STAGES | 古籍未記四柱歲數分界；現代統計不能證實命理歲數對應 |
| C-ASURA-GOLD-WORDING | 本站自撰候選句庫，沒有第三方來源；登記明文禁止寫成已交叉驗證 |

神煞顯示檢查刻意同時檢查傳遞、指定範圍與來源；參考取法可以正常顯示，但不得把 PENDING_POOL 改稱 VERIFIED。沒有找到可在保持現有門檻的前提下修正成全數通過的程式錯誤。

## 提交狀態與後續所需

本輪只新增本目錄的稽核證據。工作區另有他人修改的 `app/nine-grid/page.tsx`，未介入。由於兩項仍失敗，依 AGENTS.md 提交門檻，不提交或推送。

後續需要可追溯的原典版本與頁碼、對應主張的交叉證據，以及授權待核來源的人工確認紀錄；這些不是一般工程修復授權可以代替的證據。來源治理明文規定「沒有人工確認過的外部條款一律『待查核』，不得代填 PASS」。
