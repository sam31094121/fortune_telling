/**
 * AUDIT-2 H5（fix-3）：寶珠闖關（/beast-game/match3-hard 選隊、永久強化、戰鬥、中途接回）新增文字的英／日／韓對照。
 * - 鍵是畫面上的繁體中文原文（逐字相同）；由 lib/i18n-dom-layer.ts 在畫面上替換，不改任何計算或狀態。
 * - 只在神獸戰鬥頁生效（pathname 以 /beast-game 或 /star-beasts 開頭），而且排在既有全站字典之後（既有譯文優先）。
 * - 帶數字的動態句用 PATTERNS；卡名、二十八宿名、模式名「寶石捷連線」是專有名詞，保留原文（沒有既定譯名，不自行捏造）。
 * - 簡體中文由全站自動轉換處理（lib/zh-hans），不在這裡。
 * - 尚未收錄（照實列出）：卡面內容（卡名、技能名與說明，由 BeastCardTile 繪製）、「玩法與操作」裡的長篇規則說明、
 *   五元素單字標籤（風／空／水／火／地：寶珠上的小字放不下譯文）、強化分頁的「幼子」單字（和卡面小標籤同字）、法寶名稱、伺服端內部驗證錯誤碼文案。
 */
import type { Translate } from '@/lib/i18n-dom-layer';

type Locale = 'en' | 'ja' | 'ko';
type Row = [en: string, ja: string, ko: string];

