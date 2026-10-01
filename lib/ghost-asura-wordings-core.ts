/**
 * 鬼魅阿修羅核心話術庫
 * ============================================================================
 * 工程師專用｜直接開工版 2026-09-30
 *
 * 話術原則：短、重、狠、霸道、預警、布防、戰局、宣判
 * 禁止：捏造、增刪、改柱、改來源
 * ============================================================================
 */

export interface AsuraWording {
  /** 短宣言 — 1-2句，開場白 */
  shortDeclaration: string;

  /** 核心預警 — 3-4句，預警與布防 */
  coreWarning: string;

  /** 戰局意義 — 2-3句，這個印在命盤戰局中的作用 */
  battleSignificance: string;

  /** 宣判 — 1-2句，最終承諾 */
  verdict: string;
}

export const ASURA_WORDINGS_CORE: Record<string, AsuraWording> = {
  // ===================== 福氣系 =====================
  '天赦神契': {
    shortDeclaration: '有人替你開門。',
    coreWarning: '進去後的仗還得自己打。別被福氣寵壞了。有人幫你，不是叫你還債，而是叫你去贏。',
    battleSignificance: '每贏一場，都是在擴大那支援軍的勢力。',
    verdict: '用優勢去戰鬥，不是躺著享受。',
  },

  '天德護印': {
    shortDeclaration: '德是力量的審視，不是退縮。',
    coreWarning: '你有能力傷人，但你選擇不傷無辜。這和退縮是兩回事。困難時刻的選擇，五年後不會後悔。',
    battleSignificance: '你賭的是自己的力量，不是別人的憐憫。',
    verdict: '有邊界的德，才是德。',
  },

  '月德靈契': {
    shortDeclaration: '月光是冷的，不是溫柔的。',
    coreWarning: '它照亮黑夜，卻不是為了讓你舒服，而是讓你看清敵人在哪。用這股冷光去看清戰局，不是躲在光下。',
    battleSignificance: '被看見的第一步，是去看清自己想要什麼。',
    verdict: '以月光為劍，在黑暗裡戰鬥。',
  },

  '天龍護命': {
    shortDeclaration: '龍德是權力，不是安定。',
    coreWarning: '你站上高處，所有人都會來挑戰你。這不是詛咒，是戰場的邀請函。每一個高度都會有新的敵人。',
    battleSignificance: '不是躲起來，是一層層往上打。',
    verdict: '龍不怕摔，龍怕的是被圈養。',
  },

  '玄金寶庫': {
    shortDeclaration: '有本錢才有話語權。',
    coreWarning: '囤積資源而不出手，那不是智慧，是懦弱。資源在手，才能用來做大事。',
    battleSignificance: '有底氣的人敢出手。存底越多，能打的仗就越大。',
    verdict: '存著不打，那不是保護，是逃避。',
  },

  // ===================== 提醒系 =====================
  '噬天之影': {
    shortDeclaration: '資源、體力、情緒都會被暗中掏空。',
    coreWarning: '但只有意志弱的人才會被掏空到投降。天狗咬著，不是叫你防守，是叫你反咬。',
    battleSignificance: '警覺的終點不是防守，是出擊。',
    verdict: '在疲憊時還站著的人，是因為有好仇恨。',
  },

  '五陰纏影': {
    shortDeclaration: '五陰纏影已現。',
    coreWarning: '陰氣不是靠近你，是已經纏上命魂。順時，你能先一步嗅出暗流。逆時，疑念、雜音、背後之影，會一層層封住判斷。若再遇亡影、劫境、幽辰同場，整個戰局直接墜入陰域。',
    battleSignificance: '到那時，不是你在看局——是局在吞你。',
    verdict: '毀滅阿修羅只看一件事：你能不能在陰影徹底合圍之前，先把它們鎮碎。',
  },

  '劫境之門': {
    shortDeclaration: '知道風浪要來，就不叫逆境，叫準備。',
    coreWarning: '戰士不怕風浪，戰士怕的是沒有準備好的風浪。風浪來臨時，準備好的人會變成船長。',
    battleSignificance: '清單不是為了安心，是為了戰鬥。',
    verdict: '沒準備的人才是溺水者。',
  },

  '六劫之關': {
    shortDeclaration: '人生常常要多繞一圈才成。',
    coreWarning: '別搞反了意思。磨刀不是為了放下，是為了砍得更狠。每一道關卡都在升級你的武器。',
    battleSignificance: '多走一些路，反而能看到敵人看不到的地方。',
    verdict: '每一步都在增強防禦和攻擊力。',
  },

  '幽辰之障': {
    shortDeclaration: '元辰在暗處，障礙是隱性的。',
    coreWarning: '它不張揚，卻會在無形中阻擋。認識它，才能迴避它。',
    battleSignificance: '暗障最怕的就是被看見。',
    verdict: '先看見，才能先避開。',
  },

  // ===================== 動能系 =====================
  '洗魂之境': {
    shortDeclaration: '每一次脫皮都是一次升級。',
    coreWarning: '敏感是你的偵測器，不是你的敵人。感受深，就代表你能感受到別人感受不到的危機。',
    battleSignificance: '用這個天賦去預測對手。',
    verdict: '脫皮的人，是會變身的人。',
  },

  '碎月之痕': {
    shortDeclaration: '環境砸碎舊框架，逼著你改變。',
    coreWarning: '砸碎舊框架才能看到新戰場。計畫趕不上變化？那說明你的敵人在不停出招。出招更快。',
    battleSignificance: '變化快的人，是因為他們根本不依戀框架。',
    verdict: '主動地破，不是被動地破。',
  },

  '裂日之痕': {
    shortDeclaration: '卡著的地方，就是最有力量的地方。',
    coreWarning: '與這一柱代表的人事容易拉扯。但對抗不是詛咒，是力量。衝突才是你的舞台。',
    battleSignificance: '把對抗精神用對地方——對抗不公平、對抗懦弱、對抗自己的局限。',
    verdict: '天生要去戰鬥的人，不要把衝突當成失敗。',
  },

  '鎮軍之魂': {
    shortDeclaration: '天生指揮官，你不是跟隨者。',
    coreWarning: '領導力像刀沒錯，但刀是用來砍敵人的，不是用來自己反省的。掉隊的人註定要掉隊。',
    battleSignificance: '你的責任不是去撿，而是帶著願意跟的人去更遠的地方。',
    verdict: '讓隊伍知道你想要什麼，然後為之奮戰。',
  },

  '逐界行者': {
    shortDeclaration: '永遠在移動。但別理解成逃離，那是進攻。',
    coreWarning: '不穩定的人，往往是最難被困住的人。每一個停靠點都是一個陣地。你是巡迴式的征服者。',
    battleSignificance: '移動是為了進攻，不是為了逃避。',
    verdict: '在移動中也能精準出手。',
  },

  // ===================== 特殊系 =====================
  '裂天劫印': {
    shortDeclaration: '裂天劫印已開。',
    coreWarning: '劫勢不是等它發生才處理，而是要在它形成以前先看見。不等風暴落下，先布防，先斬斷，先破局。',
    battleSignificance: '毀滅阿修羅不問你怕不怕。',
    verdict: '只問——你能不能在劫勢真正成形之前，先讓它消失。',
  },

  '血刃之鋒': {
    shortDeclaration: '刀鋒已經出鞘。',
    coreWarning: '爆發力就在邊界。不是等著被激怒，而是隨時準備好一刀決出。',
    battleSignificance: '一刀之力，勝過千言萬語。',
    verdict: '有刃就敢出手。',
  },

  '魅生之印': {
    shortDeclaration: '異性緣的背後是能量，是場域。',
    coreWarning: '這不是簡單的好人緣。這是你散發出來的吸引力，是戰場上的磁場。',
    battleSignificance: '能量強的地方，人會自動靠近。',
    verdict: '懂得利用場域的人，已經贏了一半。',
  },

  '虛界空印': {
    shortDeclaration: '空亡就是虛界，該來的沒來。',
    coreWarning: '缺席不代表幸運。有時候缺席本身，就是一個劫難。什麼該發生卻沒發生，才是真正的問題。',
    battleSignificance: '虛空之力最難察覺，因為它什麼都沒做。',
    verdict: '看清空白，才能填補它。',
  },
};

/**
 * 取得完整話術
 */
export function getAsuraWording(asuraName: string): AsuraWording | undefined {
  return ASURA_WORDINGS_CORE[asuraName];
}

/**
 * 生成完整的阿修羅解讀文本
 */
export function generateAsuraReading(asuraName: string, pillar?: string): string {
  const wording = getAsuraWording(asuraName);
  if (!wording) return '';

  let text = `⚡ ${asuraName}`;
  if (pillar) text += `（${pillar}）`;
  text += '\n\n';
  text += wording.shortDeclaration + '\n';
  text += wording.coreWarning + '\n';
  text += wording.battleSignificance + '\n';
  text += wording.verdict;

  return text;
}
