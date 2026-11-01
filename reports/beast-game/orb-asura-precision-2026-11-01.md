# 寶珠戰／阿修羅精準修補驗收

## 授權與界線

僅 `/beast-game/match3-hard` 現行寶珠戰。沿用單一敵方反擊入口、六十張卡技能資料、既有進度與收藏；不修改命理阿修羅或其他首頁卡片。

業主最新規格取代舊攻擊門檻：同色相鄰三顆可消除，四顆起攻擊；保留斜連、禁止跳格／交叉／重複、數字珠權重與盾牌契約。前端說明及測試同步。

阿修羅為本模式敵方核心的正式定義。既有敵方規則整理為專用權威檔，不能只換名稱，不能將未串接卡片效果列為已完成。

業主另明確批准：普攻公式保留；原卡技能沿既有 effects 引擎另外結算，使用原始數值。速度只影響同輪順序，不加快動畫；無牌庫的抽牌效果列為不適用。

## 本輪確認的故障

前版掉落每幀上限為 16.67ms，導致 1000ms 演出在 30 FPS 耗時約 2033ms。改為實際可見時間後，60 FPS 約 1017ms、30 FPS 約 1033ms，差異為幀量化。畫面完全停頓時無法補出不存在的影格，不為逐顆補演而拖慢遊戲；保留先原珠後新珠的階段順序。

連線按鈕有未納入既有清理集合的短暫計時器，本輪納入同一離場清理。

僅增加敵方總攻擊預算不足以保證單次反擊變強：500 seed 初查有 136 個相鄰關卡的最強單卡攻擊未增加或下降（seed 3 的 23 → 22）。整輪中性目標能力預算與策略候選須一起檢查，不能用總數上升宣稱所有實戰變難。

## 驗收狀態（程式與模擬通過，真機待驗；提交前快照）

- 三顆有效、四顆起攻擊：核心、關卡及畫面一致；實拖三顆為零傷害、四顆有傷害，寶珠完整回歸通過。
- 指定短說明、手機主要操作同屏：原卡合法 HP／滿能量，320×568 技能鈕底部 556.03、390×844 為 812.22、768×600 為 578.69，無橫捲；頁腳仍可捲，不影響主要戰鬥同屏。10000 HP 技術 fixture 曾多換一行，不冒充原卡自然畫面。
- 反擊來源、目標、實扣傷害、HP：使用核心逐事件資料；敵我同 cardId 另帶陣營，修正技能文字誤掛；真傷被回血抵銷仍保留出卡演出。
- 阿修羅單一策略：同一 resolver 預演及結算，遵守技能次數／護盾／暈眩／速度；第十二級有限前瞻保留前級候選。500 seed 無退步、233 組更佳，另 100 次預演確認真實 HP／次數／狀態不被污染。
- 第 8～12 關 500 seed 驗證 HP／總攻擊／中性整輪能力逐級增加，1～7 原基礎配置不變。中性整輪能力 17／18／20／80／86；第十一關沿既有四獸整輪反擊，仍有明顯壓力跳升，不能宣稱自然勝率或平滑難度已驗證。
- 原效果引擎適配專項：四獸完整招牌效果、技能次數、護盾先吸收、實扣 HP、來源與目標不變性及完整敵方畫面接線通過。
- 玩家承受狀態專項：暈眩時消珠但不出手、有效攻擊力減益、持有者回合到期、原卡攻擊不改通過。UI 受控能量鈕停用且不得加入連線；解除後能量攻擊／連線真扣血與耗能正確（高 HP 技術 fixture，非自然勝率證據）。
- 同回合未出手倒數與已出手重送均去重；全盾吸收不觸發受傷、過殺只回報剩餘 HP、死亡不反應。三盾整輪減半涵蓋技能，順序為原傷→減半一次→盾→HP。
- 事件歷史限制最近 512 筆並離場清除；2000 筆全部照常送達，訂閱陣列不更換。
- FPS 時鐘：60／30／15 FPS、長幀、背景暫停及取消測試通過；200 次完成／取消無殘留 runner RAF／監聽器。
- 隔離手機尺寸 7 次實拖：含盾牌、4 倍 CPU、畫面尺寸變化與背景返回，56 格及操作解鎖正常。
- 資源取樣：documents 維持 1，DOM 與 listener 取樣有回落；尚不足證明長時間無記憶體洩漏。
- 小米與其他品牌真機、實際音效／發熱：未連線，未驗收，不以模擬代替。
- 完整 48 項發布檢查全部通過，目錄 `Temp/beast-asura-precision-gate-1793517522795`，`gate-result.json` 無失敗。其後白虎 DAMAGE→STUN 展示彙整小修已再通過正式編譯、完整寶珠與公平性回歸，目錄 `Temp/beast-asura-display-final-1793518122363`。此為提交前快照，正式部署另以平台與正式站核對。
- 最後技能徽章實驗：白虎依原卡先 303 再 102，顯示最後相關技能「空斷 −32」，不跨技能累加；同次 DAMAGE＋STUN 彙整由核心提供，來源卡僅技能名、真受傷卡顯實扣，同名我方白虎不誤掛。純 helper 與實際技能局皆通過。
- 本輪連續 30 次有效操作、至少 315 秒：每次 56 格、操作恢復、零 Runtime 錯誤；前十次平均流程 5.65 秒、後十次 4.92 秒，未觀察越玩越慢。單次時間包含掉落與技能演出，不是觸控延遲基準。固定 CPU1 隔離 Edge，高 HP 技術 fixture、同機發布檢查負載，不當自然勝率／真機證據。
- 長玩 documents 固定 1；DOM 983→948→959→966、listeners 711→659→669→671；JS heap 18.78→18.57→17.79→17.89MB、休息後 17.88MB。存在自然回落；embedder heap 7～72MB 波動，未強制 GC，不保證長期零洩漏。
- 三次 Board 卸載／重入：先移除盤面再重建 56 格與第一回合；四個 AudioContext 均關閉、最終動畫零、錯誤零。documents 1、DOM 峰 6449 後回 2301、listeners 1340 回 831。受控卡四珠真拖仍零傷害且照常消珠；能量／連線也不能繞過暈眩。

