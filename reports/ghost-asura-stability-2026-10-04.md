# 新版鬼魅阿修羅：穩定性與正式引用收口

日期：2026-10-04。範圍是已確認的新版 /ghost-asura，非新增命理取法、非重設計、非舊版全面修復。本輪遵守「舊檔只讀、只動新版、先不提交」。

## 已重現及修補

1. **名稱受順序影響**：目前後端65項，原有41項命中固定ID映射，其餘24項按順序碰撞避讓生成。將清單倒序，14個名稱改變。新增固定對應，保留先前65項正常順序的所有名稱；目前固定ID登記77項（含12個不在本來源目錄的登記）。
2. **未知項目錯借身份**：正式查找以穩定ID為準，有未知ID不得按同名借另一個已登記身份。新ID中性代稱只依ID+版本，排序、原名別名和新增其他項目不改既有名稱。300個合成新增項與原65項未碰撞；這不是新增300條命理規則，hash也不是零碰撞保證。
3. **資料契約過鬆**：已重現未知柱位被丟掉卻仍PASSED。來源版本與65項完整ID清單現有獨立契約；缺ID、重複ID、未知版本、錯柱、命中無柱、未命中帶柱、缺時辰／未完成核心驗證、格式錯誤都不能靜默正常。錯誤使用既有不完整提示，不冒充合法零項。
4. **舊請求覆蓋**：已重現同一次render連送造成兩個計算請求。現在同步鎖定；輸入變動、鎖定、pageshow、到期重查、卸載時取消舊請求。即使底層忽略abort，舊成功、舊錯誤及舊finally也不能覆蓋新結果或解鎖新請求。
5. **来源資格分開**：保留sourceStatus/referenceMethod與reading.provenance。guard通過只表示本版資料傳遞，不能把來源待核改稱正統認證。

## 新舊引用查核

原先新版 extendName 直接引用 lib/asura-name-map.ts，narrative直接引用 lib/ghost-asura-wordings-core.ts。兩者均為舊阿修羅专屬資料。

- 相容語彙與hash helpers移入 features/ghost-asura/language.ts；未搬舊對照表／另一個算法。
- 與現版名稱相容的16份話術移入 features/ghost-asura/wordings.ts，現行customerWordings優先。舊的「洗魂之境／魅生之印／界外魅緣」等未覆蓋客戶已確認名稱。
- 新版features入口運行時不載入任何lib/*asura*模組；測試將後端舊specialStars.asura替換成錯誤名稱，新版輸出完全相同。
- 原共用八字、三核心、神煞後端保留；共有後端仍可能計算給其他頁的舊asura payload，新版不消費它。不能說整個後端已刪除舊程式。
- git diff --name-only -- lib docs/技能戰鬥檔案 無輸出：本輪未改舊算法與舊工程／文化來源文件。

### 歷史文件的實際限制

讀取阿修羅資料夾的檔案、來源庫、README，以及鬼魅阿修羅工程師規格。它們有不同階段的17/41/51、9家族與200+描述，不能視為本次計數或已驗證證據。README所指阿修羅.json與lib/asura-engine.ts當日未找到。現行新語系實有11家族；不依舊文件自動建第二套核心、人格引擎或改前端。

## 原始取法仍須誠實區分

本輪沒有新增／改動任何神煞公式。實際來源是 DUAL_SHENSHA_REFERENCE_CHART_V4，含 REFERENCE_CHART_1974_V1 參考取法。

65項來源登記中6項為VERIFIED、59項referenceMethod；1974-06-28男命酉時測例17種命中中，3項為既有VERIFIED登記、14項為參考取法。這是讀取既有狀態，並非本輪重新核定其原典。元辰另有《太黅》來源，既有單一袁本技能說明與實際後端仍有差異，本轮未掩蓋或擅自重算。

目前客戶的「待校核0」指輸出狀態，不代表原典待核0。傳遞正常不能對外稱全部取法獲權威／公權力認證。

## 測試與實景

通過：

- ghost-asura-stability：排序、單筆、別名、300合成擴充、輸出不變、不同人切換、來源契約／格式、來源狀態保留、舊資料隔離。
- ghost-asura-page-flow：真實頁面handlers的連按、重試、缺時、輸入變更、延遲成功／錯誤／finally、pageshow、到期、鎖定、卸載。
- ghost-asura-layout、customer-copy、home-entry。
- npm run test:ghost-asura-wiring；test:ghost-asura-viewport（多寬度資料一致性，不是瀏覽器幾何測試）。
- npx eslint features/ghost-asura app/ghost-asura/GhostAsuraPageClient.tsx。
- npm run test:bazi：81/0。
- npm run test:bazi-ziwei-cross：104/0。
- git diff --check。
- 新技能quick_validate及交付副本校驗。

真實本機瀏覽器：

- 正常登入已到期，先收到401並回到密碼頁；經正常密碼流程恢復，未改登入或绕過驗證。
- 填寫既有測例並重跑，仍為年3／月4／日4／時6，共17種；正常回應與顯示對上。所有印記及4張補充內容預設收合。
- 390px時柱卡內橫移與名稱點開可用，整頁無橫溢；已恢復原視窗尺寸。
- 頁面可見文字未出現八字、神煞、天煞、易經、原始干支或工程來源。原始資料仍保留於後端／稽核物件。
- .tmp/ghost-asura-layout-qa/stability-mobile-2026-10-04.png 為本輪手機實景；stability-final-2026-10-04.png 為本輪重算結果實景。

尚未通過／未做：

- npm run test:bazi-output-availability：前三支與後續多項通過，但舊雙命盤鬼魅卡折疊斷言在tests/dual-chart-iching-shensha-output.test.cjs:292失敗。
- 全站tsc仍在components/IchingShenShaAsuraSection.tsx、components/StarBeastHomeCard.tsx、tests/asura-wording.test.ts出現原有錯誤；新版專屬檔未見新增型別錯誤。
- 本輪未再執行整站正式build或全站health:check，不宣稱全站正常。舊檔依使用者要求未修。
- 17項測例與300合成擴充均不構成傳統取法獨立核定。

## 新技能與保存

可發現技能：C:/Users/DRAGON/.codex/skills/ghost-asura-integrity/SKILL.md
支援參考：同目錄references/project-contract.md
閱讀副本：C:/Users/DRAGON/Documents/Codex/2026-10-04/realtime-voice-chat/outputs/ghost-asura-integrity/

技能規定新版單一正式轉譯、舊檔只讀、資料與呈現分工、版本演進和測試。它不授權推送，不保證永遠不出錯。未修改其他既有技能。

尚未提交、推送或發布。main已有先前1個未推送提交，工作區保留原有及本輪未提交變更。
