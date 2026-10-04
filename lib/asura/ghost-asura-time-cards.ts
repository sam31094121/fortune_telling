/**
 * 鬼魅阿修羅 — 過去／現在／未來 三張卡片專屬話術與解題引擎 V1
 * ============================================================================
 * 規範依據：GHOST_ASURA_TIME_CARDS_V1
 * 
 * 核心原則：
 * - 過去卡：只回答「我是怎麼被塑造成現在這個人的？」（解形成，語氣沉/看穿/揭底）
 * - 現在卡：只回答「我現在到底處在什麼狀態？」（解當下，語氣最直/最快/最敢講/點醒）
 * - 未來卡：只回答「照這個趨勢走下去，後面會怎麼發展？」（解趨勢，語氣穩/預判感/時間感/選擇感/警告感）
 * - 三張卡完全獨立成立，不互相依賴，不共用同一套文案模板
 * - 內建 NarrativeDedupEngine 去重檢查（相似度 > 0.72 即拒絕）
 * - 嚴格執行零術語與合規禁詞檢測
 * ============================================================================
 */

import { sanitizeZiweiOutput } from '../ghost-asura-ziwei-engine';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 01｜輸出介面型態（Section 12）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type EvidenceStrengthLevel = 1 | 2 | 3 | 4;

export interface AsuraTimeCardBase {
  id: string;
  period: 'past' | 'present' | 'future';
  badge: string;
  title: string;
  openingStrike: string;
  coreNarrative: string;
  strengthNarrative: string;
  shadowNarrative: string;
  costNarrative: string;
  finalStrike: string;
  asuraJoke: string;
  evidenceStrength: EvidenceStrengthLevel;
  internalEvidenceIds: string[];
}

export interface AsuraPastCard extends AsuraTimeCardBase {
  period: 'past';
  formationCause: string;
  survivalPattern: string;
  personalityTrace: string;
  currentResidue: string;
}

export interface AsuraPresentCard extends AsuraTimeCardBase {
  period: 'present';
  currentState: string;
  dominantForce: string;
  currentBlindSpot: string;
  immediateRisk: string;
  currentAdvice: string;
}

export interface AsuraFutureCard extends AsuraTimeCardBase {
  period: 'future';
  futureTrend: string;
  turningPoint: string;
  opportunity: string;
  risk: string;
  choiceBranch: string;
  timeSense: string;
}