證據：`Temp/refill-fps-resource-audit-20261101.json`、`Temp/match3-campaign-qa-78s9hK/evidence/drop-report.json`。

## 業主 25 項逐項對照

| 項目 | 狀態與證據界線 |
|---|---|
| 1 簡短進場說明 | 已接，短暫顯示且可立即操作 |
| 2 四方向／斜向文案 | 已與同色相鄰判定同步 |
| 3 三顆有效 | 核心與實拖通過，三顆不造成普攻傷害 |
| 4 四顆起攻擊 | 各關固定四顆，核心與實拖通過 |
| 5 更多顆數效果 | 既有權重、合成、盾牌與充能回歸通過 |
| 6 核心近正方形 | 保留 7×8、56 顆圓珠，以可用高度限尺寸 |
| 7 不裁切 | 已測手機／短平板／桌面範圍通過，非所有實體手機保證 |
| 8 主要操作不用捲動 | 合法原卡 HP、滿能量按鈕三尺寸同屏通過 |
| 9 敵方來源清楚 | 來源卡及陣營標示、最後技能顯示複驗通過 |
| 10 我方受擊卡清楚 | 目標陣營與卡片已分開，同 cardId 不再誤掛 |
| 11 輕量受擊 | 位移／閃爍／數字與血條；實機幀率仍待測 |
| 12 唯一阿修羅核心 | 原 counterPhase 入口接單一 planner 與原 effects |
| 13 無第二套 AI | 預演／結算共用 resolver，未為四獸建立獨立 AI |
| 14 第 1～7 關基礎 | 原對手與基礎數值回歸不變；攻擊門檻依本次明確改為四顆 |
| 15 第 8 關提高 | 既有配置一神獸起步，策略及預算提高 |
| 16 後續逐關提高 | 500 seed 預算單調檢查通過，並非任意戰況傷害保證 |
| 17 判斷升級 | 目標候選、原技能預演、合法速度及有限前瞻逐級開放；最高既定策略層後維持能力、數值繼續成長 |
| 18 四獸統一控制 | 同 planner／resolver＋各自原卡技能 |
| 19 第一次至第五次增加 | 第 8～12 關預算檢查通過 |
| 20 第五次最高 | 同基準能力預算最高；自然勝率仍需更多實玩 |
| 21 小米及其他真手機不越玩越慢 | 未接真機，未驗收，不可勾全過 |
| 22 FPS 不造成慢動作 | 60／30／15 FPS 實際時間與長幀測試通過 |
| 23 切關資源清理 | runner 200 次清理、事件歷史上限、三次 Board 卸載／重入通過；音源關閉且動畫清零，長期真機仍待測 |
| 24 連玩不衰退 | 本輪至少五分鐘／30 次有效操作未觀察速度衰退，資源有回落；不當真機長時保證 |
| 25 正常功能不破壞 | 48 項完整發布門檻通過；最後展示小修再編譯、寶珠與公平性回歸通過 |

