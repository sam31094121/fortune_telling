/**
 * 鬼魅阿修羅完整話術字典
 *
 * 基於 FIXED_SHENSHA_MAP 中的所有 60+ asuraId
 * 規範要求：所有 asuraId 都必須有四層完整話術
 *
 * 話術層級：
 * 1. meaningStrong - 短宣告（一句核心）
 * 2. coreMeaning - 核心意義（詳細說明）
 * 3. battleSignificance - 戰鬥意義（對戰場的影響）
 * 4. advice - 建議（可變的表達層）
 */

export const COMPLETE_ASURA_DICTIONARY = {
  // === 吉利印記 ===
  '天赦神契': {
    meaningStrong: '有人替你開門。',
    coreMeaning: '進去後的仗還得自己打。別被福氣寵壞了。有人幫你，不是叫你還債，而是叫你去贏。',
    battleSignificance: '每贏一場，都是在擴大那支援軍的勢力。',
    advice: '用優勢去戰鬥，不是躺著享受。',
  },
  '天德護印': {
    meaningStrong: '德是力量的審視，不是退縮。',
    coreMeaning: '你有能力傷人，但你選擇不傷無辜。這和退縮是兩回事。困難時刻的選擇，五年後不會後悔。',
    battleSignificance: '你賭的是自己的力量，不是別人的憐憫。',
    advice: '有邊界的德，才是德。',
  },
  '月德靈契': {
    meaningStrong: '月光是冷的，不是溫柔的。',
    coreMeaning: '它照亮黑夜，卻不是為了讓你舒服，而是讓你看清敵人在哪。用這股冷光去看清戰局，不是躲在光下。',
    battleSignificance: '被看見的第一步，是去看清自己想要什麼。',
    advice: '以月光為劍，在黑暗裡戰鬥。',
  },
  '天龍護命': {
    meaningStrong: '龍德是權力，不是安定。',
    coreMeaning: '你站上高處，所有人都會來挑戰你。這不是詛咒，是戰場的邀請函。每一個高度都會有新的敵人。',
    battleSignificance: '不是躲起來，是一層層往上打。',
    advice: '龍不怕摔，龍怕的是被圈養。',
  },
  '玄金寶庫': {
    meaningStrong: '有本錢才有話語權。',
    coreMeaning: '囤積資源而不出手，那不是智慧，是懦弱。資源在手，才能用來做大事。',
    battleSignificance: '有底氣的人敢出手。存底越多，能打的仗就越大。',
    advice: '存著不打，那不是保護，是逃避。',
  },

  // === 警告印記 ===
  '五陰纏影': {
    meaningStrong: '五陰纏影已現。',
    coreMeaning: '陰氣不是靠近你，是已經纏上命魂。順時，你能先一步嗅出暗流。逆時，疑念、雜音、背後之影，會一層層封住判斷。若再遇亡影、劫境、幽辰同場，整個戰局直接墜入陰域。',
    battleSignificance: '到那時，不是你在看局——是局在吞你。',
    advice: '鬼魅阿修羅只看一件事：你能不能在陰影徹底合圍之前，先把它們鎮碎。',
  },
  '劫境之門': {
    meaningStrong: '知道風浪要來，就不叫逆境，叫準備。',
    coreMeaning: '戰士不怕風浪，戰士怕的是沒有準備好的風浪。風浪來臨時，準備好的人會變成船長。',
    battleSignificance: '清單不是為了安心，是為了戰鬥。',
    advice: '沒準備的人才是溺水者。',
  },
  '六劫之關': {
    meaningStrong: '人生常常要多繞一圈才成。',
    coreMeaning: '別搞反了意思。磨刀不是為了放下，是為了砍得更狠。每一道關卡都在升級你的武器。',
    battleSignificance: '多走一些路，反而能看到敵人看不到的地方。',
    advice: '每一步都在增強防禦和攻擊力。',
  },
  '幽辰之障': {
    meaningStrong: '元辰在暗處，障礙是隱性的。',
    coreMeaning: '它不張揚，卻會在無形中阻擋。認識它，才能迴避它。',
    battleSignificance: '暗障最怕的就是被看見。',
    advice: '先看見，才能先避開。',
  },
  '碎月之痕': {
    meaningStrong: '環境砸碎舊框架，逼著你改變。',
    coreMeaning: '砸碎舊框架才能看到新戰場。計畫趕不上變化？那說明你的敵人在不停出招。出招更快。',
    battleSignificance: '變化快的人，是因為他們根本不依戀框架。',
    advice: '主動地破，不是被動地破。',
  },
  '裂日之痕': {
    meaningStrong: '卡著的地方，就是最有力量的地方。',
    coreMeaning: '與這一柱代表的人事容易拉扯。但對抗不是詛咒，是力量。衝突才是你的舞台。',
    battleSignificance: '把對抗精神用對地方——對抗不公平、對抗懦弱、對抗自己的局限。',
    advice: '天生要去戰鬥的人，不要把衝突當成失敗。',
  },

  // === 力量印記 ===
  '鎮軍之魂': {
    meaningStrong: '天生指揮官，你不是跟隨者。',
    coreMeaning: '領導力像刀沒錯，但刀是用來砍敵人的，不是用來自己反省的。掉隊的人註定要掉隊。',
    battleSignificance: '你的責任不是去撿，而是帶著願意跟的人去更遠的地方。',
    advice: '讓隊伍知道你想要什麼，然後為之奮戰。',
  },
  '逐界行者': {
    meaningStrong: '永遠在移動。但別理解成逃離，那是進攻。',
    coreMeaning: '不穩定的人，往往是最難被困住的人。每一個停靠點都是一個陣地。你是巡迴式的征服者。',
    battleSignificance: '移動是為了進攻，不是為了逃避。',
    advice: '在移動中也能精準出手。',
  },
  '血刃之鋒': {
    meaningStrong: '刀鋒已經出鞘。',
    coreMeaning: '爆發力就在邊界。不是等著被激怒，而是隨時準備好一刀決出。',
    battleSignificance: '一刀之力，勝過千言萬語。',
    advice: '有刃就敢出手。',
  },
  '虛界空印': {
    meaningStrong: '空亡就是虛界，該來的沒來。',
    coreMeaning: '缺席不代表幸運。有時候缺席本身，就是一個劫難。什麼該發生卻沒發生，才是真正的問題。',
    battleSignificance: '虛空之力最難察覺，因為它什麼都沒做。',
    advice: '看清空白，才能填補它。',
  },

  // === 擴充必需的所有其他 asuraId ===
  // 以下是針對所有其他 asuraId 的基本話術架構
  // 每個都遵循四層結構

  '玄極天印': {
    meaningStrong: '太極貴人牌，大局觀者的護符。',
    coreMeaning: '你能看到別人看不到的大局。這不是優越感，是責任——你得用這份視野去戰鬥。',
    battleSignificance: '宏觀視角就是破局的鑰匙。',
    advice: '用大局意識來決策，不是用情緒。',
  },
  '文魂天契': {
    meaningStrong: '文昌守護，文字的力量就是你的刀。',
    coreMeaning: '言辭、書寫、理論——這些都是你的武器。不是虛的，是實實在在的戰鬥工具。',
    battleSignificance: '說服別人的人，控制了戰局的節奏。',
    advice: '把筆和舌頭當成刀來用。',
  },
  '福曜護命': {
    meaningStrong: '福星守護，好運不是躺著等的。',
    coreMeaning: '福運要主動去接。機會來時，準備好的人才抓得住。幸運眷顧的是行動者。',
    battleSignificance: '好運和努力的交點，就是決勝點。',
    advice: '運氣幫你，但得你自己去抓。',
  },
  '鎮國之印': {
    meaningStrong: '國印貴人，權力的象徵。',
    coreMeaning: '你有權力掌控大局。但權力越大，責任越大。不是為了享受，是為了戰鬥。',
    battleSignificance: '掌權者的每個決定，都決定了戰局。',
    advice: '權力不是目的，是工具。',
  },
  '靈學之門': {
    meaningStrong: '學堂之光，知識就是力量。',
    coreMeaning: '你的聰慧來自學習和思考。這份智力不是用來逃避，是用來戰鬥的。',
    battleSignificance: '知識決定戰場的高度。',
    advice: '永遠比敵人多知道一點。',
  },
  '文魄秘殿': {
    meaningStrong: '詞館秘密，文化的傳承者。',
    coreMeaning: '你懂的規則和典故，別人不懂。這是你的優勢。用這份優勢去看穿對手。',
    battleSignificance: '懂規則的人，能利用規則。',
    advice: '知識的深度就是你的護盾。',
  },
  '天饗神庫': {
    meaningStrong: '天廚守護，豐盛的物質基礎。',
    coreMeaning: '你不缺物資。有這個基礎，就該拿去做大事。不用只是保留，要敢於投入。',
    battleSignificance: '資源充足的人，能支持更長的戰線。',
    advice: '用你有的去換你想要的。',
  },
  '玄祿寶印': {
    meaningStrong: '祿神加護，財運的眷顧。',
    coreMeaning: '金錢會來，但來了之後呢？花在對的地方，才是智慧。',
    battleSignificance: '財務自由的人，能選擇自己的戰場。',
    advice: '祿運要用來擴大勢力，不是積累。',
  },
  '天醫靈契': {
    meaningStrong: '療癒之力不在於柔軟，而在於對症下藥。',
    coreMeaning: '你能看清對方的傷口，但開刀需要狠心。醫者不是心軟的職業，是眼冷的職業。',
    battleSignificance: '識人之能，就是你的致命一劍。',
    advice: '治癒別人之前，先學著不被傷害。',
  },
  '孤華幽冠': {
    meaningStrong: '華蓋之力，孤絕而高貴。',
    coreMeaning: '你的特殊性讓你與眾不同，但也讓你孤獨。接受這份孤獨，它是你的力量源泉。',
    battleSignificance: '獨特的人往往是戰場上最致命的。',
    advice: '你的孤獨就是你的優勢。',
  },
  '劫魂之刃': {
    meaningStrong: '一刻不停的奪取，這就是你的宿命。',
    coreMeaning: '命盤上的掠奪之氣不是貪婪，是對手早就在你面前的信號。該搶的搶，該抓的抓，不要當受害者。',
    battleSignificance: '別人的失手，就是你的進攻機會。',
    advice: '搶贏的人，都是在對手鬆懈那一刻出手的。',
  },
  '亡影幽魂': {
    meaningStrong: '亡神降臨，死亡的陰影。',
    coreMeaning: '面對死亡的陰影，你有兩種選擇：屈服或戰鬥。戰士只會選擇後者。',
    battleSignificance: '不怕死的人，最難被打敗。',
    advice: '死都不怕，還怕什麼。',
  },
  '白虎血印': {
    meaningStrong: '白虎下降，鮮血淋漓。',
    coreMeaning: '危險就在眼前。但危險也意味著機會——敢於面對的人，能從中奪利。',
    battleSignificance: '最危險的時刻，往往是反殺的機會。',
    advice: '血和刀就是你的語言。',
  },
  '喪界幽門': {
    meaningStrong: '喪門開啟，失去的預兆。',
    coreMeaning: '失去是必然。但失去什麼，決定了你的未來。要失去的是無用的，保護的是核心。',
    battleSignificance: '懂得放棄的人，反而能贏。',
    advice: '舍得放下，才能握緊重要的。',
  },
  '麻衣冥印': {
    meaningStrong: '披麻戴孝，哀悼之風。',
    coreMeaning: '悲傷不是軟弱，是力量的另一個形態。用你的哀傷去銘記教訓。',
    battleSignificance: '有血性的人，會把哀傷化作決心。',
    advice: '用眼淚去鑄刀。',
  },
  '孤辰絕界': {
    meaningStrong: '孤絕不是懲罰，是你被迫學會的絕技。',
    coreMeaning: '命盤上的孤絕：沒人幫，只能自救；沒路走，就自己開路。這不是悲傷的故事，是戰士的故事。',
    battleSignificance: '獨行時最強，團隊時最危險——因為你習慣了一個人。',
    advice: '孤絕的人才能絕地逢生，因為沒有退路可言。',
  },
  '寡宿幽宮': {
    meaningStrong: '寡宿之星，獨行的宿命。',
    coreMeaning: '沒有伴侶不是詛咒，是自由。用這份自由去選擇你想要的戰場。',
    battleSignificance: '沒有羈絆的人，能走得更遠。',
    advice: '孤身一人也能成就大業。',
  },
  '紅鸞魅印': {
    meaningStrong: '紅鸞起舞，愛欲的漩渦。',
    coreMeaning: '感情是力量的源泉，但也是陷阱。要會用，不要被用。',
    battleSignificance: '感情驅動的人，往往最無敵。',
    advice: '用愛去戰鬥，但別被愛打敗。',
  },
  '天喜緣契': {
    meaningStrong: '天喜降臨，好事連連。',
    coreMeaning: '運氣在你一邊。有這份基礎，就該放膽去做。幸運眷顧的是勇敢者。',
    battleSignificance: '好運會加倍你的力量。',
    advice: '運氣來時，就要大膽出手。',
  },
  '魅池情印': {
    meaningStrong: '咸池之水，情欲的深淵。',
    coreMeaning: '誘惑就在眼前。識人之能比抵抗之心更重要。知道哪些是陷阱，就能繞過去。',
    battleSignificance: '識破對手的手段，就贏了一半。',
    advice: '不是避免誘惑，是用它來贏。',
  },
  '緋艷魅魂': {
    meaningStrong: '紅艷現世，欲望的化身。',
    coreMeaning: '你有吸引力，但這是危險的武器。懂得控制，就能征服；失控，就會被反噬。',
    battleSignificance: '魅力就是最高級的武器。',
    advice: '用吸引力來控制戰局。',
  },
  '童靈之印': {
    meaningStrong: '童子星臨，童心未泯。',
    coreMeaning: '保持直覺很重要。但直覺要和理性結合，才能形成戰力。',
    battleSignificance: '童真的洞察力，往往最準。',
    advice: '別失去你的本心，但要加上策略。',
  },
  '陰陽錯界': {
    meaningStrong: '陰差陽錯，命運的玩笑。',
    coreMeaning: '計畫永遠趕不上變化。但變化本身就是機會。善於應變的人，能在混亂中找到勝機。',
    battleSignificance: '混亂就是英雄的舞台。',
    advice: '計畫趕不上變化時，才是真正的考驗。',
  },
  '十敗劫印': {
    meaningStrong: '十惡大敗，終極的劫數。',
    coreMeaning: '這是命盤上最凶的印記。但凶不代表死——它代表終極的試煉。度過去，就是新生。',
    battleSignificance: '在絕境中反殺，才是真正的勝者。',
    advice: '大敗之後，要麼死，要麼成神。',
  },
  '魁罡戰魂': {
    meaningStrong: '魁罡之星，將軍的氣魄。',
    coreMeaning: '你天生是領袖。但領袖不是享受權力，是承擔責任。你的能力就是你的十字架。',
    battleSignificance: '領導力決定戰場的勝負。',
    advice: '帶著軍隊去征服，不是逃避。',
  },
  '飛刃血痕': {
    meaningStrong: '飛刃無蹤，血痕遍地。',
    coreMeaning: '你的力量來自於隱身。不顯山露水，卻能一擊致命。這是暗殺者的風格。',
    battleSignificance: '看不見的刃，才是最致命的。',
    advice: '隱身不是懦弱，是戰術。',
  },
  '流霞魅痕': {
    meaningStrong: '流霞如鄉，魅力無窮。',
    coreMeaning: '你的魅力像流動的霞光，難以捉摸但無人能拒。用這份魅力去影響他人。',
    battleSignificance: '無形的影響力，勝過有形的暴力。',
    advice: '讓別人心甘情願跟隨你。',
  },
  '羅網禁界': {
    meaningStrong: '天羅地網，無處可逃。',
    coreMeaning: '陷阱就在四周。但知道陷阱在哪，就能利用它去困敵人。',
    battleSignificance: '最好的防守，就是把敵人困在網裡。',
    advice: '學會設置陷阱，就不怕被陷阱。',
  },
  '赤血刃印': {
    meaningStrong: '血刃之星，殺戮的歡樂。',
    coreMeaning: '你的手上會見血。但血不是污點，是勳章。有過殺戮，才知道自己有多強。',
    battleSignificance: '嘗過血的人，再也回不去。',
    advice: '用血去證明你的存在。',
  },
  '勾魂絞界': {
    meaningStrong: '勾絞之星，靈魂的囚籠。',
    coreMeaning: '你能困住別人的心。但這份力量也能困住自己。要會用，不要被用。',
    battleSignificance: '控制心靈的人，控制了戰場。',
    advice: '讓別人靈魂出竅，自己卻清醒如常。',
  },

  // === 其他映射 ===
  '孤界之門': {
    meaningStrong: '隔角之力，分割與孤立。',
    coreMeaning: '你有分離他人的力量。但用來分離敵人的聯盟，而不是孤立自己。',
    battleSignificance: '分化對方陣營，就贏了。',
    advice: '學會製造分裂，瓦解對手。',
  },
  '洗魂之境': {
    meaningStrong: '沐浴之光，淨化與重生。',
    coreMeaning: '你能洗去過去的污垢。每一次失敗都是淨化。失敗越多，你越強。',
    battleSignificance: '從零開始的人，往往最無敵。',
    advice: '每次摔倒都是清洗，站起來就是新人。',
  },
  '裂天劫印': {
    meaningStrong: '天煞之力，撕裂蒼穹。',
    coreMeaning: '你的力量足以摧毀。但摧毀是為了重建。不是單純的破壞，是創造的前奏。',
    battleSignificance: '摧毀舊秩序的人，就能建立新秩序。',
    advice: '用摧毀去打開新的可能。',
  },
  '魅生之印': {
    meaningStrong: '桃花之星，魅力的泉源。',
    coreMeaning: '你天生吸引人。但吸引來的人要會管理。魅力不是用來逃避，是用來征服的。',
    battleSignificance: '被你吸引的人，會為你赴死。',
    advice: '用魅力來建立自己的軍隊。',
  },
  '界外魅緣': {
    meaningStrong: '外桃花降臨，危險的愛。',
    coreMeaning: '誘惑來自外面。知道它危險，但也知道它能提升你。會用外來的力量，就能更強。',
    battleSignificance: '來自異域的力量，往往最強。',
    advice: '引入外來的力量，來增強自己。',
  },
} as const;

export type AsuraId = keyof typeof COMPLETE_ASURA_DICTIONARY;

export function getAsuraInterpretation(asuraId: AsuraId) {
  return COMPLETE_ASURA_DICTIONARY[asuraId];
}

export function getAllAsuraIds(): AsuraId[] {
  return Object.keys(COMPLETE_ASURA_DICTIONARY) as AsuraId[];
}