const ROWS: Record<string, Row> = {
  // ── 選擇身分／主角 ──
  '寶珠戰': ['Orb Battle', '宝珠バトル', '보주 배틀'],
  '我自己': ['Me', '自分', '나'],
  '開始或接續自己的闖關進度': ['Start or continue your own campaign', '自分の挑戦を始める・続ける', '내 도전을 시작하거나 이어 합니다'],
  '親朋好友': ['Friends & family', '家族・友人', '가족·친구'],
  '從第一關開始，不影響我的進度': ["Starts from stage 1 and won't affect my progress", 'ステージ1から始まり、自分の進行には影響しません', '1스테이지부터 시작하며 내 진행에는 영향을 주지 않습니다'],
  '自己的進度保存在這個瀏覽器。': ['Your own progress is saved in this browser.', '自分の進行はこのブラウザに保存されます。', '내 진행 상황은 이 브라우저에 저장됩니다.'],
  '選擇遊玩身分': ['Choose who is playing', 'プレイする人を選ぶ', '플레이할 사람 선택'],
  '回到首頁': ['Home', 'ホームへ', '홈으로'],
  '更換玩家': ['Switch player', 'プレイヤー変更', '플레이어 변경'],
  '選擇你的四象主角': ['Choose your Four Symbols hero', '四象の主人公を選んでください', '사상 주인공을 고르세요'],
  '保留或重新選擇主角': ['Keep or change your hero', '主人公をそのままにするか選び直してください', '주인공을 유지하거나 다시 고르세요'],
  '主角占一個出戰位置。選定後固定，通過第八關可重新選擇一次。': ['Your hero takes one team slot. Once chosen it is fixed; after clearing stage 8 you can choose again once.', '主人公は出撃枠を1つ使います。選ぶと固定され、ステージ8をクリアすると1回だけ選び直せます。', '주인공은 출전 자리 하나를 차지합니다. 고르면 고정되며, 8스테이지를 통과하면 한 번 다시 고를 수 있습니다.'],
  '先點選一張主角卡，再按下方按鈕確認。': ['Tap a hero card first, then confirm with the button below.', 'まず主人公カードをタップし、下のボタンで確定してください。', '먼저 주인공 카드를 누른 뒤 아래 버튼으로 확정하세요.'],
  '請先點選一位主角': ['Choose a hero first', 'まず主人公を選んでください', '먼저 주인공을 고르세요'],
  '選擇主角': ['Choose hero', '主人公を選ぶ', '주인공 선택'],
  '保留原主角': ['Keep current hero', '今の主人公のまま', '지금 주인공 유지'],
  '正在儲存主角…': ['Saving your hero…', '主人公を保存中…', '주인공 저장 중…'],
  // ── 選隊 ──
  '第二步：點選四位夥伴': ['Step 2: Pick four companions', 'ステップ2：仲間を4体選ぶ', '2단계: 동료 넷 고르기'],
  '往下滑，點喜歡的卡片加入隊伍。主角已保留，不用再選。': ['Scroll down and tap the cards you like to add them. Your hero is already in, so no need to pick again.', '下にスクロールして、好きなカードをタップしてチームに加えてください。主人公は確保済みなので選び直す必要はありません。', '아래로 내려 마음에 드는 카드를 눌러 팀에 넣으세요. 주인공은 이미 들어가 있어 다시 고를 필요가 없습니다.'],
  '想換夥伴？再點一次已選卡片即可取消。': ['Want to swap? Tap a chosen card again to remove it.', '仲間を替えたいときは、選んだカードをもう一度タップすると外せます。', '동료를 바꾸려면 고른 카드를 한 번 더 누르면 빠집니다.'],
  '勝利獲得的成獸保存在這裡，也能加入隊伍。': ['Adult beasts you win are kept here and can join your team.', '勝利で手に入れた成獣はここに保存され、チームにも加えられます。', '승리로 얻은 성체 신수는 여기에 보관되며 팀에도 넣을 수 있습니다.'],
  '主角與出戰隊伍': ['Hero and battle team', '主人公と出撃チーム', '주인공과 출전 팀'],
  '主角・固定': ['Hero · fixed', '主人公・固定', '주인공 · 고정'],
  '一鍵推薦四位夥伴': ['Recommend four companions', 'おすすめの仲間4体を選ぶ', '추천 동료 넷 자동 선택'],
  '全部': ['All', 'すべて', '전체'],
  '已獲成獸': ['Adult beasts won', '獲得した成獣', '얻은 성체 신수'],
  '贏得第一場，即可獲得第一張成獸卡。': ['Win your first battle to get your first adult beast card.', '初勝利で最初の成獣カードがもらえます。', '첫 승리를 거두면 첫 성체 신수 카드를 얻습니다.'],
  '存檔備份': ['Save backup', 'セーブのバックアップ', '저장 백업'],
  '只備份「我自己」的寶珠進度。這是手動下載與搬移，不是雲端同步；兩台裝置之後的進度不會自動合併。': ['Backs up only the orb progress for "Me". This is a manual download and transfer, not cloud sync; progress made later on two devices won\'t merge automatically.', '「自分」の宝珠進行だけをバックアップします。手動でダウンロードして移すもので、クラウド同期ではありません。2台の端末でその後に進めた分は自動では統合されません。', '"나"의 보주 진행만 백업합니다. 직접 내려받아 옮기는 방식이며 클라우드 동기화가 아닙니다. 두 기기에서 이후 진행한 내용은 자동으로 합쳐지지 않습니다.'],
  '下載自己的存檔': ['Download my save', '自分のセーブをダウンロード', '내 저장 파일 내려받기'],
  '另一裝置可選擇備份檔預覽。僅限尚未有自己進度的瀏覽器，既有存檔不會被覆蓋。': ['On another device, choose the backup file to preview it. This only works in a browser with no "Me" progress yet; existing saves are never overwritten.', '別の端末でバックアップファイルを選ぶとプレビューできます。まだ自分の進行がないブラウザに限ります。既存のセーブは上書きされません。', '다른 기기에서 백업 파일을 고르면 미리 볼 수 있습니다. 아직 내 진행이 없는 브라우저에서만 가능하며, 기존 저장은 덮어쓰지 않습니다.'],
  '選擇寶珠備份檔（最多 2 MB）': ['Choose an orb backup file (max 2 MB)', '宝珠のバックアップファイルを選択（最大 2 MB）', '보주 백업 파일 선택(최대 2MB)'],
  '幼子夥伴': ['Young companions', '幼獣の仲間', '어린 신수 동료'],
  '尚未消耗的幼子可自由挑選。': ['Any young beast not yet used up can be picked.', 'まだ消費していない幼獣は自由に選べます。', '아직 소모하지 않은 어린 신수는 자유롭게 고를 수 있습니다.'],
  '點選出戰': ['Tap to deploy', 'タップで出撃', '눌러서 출전'],
  '已選夥伴': ['Chosen', '選択済み', '선택됨'],
  '移除夥伴': ['Remove', '外す', '빼기'],
  '四位夥伴已選齊！': ['All four companions chosen!', '仲間4体がそろいました！', '동료 넷을 모두 골랐습니다!'],
  '請點畫面底部金色「點此開始作戰 →」按鈕，帶隊出發。': ['Tap the gold "Start battle →" button at the bottom of the screen to head out.', '画面下の金色の「出撃する →」ボタンを押して出発してください。', '화면 아래 금색 "전투 시작 →" 버튼을 눌러 출발하세요.'],
  '點此開始作戰 →': ['Start battle →', '出撃する →', '전투 시작 →'],
  '隊伍已就緒，點此開始作戰': ['Team ready. Tap to start.', 'チームの準備ができました。タップで出撃します', '팀 준비 완료. 눌러서 시작하세요'],
  '正在儲存隊伍…': ['Saving team…', 'チームを保存中…', '팀 저장 중…'],
  '固定主角': ['Fixed hero', '固定の主人公', '고정 주인공'],
  '選擇主角的四位夥伴': ["Choose your hero's four companions", '主人公の仲間を4体選ぶ', '주인공의 동료 넷 고르기'],
  // ── 永久強化 ──
  '寶珠闖關永久強化': ['Orb campaign permanent boosts', '宝珠チャレンジの永久強化', '보주 도전 영구 강화'],
  '永久強化': ['Permanent boost', '永久強化', '영구 강화'],
  '永久強化尚未解鎖': ['Permanent boost locked', '永久強化はまだ解放されていません', '영구 강화 미해금'],
  '永久強化解鎖進度': ['Permanent boost unlock progress', '永久強化の解放状況', '영구 강화 해금 진행도'],
  '還沒有強化過的卡，打完一關就能一鍵吃到封頂。': ['No cards boosted yet. Clear a stage and you can auto-feed to the cap.', 'まだ強化したカードはありません。ステージをクリアすると上限まで一括強化できます。', '아직 강화한 카드가 없습니다. 한 스테이지를 깨면 상한까지 한 번에 강화할 수 있습니다.'],
  '① 選神獸': ['① Choose a beast', '① 神獣を選ぶ', '① 신수 선택'],
  '② 選材料': ['② Choose material', '② 素材を選ぶ', '② 재료 선택'],
  '選擇要強化的神獸': ['Choose a beast to boost', '強化する神獣を選ぶ', '강화할 신수 선택'],
  '選擇融入的材料': ['Choose material to absorb', '取り込む素材を選ぶ', '흡수할 재료 선택'],
  '重選神獸': ['Change beast', '神獣を選び直す', '신수 다시 선택'],
  '一鍵吃到封頂（先看預覽）': ['Auto-feed to cap (preview first)', '上限まで一括強化（先にプレビュー）', '상한까지 한 번에 강화(먼저 미리보기)'],
  '一鍵吃到封頂預覽': ['Auto-feed preview', '一括強化のプレビュー', '한 번에 강화 미리보기'],
  '一鍵吃到封頂・預覽': ['Auto-feed · preview', '一括強化・プレビュー', '한 번에 강화 · 미리보기'],
  '目前不能用': ['Not usable now', '今は使えません', '지금은 사용할 수 없음'],
  '目前沒有可消耗的材料。': ['No material available right now.', '今は使える素材がありません。', '지금은 사용할 수 있는 재료가 없습니다.'],
  '返回': ['Back', '戻る', '돌아가기'],
  '・吃完就封頂': [' · reaches the cap', '・これで上限に到達', ' · 이걸로 상한 도달'],
  '會用掉': ['Uses', '使用：', '사용:'],
  '張。': [' cards.', '枚です。', '장.'],
  '被吃掉的卡會永久消失，無法復原。出戰隊伍、攻擊前五名與開局能量第一的卡不會被拿去吃。': ["Absorbed cards disappear permanently and can't be restored. Cards in your battle team, your top five by attack and the card with the highest starting energy are never used.", '取り込んだカードは永久に消え、元に戻せません。出撃チーム、攻撃上位5枚、開始時エネルギー1位のカードは使われません。', '흡수된 카드는 영구히 사라지며 되돌릴 수 없습니다. 출전 팀, 공격 상위 5장, 시작 에너지 1위 카드는 사용하지 않습니다.'],
  '強化尚未儲存，請重試。': ['The boost was not saved. Please try again.', '強化はまだ保存されていません。もう一度お試しください。', '강화가 아직 저장되지 않았습니다. 다시 시도하세요.'],
  '融入強化': ['Absorb boost', '取り込み強化', '흡수 강화'],
  '確認融入': ['Confirm absorb', '取り込みを確定', '흡수 확정'],
  '重選材料': ['Change material', '素材を選び直す', '재료 다시 선택'],
  '永久消耗': ['Used up permanently', '永久に消費', '영구 소모'],
  '融入': ['Absorb', '取り込む', '흡수'],
  '強化上限': ['Boost cap', '強化の上限', '강화 상한'],
  '已滿': ['Maxed', '上限', '상한'],
  '攻擊': ['Attack', '攻撃', '공격'],
  '強化前攻擊、強化後攻擊與本次增加': ['Attack before and after the boost, and this increase', '強化前と強化後の攻撃、今回の上昇値', '강화 전 공격, 강화 후 공격과 이번 증가량'],
  '攻擊數值': ['Attack numbers', '攻撃の数値', '공격 수치'],
  '原始攻擊': ['Base attack', '元の攻撃', '기본 공격'],
  '目前永久加成': ['Current permanent bonus', '現在の永久ボーナス', '현재 영구 보너스'],
  '本次提升': ['This increase', '今回の上昇', '이번 상승'],
  '強化後攻擊': ['Attack after boost', '強化後の攻撃', '강화 후 공격'],
  '這張重複卡放進共鳴格後會消失，本體保留。': ['This duplicate disappears once placed in a resonance slot; the original card stays.', 'この重複カードは共鳴枠に入れると消えます。元のカードは残ります。', '이 중복 카드는 공명 칸에 넣으면 사라지고, 원래 카드는 남습니다.'],
  '材料融入後會消失，無法復原。': ["Material disappears once absorbed and can't be restored.", '素材は取り込むと消え、元に戻せません。', '재료는 흡수하면 사라지며 되돌릴 수 없습니다.'],
  // 「幼子」單字不收：卡面角落的小標籤也是這兩個字，換成譯文會撐破卡面（BeastCardTile 受保護不能改）。
  '本體→四大神獸': ['Adult card → Four Great Beasts', '本体→四大神獣', '본체 → 사대 신수'],
  '同卡共鳴格': ['Same-card resonance slot', '同カード共鳴枠', '같은 카드 공명 칸'],
  '已放進共鳴格，永久加成已儲存。': ['Placed in the resonance slot. Permanent bonus saved.', '共鳴枠に入れました。永久ボーナスを保存しました。', '공명 칸에 넣었습니다. 영구 보너스가 저장되었습니다.'],
  '本體已融入四大神獸，永久加成已儲存。': ['The adult card was absorbed into a Great Beast. Permanent bonus saved.', '本体を四大神獣に取り込みました。永久ボーナスを保存しました。', '본체를 사대 신수에 흡수시켰습니다. 영구 보너스가 저장되었습니다.'],
  '幼子已融入，永久加成已儲存。': ['Young beast absorbed. Permanent bonus saved.', '幼獣を取り込みました。永久ボーナスを保存しました。', '어린 신수를 흡수했습니다. 영구 보너스가 저장되었습니다.'],
  '不能自己吃自己（同一張卡要有第二張才能放進共鳴格）': ["A card can't absorb itself (you need a second copy to use a resonance slot)", '自分自身は取り込めません（共鳴枠には同じカードの2枚目が必要です）', '자기 자신은 흡수할 수 없습니다(공명 칸에는 같은 카드 2장째가 필요합니다)'],
  '待餵區只收寶珠闖關結算的卡；其他模式的卡不能當材料': ['The feed queue only takes cards earned in the orb campaign; cards from other modes can\'t be used as material', '取り込み待ちには宝珠チャレンジで獲得したカードだけが入ります。他のモードのカードは素材にできません', '흡수 대기열에는 보주 도전에서 얻은 카드만 들어갑니다. 다른 모드의 카드는 재료로 쓸 수 없습니다'],
  '共鳴格已滿': ['Resonance slots are full', '共鳴枠がいっぱいです', '공명 칸이 가득 찼습니다'],
  '目前沒有能放進去的材料（材料都被鎖住，或每張都會超過上限）': ['No material can be added right now (all material is locked, or every card would go over the cap)', '今は入れられる素材がありません（素材がすべてロック中か、どれも上限を超えます）', '지금은 넣을 수 있는 재료가 없습니다(재료가 모두 잠겨 있거나 모두 상한을 넘습니다)'],
  '目前沒有能放進去的材料': ['No material can be added right now', '今は入れられる素材がありません', '지금은 넣을 수 있는 재료가 없습니다'],
  '材料或進度已在別處變更，請重新預覽後再確認': ['Your material or progress changed elsewhere. Please preview again before confirming', '素材または進行が別の場所で変更されました。もう一度プレビューしてから確定してください', '재료나 진행이 다른 곳에서 바뀌었습니다. 다시 미리 본 뒤 확정하세요'],
  // ── 戰鬥（新增） ──
  '點選模式：開': ['Tap mode: on', 'タップ操作：オン', '탭 모드: 켜짐'],
  '點選模式：關': ['Tap mode: off', 'タップ操作：オフ', '탭 모드: 꺼짐'],
  '不方便拖曳時：開啟後點第一顆、再依序點相鄰同色珠，按「確認出手」送出；再點最後一顆可撤銷。鍵盤可用方向鍵移動、Enter 選取、Esc 取消。': ['If dragging is hard: turn this on, tap the first orb, then tap adjacent orbs of the same color in order and press "Confirm move" to send. Tap the last orb again to undo. With a keyboard, move with the arrow keys, select with Enter and cancel with Esc.', 'ドラッグしにくいとき：オンにして最初の宝珠をタップし、隣の同じ色の宝珠を順にタップして「確定して出す」で送ります。最後の宝珠をもう一度タップすると取り消せます。キーボードでは矢印キーで移動、Enter で選択、Esc で取り消しです。', '드래그가 어려울 때: 켠 뒤 첫 보주를 누르고, 이웃한 같은 색 보주를 차례로 눌러 "확정하고 공격"으로 보냅니다. 마지막 보주를 다시 누르면 취소됩니다. 키보드는 방향키로 이동, Enter로 선택, Esc로 취소합니다.'],
  '寶珠盤面：按住拖曳相鄰同色珠；鍵盤可用方向鍵移動、Enter 選取，再按「確認出手」': ['Orb board: press and drag across adjacent orbs of the same color. With a keyboard, move with the arrow keys, select with Enter, then press "Confirm move"', '宝珠ボード：隣り合う同じ色の宝珠を押したままなぞります。キーボードでは矢印キーで移動、Enter で選択し、「確定して出す」を押します', '보주 판: 이웃한 같은 색 보주를 누른 채 드래그합니다. 키보드는 방향키로 이동, Enter로 선택한 뒤 "확정하고 공격"을 누릅니다'],
  '取消': ['Cancel', 'キャンセル', '취소'],
  '待補珠空格': ['Empty slot waiting for a new orb', '補充待ちの空きマス', '보충을 기다리는 빈칸'],
  '同屬性盾牌合擊：其餘同色寶珠轉為盾牌': ['Same-element shield strike: other orbs of this color turn into shields', '同属性の盾で合撃：残りの同じ色の宝珠が盾に変わります', '같은 속성 방패 합격: 나머지 같은 색 보주가 방패로 바뀝니다'],
  '盾牌合體：依顏色數結算防護與回復': ['Shield fusion: protection and healing depend on the number of colors', '盾の合体：色の数に応じて防御と回復を計算します', '방패 합체: 색 수에 따라 방어와 회복을 계산합니다'],
  '去永久強化 →': ['Go to permanent boosts →', '永久強化へ →', '영구 강화로 →'],
  '一鍵吃到封頂，變強馬上帶進下一關': ['Auto-feed to the cap and take the boost straight into the next stage', '上限まで一括強化して、強さをそのまま次のステージへ', '상한까지 한 번에 강화하고 바로 다음 스테이지로'],
  '這一局還沒打完': ["This battle isn't finished", 'この対戦はまだ終わっていません', '이 판은 아직 끝나지 않았습니다'],
  '離開會把這一局記為落敗：不發獎勵、勝場不變。確定要離開嗎？': ["Leaving will count this battle as a loss: no reward, and your win count won't change. Leave anyway?", '離れるとこの対戦は敗北として記録されます。報酬はなく、勝利数も変わりません。本当に離れますか？', '나가면 이 판은 패배로 기록됩니다. 보상은 없고 승수도 바뀌지 않습니다. 정말 나가시겠습니까?'],
  '繼續作戰': ['Keep fighting', '戦闘を続ける', '계속 싸우기'],
  '確定離開': ['Leave', '離れる', '나가기'],
  '重新接回': ['Reconnect', '再接続', '다시 연결'],
  '重試接回': ['Retry reconnect', '再接続をやり直す', '다시 연결 재시도'],
  '收起提示': ['Hide notice', 'お知らせを閉じる', '안내 닫기'],
  '返回我的卡片': ['Back to my cards', 'マイカードに戻る', '내 카드로 돌아가기'],
  '我的卡片': ['My cards', 'マイカード', '내 카드'],
  '重新選卡': ['Pick cards again', 'カードを選び直す', '카드 다시 고르기'],
  '玩法與操作': ['How to play', '遊び方と操作', '플레이 방법과 조작'],
  '已為你準備新的一局。': ['A new battle is ready for you.', '新しい対戦を用意しました。', '새 판을 준비했습니다.'],
  '暫時無法建立戰局紀錄，請確認網路後按「重試」。': ['Couldn\'t create the battle record right now. Check your connection and press "Retry".', '今は対戦記録を作成できません。ネットワークを確認して「再試行」を押してください。', '지금은 전투 기록을 만들 수 없습니다. 네트워크를 확인한 뒤 "다시 시도"를 누르세요.'],
  '伺服端尚未確認這場勝利，獎勵尚未保存，請重試。': ["The server hasn't confirmed this win yet, so the reward isn't saved. Please try again.", 'サーバーがまだこの勝利を確認していないため、報酬は保存されていません。もう一度お試しください。', '서버가 아직 이 승리를 확인하지 않아 보상이 저장되지 않았습니다. 다시 시도하세요.'],
  '暫時無法使用寶器，請重試。': ["Can't use the treasure right now. Please try again.", '今は宝器を使えません。もう一度お試しください。', '지금은 보기를 사용할 수 없습니다. 다시 시도하세요.'],
  '寶器未保存，請重試。': ['The treasure was not saved. Please try again.', '宝器が保存されていません。もう一度お試しください。', '보기가 저장되지 않았습니다. 다시 시도하세요.'],
  '暫時無法完成本回合，盤面與生命未變更，請重新連珠。': ["Couldn't finish this turn. The board and HP are unchanged; please link orbs again.", '今はこのターンを完了できません。盤面とHPは変わっていないので、もう一度宝珠をつないでください。', '지금은 이번 턴을 끝낼 수 없습니다. 판과 HP는 그대로이니 보주를 다시 연결하세요.'],
  '暫時無法發動技能，能量與生命未變更，請重試。': ["Couldn't use the skill. Energy and HP are unchanged; please try again.", '今はスキルを発動できません。エネルギーとHPは変わっていません。もう一度お試しください。', '지금은 스킬을 쓸 수 없습니다. 에너지와 HP는 그대로입니다. 다시 시도하세요.'],
  '暫時無法發動連線攻擊，能量與生命未變更，請重試。': ["Couldn't launch the link attack. Energy and HP are unchanged; please try again.", '今はリンク攻撃を発動できません。エネルギーとHPは変わっていません。もう一度お試しください。', '지금은 연계 공격을 쓸 수 없습니다. 에너지와 HP는 그대로입니다. 다시 시도하세요.'],
  '有卡暫時受控，請重選': ['A card is temporarily disabled. Please choose again', '行動できないカードがあります。選び直してください', '일시적으로 행동할 수 없는 카드가 있습니다. 다시 고르세요'],
  '有卡已倒下': ['A card has fallen', '倒れたカードがあります', '쓰러진 카드가 있습니다'],
  '按住寶珠拖過相鄰同色珠（≥3）放開攻擊': ['Press an orb, drag across adjacent orbs of the same color (3 or more) and release to attack', '宝珠を押したまま隣の同じ色の宝珠（3個以上）をなぞり、離すと攻撃します', '보주를 누른 채 이웃한 같은 색 보주(3개 이상)를 지나 놓으면 공격합니다'],
  // ── 戰鬥畫面標頭與螢幕報讀文字（fix-3 H5 第二批：390 實測仍是中文的部分） ──
  '困難・56 珠・可斜連': ['Hard · 56 orbs · diagonal links', 'ハード・宝珠56個・斜めつなぎ可', '어려움 · 보주 56개 · 대각선 연결 가능'],
  '寶珠戰・困難': ['Orb Battle · Hard', '宝珠バトル・ハード', '보주 배틀 · 어려움'],
  '56 珠斜連': ['56 orbs, diagonal links', '宝珠56個・斜めつなぎ', '보주 56개 · 대각선 연결'],
  '困難': ['Hard', 'ハード', '어려움'],
  '回合': ['Turn', 'ターン', '턴'],
  '對': ['vs', '対', '대'],
  '顆寶珠': ['orbs', '個の宝珠', '개 보주'],
  '・可斜連': [' · diagonal links OK', '・斜めつなぎ可', ' · 대각선 연결 가능'],
  '・敵方：': [' · Enemies:', '・敵：', ' · 적:'],
  '敵方神獸（點選指定目標；出手時標示反擊中）': ['Enemy beasts (tap one to target it; marked while counterattacking)', '敵の神獣（タップで標的を指定します。攻撃時は反撃中と表示されます）', '적 신수(눌러서 목표를 지정합니다. 공격할 때 반격 중으로 표시됩니다)'],
  '戰鬥進行中': ['Battle in progress', '戦闘中です', '전투 진행 중'],
  '待命': ['Standing by', '待機中', '대기 중'],
  '相鄰同色珠三顆起可消除（可斜連）；攻擊須達本關門檻': ["Link 3 or more adjacent orbs of the same color to clear them (diagonals allowed); to attack, you must reach this stage's minimum", '隣り合う同じ色の宝珠を3個以上つなぐと消せます（斜めも可）。攻撃するにはこのステージの基準数が必要です', '이웃한 같은 색 보주를 3개 이상 이으면 지울 수 있습니다(대각선 가능). 공격하려면 이번 스테이지 기준을 채워야 합니다'],
  '出戰神獸（點卡設優先；滿能量點「技能」）': ['Your beasts (tap a card to give it priority; at full energy, tap "Skill")', '出撃中の神獣（カードをタップで優先指定、エネルギー満タンで「スキル」をタップ）', '출전 신수(카드를 눌러 우선 지정, 에너지가 가득 차면 "스킬"을 누르세요)'],
  '傷害': ['Damage', 'ダメージ', '피해'],
  // ── 中途接回／伺服端提示（A6） ──
  '戰局接回功能尚未開放。': ['Battle resume is not available yet.', '対戦の再開機能はまだ公開されていません。', '전투 이어 하기 기능은 아직 열리지 않았습니다.'],
  '戰局資料格式不正確，伺服端拒絕記錄。': ['The battle data format is invalid, so the server refused to record it.', '対戦データの形式が正しくないため、サーバーが記録を拒否しました。', '전투 데이터 형식이 올바르지 않아 서버가 기록을 거부했습니다.'],
  '這場戰局的紀錄和伺服端不一致（可能被修改過），不能接回。依規定這場作廢：不發獎勵、勝場不變，和落敗相同。': ["This battle's record doesn't match the server (it may have been altered), so it can't be resumed. Under the rules this battle is void: no reward and no change to your win count, the same as a loss.", 'この対戦の記録がサーバーと一致しないため（改変された可能性があります）、再開できません。規定によりこの対戦は無効です。報酬はなく勝利数も変わらず、敗北と同じ扱いです。', '이 전투 기록이 서버와 일치하지 않아(수정되었을 수 있습니다) 이어 할 수 없습니다. 규정에 따라 이 판은 무효이며, 보상 없이 승수도 바뀌지 않아 패배와 같습니다.'],
  '伺服端已經記下比這個畫面更新的進度：可能是連線中斷時上一步其實已經送達，或別的分頁／裝置正在打這場。這一步沒有被記錄；請按「重新接回」載入伺服端最新的局面。': ['The server already has newer progress than this screen: your last move may have arrived while the connection dropped, or another tab or device is playing this battle. This move was not recorded. Press "Reconnect" to load the latest state from the server.', 'サーバーにはこの画面より新しい進行が記録されています。接続が切れたときに前の一手が実は届いていたか、別のタブや端末でこの対戦をしている可能性があります。この一手は記録されていません。「再接続」を押してサーバーの最新の局面を読み込んでください。', '서버에는 이 화면보다 새로운 진행이 기록되어 있습니다. 연결이 끊겼을 때 이전 수가 실제로 도착했거나, 다른 탭이나 기기에서 이 판을 하고 있을 수 있습니다. 이번 수는 기록되지 않았습니다. "다시 연결"을 눌러 서버의 최신 상황을 불러오세요.'],
  '這場戰局已超過 24 小時沒有進度，不能再接回。依規定這場作廢：不發獎勵、勝場不變，和落敗相同。': ["This battle has had no progress for over 24 hours and can't be resumed. Under the rules it is void: no reward and no change to your win count, the same as a loss.", 'この対戦は24時間以上進行がないため、再開できません。規定により無効です。報酬はなく勝利数も変わらず、敗北と同じ扱いです。', '이 판은 24시간 넘게 진행이 없어 이어 할 수 없습니다. 규정에 따라 무효이며, 보상 없이 승수도 바뀌지 않아 패배와 같습니다.'],
  '這場戰鬥已經結算過了，不會再記一次帳。': ["This battle has already been settled and won't be counted again.", 'この対戦はすでに精算済みです。二重には記録されません。', '이 전투는 이미 정산되었으며 다시 기록되지 않습니다.'],
  '這場戰局已經記為落敗（輸掉或中途離開），不能再接回或出手，也不會發獎勵；勝場不變。': ["This battle is already recorded as a loss (lost or left midway). It can't be resumed or played, and there is no reward; your win count is unchanged.", 'この対戦はすでに敗北（負けまたは途中離脱）として記録されています。再開も操作もできず、報酬もありません。勝利数は変わりません。', '이 판은 이미 패배(패배 또는 중도 이탈)로 기록되었습니다. 이어 하거나 둘 수 없고 보상도 없으며, 승수는 그대로입니다.'],
  '這場戰局是在另一台裝置或瀏覽器開始的，這裡不能代打或結算。': ["This battle was started on another device or browser, so it can't be played or settled here.", 'この対戦は別の端末またはブラウザで始まったため、ここでは代わりにプレイしたり精算したりできません。', '이 판은 다른 기기나 브라우저에서 시작되어 여기서는 대신 하거나 정산할 수 없습니다.'],
  '伺服端紀錄顯示敵方還沒有全部倒下，不能結算勝利。': ["The server record shows that not every enemy has fallen, so the win can't be settled.", 'サーバーの記録では敵がまだ全員倒れていないため、勝利を精算できません。', '서버 기록상 적이 아직 모두 쓰러지지 않아 승리를 정산할 수 없습니다.'],
  '伺服端目前沒有共用的戰局紀錄儲存，中途接回功能暫停。這一局改用一般模式：可以照常打、照常結算，但重新整理後會重開本關（不扣勝場）。': ['The server has no shared battle storage right now, so resuming a battle is paused. This battle uses normal mode: you can play and settle as usual, but refreshing restarts the stage (your wins are not reduced).', 'サーバーに共有の対戦記録ストレージがないため、途中再開機能を一時停止しています。この対戦は通常モードになります。普段どおりプレイ・精算できますが、再読み込みするとこのステージは最初からになります（勝利数は減りません）。', '서버에 공유 전투 기록 저장소가 없어 중간 이어 하기 기능을 잠시 멈췄습니다. 이번 판은 일반 모드로 진행합니다. 평소처럼 플레이하고 정산할 수 있지만, 새로 고침하면 이 스테이지를 처음부터 다시 합니다(승수는 줄지 않습니다).'],
  '伺服端已經找不到這場的紀錄（伺服器重新啟動、換了一台，或紀錄已清除），無法確認這場打到哪裡，所以不能接回。這場不發獎勵、勝場不變；已為你準備新的一局。': ["The server can no longer find this battle's record (the server restarted, a different server answered, or the record was cleared), so it can't confirm where you were and the battle can't be resumed. There is no reward and your win count is unchanged. A new battle is ready for you.", 'サーバーでこの対戦の記録が見つかりません（サーバーの再起動、別のサーバーへの切り替え、または記録の消去）。どこまで進んだか確認できないため、再開できません。報酬はなく勝利数も変わりません。新しい対戦を用意しました。', '서버에서 이 판의 기록을 찾을 수 없습니다(서버 재시작, 다른 서버로 전환, 또는 기록 삭제). 어디까지 했는지 확인할 수 없어 이어 할 수 없습니다. 보상은 없고 승수도 그대로입니다. 새 판을 준비했습니다.'],
  '送出的速度太快，伺服端暫時不接受。請稍等幾秒再試；盤面與生命都沒有變更。': ['You sent moves too quickly, so the server is pausing them. Wait a few seconds and try again; the board and HP are unchanged.', '送信が速すぎるため、サーバーが一時的に受け付けていません。数秒待ってからお試しください。盤面とHPは変わっていません。', '너무 빨리 보내서 서버가 잠시 받지 않습니다. 몇 초 뒤 다시 시도하세요. 판과 HP는 그대로입니다.'],
  '上一場未完成的戰局存檔已損毀，無法接回。依規定這場作廢：不發獎勵、勝場不變，和落敗相同。已為你準備新的一局。': ["The save for your unfinished battle is damaged and can't be resumed. Under the rules it is void: no reward and no change to your win count, the same as a loss. A new battle is ready for you.", '前回の未完了の対戦データが壊れているため、再開できません。規定によりこの対戦は無効です。報酬はなく勝利数も変わらず、敗北と同じ扱いです。新しい対戦を用意しました。', '이전에 끝내지 못한 판의 저장 데이터가 손상되어 이어 할 수 없습니다. 규정에 따라 무효이며, 보상 없이 승수도 바뀌지 않아 패배와 같습니다. 새 판을 준비했습니다.'],
  '上一場未完成的戰局已超過 24 小時，不能再接回。依規定這場作廢：不發獎勵、勝場不變，和落敗相同。已為你準備新的一局。': ["Your unfinished battle is more than 24 hours old and can't be resumed. Under the rules it is void: no reward and no change to your win count, the same as a loss. A new battle is ready for you.", '前回の未完了の対戦は24時間を過ぎたため、再開できません。規定によりこの対戦は無効です。報酬はなく勝利数も変わらず、敗北と同じ扱いです。新しい対戦を用意しました。', '이전에 끝내지 못한 판이 24시간을 넘겨 이어 할 수 없습니다. 규정에 따라 무효이며, 보상 없이 승수도 바뀌지 않아 패배와 같습니다. 새 판을 준비했습니다.'],
  '這個瀏覽器不允許儲存，無法確認有沒有未完成的戰局。請允許網站儲存資料後重新整理。': ["This browser doesn't allow storage, so we can't check for an unfinished battle. Please allow this site to store data, then refresh.", 'このブラウザは保存を許可していないため、未完了の対戦があるか確認できません。サイトのデータ保存を許可してから再読み込みしてください。', '이 브라우저는 저장을 허용하지 않아 끝내지 못한 판이 있는지 확인할 수 없습니다. 사이트 데이터 저장을 허용한 뒤 새로 고침하세요.'],
  '已接回上一場未完成的戰局：血量、盤面、敵人、回合與能量都和離開前一樣。': ['Your unfinished battle is back: HP, board, enemies, turn and energy are exactly as you left them.', '前回の未完了の対戦を再開しました。HP、盤面、敵、ターン、エネルギーは離れる前と同じです。', '끝내지 못한 판을 이어 왔습니다. HP, 판, 적, 턴, 에너지가 나가기 전과 같습니다.'],
  '已接回上一場未完成的戰局。你重新整理時最後一步剛好送出，伺服端已經算完，畫面已更新成伺服端的最新結果。': ['Your unfinished battle is back. Your last move was sent just as you refreshed and the server already processed it, so the screen now shows the latest result from the server.', '前回の未完了の対戦を再開しました。再読み込みしたときに最後の一手が送信され、サーバーで計算済みだったため、画面をサーバーの最新結果に更新しました。', '끝내지 못한 판을 이어 왔습니다. 새로 고침할 때 마지막 수가 마침 전송되어 서버가 이미 계산했기 때문에, 화면을 서버의 최신 결과로 바꿨습니다.'],
  '這場戰鬥正在另一個分頁進行。請回到那個分頁繼續；若已關閉，請重新整理這一頁。': ["This battle is open in another tab. Go back to that tab to continue; if you've closed it, refresh this page.", 'この対戦は別のタブで進行中です。そのタブに戻って続けてください。閉じた場合はこのページを再読み込みしてください。', '이 전투는 다른 탭에서 진행 중입니다. 그 탭으로 돌아가 계속하세요. 닫았다면 이 페이지를 새로 고침하세요.'],
  '暫時無法連線確認上一場戰局，戰局仍保留，不會重開。請確認網路後按「重試接回」。': ['We can\'t reach the server to check your last battle right now. The battle is kept and won\'t restart. Check your connection and press "Retry reconnect".', '今はサーバーに接続して前回の対戦を確認できません。対戦は保持され、やり直しにはなりません。ネットワークを確認して「再接続をやり直す」を押してください。', '지금은 서버에 연결해 이전 판을 확인할 수 없습니다. 판은 그대로 보관되며 다시 시작되지 않습니다. 네트워크를 확인한 뒤 "다시 연결 재시도"를 누르세요.'],
  '你的闖關進度已經變更（例如剛匯入備份，或在別的分頁打完了一關），上一場未完成的戰局對不上目前進度，所以無法接回。這場不發獎勵、勝場不變；已為你準備新的一局。': ["Your campaign progress has changed (for example, you just imported a backup or finished a stage in another tab), so your unfinished battle no longer matches and can't be resumed. There is no reward and your win count is unchanged. A new battle is ready for you.", 'チャレンジの進行が変わったため（バックアップを読み込んだ、別のタブでステージをクリアしたなど）、前回の未完了の対戦が現在の進行と合わず、再開できません。報酬はなく勝利数も変わりません。新しい対戦を用意しました。', '도전 진행이 바뀌어(예: 방금 백업을 가져왔거나 다른 탭에서 스테이지를 깼음) 끝내지 못한 판이 현재 진행과 맞지 않아 이어 할 수 없습니다. 보상은 없고 승수도 그대로입니다. 새 판을 준비했습니다.'],
  '連線中斷：剛才那一步可能已經送到伺服端，也可能沒有。請按「重新接回」向伺服端確認最新局面（不會重複扣血，也不會多算一步）。': ['Connection lost: your last move may or may not have reached the server. Press "Reconnect" to check the latest state with the server (HP won\'t be deducted twice and no extra move will be counted).', '接続が切れました。直前の一手はサーバーに届いたかもしれませんし、届いていないかもしれません。「再接続」を押してサーバーの最新の局面を確認してください（HPが二重に減ったり、手数が増えたりはしません）。', '연결이 끊겼습니다. 방금 둔 수가 서버에 도착했을 수도, 아닐 수도 있습니다. "다시 연결"을 눌러 서버의 최신 상황을 확인하세요(HP가 두 번 깎이거나 수가 더 계산되지 않습니다).'],
};