專項證據另見 `Temp/match3-campaign-qa-siiDag/evidence/skills-report.json`、`Temp/match3-campaign-qa-PKfRIw/evidence/skills-controls-report.json`、`Temp/match3-campaign-qa-xyVxdG/evidence/skills-legalhp-geometry.json`。臨時目錄證據保留於本機，完整發布紀錄在本輪 gate 目錄。

本輪連續／重入證據：`Temp/match3-campaign-qa-n0H790/evidence/skills-longplay-report.json`、`Temp/match3-campaign-qa-8Cvldd/evidence/remount-report.json`。

最後徽章證據：`Temp/match3-campaign-qa-J9oKm1/evidence/skills-marker-final.json`。不得將上述模擬／技術 fixture 宣稱為 25 項全部實機通過。


## 追加：恢復手機可操作的寶珠尺寸

業主回報近正方形調整後寶珠過小，明確要求恢復前一版尺寸並避免拖珠時上下晃動。故障原因是新增依可視高度扣固定410／360px後再限制盤寬，320×568下盤僅約182px、單珠約24px。本次只移除兩條高度限寬，恢復依可用寬度呈現7×8盤，增加局部overflow-anchor:none；保留安全區、touch-action:none、56格及全部戰鬥規則。

本機瀏覽器觸控模擬：320×568與320×480盤寬304px、單珠39.81px；390×844盤寬374px、單珠49.28px。三尺寸拖珠至補滿56格，scrollY前後相同、scroll事件0、無橫向溢出及頁面例外。我方卡可主動捲動到達。極矮螢幕仍需要主動捲動查看卡片，不宣稱全部內容同屏；沒有以裁切或縮珠掩蓋限制。證據：本機Temp/match3-campaign-qa-MQrthx/evidence/restored-size-report.json。

本次npm run build及test:beast-fairness通過，編譯保留既有lint警告。這是尺寸與頁面位移修復，不代表先前主執行緒長停頓後整批落定的問題已修好，也不代替Android／iPhone真機驗收。

最新隔離production build再驗：127.0.0.1:9194/beast-game/match3-hard，三尺寸可見「簡單·4顆可攻擊」（起始進度label），盤與單珠尺寸一致、拖珠補56及scroll差0、errors0。證據：Temp/match3-campaign-qa-aHqyOI/evidence/restored-size-report.json。測試服務／瀏覽器已關閉，未動使用者8888。


## 追加：五對五、末位唯一神獸與清楚反擊

業主明確取代逐隻增至四獸的舊設定：第1關仍五幼子、第2–7關仍五成獸；第8關起前四格成獸、第五格唯一神獸，後續不增加神獸席位，所有關卡單卡反擊。沿用原名單首隻神獸，不新增固定輪換順序；原始卡檔及技能不改。

總ATK/HP沿原線性遭遇預算，單次基礎攻擊峰值改從第7關最大值逐關增加，第8–12關為16/18/20/22/24，取代原第11關四獸合擊跳變。末位神獸基礎ATK不低其他四張，但實傷仍受原技能與屬性克制影響，不宣稱所有情境全面最強或保證玩家獲勝。

關卡1–16每關500種子、8–12預算每關500種子、高關及安全整數邊界驗證通過。完整test:beast-match3與test:beast-fairness通過；前七關、原卡資料、4珠門檻、數字珠、盾牌、收藏保存保持。

第8/11/12關隔離手機瀏覽器真觸控連珠：五敵位、末位唯一白虎、普攻軌跡最多1條且技能來源同一敵卡，補滿56格與操作恢復，無橫溢/頁面錯誤。證據本機Temp/match3-campaign-qa-hQFqOe/evidence/five-versus-five-report.json；非Android/iPhone實體機，不代表長期自然勝率驗收。