export interface GhostAsuraTimeCardsOutput {
  past: AsuraPastCard;
  present: AsuraPresentCard;
  future: AsuraFutureCard;
  dedupScore: {
    pastPresentSim: number;
    presentFutureSim: number;
    pastFutureSim: number;
    maxSimilarity: number;
    passed: boolean;
  };
  cleanPass: boolean;
  leaks: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 02｜證據強度話術對齊（Section 09）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const STRENGTH_VERDICTS: Record<EvidenceStrengthLevel, string> = {
  1: '這條線有出來，但我先不把話說死。',
  2: '這就不是單一反應了。方向開始出來。',
  3: '這句我敢直接講。因為幾條線已經對上。',
  4: '這次不用繞。這條線已經很清楚。你現在或許不會馬上認同，但事情走到那裡，你會知道我為什麼現在敢講。',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 03｜去重與相似度引擎（NarrativeDedupEngine Section 08）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function calculateTextSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  // 建立 2-gram 字符集合
  const getBigrams = (str: string): Set<string> => {
    const clean = str.replace(/[\s\p{P}]/gu, '');
    const bigrams = new Set<string>();
    for (let i = 0; i < clean.length - 1; i++) {
      bigrams.add(clean.slice(i, i + 2));
    }
    return bigrams;
  };

  const setA = getBigrams(textA);
  const setB = getBigrams(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  // Jaccard 相似係數
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 04｜獨立解題器：過去卡（解形成）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildPastCard(params: {
  userName?: string;
  archetype?: string;
  evidenceStrength?: EvidenceStrengthLevel;
  evidenceIds?: string[];
}): AsuraPastCard {
  const name = params.userName || '你';
  const strength = params.evidenceStrength || 3;
  const strengthPrefix = STRENGTH_VERDICTS[strength];

  const formationCause = `${name}現在這種反應，不是突然有的。以前有幾次關鍵轉折，你明明想等，最後卻發現：等到最後，事情已經不是你決定。`;
  const survivalPattern = `所以你慢慢學會一件事——與其等別人給答案，不如自己先動。久了以後，這就不是選擇了，直接刻進骨子裡變成習慣。`;
  const personalityTrace = `你現在看起來雷厲風行、極度果斷，底下其實藏著一個東西：你很討厭失去主導權。這不是今天才開始，只是以前你叫它保護自己，現在它已經變成你的性格。`;
  const currentResidue = `即使環境變安全了，你身體的警報器依然習慣調在最高檔位，一有風吹草動就想拔刀先發制人。`;

  const openingStrike = `${strengthPrefix}\n你以為這只是脾氣，其實是以前留下來的自動防禦系統。`;
  const coreNarrative = `${formationCause}\n${survivalPattern}`;
  const strengthNarrative = `這套防禦給了你無與倫比的突破力與獨立生存資本，沒人能輕易牽制你。`;
  const shadowNarrative = `但過度防禦的代價，是你很難相信別人能把事情辦妥，常常把自己逼成孤軍奮戰。`;
  const costNarrative = `你用堅硬的外殼換取安全感，換來的代價是身邊的人很難真正走進你的陣地。`;
  const finalStrike = `原來看清形成的原因，不是為了原諒軟弱，而是讓你知道手裡的刀什麼時候可以放下。`;
  const asuraJoke = `你以為這是天生傲骨，其實是以前摔怕了之後，乾脆自己先把地基拆掉。`;

  return {
    id: `asura-past-${Date.now()}`,
    period: 'past',
    badge: '【過去】你怎麼變成現在這個人',
    title: '人格形成與防衛源頭',
    openingStrike,
    coreNarrative,
    strengthNarrative,
    shadowNarrative,
    costNarrative,
    finalStrike,
    asuraJoke,
    formationCause,
    survivalPattern,
    personalityTrace,
    currentResidue,
    evidenceStrength: strength,
    internalEvidenceIds: params.evidenceIds || ['PAST_ARCHETYPE_TRACE'],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 05｜獨立解題器：現在卡（解當下）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildPresentCard(params: {
  userName?: string;
  archetype?: string;
  evidenceStrength?: EvidenceStrengthLevel;
  evidenceIds?: string[];
}): AsuraPresentCard {
  const name = params.userName || '你';
  const strength = params.evidenceStrength || 4;
  const strengthPrefix = STRENGTH_VERDICTS[strength];

  const currentState = `${name}現在不是沒有機會，是事情一起來的時候，你想全部靠自己橫推過去。`;
  const dominantForce = `當前最強的地方是反應極快、破局果決，戰場嗅覺比周圍人都銳利。`;
  const currentBlindSpot = `但最危險的地方也是反應太快。別人還在整理問題，你心裡已經把結論下完、連答案都開始執行了。`;
  const immediateRisk = `短期看起來效率極高，久一點你就會發現：很多事情不是做錯，是你太早拍板把後續變數給封死了。`;
  const currentAdvice = `現在真正要防備的不是失敗，是你在局勢還沒走完以前，就已經把退路給炸掉。今年，先讓別人把話講完，再輪到你出手。`;

  const openingStrike = `${strengthPrefix}\n別人還在開會找共識，你心裡已經直接散會開始抄傢伙。`;
  const coreNarrative = `${currentState}\n${dominantForce}`;
  const strengthNarrative = `當前戰力全開，執行力處於峰值，任何拖延的阻礙都會被你強行撕開缺口。`;
  const shadowNarrative = `急於定局的心態會讓盟友跟不上你的節奏，容易把合作夥伴逼成旁觀看戲的局外人。`;
  const costNarrative = `速度過快的代價就是容錯率降為零，稍有偏差就是整盤翻覆。`;
  const finalStrike = `現在先讓子彈飛完全程，看清誰是靶子誰是隊友，再亮底牌。`;
  const asuraJoke = `別人開會看簡報，你開會看秒錶。嫌全世界太慢，最後累垮的始終是你自己。`;

  return {
    id: `asura-present-${Date.now()}`,
    period: 'present',
    badge: '【現在】你現在到底在哪個局裡',
    title: '當前核心戰局與致命盲點',
    openingStrike,
    coreNarrative,
    strengthNarrative,
    shadowNarrative,
    costNarrative,
    finalStrike,
    asuraJoke,
    currentState,
    dominantForce,
    currentBlindSpot,
    immediateRisk,
    currentAdvice,
    evidenceStrength: strength,
    internalEvidenceIds: params.evidenceIds || ['PRESENT_BATTLE_RADAR'],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 06｜獨立解題器：未來卡（解趨勢）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildFutureCard(params: {
  userName?: string;
  archetype?: string;
  evidenceStrength?: EvidenceStrengthLevel;
  evidenceIds?: string[];
}): AsuraFutureCard {
  const name = params.userName || '你';
  const strength = params.evidenceStrength || 3;
  const strengthPrefix = STRENGTH_VERDICTS[strength];

  const futureTrend = `後面真正開始變大的不是麻煩，而是選擇。你會慢慢發現，能走的路比以前多了一倍。`;
  const turningPoint = `真正的轉折點會出現在多個機會同時叩門的那一刻。如果你依然抱持看到門就想踹開的習慣，力量會被徹底分散。`;
  const opportunity = `大局正在朝向需要自主拍板者傾斜，未來的舞台會把話語權交到敢於承擔後果的人手裡。`;
  const risk = `最大的陷阱在於戰線拉得太長，試圖在每一個戰場都證明自己能贏。`;
  const choiceBranch = `這一段真正要學的不是變得更勇敢——你骨子裡本來就敢。你要做的是選擇題：哪一扇門值得你親自進，哪一扇門由著它自己關上。`;
  const timeSense = `前期蓄能積聚籌碼，中期面臨雙叉路口抉擇，後段才真正迎來定型與成果收割。`;

  const openingStrike = `${strengthPrefix}\n門變多從來不是問題，問題是你是不是每一扇都想自己親自踹開。`;
  const coreNarrative = `${futureTrend}\n${turningPoint}`;
  const strengthNarrative = `只要聚焦在核心主線，未來的資源會以倍數規模向你的主力陣地聚攏。`;
  const shadowNarrative = `若貪多嚼不爛、多線開火，極易在取得戰果前夕耗盡彈藥。`;
  const costNarrative = `做出抉擇必然要割捨次要利益，想通吃全場的下場通常是一無所獲。`;
  const finalStrike = `看清哪一扇門背後有你要的天下，其餘的，連看都不要看一眼。`;
  const asuraJoke = `慾望清單拉得比長城還長，後面不是沒路走，是你的選擇多到開始在門口互毆。`;

  return {
    id: `asura-future-${Date.now()}`,
    period: 'future',
    badge: '【未來】這條線接下來往哪裡走',
    title: '局勢預判與選擇分支',
    openingStrike,
    coreNarrative,
    strengthNarrative,
    shadowNarrative,
    costNarrative,
    finalStrike,
    asuraJoke,
    futureTrend,
    turningPoint,
    opportunity,
    risk,
    choiceBranch,
    timeSense,
    evidenceStrength: strength,
    internalEvidenceIds: params.evidenceIds || ['FUTURE_TREND_PROJECTION'],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 07｜全卡合成與安全去重守門員
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildGhostAsuraTimeCards(params: {
  userName?: string;
  archetype?: string;
  evidenceStrength?: EvidenceStrengthLevel;
  evidenceIds?: string[];
}): GhostAsuraTimeCardsOutput {
  const past = buildPastCard(params);
  const present = buildPresentCard(params);
  const future = buildFutureCard(params);

  // 1. 去重引擎檢驗（Section 08）
  const pastFullText = `${past.openingStrike}\n${past.coreNarrative}\n${past.finalStrike}\n${past.asuraJoke}`;
  const presentFullText = `${present.openingStrike}\n${present.coreNarrative}\n${present.finalStrike}\n${present.asuraJoke}`;
  const futureFullText = `${future.openingStrike}\n${future.coreNarrative}\n${future.finalStrike}\n${future.asuraJoke}`;

  const pastPresentSim = calculateTextSimilarity(pastFullText, presentFullText);
  const presentFutureSim = calculateTextSimilarity(presentFullText, futureFullText);
  const pastFutureSim = calculateTextSimilarity(pastFullText, futureFullText);
  const maxSimilarity = Math.max(pastPresentSim, presentFutureSim, pastFutureSim);

  // 門檻：相似度不得大於 0.72
  const dedupPassed = maxSimilarity < 0.72;

  // 2. 零術語與合規禁詞過濾守門
  const allNarrative = `${pastFullText}\n${presentFullText}\n${futureFullText}`;
  const { cleanText, leaks } = sanitizeZiweiOutput(allNarrative);

  return {
    past,
    present,
    future,
    dedupScore: {
      pastPresentSim: Number(pastPresentSim.toFixed(4)),
      presentFutureSim: Number(presentFutureSim.toFixed(4)),
      pastFutureSim: Number(pastFutureSim.toFixed(4)),
      maxSimilarity: Number(maxSimilarity.toFixed(4)),
      passed: dedupPassed,
    },
    cleanPass: leaks.length === 0,
    leaks,
  };
}
