/** New Asura wording library. Selected unchanged from lib/ghost-asura-wordings-core.ts
 * on 2026-10-04, limited to current registered names; current customer copy takes precedence.
 * Cultural text is not a calculation or source-verification certificate.
 */
import { ASURA_CUSTOMER_WORDINGS } from './customerWordings';
export interface AsuraWording {
  shortDeclaration: string;
  coreWarning: string;
  battleSignificance: string;
  verdict: string;
}
const adopted: Record<string, AsuraWording> = {
  "天赦神契": {
    "shortDeclaration": "有人替你開門。",
    "coreWarning": "進去後的仗還得自己打。別被福氣寵壞了。有人幫你，不是叫你還債，而是叫你去贏。",
    "battleSignificance": "每贏一場，都是在擴大那支援軍的勢力。",
    "verdict": "用優勢去戰鬥，不是躺著享受。"
  },
  "天德護印": {
    "shortDeclaration": "德是力量的審視，不是退縮。",
    "coreWarning": "你有能力傷人，但你選擇不傷無辜。這和退縮是兩回事。困難時刻的選擇，五年後不會後悔。",
    "battleSignificance": "你賭的是自己的力量，不是別人的憐憫。",
    "verdict": "有邊界的德，才是德。"
  },
  "月德靈契": {
    "shortDeclaration": "月光是冷的，不是溫柔的。",
    "coreWarning": "它照亮黑夜，卻不是為了讓你舒服，而是讓你看清敵人在哪。用這股冷光去看清戰局，不是躲在光下。",
    "battleSignificance": "被看見的第一步，是去看清自己想要什麼。",
    "verdict": "以月光為劍，在黑暗裡戰鬥。"
  },
  "天龍護命": {
    "shortDeclaration": "龍德是權力，不是安定。",
    "coreWarning": "你站上高處，所有人都會來挑戰你。這不是詛咒，是戰場的邀請函。每一個高度都會有新的敵人。",
    "battleSignificance": "不是躲起來，是一層層往上打。",
    "verdict": "龍不怕摔，龍怕的是被圈養。"
  },
  "玄金寶庫": {
    "shortDeclaration": "有本錢才有話語權。",
    "coreWarning": "囤積資源而不出手，那不是智慧，是懦弱。資源在手，才能用來做大事。",
    "battleSignificance": "有底氣的人敢出手。存底越多，能打的仗就越大。",
    "verdict": "存著不打，那不是保護，是逃避。"
  },
  "噬天之影": {
    "shortDeclaration": "資源、體力、情緒都會被暗中掏空。",
    "coreWarning": "但只有意志弱的人才會被掏空到投降。天狗咬著，不是叫你防守，是叫你反咬。",
    "battleSignificance": "警覺的終點不是防守，是出擊。",
    "verdict": "在疲憊時還站著的人，是因為有好仇恨。"
  },
  "五陰纏影": {
    "shortDeclaration": "五陰纏影已現。",
    "coreWarning": "陰氣不是靠近你，是已經纏上命魂。順時，你能先一步嗅出暗流。逆時，疑念、雜音、背後之影，會一層層封住判斷。若再遇亡影、劫境、幽辰同場，整個戰局直接墜入陰域。",
    "battleSignificance": "到那時，不是你在看局——是局在吞你。",
    "verdict": "鬼魅阿修羅只看一件事：你能不能在陰影徹底合圍之前，先把它們鎮碎。"
  },
  "劫境之門": {
    "shortDeclaration": "知道風浪要來，就不叫逆境，叫準備。",
    "coreWarning": "戰士不怕風浪，戰士怕的是沒有準備好的風浪。風浪來臨時，準備好的人會變成船長。",
    "battleSignificance": "清單不是為了安心，是為了戰鬥。",
    "verdict": "沒準備的人才是溺水者。"
  },
  "六劫之關": {
    "shortDeclaration": "人生常常要多繞一圈才成。",
    "coreWarning": "別搞反了意思。磨刀不是為了放下，是為了砍得更狠。每一道關卡都在升級你的武器。",
    "battleSignificance": "多走一些路，反而能看到敵人看不到的地方。",
    "verdict": "每一步都在增強防禦和攻擊力。"
  },
  "幽辰之障": {
    "shortDeclaration": "元辰在暗處，障礙是隱性的。",
    "coreWarning": "它不張揚，卻會在無形中阻擋。認識它，才能迴避它。",
    "battleSignificance": "暗障最怕的就是被看見。",
    "verdict": "先看見，才能先避開。"
  },
  "碎月之痕": {
    "shortDeclaration": "環境砸碎舊框架，逼著你改變。",
    "coreWarning": "砸碎舊框架才能看到新戰場。計畫趕不上變化？那說明你的敵人在不停出招。出招更快。",
    "battleSignificance": "變化快的人，是因為他們根本不依戀框架。",
    "verdict": "主動地破，不是被動地破。"
  },
  "裂日之痕": {
    "shortDeclaration": "卡著的地方，就是最有力量的地方。",
    "coreWarning": "與這一柱代表的人事容易拉扯。但對抗不是詛咒，是力量。衝突才是你的舞台。",
    "battleSignificance": "把對抗精神用對地方——對抗不公平、對抗懦弱、對抗自己的局限。",
    "verdict": "天生要去戰鬥的人，不要把衝突當成失敗。"
  },
  "鎮軍之魂": {
    "shortDeclaration": "天生指揮官，你不是跟隨者。",
    "coreWarning": "領導力像刀沒錯，但刀是用來砍敵人的，不是用來自己反省的。掉隊的人註定要掉隊。",
    "battleSignificance": "你的責任不是去撿，而是帶著願意跟的人去更遠的地方。",
    "verdict": "讓隊伍知道你想要什麼，然後為之奮戰。"
  },
  "逐界行者": {
    "shortDeclaration": "永遠在移動。但別理解成逃離，那是進攻。",
    "coreWarning": "不穩定的人，往往是最難被困住的人。每一個停靠點都是一個陣地。你是巡迴式的征服者。",
    "battleSignificance": "移動是為了進攻，不是為了逃避。",
    "verdict": "在移動中也能精準出手。"
  },
  "血刃之鋒": {
    "shortDeclaration": "刀鋒已經出鞘。",
    "coreWarning": "爆發力就在邊界。不是等著被激怒，而是隨時準備好一刀決出。",
    "battleSignificance": "一刀之力，勝過千言萬語。",
    "verdict": "有刃就敢出手。"
  },
  "虛界空印": {
    "shortDeclaration": "空亡就是虛界，該來的沒來。",
    "coreWarning": "缺席不代表幸運。有時候缺席本身，就是一個劫難。什麼該發生卻沒發生，才是真正的問題。",
    "battleSignificance": "虛空之力最難察覺，因為它什麼都沒做。",
    "verdict": "看清空白，才能填補它。"
  },
  "天乙神印": {
    "shortDeclaration": "令旗在手，帥位已定。",
    "coreWarning": "貴人相助不是讓你躲在身後當懦夫。有人替你掌旗，你就要敢帶隊衝鋒，陣前立威。",
    "battleSignificance": "援軍只敬重強者。用你的果決換取更大的戰果。",
    "verdict": "手握令旗，自成一軍。"
  },
  "文魂天契": {
    "shortDeclaration": "謀定後動，殺伐由心。",
    "coreWarning": "文韜不是書生的酸腐，是統籌三軍的戰略思維。一眼識破陣型死穴，用智慧一擊致命。",
    "battleSignificance": "智謀如刃，運籌帷幄之中定敵人生死。",
    "verdict": "筆落如刀，步步奪城。"
  },
  "孤華幽冠": {
    "shortDeclaration": "孤峰立陣，傲視群雄。",
    "coreWarning": "真正的強者永遠是獨行的。不屑與凡俗為伍，自有一身無人可及的傲骨與絕學。",
    "battleSignificance": "一人成陣，冷眼俯瞰戰局起落。",
    "verdict": "無人同路，我自稱王。"
  },
  "魁罡戰魂": {
    "shortDeclaration": "狂烈殺伐，直衝中樞。",
    "coreWarning": "生來帶著一身鐵骨煞氣。戰場之上容不得軟弱，想奪取陣地，就正面硬碰硬打穿敵陣！",
    "battleSignificance": "以絕對的剛烈與膽魄，震懾全場宵小。",
    "verdict": "霸氣沖霄，專斷乾坤。"
  },
  "玄極天印": {
    "shortDeclaration": "陰陽化力，借勢破敵。",
    "coreWarning": "剛柔相濟方為極致戰法。任敵狂猛如潮，我自順勢化力，反手將對手打入深淵。",
    "battleSignificance": "以靜制動，在動靜轉換間奪取制勝機先。",
    "verdict": "萬力歸一，生生不息。"
  },
  "福曜護命": {
    "shortDeclaration": "戰運加身，攻無不克。",
    "coreWarning": "所謂福運，是敢於揮刀之人的獎賞。別守著運氣不敢出手，乘風破浪，擴大戰果！",
    "battleSignificance": "氣運在身，每一次衝鋒都比常人更具底氣。",
    "verdict": "借天時破敵，奪千里勝境。"
  },
  "白虎血印": {
    "shortDeclaration": "猛虎出閘，煞氣逼人。",
    "coreWarning": "骨子裡的狠勁一旦被激發，就沒有收手的餘地。將這股兇猛化作護衛陣地的鋼鐵獠牙！",
    "battleSignificance": "以殺止殺，讓對手在膽寒中不敢越雷池一步。",
    "verdict": "利齒出鞘，誰敢攖鋒。"
  },
  "飛刃血痕": {
    "shortDeclaration": "冷刃暗伏，見血封喉。",
    "coreWarning": "防備突如其來的暗算，更要隨時備好反手一刀。在邊界處決生死，不留一絲猶豫。",
    "battleSignificance": "快刃奪命，以極致速度搶先終結對手。",
    "verdict": "刀鋒所至，立斷糾纏。"
  },
  "劫魂之刃": {
    "shortDeclaration": "凶險在前，正好磨刀。",
    "coreWarning": "劫難不是來讓你懼怕的，是來逼你拔刀的。越是絕境，越能激發阿修羅骨子裡的無盡狂意！",
    "battleSignificance": "把劫難踩在腳下，奪取生機方成戰神。",
    "verdict": "絕境破殺，唯強者生。"
  },
  "孤辰絕界": {
    "shortDeclaration": "割席自立，獨守孤堡。",
    "coreWarning": "沒有援軍又如何？一人守城，便是一座牢不可破的要塞。斷絕無效社交，專注手裡實力！",
    "battleSignificance": "不依附任何人，立起屬於自己的絕對領域。",
    "verdict": "孤軍奮戰，自成一方霸主。"
  },
  "寡宿幽宮": {
    "shortDeclaration": "心冷如鐵，不受凡塵牽絆。",
    "coreWarning": "情感的羈絆只會鈍了你的刀。學會享受這份冷靜與獨處，在沉默中積蓄撕裂長夜的力量。",
    "battleSignificance": "無情方能無破綻，冷靜俯瞰全場動向。",
    "verdict": "寒夜獨坐，蓄勢待發。"
  }
};
export const ASURA_WORDINGS: Readonly<Record<string, AsuraWording>> = { ...adopted, ...ASURA_CUSTOMER_WORDINGS };