追加UI授權：頂列改實際第N關（wins+1）與4顆攻擊門檻；反擊單條線2px改4.5px圓端、360ms單次前進停留淡出，原命中圈加柔和填色，移除該線drop-shadow；沿用原420ms反擊窗口及傷害，不加粒子或連續閃爍，減少動態設定保留。

最後追加五元素光束：依實際出手卡ID及element讀既有色盤；風弧、水波、火折、地直束、空弧，白虎空屬性採紫白折電視覺，未增雷系技能。單條SVG路徑偏移上限14px、源端與命中端保持精準；無新粒子/迴圈/額外傷害。新增五色、端點、範圍與白虎特例回歸通過並納入test:beast-match3。

業主追加確認沙漏會誤導：困難版移除待機倒數及永久緊急紅框，只在counterFoes真實出手期間顯示反擊中，aria-label同樣取消每卡幾步後反擊預告；其他模式倒數規則及顯示不動。

最終五屬性技術fixture驗收：每次指定一張真卡為唯一反擊來源，五色與路徑/命中一致、減少動態無動畫、56格恢復、errors0，非自然通關證據。Temp/match3-campaign-qa-QPm6Bq/evidence/five-element-beam-report.json；正常第11關沙漏替換待機0→真白虎反擊中1→結束0，Temp/match3-campaign-qa-0mb3HI/evidence/counter-badge-final-report.json。最後UI修改後npm run build通過（既有lint警告保留），test:locked-cards18項及diff-check通過。

## 追加：手機整批掉落的三項最小演出修復

業主再次回報手機普通遊玩會突然整批掉落、像偷偷換盤，明確要求細修。修前相同輸入/RNG隔離實測：普通消除2珠在約14ms跳14–20px；單盾17珠在約12ms跳8–158px。終盤始終等於核心結果；普通消除也能發生，不能將全部現象解釋為真正重整。證據位於本機Temp/match3-campaign-qa-XjmEcF/evidence/refill-v2-before-report.json。

修復範圍僅困難寶珠演出：

- 移除把CSS動畫暫停後逐RAF寫currentTime的控制，讓原生transform動畫在瀏覽器時間軸播放；流程仍用實際elapsed、DOM提交確認、背景暫停與取消清理，不以每幀限額造成低FPS慢動作，不補播過時音效。
- 移除全連鎖強壓5秒的比例加速。同一段維持原20ms逐珠間隔、300–426ms落程與原清退/獎勵停留；舊珠落定後再入新珠。鏈數越多總播放自然越久，不再將間隔壓成1ms。此修正優先保留可辨識順序，沒有改核心50段上限。人工50段各56個新珠的極端需89.3秒；混合舊/新珠且每段有獎勵的人工上界約122.6秒，非已觀察自然局，不宣稱所有長鏈仍5秒內結束。
- 核心無可攻擊連線時仍依既有規則整理普通珠，但演出不再清退或重落magic>0的數字/盾牌，顏色、座標、power保留。該段顯示短提示「沒有可攻擊連線，整理普通寶珠」，不新增停等，不改RNG、傷害、充能、卡片或存檔。

原生合成器隔離實驗：650ms主執行緒阻塞內，原生球持續移動，逐RAF手動球停在原處；證據Temp/orb-native-timeline-oHlugS。實戰截圖亦確認同輸入舊珠停在Y239.6，新版依序232.9→248.8→256.6→260.1→262.1。這不是所有手機每幀顯示保證。

本輪完整test:beast-match3、test:beast-fairness與test:locked-cards通過。首次回歸另抓到上一批光束寫死白虎ID違反既有卡片來源守門，已改引用既有BAIHU_RIG.cardId，行為/素材不變，再跑完整寶珠回歸通過，沒有放寬守門。掉落測試增加特殊珠保留、單段與50段相同時序、30/60/15FPS時間一致、過時音效丟棄及200輪完成/取消資源清理。

本輪手機項目為瀏覽器模擬與明示測試fixture；headless切另一頁仍回報visibility=visible，僅能算切頁返回，不冒充真手機切App測試。Android/iPhone、小米/三星實體機仍未連線，不能宣稱全品牌真機驗收。