type Fmt = (m: RegExpMatchArray, t: (s: string) => string) => string;
const P = (re: RegExp, en: Fmt, ja: Fmt, ko: Fmt) => ({ re, f: { en, ja, ko } as Record<Locale, Fmt> });
const NAME = '([^\\s，、・（）0-9]{1,8}?(?:・幼子)?)';
/** 動態句（帶數字或卡名）。卡名保留原文。 */
const PATTERNS = [
  P(new RegExp(`^點選 ${NAME}$`), m => `Choose ${m[1]}`, m => `${m[1]}を選ぶ`, m => `${m[1]} 선택`),
  P(new RegExp(`^已選 ${NAME}・請按下方確認$`), m => `${m[1]} selected · confirm below`, m => `${m[1]}を選択中・下で確定してください`, m => `${m[1]} 선택됨 · 아래에서 확정하세요`),
  P(new RegExp(`^已選 ${NAME}，請點下方按鈕確認，再選擇四位夥伴。$`), m => `You chose ${m[1]}. Confirm with the button below, then pick four companions.`, m => `${m[1]}を選びました。下のボタンで確定してから、仲間を4体選んでください。`, m => `${m[1]}을(를) 골랐습니다. 아래 버튼으로 확정한 뒤 동료 넷을 고르세요.`),
  P(new RegExp(`^點此確認 ${NAME}，繼續選夥伴 →$`), m => `Confirm ${m[1]} and pick companions →`, m => `${m[1]}で決定して仲間選びへ →`, m => `${m[1]}(으)로 확정하고 동료 고르기 →`),
  P(/^已選 (\d)／4 位夥伴，還差 (\d) 位$/, m => `${m[1]}/4 companions chosen, ${m[2]} to go`, m => `仲間 ${m[1]}／4 体を選択、あと ${m[2]} 体`, m => `동료 ${m[1]}/4명 선택, ${m[2]}명 남음`),
  P(/^請再點選 (\d) 位夥伴$/, m => `Pick ${m[1]} more`, m => `あと ${m[1]} 体選んでください`, m => `${m[1]}명 더 고르세요`),
  P(/^已選 (\d+) 張$/, m => `${m[1]} selected`, m => `${m[1]} 枚選択中`, m => `${m[1]}장 선택됨`),
  P(/^顯示全部 (\d+) 張(成獸|幼子)$/, m => `Show all ${m[1]} ${m[2] === '成獸' ? 'adult beasts' : 'young beasts'}`, m => `${m[2] === '成獸' ? '成獣' : '幼獣'}を全 ${m[1]} 枚表示`, m => `${m[2] === '成獸' ? '성체 신수' : '어린 신수'} ${m[1]}장 모두 보기`),
  P(/^收起(成獸|幼子)$/, m => `Hide ${m[1] === '成獸' ? 'adult beasts' : 'young beasts'}`, m => `${m[1] === '成獸' ? '成獣' : '幼獣'}を閉じる`, m => `${m[1] === '成獸' ? '성체 신수' : '어린 신수'} 접기`),
  P(new RegExp(`^${NAME}，出戰攻擊 (\\d+)$`), m => `${m[1]}, battle attack ${m[2]}`, m => `${m[1]}、出撃時の攻撃 ${m[2]}`, m => `${m[1]}, 출전 공격 ${m[2]}`),
  P(new RegExp(`^移除${NAME}$`), m => `Remove ${m[1]}`, m => `${m[1]}を外す`, m => `${m[1]} 빼기`),
  P(/^已獲 (\d+) 張 · (已選夥伴|點選出戰)$/, m => `Won ×${m[1]} · ${m[2] === '已選夥伴' ? 'Chosen' : 'Tap to deploy'}`, m => `獲得 ${m[1]} 枚・${m[2] === '已選夥伴' ? '選択済み' : 'タップで出撃'}`, m => `${m[1]}장 보유 · ${m[2] === '已選夥伴' ? '선택됨' : '눌러서 출전'}`),
  P(/^攻 (\d+)／上限 (\d+)$/, m => `ATK ${m[1]} / cap ${m[2]}`, m => `攻撃 ${m[1]}／上限 ${m[2]}`, m => `공격 ${m[1]}/상한 ${m[2]}`),
  P(/^已滿 (\d+)／(\d+)$/, m => `Maxed ${m[1]}/${m[2]}`, m => `上限 ${m[1]}／${m[2]}`, m => `상한 ${m[1]}/${m[2]}`),
  P(new RegExp(`^強化${NAME}，攻擊 (\\d+)／上限 (\\d+)$`), m => `Boost ${m[1]}, attack ${m[2]} / cap ${m[3]}`, m => `${m[1]}を強化、攻撃 ${m[2]}／上限 ${m[3]}`, m => `${m[1]} 강화, 공격 ${m[2]}/상한 ${m[3]}`),
  P(/^攻 (\d+)$/, m => `ATK ${m[1]}`, m => `攻撃 ${m[1]}`, m => `공격 ${m[1]}`),
  P(/^（卡面 (\d+)）$/, m => ` (card ${m[1]})`, m => `（カード ${m[1]}）`, m => `(카드 ${m[1]})`),
  P(/^永久 \+(\d+) · 攻擊 (\d+)$/, m => `Permanent +${m[1]} · ATK ${m[2]}`, m => `永久 +${m[1]}・攻撃 ${m[2]}`, m => `영구 +${m[1]} · 공격 ${m[2]}`),
  P(/^再贏 (\d+) 場解鎖永久強化（第五關起）$/, m => `Win ${m[1]} more to unlock permanent boosts (from stage 5)`, m => `あと ${m[1]} 勝で永久強化が解放されます（ステージ5から）`, m => `${m[1]}번 더 이기면 영구 강화가 해금됩니다(5스테이지부터)`),
  P(/^再贏 (\d+) 場解鎖永久強化。$/, m => `Win ${m[1]} more to unlock permanent boosts.`, m => `あと ${m[1]} 勝で永久強化が解放されます。`, m => `${m[1]}번 더 이기면 영구 강화가 해금됩니다.`),
  P(/^(\d+)／(\d+) 勝・每贏一場會拿到一張成獸，解鎖後可以把幼子或重複卡吃進主角，變強會直接帶進下一關。$/, m => `${m[1]}/${m[2]} wins · Each win gives you an adult beast card. Once unlocked, you can feed young beasts or duplicate cards to your hero, and the boost carries straight into the next stage.`, m => `${m[1]}／${m[2]} 勝・1勝ごとに成獣カードを1枚獲得します。解放後は幼獣や重複カードを主人公に取り込めて、強化はそのまま次のステージに反映されます。`, m => `${m[1]}/${m[2]}승 · 이길 때마다 성체 신수 카드 1장을 얻습니다. 해금 후에는 어린 신수나 중복 카드를 주인공에게 흡수시킬 수 있고, 강화는 바로 다음 스테이지에 반영됩니다.`),
  P(/^已滿（(\d+)／(\d+)）$/, m => `Maxed (${m[1]}/${m[2]})`, m => `上限（${m[1]}／${m[2]}）`, m => `상한(${m[1]}/${m[2]})`),
  P(/^已滿（(\d+)／(\d+)），不能再強化$/, m => `Maxed (${m[1]}/${m[2]}), can't boost further`, m => `上限（${m[1]}／${m[2]}）、これ以上強化できません`, m => `상한(${m[1]}/${m[2]}), 더 강화할 수 없음`),
  P(/^攻擊 (\d+)／上限 (\d+)，還能加 (\d+) 點$/, m => `Attack ${m[1]} / cap ${m[2]}, ${m[3]} more possible`, m => `攻撃 ${m[1]}／上限 ${m[2]}、あと ${m[3]} 上げられます`, m => `공격 ${m[1]}/상한 ${m[2]}, ${m[3]} 더 올릴 수 있음`),
  P(/^這張 \+(\d+) 會超過上限（只差 (\d+) 點），請改選加成較小的材料$/, m => `This card's +${m[1]} would exceed the cap (only ${m[2]} left). Choose material with a smaller bonus`, m => `このカードの +${m[1]} は上限を超えます（残り ${m[2]}）。ボーナスの小さい素材を選んでください`, m => `이 카드의 +${m[1]}은(는) 상한을 넘습니다(남은 ${m[2]}). 보너스가 작은 재료를 고르세요`),
  P(/^這張幼子 \+(\d+) 會超過上限（只差 (\d+) 點），請改選加成較小的幼子$/, m => `This young beast's +${m[1]} would exceed the cap (only ${m[2]} left). Choose a young beast with a smaller bonus`, m => `この幼獣の +${m[1]} は上限を超えます（残り ${m[2]}）。ボーナスの小さい幼獣を選んでください`, m => `이 어린 신수의 +${m[1]}은(는) 상한을 넘습니다(남은 ${m[2]}). 보너스가 작은 어린 신수를 고르세요`),
  P(/^已吃進 (\d+) 張，攻擊 (\d+) → (\d+)，已儲存。$/, m => `Absorbed ${m[1]} cards, attack ${m[2]} → ${m[3]}. Saved.`, m => `${m[1]} 枚取り込み、攻撃 ${m[2]} → ${m[3]}。保存しました。`, m => `${m[1]}장 흡수, 공격 ${m[2]} → ${m[3]}. 저장했습니다.`),
  P(/^・上限 (\d+)$/, m => ` · cap ${m[1]}`, m => `・上限 ${m[1]}`, m => ` · 상한 ${m[1]}`),
  P(/^・已滿$/, () => ' · maxed', () => '・上限', () => ' · 상한'),
  P(/^（上限 (\d+)）$/, m => ` (cap ${m[1]})`, m => `（上限 ${m[1]}）`, m => `(상한 ${m[1]})`),
  P(/^攻擊 (\d+) →$/, m => `Attack ${m[1]} →`, m => `攻撃 ${m[1]} →`, m => `공격 ${m[1]} →`),
  P(/^再贏 (\d+) 場解鎖永久強化（(\d+)／(\d+)）$/, m => `Win ${m[1]} more to unlock permanent boosts (${m[2]}/${m[3]})`, m => `あと ${m[1]} 勝で永久強化が解放されます（${m[2]}／${m[3]}）`, m => `${m[1]}번 더 이기면 영구 강화가 해금됩니다(${m[2]}/${m[3]})`),
  P(/^張（(.+)），材料剩$/, (m, t) => ` cards (${t(m[1])}), materials left:`, (m, t) => `枚（${t(m[1])}）、残りの素材`, (m, t) => `장(${t(m[1])}), 남은 재료`),
  P(/^・只差 (\d+) 點，這張會超過上限$/, m => ` · only ${m[1]} left; this card would exceed the cap`, m => `・残り ${m[1]}、このカードは上限を超えます`, m => ` · 남은 ${m[1]}, 이 카드는 상한을 넘습니다`),
  P(/^確認出手（(\d+) 顆）$/, m => `Confirm move (${m[1]})`, m => `確定して出す（${m[1]} 個）`, m => `확정하고 공격(${m[1]}개)`),
  P(/^合計 (\d+) 顆：只消除補珠，本關需 (\d+) 顆才會攻擊$/, m => `${m[1]} in total: this only clears and refills; this stage needs ${m[2]} to attack`, m => `合計 ${m[1]} 個：消して補充するだけです。このステージは ${m[2]} 個で攻撃になります`, m => `합계 ${m[1]}개: 지우고 보충만 합니다. 이 스테이지는 ${m[2]}개부터 공격합니다`),
  P(/^已選 (\d+) 顆。(.*)$/, (m, t) => `${m[1]} selected. ${m[2] ? t(m[2]) : ''}`.trim(), (m, t) => `${m[1]} 個選択中。${m[2] ? t(m[2]) : ''}`, (m, t) => `${m[1]}개 선택됨. ${m[2] ? t(m[2]) : ''}`.trim()),
  P(/^需 (\d+) 張卡各 (\d+) 能量$/, m => `Needs ${m[1]} cards with ${m[2]} energy each`, m => `${m[1]} 枚のカードにそれぞれエネルギー ${m[2]} が必要`, m => `카드 ${m[1]}장에 각각 에너지 ${m[2]} 필요`),
  P(/^再選 (\d+) 張$/, m => `Pick ${m[1]} more`, m => `あと ${m[1]} 枚`, m => `${m[1]}장 더`),
  P(/^每張需 (\d+) 能量$/, m => `Each needs ${m[1]} energy`, m => `1枚ごとにエネルギー ${m[1]} が必要`, m => `장당 에너지 ${m[1]} 필요`),
  P(/^第 (\d+) 關 · (\d+)顆可攻擊$/, m => `Stage ${m[1]} · ${m[2]} orbs to attack`, m => `ステージ${m[1]}・${m[2]}個で攻撃`, m => `${m[1]}스테이지 · ${m[2]}개부터 공격`),
  P(/^回合 (\d+)$/, m => `Turn ${m[1]}`, m => `ターン ${m[1]}`, m => `${m[1]}턴`),
  P(/^暫時無法建立戰局紀錄：(.+)$/, (m, t) => `Couldn't create the battle record: ${t(m[1])}`, (m, t) => `今は対戦記録を作成できません：${t(m[1])}`, (m, t) => `지금은 전투 기록을 만들 수 없습니다: ${t(m[1])}`),
];
/** 「幼子 3、同卡共鳴 1、本體 2」這類組合字串的詞彙替換（只用於上面的動態句內）。 */
const PIECES: Record<Locale, [RegExp, string][]> = {
  en: [[/同卡共鳴 (\d+)/g, 'resonance $1'], [/幼子 (\d+)/g, 'young $1'], [/本體 (\d+)/g, 'adult $1'], [/、/g, ', ']],
  ja: [[/同卡共鳴 (\d+)/g, '同カード共鳴 $1'], [/幼子 (\d+)/g, '幼獣 $1'], [/本體 (\d+)/g, '本体 $1']],
  ko: [[/同卡共鳴 (\d+)/g, '같은 카드 공명 $1'], [/幼子 (\d+)/g, '어린 신수 $1'], [/本體 (\d+)/g, '본체 $1'], [/、/g, ', ']],
};

