---
name: beast-six-second-production
description: 為命理六十隻神獸建立本體一致的六秒戰鬥影片、逐部位與玩家音色審查，以及通過後的技能檔庫串接。適用於新增角色影片與既有動作細修。
---

以 `docs/beast-six-second-production-plan.md` 的時序、驗收及實測狀態為準。影片本體須與目前實際戰鬥使用的參考圖一致；檔案存在或時長正確均不代表通過視覺驗收。

目前有效要求是 `scripts/beast-mutual-bite-recipe.mjs` 的 `six-second-mutual-bite-v2`：使用者追加「互相對咬的激烈動作」。六秒內依序為 0–1.8 秒蓄力、1.8–2.5 秒玩家衝鋒、2.5–2.8 秒玩家首咬、2.8–3.3 秒對手反咬、3.6–4.2 秒玩家再次命中、4.2–6 秒放開收勢。玩家先發動、鏡頭與聲音以玩家為主；反咬不等於改由對手主導或替對手加上叫聲。舊的單次咬擊配方、歷史影片及模型 pass 均需按新條件重新交叉驗收。

- 新的 `reciprocalBite` 是必要放行項目，不可 not-applicable；分別记录玩家首咬、對手反咬、玩家末咬的實際時間、顎／喙閉合、放開與受力反應。只有交纏、靠近、碰頭或一次單向咬擊不算互咬。2 fps 接觸表只能篩出問題，不能用它確認一瞬間的閉合；必要時提取密集接觸影格。
- `node scripts/build-beast-six-second-audio.mjs --all --mutual` 產出獨立的 `player-six-second-v2.wav` 與來源紀錄，保留舊版聲音。從該玩家登錄 MP3 解碼後只剪接、調整音量與淡入淡出，不改音高、速度或頻譜；很短的原叫聲以 60ms 間隔重複，記錄方法並另做聆聽驗收。新候選保留選定原聲檔與 SHA-256，不以模型生成的陌生吼聲替代。
- Omni 改用 background 請求，先保存 interaction ID 再輪詢。`node scripts/beast-omni-resume.mjs ID` 只 GET 同一任務，不會重新 POST；沒有 ID 的網路失敗仍保留未知結果，不推定未計費。
- 2026-09-06 實際遇到兩種限制：Omni 每日 20 次限制（當時建議 2026-09-07 約 08:00 台灣時間再查）及專案每月支出上限。`quota-blocked` 明確停下；支出上限不能由睡到隔天或更換同專案模型解決。原錯誤、scope、retryAt 与既有任務編號需保存，不自動密集重試。待使用者完成外部額度調整，且每日限制恢復後，再執行 `node scripts/beast-first-pass.mjs 21 --quota-cleared`；此旗標只是記錄外部條件已恢復，不會修改帳單。若已有 interaction ID，優先查回；若查回無影片的終止結果，先核對後再建立有原因的新版本。
- 對 HTTP 429 已確定退回且沒有 operation 的請求，可在配額確實恢復後建立新版本並保留退回紀錄。未知網路結果不可盲目重送；使用者已明確批准重產時，若查回途徑失敗，可保留原未知請求及計費不明紀錄，改用有具體新方法、獨立版本與可持久保存任務編號的替代方案。這不是把原請求宣稱未送達。
- 使用者再次明確要求續產、但尚未確認外部額度已更改時，可記錄該次要求後進行一次續產嘗試：`beast-veo-scene.mjs` 的 `--requested-quota-retry "該次要求與理由"` 只接受已知 429 退回且無 interaction、operation 或候選的工作單，保留原錯誤歷史並標記 `clearanceConfirmed:false`。新拒絕立即停下；此選項不能用於自動輪詢、未知結果或宣稱額度已解除。2026-09-06 11:09 的再次續產已被每月支出上限退回，後續須先處理外部條件，不能持續重試同一已知拒絕。
- 模型可能要求補上原圖不存在的白紋、額珠或綠胸珠，也可能捏造互咬時點。以本體原圖和實際影格為準，將更正存入 `reports/beast-production/cross-checks/`；更正錯誤不等於全片通過。未聆聽項目不可寫成已聽過。
- `reports/beast-production/visual-cross-check-summary.json` 記錄現有候選初篩覆蓋率；每次須核對目前候選雜湊，不能用舊版本審查湊數。初篩只列出實際看見的差異，與完整逐格、互咬及聲音驗收分開計數；抽查中看見胸飾或猴臉仍存在時，應更正模型相反說法，不得照錯誤報告重畫。
- 已選用的場景圖複製到工作區 staging，原始生成位置保留；prompt set、兩隻本體來源、雜湊與針對構圖的審查記錄都要保存。完整首幀不等於合格影片。
- 額度仍受限而使用者要求下一個任務時，可繼續未送出的角色場景與動作準備。先把實際 image_gen 提示詞存入 `reports/beast-production/{id}-preparation.json` 再啟動生成；有細修時保存完整 `imagePrompts` 陣列。不要在尚未結束的工具工作階段中從 session store 複製提示詞，避免得到 null。檢查完整本體入鏡後，以 `node scripts/register-beast-source-scene.mjs ID 已檢查的圖片 "具體畫面觀察"` 保存場景、來源及互咬工作單，再同步技能檔；此指令只準備首次素材，不送影片。`production.sourceScene` 只代表起始圖片，不能計入影片候選數，也不改成 generating。