最終獨立驗收：普通/30FPS/650ms停頓/4倍CPU與捲動/單盾/真重整，終盤均精確等核心、56格、busy正常解除且頁面無例外。最終真單盾8段計畫8秒、20ms間隔與318–426ms落程，不再壓5秒；真重整含power4/7/13三顆特殊珠，位置/opacity保持且無flash/fall，只有53顆普通珠重整。明示visibility事件fixture暫停穩定後800ms位置相同，恢復後終盤正確。證據Temp/match3-campaign-qa-khht5s/evidence/refill-v2-final-shield-report.json、Temp/match3-campaign-qa-Qvd8Yb/evidence/refill-final-special-report.json、Temp/match3-campaign-qa-fTUpWD/evidence/refill-hidden-fixture-report.json；總結Temp/orb-refill-independent-final-20261101.md。最終全寶珠回歸及production build再次通過（既有lint警告保留），diff-check通過。未更動客戶存檔，自建測試瀏覽器已關閉；用戶8888服務保持。

前批正式驗收亦通過：Temp/match3-campaign-qa-ZrqvSI/evidence/refill-7960b86-formal-report.json，普通/長盾/特殊珠整理三組盤面等核心、56格、無busy違規或頁面錯誤；正式chunk已載入新提示與native timeline。下列為其後業主追加，不混作前批已發布證據。

## 追加：主要戰鬥同屏、神獸最後解鎖、普通掉落略快與逐欄整理

業主確認目前一般手機尺寸清楚，只要主要戰鬥不再上下移動，且矮屏也要看到HP/技能/攻擊。重現390×844本體785.22px但父頁850.22px、320×667本體663.53px但父頁728.53px，多65px來自尾端安裝dock。僅hard戰鬥以完整實際可視範圍設定局部data狀態，CSS限制html/body捲動及回彈，不改inline body style；主要戰鬥收起dock，說明/結算/離場恢復。矮屏先收緊卡片及留白，預留滿能量按鈕，≤520px以實際剩餘高度調盤寬且珠不小於33px；ResizeObserver/視窗事件離場清除，錯誤提示、縮放與放不下的極端視窗不硬裁。

隔離手機原生座標驗收390×844、320×667、320×568、320×480，五張滿能量均完整同屏且可點；上方/敵卡/盤/己卡/空白touch swipe及wheel均scrollY=0，所有反擊源端/目標端位於viewport。珠尺寸依序49.28/39.81/39.81/33px。說明開啟解鎖、返回頂部關閉重鎖；退出選卡恢復auto並可捲300px。實際安裝鈕注入亦戰鬥隱藏、離場恢復。證據Temp/match3-campaign-qa-rfKM50/evidence/fit-native-interaction-report.json及Temp/match3-campaign-qa-nE2m62；不宣稱所有小尺寸或實機都已通過。

業主明確選定前四張倒下後神獸才能被打並參戰。原先僅位置最後，沒有待命閘門，仍可提前反擊。新增共用核心availability/target/initialization判定，待命不受傷、不反擊、不跑召喚/被動；前四張全倒後沿原效果引擎初始化一次。Board建好完整五敵後才初始化，前端顯示待命/disabled，舊目標自動選可攻擊敵。第1–7關、原卡值、五對五與其他模式不變。新增boss-reserve測試納入全寶珠gate；盾牌source-test編譯器補esModuleInterop與正式tsconfig一致，保留所有斷言，JSON仍用default import避免新建置警告。

第8/11關技術fixture：前三張倒下、第四張HP1，真四連擊殺第四張後末位解除待命、成為唯一反擊來源；其HP未受溢傷，下一回合原PASSIVE使用/加成仍只有一次。證據Temp/match3-campaign-qa-7JLA51/evidence/boss-transition-report.json、Temp/match3-campaign-qa-BIFTQw/evidence/boss-transition-repeat-report.json。這是受控過渡驗證，非自然勝率測試。

後續追加普通掉落約快一成：原duration乘0.9取整數，20ms間隔、清退、獎勵停留不變；同色/異色合體1650ms及釋放點不變。真八段盾後補珠計畫7723ms、單珠319/302/286/383ms，終盤一致且操作恢復，證據Temp/match3-campaign-qa-6R86GE/evidence/refill-v2-final-shield-report.json。長鏈依段數自然增加總時間，沒有恢復5秒快轉。