const INDEX: Record<Locale, number> = { en: 0, ja: 1, ko: 2 };

/** 只在神獸戰鬥相關頁面生效（避免單字詞條在其他頁面誤換）。 */
export function onMatch3Page(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p.startsWith('/beast-game') || p.startsWith('/star-beasts');
}

export function createMatch3Translator(locale: Locale): Translate {
  const exact = new Map(Object.entries(ROWS).map(([k, v]) => [k, v[INDEX[locale]]]));
  const pieces = (s: string) => { const hit = exact.get(s); if (hit) return hit; let out = s; for (const [re, rep] of PIECES[locale]) out = out.replace(re, rep); return out; };
  return text => {
    const hit = exact.get(text);
    if (hit !== undefined) return hit;
    for (const { re, f } of PATTERNS) { const m = text.match(re); if (m) return f[locale](m, pieces); }
    return undefined;
  };
}

/** 測試用：字典鍵數與三語都有值。 */
export const MATCH3_COPY_KEYS = Object.keys(ROWS);
export const MATCH3_PATTERN_COUNT = PATTERNS.length;

/**
 * 簡體中文（大陸慣用詞）補正：全站 OpenCC 轉換後，只在神獸戰鬥頁再換掉台灣用語。
 * 只動顯示文字；不放進全站 PROJECT_OVERRIDES，避免影響命理等其他頁面的既有用字。
 */
const HANS_FIXES: [string, string][] = [
  ['伺服端', '服务器'], ['战局纪录', '战局记录'], ['纪录', '记录'], ['存盘', '存档'], ['备份档', '备份文件'], ['屏幕报读', '读屏'],
];
export function fixMatch3Hans(text: string): string {
  if (!onMatch3Page()) return text;
  let out = text;
  for (const [from, to] of HANS_FIXES) out = out.split(from).join(to);
  return out;
}