- 執行 `node scripts/beast-six-second-production.mjs` 建立／核對六十張獨立工作單，保留參考圖 SHA-256、成年／幼子／四象的各自外觀。不得以首宿替代四象。
- `node scripts/beast-six-second-production.mjs --generate beast_a01` 送出單張 Veo 付費候選。必須已有本次生成付費授權；此技能本身不授權費用。中斷時讀取原 operation 繼續，結果不明不得重複提交。
- 使用者於 2026-09-06 明確要求 1–60 隻每隻產出影片並批准費用與細修；因此可先完成全體候選、逐隻審查，再依問題細修。候選產出與正式驗收分別計數，不以首隻未通過阻止其餘候選製作，也不能把六十個候選視為六十個合格影片。
- `node scripts/beast-first-pass.mjs 1` 按總表順序逐隻生成六秒 Omni 候選、驗解碼、製作手機預覽並立即模型審查。每隻內容不合格記為 needs-refinement 後繼續下一隻；服務錯誤或不明付費結果會停下，不自動重複提交。`reports/beast-production/first-pass.json` 保存目前程序 PID、進度、時刻與逐隻問題；恢復前核對 PID、鎖檔與單隻結果。
- `node scripts/beast-omni-production.mjs PLAYER OPPONENT` 使用各自本體參考與玩家原聲，原生請求六秒影片。`--edit "具体修正"` 利用原 interaction 做局部細修，`--player-detail 原圖路徑` 補充原始高解析細節。每次必須保留具體方法理由、參考雜湊、舊版與審查，禁止無限照原配方重送。
- `--scene-reference 場景圖` 使用已比對的完整場景作首尾幀，配合明確 FIRST_FRAME／LAST_FRAME 角色標籤與 `image_to_video` 任務。此模式供應商最多接受兩張圖，本腳本只送完整場景一張；本體原圖仍保留作獨立審查依據。可另以 `node scripts/beast-veo-scene.mjs PLAYER OPPONENT SCENE` 驗證真正首幀條件，必須再次驗收聲畫。
- Omni 候選保存在 `.tmp/beast-production/{id}/attempt-NN/`；舊 Veo 第一版位於單隻根目錄。未通過不寫入 public。工作單、六秒預覽與細修證據放在 `reports/beast-production/`；沒有自動批准入庫。
- 開發環境 `/beast-game/production` 顯示六十隻實際工作單與候選影片，五秒更新進度，只在程序仍存在時顯示執行中。預覽 API 僅開發環境開放、只讀取已登錄的影片、支援手機 Range 播放；不可改成公開播放未驗收素材。`node tests/beast-production-preview.cjs` 驗證實片播放、切換停聲、三種手機寬度與檔案路徑限制。
- 候選完成後執行 `--review {id}`，模型會比對本體、原聲與影片並留下逐項證據，這只是模型判讀，仍需人工畫面交叉比對。`--refine {id} "具體細修原因"` 保存舊版並建立下一版。可加 `--reference-assets` 改用資產參考模式：服務要求 8 秒母帶，只擷取含完整動作與餘韻的前 6 秒，必須重新驗收，不可把動作截斷或拉伸時長。
- 模型審查預設每秒抽查四格（`BEAST_REVIEW_FPS` 可設 1–24），不能用服務預設每秒一格來保證快速咬合。保留原始回覆；漏回欄位記為 unverified，不補成 pass。另用實際接觸影格交叉比對，不能把模型未看到最後一秒的判斷當成影片真的短於六秒。
- Windows 狀態檔寫入使用每次唯一暫存檔及原子替換；只重試 EPERM／EACCES／EBUSY 的本機短暫鎖定，不重送生成 API。永久寫入錯誤保留舊檔及暫存供恢复。付費請求之前的失敗也要先確認日誌與工作單，不能看到空資料夾就假定未送出。
- 參考模式需要 `FFMPEG` 指向既有轉檔程式；腳本也辨識本工作區 `.tmp/python-media/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe`。鎖檔防止同隻重複付費；程序異常退出殘留鎖時先核对記錄的 PID 與 operation，確認無執行中任務才清除該鎖。
- 六秒連貫演出以本檔開頭的互咬時序為準：玩家先咬、對手反咬、4 秒玩家再命中，4.2–6 秒收勢。聲音以同一玩家神獸音色貫穿，對手不發聲；不以人聲、雷聲或統一吼聲替代所有物種。
- 逐一比對頭、軀幹、手腳、嘴巴、牙齒／喙、眼睛、爪／蹄、尾巴、雙方本體、實際接觸、音色與前後連貫。鳥類不補牙、蛇類不補腳。標示不適用項目的物種理由。每項記錄時間點及證據；不可由提示詞或合成參數推定通過。模型可能漏判新增的角、遺失胸飾與簡化甲紋，仍需原圖與逐格畫面交叉確認。
- 禁止卡面飛行、平移放大、靜態姿勢淡接或嘴巴貼片冒充真實關節動作。生成模型不能保證 1:1，審查不合就記錄需細修原因，不入庫。同一方法連續失敗須改用有依據的方法；使用者已明確批准持續細修時，可以為新方法更新單張工作單的嘗試上限並記錄理由，不能用技能自行設定的三次預設取代使用者要求，也不能無限重送同一失敗配方。
- 有通用陪練對手的預錄片只能用於明示的技能展示；不可蓋住實際對戰並冒充使用者所選對手。實際戰鬥需玩家與當前對手身分對應。
- 通過後先轉手機版本、驗解碼／聲音／時長，再同步 `skills.json`、`skill_charge.json` 與總表；前端只播審查通過的影片、載入失敗退回既有演出，避免黑畫面、重複配音與裁掉頭尾。
- 舞台來源保存原頁、作者、授權、下載檔雜湊與改作方式。手機優先測 360／390／430px，聲畫同步、略過與退出停聲，且不改勝負核心。
- 健康檢查綠燈不等於影片本體驗收。若其他工作階段正在修改相同檔案，保留其內容並釐清分工，禁止直接打包推送未知變更。
- `npm run build:beast-audio-6s` 以六十隻各自登錄原聲產生六秒候選，驗解碼、288000 個 48kHz 樣本與削波，仍待聲畫聆聽驗收。`python scripts/package-beast-audio.py` 產出附授權與雜湊的候選 ZIP；不得當成六十支影片完成。
- `npm run sync:beast-production` 同步總表、六十份 `skills.json` 與 `skill_charge.json` 的六秒配方、本體雜湊及工作單連結。只同步生產規格，不自動批准影片。
- 使用者要求「先列入戰鬥技能檔案」時，執行同一同步指令；`scripts/beast-skill-production-record.mjs` 會登錄目前可驗證的候選版本／對手、原聲來源、逐部位細修清單及配額阻擋，並產出 `public/skill-battle-archive/production-catalog.json`。候選來源雜湊、預覽六秒時長與聲音來源須核對，舊版本不能套用新對手；過期審查不引用。登錄不寫入播放欄位或 release，`npm run test:beast-skill-registration` 驗證這些界線。
- 使用者確認已調整外部額度後，續產嘗試使用 `--requested-quota-retry "使用者確認與驗證理由" --quota-cleared`，保存 `clearanceConfirmed:true` 的使用者通知；供應商若仍回 429，保留新回覆並停止，不將通知本身當作服務已恢復的證據。每日 retryAt 與每月支出上限仍分別處理。
- `npm run check:beast-releases` 列出 approved／pending／invalid，驗證單卡與總表一致、放行證據、原圖和兩種影片雜湊、實際聲畫解碼及手機容量；`-- --require-all` 要求六十隻全部通過才成功。pending 不是完成。
- `npm run test:beast-mobile` 使用 Playwright 與僅開發環境的 `/beast-game/preview`，在隔離瀏覽器測 360／390／430px、1:1 手動決勝、2:0 自動第三組、略過與退出停聲。無可用 WebGL 時顯示本體靜態備援，不能標成已生成影片。Playwright 可從已安裝執行環境透過 `NODE_PATH` 提供；不碰使用者收藏。