最後追加禁止整盤先空白：真重整改逐欄展示core計算完的盤面，每段只清退/重落該欄普通珠；其餘欄與特殊珠保持。所有展示段chain0/groups空/attackfalse，不送傷害或能量；不重抽RNG。真seed87/resolve1087畫面依欄0至6、每次最多8顆且不跨欄同落、無整盤空白，magic4/7/13全程保留、最終56格精確等核心且無頁面錯誤。證據Temp/match3-campaign-qa-6gwaUb/evidence/refill-column-special-report.json與terminal-first-column.png。所有測試資料隔離、自建瀏覽器已關閉。

本追加批最終gate：完整test:beast-match3（含boss-reserve、逐欄refill與runner）PASS；test:beast-fairness（194核心、9客戶流程與1000局稽核）PASS；test:locked-cards 18項PASS；production build PASS，只有既有lint警告，沒有named JSON export新警告；diff-check PASS。尚未完成Android/iPhone實體裝置、發熱及真實聽感驗收，不以模擬冒充。

## 再追加：能量出招不交敵方回合

業主明確指定：寶珠連線才輪替，三顆零傷害也換敵；底部儲存能量隨可操作時使用，不應引發敵方攻擊。實際發現unleash/fireLink均setMoves再endStep，且第11關起受創技能可能另外打回玩家。最小修正兩條能量路徑取消回合推進，保留原耗能、原傷害、動畫busy及結算；damageFoeWithSkills新增預設true的reactionEnabled，只有能量明確傳false抑制整個受創技能，一般寶珠原技能不變。每次能量使用獨立遞增事件序號，避免同回合相同moves導致去重吞傷。能量擊殺末護衛後立即初始化新可用神獸一次，但不執行敵方回合。

另查到1/2顆無效拖曳short分支會計回合並反擊，與3顆才有效規格衝突，一併刪除此分支；保留提示。測試抽取實際Board release函式並執行真resolveDrag，僅呈現adapter替身：1/2不計回合、3/4/8各一次交敵，3零攻擊、4以上攻擊。技能runtime測試涵蓋普通受創仍觸發、連續三個獨立能量事件各扣血/相同事件重送去重、雙方狀態期限不推進、末護衛能量擊殺解鎖與初始化一次。玩法說明與戰鬥紀錄同步。

最終完整寶珠回歸、公平性檢查、18項鎖定卡片及production build均通過，既有lint警告保留；無修改原卡數值、連珠傷害公式、掉落演出或其他卡片。

前批正式5dc315e實際載入新page-c51dbb29a3489071：Temp/match3-campaign-qa-7yGlYS/evidence/formal-5dc-fit-report.json驗390×844及320×480滿能量同屏、swipe/wheel仍scrollY0、末位待命不可選、說明與離場恢復；Temp/match3-campaign-qa-gbVpSM/evidence/refill-column-special-report.json正式真重整最多8顆逐欄、終盤等core。這批證據不代表之後能量/門檻已上線。

能量本機實點Temp/match3-campaign-qa-vyh1PI：同回合兩張單卡造成163/54實扣、各扣100能量且零反擊；多卡連線傷害576、各扣50且零反擊；1/2不交回合、3/4/8各一次；能量擊殺後正常勝利但回合不增加。第11關Temp/match3-campaign-qa-kLe095/evidence/energy-stage11-report.json：具有受創技能110的柳土獐HP10000→9864，但技能use/event未觸發、零反擊/回合不變；末護衛1HP能量擊殺後神獸882HP保留、待命解除、被動初始化一次且不反擊。這些為隔離fixture，未修改客戶進度。

## 門檻再核定（第八關才首次八顆）

業主選擇第八關才首次8顆，覆蓋固定4及歷史第六關到8配置。採前八關3/4/4/5/5/6/7/8、第八後8；有效連線仍3，未達本關攻擊門檻仍消除/充能並交敵一次，第一關3可攻。數字權重與原傷害公式、敵方強度倍率、五對五待命、能量免回合不變。進場說明與help需依stage顯示，禁止繼續宣稱所有關卡固定4。

最終獨立實拖6項PASS：Temp/match3-campaign-qa-5ezXpq/evidence/stage-threshold-report.json，第1關3連傷114、第7關7連157、第8關3/4連直傷0但各+1回合/1反擊、第8關8連352、第9關8連437；全部補滿56、busy恢復、無頁面錯誤。標題/intro/help讀值一致。此為刻意配置的門檻fixture，不作自然勝率宣稱。最新門檻完成後重新執行完整寶珠回歸、公平性、locked-cards與production build均PASS，diff-check PASS；模擬不代替實體Android/iPhone驗收。

正式3fc819c確認載入page-e3d8e8b：Temp/match3-campaign-qa-DMOHE2/evidence/formal-3fc-energy-report.json兩單卡傷163/54各扣100、多卡傷576各扣50，回合不變/零反擊；Temp/match3-campaign-qa-vkvnD2/evidence/formal-3fc-threshold-report.json第一關3攻擊208、第八關3/4直接傷害0且各一次反擊，顯示3/8門檻一致、56格/頁面零錯誤。以下為其後追加規則，不能以這份正式證據代替。

## 最新追加：逐張退場、完整神獸對決、誤按計次、逐組連鎖攻擊與更快普通落程

業主再確認誤按也計回合，覆蓋前批1/2不計設定。Board非空無效path也setMoves並正常endStep狀態tick/一次敵方行動；空path、busy重複操作、UI及能量不計。callback回歸含空、1/2、跳格、3/4/8，依當關門檻區分傷害。此為明確覆蓋，不將前批通過當最新誤按規則已發布。

敗卡等原有busy演出完成後以ID鎖存退場，不splice foes、不改索引，其他活卡保留原欄；下一次busy不重現敗卡，新局恢復。最後只剩真guardian才置中3欄，沿現有rigFor/rigFrameUrl完整靜態姿態（白虎land-crouch），橫向身形/名稱/HP，無新增素材或rAF。完整身形390/320480截圖與幾何證據Temp/match3-campaign-qa-ZVtV7v/evidence/boss-fullbody-final-report.json：卡222.8×100/180.8×54、contain無圓裁、scroll0/同屏。既有最後擊殺與反擊完成後才轉場，避免提前移除rig目標。此完整姿勢布局驗收先於逐張退場追加，後者另補行為驗收。

確定的掉落攻擊故障：原resolveHardDrag把所有step.attackAllowed覆寫成初次拖線結果，初次不足會漏掉後續達標，初次達標又會讓後續不足組攻擊。現每個scored group以當時effectiveDragCount/當關minimum記錄attackAllowed，初組沿dragIntent，step只彙整；computeHits同時核對group/step。不新增來源過濾，不變動原scored組、RNG、盤面、獎勵；混色盾維持零攻擊。Board紀錄改辨識後續達標，不再錯稱整次只消除。新cascade-attack gate驗真seed初3後9自動攻、初8後3不攻、同step8與3不混算、展示重整不攻。

完整回歸首次在progression.test舊的「所有step都不可攻」斷言失敗；因業主已核定逐組達標，改成初組不足零傷、後續逐組核對門檻/實際傷害，保留其他盤面、技能與500seed斷言後全寶珠gate通過，未跳過失敗項。普通落程依最新要求0.9→0.8原基準，較前版再短約11%；20ms間隔、舊珠先落/新珠再補、合體1650ms及整串不壓縮維持。

最終獨立本機PASS：Temp/match3-campaign-qa-Dy9BEr/evidence/misclick-counter-report.json（1/2各+1回合/1反擊/敵HP不變）；LEkO8M/evidence/cascade-group-attack-report.json（初3後9實傷87等core，3+3+3與5+5不合湊）；sOlCJz/evidence/cascade-group8-attack-report.json（初8後3總傷35等core，後3零傷）；3w65yI/evidence/refill-v2-final-shield-report.json（新254/269/283/341ms落程、delay0/20/40…600ms、native running/finished、56格/無提前busy解除）；GdRWYs/evidence/retired-enemies-report.json（DOM5→4→Boss1，原foes5保留，後續busy不復活；能量擊殺末護衛後Boss HP952保留/技能初始化一次、回合不變/0反擊）。以上目錄均在Temp/match3-campaign-qa-*下，全部終盤等core且無JS錯誤，自建靜音Edge已關閉，未改客戶存檔。

最新全部gate已過：test:beast-match3（含新增cascade-attack）、test:beast-fairness、test:locked-cards、production build與diff-check。Build保留既有lint警告；沒有跳過失敗或改原卡值。這批提交前的證據仍是瀏覽器模擬，非各品牌真機驗收。
