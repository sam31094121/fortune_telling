/**
 * 天地人人際配對引擎
 *
 * 比例架構：
 *   天層 40% = 生肖相性 15% + 五行相生剋 15% + 星座相性 10%
 *   地層 20% = 血型相性 20%
 *   人層 40% = 人格矩陣互補 20% + 人格矩陣共鳴 20%
 *
 * 配對結果分級：
 *   90-100 天生一對     — 命中注定，靈魂共鳴
 *   75-89  相輔相成     — 互補加乘，越走越深
 *   60-74  磨合成長     — 需要時間，值得等待
 *   45-59  禮讓之道     — 有摩擦，但懂得禮讓就能長久
 *   30-44  差異互見     — 差異大，需更多理解與包容
 *   0-29   各自精彩     — 個性差距明顯，需刻意經營
 */

// ────────────────────────────────────────────────────────────
// 生肖相性矩陣
// ────────────────────────────────────────────────────────────

const ZODIAC_ANIMALS = ['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬'] as const;
type ZodiacAnimal = typeof ZODIAC_ANIMALS[number];

// 六合（最佳搭配）+12分
const LIUHE: [ZodiacAnimal, ZodiacAnimal][] = [
  ['鼠','牛'],['虎','豬'],['兔','狗'],['龍','雞'],['蛇','猴'],['馬','羊'],
];

// 三合（強力相性）+8分（每對）
const SANHE_GROUPS: ZodiacAnimal[][] = [
  ['猴','鼠','龍'], // 申子辰
  ['虎','馬','狗'], // 寅午戌
  ['豬','兔','羊'], // 亥卯未
  ['蛇','雞','牛'], // 巳酉丑
];

// 相沖（正面衝突）-10分
const CHONG: [ZodiacAnimal, ZodiacAnimal][] = [
  ['鼠','馬'],['牛','羊'],['虎','猴'],['兔','雞'],['龍','狗'],['蛇','豬'],
];

// 相刑（磨擦）-5分
const XING: [ZodiacAnimal, ZodiacAnimal][] = [
  ['虎','蛇'],['蛇','猴'],['猴','虎'],
  ['牛','羊'],['羊','狗'],['狗','牛'],
  ['鼠','鼠'],['馬','馬'],['雞','雞'],
];

function getZodiacAnimalScore(a: string, b: string): number {
  const A = a as ZodiacAnimal;
  const B = b as ZodiacAnimal;
  const pair = (x: ZodiacAnimal, y: ZodiacAnimal) =>
    LIUHE.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
  if (pair(A, B)) return 100; // 六合滿分

  const sanheScore = SANHE_GROUPS.some(g => g.includes(A) && g.includes(B)) ? 85 : 0;
  if (sanheScore) return sanheScore;

  const isChong = CHONG.some(([p, q]) => (p === A && q === B) || (p === B && q === A));
  if (isChong) return 30;

  const isXing = XING.some(([p, q]) => (p === A && q === B) || (p === B && q === A));
  if (isXing) return 50;

  return 65; // 普通相性
}

// ────────────────────────────────────────────────────────────
// 五行相性
// ────────────────────────────────────────────────────────────

type Wuxing = '木' | '火' | '土' | '金' | '水';

// 相生（A 生 B）→ 80+  相剋（A 剋 B）→ 35  相同 → 70
const WUXING_RELATION: Record<Wuxing, { sheng: Wuxing; ke: Wuxing }> = {
  木: { sheng: '火', ke: '土' },
  火: { sheng: '土', ke: '金' },
  土: { sheng: '金', ke: '水' },
  金: { sheng: '水', ke: '木' },
  水: { sheng: '木', ke: '火' },
};

function getWuxingScore(a: string, b: string): number {
  const A = a as Wuxing;
  const B = b as Wuxing;
  if (A === B) return 70;
  if (WUXING_RELATION[A].sheng === B || WUXING_RELATION[B].sheng === A) return 88;
  if (WUXING_RELATION[A].ke === B || WUXING_RELATION[B].ke === A) return 38;
  return 60;
}

// ────────────────────────────────────────────────────────────
// 星座相性（元素 + 模式）
// ────────────────────────────────────────────────────────────

type ZodiacSign =
  'Aries'|'Taurus'|'Gemini'|'Cancer'|'Leo'|'Virgo'|
  'Libra'|'Scorpio'|'Sagittarius'|'Capricorn'|'Aquarius'|'Pisces';

const ZODIAC_ZH_TO_EN: Record<string, ZodiacSign> = {
  '牡羊座':'Aries','金牛座':'Taurus','雙子座':'Gemini','巨蟹座':'Cancer',
  '獅子座':'Leo','處女座':'Virgo','天秤座':'Libra','天蠍座':'Scorpio',
  '射手座':'Sagittarius','摩羯座':'Capricorn','水瓶座':'Aquarius','雙魚座':'Pisces',
};

const ELEMENT_MAP: Record<ZodiacSign, '火'|'土'|'風'|'水'> = {
  Aries:'火', Leo:'火', Sagittarius:'火',
  Taurus:'土', Virgo:'土', Capricorn:'土',
  Gemini:'風', Libra:'風', Aquarius:'風',
  Cancer:'水', Scorpio:'水', Pisces:'水',
};

const MODE_MAP: Record<ZodiacSign, '開創'|'固定'|'變動'> = {
  Aries:'開創', Cancer:'開創', Libra:'開創', Capricorn:'開創',
  Taurus:'固定', Leo:'固定', Scorpio:'固定', Aquarius:'固定',
  Gemini:'變動', Virgo:'變動', Sagittarius:'變動', Pisces:'變動',
};

// 對立星座（磁性吸引但挑戰大）
const OPPOSITE_PAIRS: [ZodiacSign, ZodiacSign][] = [
  ['Aries','Libra'],['Taurus','Scorpio'],['Gemini','Sagittarius'],
  ['Cancer','Capricorn'],['Leo','Aquarius'],['Virgo','Pisces'],
];

function getZodiacScore(a: string, b: string): number {
  const A = (ZODIAC_ZH_TO_EN[a] ?? 'Aries') as ZodiacSign;
  const B = (ZODIAC_ZH_TO_EN[b] ?? 'Aries') as ZodiacSign;
  if (A === B) return 72;

  const sameElement = ELEMENT_MAP[A] === ELEMENT_MAP[B];
  const sameMode = MODE_MAP[A] === MODE_MAP[B];
  const isOpposite = OPPOSITE_PAIRS.some(([p,q]) => (p===A&&q===B)||(p===B&&q===A));

  if (sameElement && !sameMode) return 90; // 同元素，不同模式 → 最佳
  if (sameElement && sameMode)  return 75; // 同元素同模式 → 親近但可能自我中心
  if (isOpposite)               return 68; // 對立 → 吸引但有張力
  if (sameMode)                 return 55; // 同模式不同元素 → 競爭感
  return 62;                                // 其他
}

// ────────────────────────────────────────────────────────────
// 血型相性（流行文化版，主要流行於亞洲）
// ────────────────────────────────────────────────────────────

const BLOOD_SCORE: Record<string, Record<string, number>> = {
  A:  { A: 85, B: 48, AB: 78, O: 80 },
  B:  { A: 48, B: 82, AB: 75, O: 70 },
  AB: { A: 78, B: 75, AB: 80, O: 65 },
  O:  { A: 80, B: 70, AB: 65, O: 88 },
};

function getBloodScore(a: string, b: string): number {
  return BLOOD_SCORE[a]?.[b] ?? 65;
}

// ────────────────────────────────────────────────────────────
// 人格矩陣相性（互補 + 共鳴）
// ────────────────────────────────────────────────────────────

export interface PersonalityMatrixCompat {
  emotion: number; logic: number; social: number; leadership: number;
  security: number; creativity: number; risk: number; attachment: number;
}

// 互補型維度：差距大反而好（一方高，一方低 → 平衡）
const COMPLEMENT_KEYS: (keyof PersonalityMatrixCompat)[] = ['logic','creativity','risk','leadership'];

// 共鳴型維度：相近才好（都高或都低 → 同頻）
const RESONANCE_KEYS: (keyof PersonalityMatrixCompat)[] = ['emotion','social','security','attachment'];

function getMatrixCompatScore(A: PersonalityMatrixCompat, B: PersonalityMatrixCompat) {
  // 互補分數：差距越大（但不超過60）分數越高
  let complementScore = 0;
  for (const k of COMPLEMENT_KEYS) {
    const diff = Math.abs(A[k] - B[k]);
    // 理想差距 30-50 → 100, 差距 0 或 100 → 40
    const ideal = Math.max(0, 100 - Math.abs(diff - 40) * 1.5);
    complementScore += ideal;
  }
  complementScore = complementScore / COMPLEMENT_KEYS.length;

  // 共鳴分數：越相近越好
  let resonanceScore = 0;
  for (const k of RESONANCE_KEYS) {
    const diff = Math.abs(A[k] - B[k]);
    resonanceScore += Math.max(0, 100 - diff * 1.2);
  }
  resonanceScore = resonanceScore / RESONANCE_KEYS.length;

  return { complementScore, resonanceScore };
}

// ────────────────────────────────────────────────────────────
// 主計算函式
// ────────────────────────────────────────────────────────────

export interface PersonProfile {
  name: string;
  zodiacZh: string;        // 中文星座
  chineseZodiac: string;   // 生肖
  wuxing: string;          // 五行
  bloodType: string;
  matrix: PersonalityMatrixCompat;
}

export interface CompatibilityDimension {
  label: string;
  score: number;           // 0-100
  description: string;
  emoji: string;
}

// ────────────────────────────────────────────────────────────
// 話術溝通配對系統
// ────────────────────────────────────────────────────────────

export interface CommunicationStyle {
  type: string;        // 溝通型態名稱
  emoji: string;
  tagline: string;     // 一句話標語
  howTheySpeak: string; // 說話方式
  whatTriggersShutdown: string;  // 什麼讓他們關閉
  whatTheyNeedToHear: string;    // 最需要聽到什麼
  pattern: '情感型' | '邏輯型' | '行動型' | '穩定型';
}

export interface ConflictScenario {
  title: string;       // 衝突場景標題
  howItStarts: string; // 怎麼開始的
  whatHappens: string; // 各自的反應
  rootCause: string;   // 根本原因
  solution: string;    // 化解方式
}

export interface CommunicationReport {
  personA: CommunicationStyle;
  personB: CommunicationStyle;
  clashType: string;        // 溝通衝突型態標題
  clashDescription: string; // 衝突型態描述
  topConflicts: ConflictScenario[];
  dailyHarmony: string[];   // 日常和諧相處法（3條）
}

// 由人格矩陣 + 五行推算溝通風格
function deriveCommunicationStyle(profile: PersonProfile): CommunicationStyle {
  const m = profile.matrix;
  const w = profile.wuxing;

  // 判斷主導溝通型態
  const emotionScore  = (m.emotion + m.attachment) / 2;
  const logicScore    = (m.logic + m.creativity) / 2;
  const actionScore   = (m.leadership + m.risk) / 2;
  const stabilityScore = (m.security + (100 - m.risk)) / 2;

  const max = Math.max(emotionScore, logicScore, actionScore, stabilityScore);

  let pattern: CommunicationStyle['pattern'];
  let type: string, emoji: string, tagline: string;
  let howTheySpeak: string, whatTriggersShutdown: string, whatTheyNeedToHear: string;

  if (max === emotionScore) {
    pattern = '情感型';
    // 細分：五行影響情感型的表現方式
    if (w === '火' || w === '木') {
      type = '熱烈表達型'; emoji = '🔥';
      tagline = '說話帶溫度，情緒就是訊息';
      howTheySpeak = '語氣起伏明顯，喜歡用比喻和故事，情緒直接體現在語調中，高興時滔滔不絕，難過時沉默以對';
      whatTriggersShutdown = '被人說「你太情緒化了」「冷靜一點」——感覺情感被否定時會關閉，或反向爆發';
      whatTheyNeedToHear = '「我懂你的感受」「你說的我都聽進去了」——先被理解，再談解決方案';
    } else {
      type = '深情內斂型'; emoji = '🌊';
      tagline = '話不多，但每句都是心底話';
      howTheySpeak = '說話慢而深沉，不輕易表達，但一旦說出口就是真心；常用「我覺得」「對我來說」這類句式';
      whatTriggersShutdown = '被催促表態、被強迫立刻回應——需要時間整理情緒，急著要答案只會讓他關閉';
      whatTheyNeedToHear = '「你願意說就說，不說也沒關係」「我會等你」——給空間比給答案更重要';
    }
  } else if (max === logicScore) {
    pattern = '邏輯型';
    if (w === '金' || w === '水') {
      type = '精準分析型'; emoji = '🔬';
      tagline = '用道理說話，事實優先，情緒靠邊';
      howTheySpeak = '說話條理清晰，喜歡舉例、比較、給建議；討論問題時會分析原因，不擅長純粹的情緒支持';
      whatTriggersShutdown = '對方只重複情緒、拒絕聽理由時——感覺溝通沒有意義，會選擇沉默或離開討論';
      whatTheyNeedToHear = '「你說的有道理」「我聽懂了你的邏輯」——被理性認可比被情感接納更重要';
    } else {
      type = '冷靜建議型'; emoji = '📐';
      tagline = '解決問題是溝通的目的，感受是工具不是核心';
      howTheySpeak = '語氣平穩，說話時常帶入「所以」「因此」「我建議」，傾向給出可執行的方案，不習慣空談情緒';
      whatTriggersShutdown = '情緒攻擊、言語誇張、或問題反覆卻不行動——會覺得浪費時間，逐漸退出對話';
      whatTheyNeedToHear = '「謝謝你幫我想辦法」「你說的我會試試看」——行動力的回應讓他們感到被重視';
    }
  } else if (max === actionScore) {
    pattern = '行動型';
    type = '直接主導型'; emoji = '⚡';
    tagline = '說到做到，不繞彎子，快速決策';
    howTheySpeak = '語速快、直接切重點，不喜歡鋪墊太多，說話像在下指令；高壓時可能不考慮對方感受直接說出口';
    whatTriggersShutdown = '說了半天沒有結論、對方一直猶豫不決——會失去耐心，甚至自己做決定把對方晾在一邊';
    whatTheyNeedToHear = '「我決定了，跟你的建議一樣」「你說的我已經在做了」——行動與效率讓他們感受到尊重';
  } else {
    pattern = '穩定型';
    if (w === '土') {
      type = '穩重包容型'; emoji = '🏔️';
      tagline = '說話前先想三遍，不輕易開口但每字有重量';
      howTheySpeak = '說話慢條斯理，習慣先聽再說，不爭不搶；衝突中傾向扮演和事佬，自己的委屈常藏在心裡不說';
      whatTriggersShutdown = '一直被推著表態、被逼著站邊——壓力太大時選擇沉默，然後悄悄積累怨氣';
      whatTheyNeedToHear = '「你真的很好說話，謝謝你包容我」「你的感受也很重要」——被看見不只是在付出';
    } else {
      type = '謹慎觀察型'; emoji = '🦉';
      tagline = '先看清楚，再開口，一切都在掌握中才有安全感';
      howTheySpeak = '開口前會觀察對方情緒，說話保留空間，常用「也許」「可能」「你覺得呢」——不輕易確定，留有餘地';
      whatTriggersShutdown = '被突然衝擊、意外的強烈情緒——需要預期和穩定感，突發狀況讓他立刻進入防衛模式';
      whatTheyNeedToHear = '「沒關係，慢慢來」「我不是在責備你」——先讓他感到安全，才能真正溝通';
    }
  }

  return { type, emoji, tagline, howTheySpeak, whatTriggersShutdown, whatTheyNeedToHear, pattern };
}

// 兩種溝通風格之間的衝突場景
function buildConflictScenarios(
  A: PersonProfile, B: PersonProfile,
  styleA: CommunicationStyle, styleB: CommunicationStyle,
): ConflictScenario[] {
  const scenarios: ConflictScenario[] = [];
  const nameA = A.name, nameB = B.name;

  // 情感型 vs 邏輯型：最經典衝突
  if (
    (styleA.pattern === '情感型' && styleB.pattern === '邏輯型') ||
    (styleA.pattern === '邏輯型' && styleB.pattern === '情感型')
  ) {
    const emotional = styleA.pattern === '情感型' ? nameA : nameB;
    const logical = styleA.pattern === '邏輯型' ? nameA : nameB;
    scenarios.push({
      title: '「你只想解決問題，我只想被理解」',
      howItStarts: `${emotional}因為某件事心情不好，想找${logical}訴說感受`,
      whatHappens: `${logical}馬上開始分析原因、給建議；${emotional}越聽越委屈，說「你都不理解我」；${logical}困惑「我明明在幫你」`,
      rootCause: '情感型需要先被「理解」，邏輯型認為「解決問題」才是愛——語言相同，頻道不同',
      solution: `${logical}說的第一句話先換成「你一定很難受，跟我說說」，問題等五分鐘後再討論`,
    });
  }

  // 行動型 vs 穩定型：速度衝突
  if (
    (styleA.pattern === '行動型' && styleB.pattern === '穩定型') ||
    (styleA.pattern === '穩定型' && styleB.pattern === '行動型')
  ) {
    const action = styleA.pattern === '行動型' ? nameA : nameB;
    const stable = styleA.pattern === '穩定型' ? nameA : nameB;
    scenarios.push({
      title: '「你太急了」vs「你太慢了」',
      howItStarts: `面對一個需要決定的問題，${action}已經想好方案，${stable}還在思考中`,
      whatHappens: `${action}催促、甚至直接做決定；${stable}感覺被跳過、不被尊重；最後兩人都覺得對方「不尊重自己的節奏」`,
      rootCause: '行動型的效率感 vs 穩定型的安全感——前者覺得拖延是浪費，後者覺得急躁是莽撞',
      solution: `${action}提前告知「我們下週五前要決定」，給${stable}準備時間；${stable}練習給出「草案」而非最終答案`,
    });
  }

  // 兩個行動型：競爭衝突
  if (styleA.pattern === '行動型' && styleB.pattern === '行動型') {
    scenarios.push({
      title: '「誰說了算」的主導權之戰',
      howItStarts: '同時都有想法，同時都想推進自己的方案',
      whatHappens: `${nameA}和${nameB}都說話直接、都想主導，語氣越來越強，變成誰都不讓誰，看起來像在吵架其實都是認真的`,
      rootCause: '兩個主導型的人在同一件事上，能量相撞——不是不愛對方，是本能反應',
      solution: '提前分工：誰負責哪個領域就誰說了算，不重疊就不衝突；重大決策輪流主導',
    });
  }

  // 兩個情感型：情緒漩渦
  if (styleA.pattern === '情感型' && styleB.pattern === '情感型') {
    scenarios.push({
      title: '情緒漩渦——誰先冷靜誰先輸？',
      howItStarts: '一方情緒波動，觸發另一方跟著情緒波動',
      whatHappens: `${nameA}不開心，${nameB}感受到了也不開心；兩個人都在說「你不理解我」，情緒越疊越高，最後可能為了說不清楚的事大哭一場`,
      rootCause: '兩個高情感連結的人，共振太快——彼此都是對方的情緒放大器',
      solution: '約定「暫停信號」：任何一方說「我需要五分鐘」就立刻暫停，各自沉澱後重新開始',
    });
  }

  // 五行相剋產生的溝通矛盾
  const wuxingConflict = getWuxingScore(A.wuxing, B.wuxing) < 45;
  if (wuxingConflict) {
    scenarios.push({
      title: `${A.wuxing}遇上${B.wuxing}：說話方式天生不在同一頻道`,
      howItStarts: '日常對話中，一方說的話被另一方以完全不同的方式詮釋',
      whatHappens: `${nameA}說了一句自認為平常的話，${nameB}聽起來卻像是在批評或施壓；反過來也一樣——不是誰的錯，是五行屬性決定的接收方式不同`,
      rootCause: `${A.wuxing}與${B.wuxing}在五行能量上相剋，導致訊息發出去和被接收的意思常常「跑掉」`,
      solution: '重要的事情說完後加一句：「你聽到的是什麼意思？」——確認理解後再繼續',
    });
  }

  // 安全感差距
  const secDiff = Math.abs(A.matrix.security - B.matrix.security);
  if (secDiff > 35) {
    const needSecurity = A.matrix.security > B.matrix.security ? nameA : nameB;
    const lessSecurity = A.matrix.security > B.matrix.security ? nameB : nameA;
    scenarios.push({
      title: '「你確定嗎？」vs「放輕鬆嘛」',
      howItStarts: '面對不確定性，兩人反應截然不同',
      whatHappens: `${needSecurity}需要反覆確認、需要更多保證；${lessSecurity}覺得「想太多了，沒事的」；${needSecurity}感到被忽視，${lessSecurity}感到被拖累`,
      rootCause: '安全感需求差距太大——不是誰對誰錯，是神經系統對「風險」的容忍度不同',
      solution: `${lessSecurity}多給一句「我明白你擔心，我們可以先準備B計畫」——哪怕只是說說，也能讓${needSecurity}平靜很多`,
    });
  }

  return scenarios.slice(0, 3); // 最多顯示 3 個場景
}

// 推算日常和諧相處法
function buildHarmonyTips(styleA: CommunicationStyle, styleB: CommunicationStyle, A: PersonProfile, B: PersonProfile): string[] {
  const tips: string[] = [];

  if (styleA.pattern === '情感型' || styleB.pattern === '情感型') {
    tips.push(`每天花 5 分鐘，不談「事情」，只聊「感受」——「今天你心情怎樣？」這個問題比任何分析都有力量`);
  }
  if (styleA.pattern === '邏輯型' || styleB.pattern === '邏輯型') {
    tips.push(`討論問題前先說清楚：「我現在需要的是傾聽，還是建議？」——讓對方知道怎麼回應才是對的`);
  }
  if (styleA.pattern === '行動型' || styleB.pattern === '行動型') {
    tips.push(`重要決定前給彼此一個「冷靜期」——寫下各自的想法，24小時後再討論，避免在情緒高峰時說出傷人的話`);
  }
  if (styleA.pattern === '穩定型' || styleB.pattern === '穩定型') {
    tips.push(`不要在對方剛進門或剛睡醒時提重要話題——等他們有了空間感，再開口，得到的回應會好三倍`);
  }

  // 通用：生肖/五行帶來的建議
  tips.push(`記住對方的「關閉觸發點」：${A.name}最怕「${styleA.whatTriggersShutdown.slice(0, 20)}…」，${B.name}最怕「${styleB.whatTriggersShutdown.slice(0, 20)}…」——避開這些，衝突減少一半`);
  tips.push(`爭吵結束後不要馬上討論「誰對誰錯」——先說一句「我愛你，我們只是有時候說話方式不同」，讓關係的溫度回來`);

  return tips.slice(0, 3);
}

export function computeCommunicationReport(A: PersonProfile, B: PersonProfile): CommunicationReport {
  const styleA = deriveCommunicationStyle(A);
  const styleB = deriveCommunicationStyle(B);

  // 衝突型態分類
  let clashType: string, clashDescription: string;
  const patterns = [styleA.pattern, styleB.pattern].sort().join('×');
  switch (patterns) {
    case '情感型×邏輯型':
      clashType = '理解 vs 解決 型衝突'; clashDescription = '一個要被懂，一個要給答案——愛的語言不同，不是不愛。'; break;
    case '行動型×穩定型':
      clashType = '快 vs 慢 型衝突'; clashDescription = '一個先做再說，一個想清楚再動——節奏不同，但目標可以一樣。'; break;
    case '行動型×行動型':
      clashType = '主導權 型衝突'; clashDescription = '兩個都想帶頭，碰在一起能量強大，但需要分工才不互撞。'; break;
    case '情感型×情感型':
      clashType = '情緒共振 型衝突'; clashDescription = '彼此是最好的鏡子，也是最容易放大彼此情緒的人。'; break;
    case '邏輯型×穩定型':
      clashType = '理性 vs 回避 型衝突'; clashDescription = '一個要分析，一個要和平——表達需求的方式完全不同。'; break;
    case '情感型×行動型':
    case '行動型×情感型':
      clashType = '感受 vs 效率 型衝突'; clashDescription = '一個覺得沒被在乎，一個覺得沒有進展——都在付出，頻道不對。'; break;
    default:
      clashType = '節奏差異 型衝突'; clashDescription = '兩人溝通節奏和方式有差異，需要主動調整頻道。';
  }

  const topConflicts = buildConflictScenarios(A, B, styleA, styleB);
  const dailyHarmony = buildHarmonyTips(styleA, styleB, A, B);

  return { personA: styleA, personB: styleB, clashType, clashDescription, topConflicts, dailyHarmony };
}

export interface CompatibilityResult {
  totalScore: number;
  grade: '天生一對' | '相輔相成' | '磨合成長' | '禮讓之道' | '差異互見' | '各自精彩';
  gradeColor: string;
  gradeDescription: string;
  dimensions: CompatibilityDimension[];
  frictionPoints: string[];
  strengthPoints: string[];
  wisdomNote: string;
  communicationReport: CommunicationReport;
}

export function computeCompatibility(A: PersonProfile, B: PersonProfile): CompatibilityResult {
  // ── 天層 40% ─────────────────────────────────────────────
  const zodiacAnimalScore = getZodiacAnimalScore(A.chineseZodiac, B.chineseZodiac);
  const wuxingScore       = getWuxingScore(A.wuxing, B.wuxing);
  const zodiacSignScore   = getZodiacScore(A.zodiacZh, B.zodiacZh);

  const heavenScore = zodiacAnimalScore * 0.15 + wuxingScore * 0.15 + zodiacSignScore * 0.10;

  // ── 地層 20% ─────────────────────────────────────────────
  const bloodScore  = getBloodScore(A.bloodType, B.bloodType);
  const earthScore  = bloodScore * 0.20;

  // ── 人層 40% ─────────────────────────────────────────────
  const { complementScore, resonanceScore } = getMatrixCompatScore(A.matrix, B.matrix);
  const humanScore = complementScore * 0.20 + resonanceScore * 0.20;

  // ── 總分 ─────────────────────────────────────────────────
  const raw = heavenScore + earthScore + humanScore;
  const totalScore = Math.round(Math.max(0, Math.min(100, raw)));

  // ── 分級 ─────────────────────────────────────────────────
  let grade: CompatibilityResult['grade'];
  let gradeColor: string;
  let gradeDescription: string;

  if (totalScore >= 90) {
    grade = '天生一對'; gradeColor = '#f59e0b';
    gradeDescription = '命中注定的相遇，靈魂深處的共鳴，彼此就是對方最好的歸宿。';
  } else if (totalScore >= 75) {
    grade = '相輔相成'; gradeColor = '#10b981';
    gradeDescription = '你們的差異是禮物，互補之處讓彼此成為更好的人。';
  } else if (totalScore >= 60) {
    grade = '磨合成長'; gradeColor = '#6366f1';
    gradeDescription = '有摩擦，有火花，在磨合中成長，越走越深刻。';
  } else if (totalScore >= 45) {
    grade = '禮讓之道'; gradeColor = '#8b5cf6';
    gradeDescription = '差異帶來張力，但懂得禮讓與包容，就能走出專屬的美麗。';
  } else if (totalScore >= 30) {
    grade = '差異互見'; gradeColor = '#f97316';
    gradeDescription = '個性差異明顯，需要更多理解與耐心，但衝突也是相互了解的開始。';
  } else {
    grade = '各自精彩'; gradeColor = '#ef4444';
    gradeDescription = '你們的世界非常不同，但不同不等於不好——尊重差異才是智慧。';
  }

  // ── 維度明細（統一三段描述閾值：高≥75 / 中≥50 / 低<50）──────
  const dimensions: CompatibilityDimension[] = [
    {
      label: '生肖緣分', score: zodiacAnimalScore, emoji: '🐉',
      description: zodiacAnimalScore >= 90 ? '六合至親，命理天定的絕佳搭配' :
                   zodiacAnimalScore >= 75 ? '三合吉象，緣分深厚相得益彰' :
                   zodiacAnimalScore >= 50 ? '普通相性，平順共處無大礙' : '相沖相刑，需要更多包容與理解',
    },
    {
      label: '五行交融', score: wuxingScore, emoji: '☯️',
      description: wuxingScore >= 75 ? '五行相生，能量互補流動和諧' :
                   wuxingScore >= 50 ? '五行相同或中性，氣場平穩共處' : '五行相剋，容易在思維決策上產生摩擦',
    },
    {
      label: '星座共振', score: zodiacSignScore, emoji: '✨',
      description: zodiacSignScore >= 75 ? '元素同頻，思維方式與節奏高度契合' :
                   zodiacSignScore >= 50 ? '星性互補，各有特色可以學習彼此' : '星性差異較大，需更多耐心與溝通',
    },
    {
      label: '血型默契', score: bloodScore, emoji: '💫',
      description: bloodScore >= 75 ? '行事風格高度默契，相處自然省力' :
                   bloodScore >= 50 ? '基本性格互相理解，可以磨合' : '行事方式差距明顯，需調整期待',
    },
    {
      label: '人格互補', score: Math.round(complementScore), emoji: '🔮',
      description: complementScore >= 75 ? '長處與短處剛好互補，1+1大於2' :
                   complementScore >= 50 ? '有互補空間，可以在差異中學習成長' : '個性過於相似或兩極，容易競爭或無法平衡',
    },
    {
      label: '靈魂共鳴', score: Math.round(resonanceScore), emoji: '💜',
      description: resonanceScore >= 75 ? '情感頻率高度一致，心靈相通不用解釋' :
                   resonanceScore >= 50 ? '情感基礎穩固，能互相理解與支持' : '情感表達方式不同，容易誤解，需耐心建立連結',
    },
  ];

  // ── 強項 & 摩擦點 ─────────────────────────────────────────
  const strengthPoints: string[] = [];
  const frictionPoints: string[] = [];

  // 五行
  if (wuxingScore >= 80) strengthPoints.push(`${A.wuxing}與${B.wuxing}五行相生，能量互補，讓彼此都更有力量`);
  else if (wuxingScore < 45) frictionPoints.push(`${A.wuxing}與${B.wuxing}五行相剋，容易在決策方向上意見分歧`);

  // 生肖
  if (zodiacAnimalScore >= 90) strengthPoints.push(`${A.chineseZodiac}與${B.chineseZodiac}六合，命理上是天定的最佳搭配`);
  else if (zodiacAnimalScore < 40) frictionPoints.push(`${A.chineseZodiac}與${B.chineseZodiac}生肖相沖，個性容易直接碰撞，需主動退讓`);

  // 情感深度差距
  const emotionDiff = Math.abs(A.matrix.emotion - B.matrix.emotion);
  if (emotionDiff > 35) frictionPoints.push('情感表達深淺差距大，一方渴望被理解，另一方卻難以察覺');
  else if (emotionDiff <= 15) strengthPoints.push('情感深度相近，說話不用解釋對方就懂，天然的默契');

  // 社交需求差距
  const socialDiff = Math.abs(A.matrix.social - B.matrix.social);
  if (socialDiff > 35) frictionPoints.push('社交需求差異大，一個享受人群，一個需要獨處，容易在生活方式上拉鋸');
  else if (socialDiff <= 10) strengthPoints.push('社交節奏一致，生活方式自然契合，不需要妥協就能共處');

  // 風險態度差距
  const riskDiff = Math.abs(A.matrix.risk - B.matrix.risk);
  if (riskDiff > 40) frictionPoints.push('面對風險的態度截然不同，一方保守謹慎，一方勇於冒進，容易對重要決定產生分歧');
  else if (riskDiff >= 20 && riskDiff <= 45) strengthPoints.push('一個穩重一個勇敢，剛好形成互補，讓決策更全面');

  // 邏輯 vs 情感互補
  if ((A.matrix.logic > 72 && B.matrix.emotion > 72) || (A.matrix.emotion > 72 && B.matrix.logic > 72)) {
    strengthPoints.push('一個理性主導，一個感性豐富，思維方式互補，是最好的決策組合');
  }

  // 安全感共鳴
  const secDiff = Math.abs(A.matrix.security - B.matrix.security);
  if (secDiff <= 10 && A.matrix.security > 65) strengthPoints.push('雙方都有穩定的安全感，關係的根基穩固，不容易因外部動盪而動搖');
  else if (secDiff > 40) frictionPoints.push('對「穩定感」的需求差距大，一方需要確定性，另一方享受彈性，需要找到平衡點');

  // ── 相處智慧（與 grade 閾值完全一致：90/75/60/45/30）────────
  const wisdomNote = generateWisdom(totalScore, A, B, frictionPoints, strengthPoints);

  const communicationReport = computeCommunicationReport(A, B);

  return { totalScore, grade, gradeColor, gradeDescription, dimensions, frictionPoints, strengthPoints, wisdomNote, communicationReport };
}

function generateWisdom(
  score: number,
  A: PersonProfile,
  B: PersonProfile,
  frictions: string[],
  strengths: string[],
): string {
  const mainFriction = frictions[0] ?? '';
  const mainStrength = strengths[0] ?? '';

  if (score >= 90) {
    return `${A.name}與${B.name}是命理與心理都高度契合的一對。${mainStrength ? `你們${mainStrength}——這是難得的天賦。` : ''}珍惜這份命中注定的相遇，讓愛在歲月中越陳越香。`;
  }
  if (score >= 75) {
    return `${A.name}與${B.name}的關係充滿互補的美好。${mainStrength ? `你們${mainStrength}，` : ''}差異是你們最大的禮物，讓彼此在對方身上看見自己沒有的部分。越相處，越懂得珍惜。`;
  }
  if (score >= 60) {
    const frictionHint = mainFriction ? `尤其是「${mainFriction}」這一點，需要主動溝通。` : '';
    return `${A.name}與${B.name}之間有真實的火花，也有真實的摩擦。${frictionHint}摩擦不是壞事，它是兩個靈魂在彼此雕刻中變得更完整的過程。記得：開口說，比沉默更有力量。`;
  }
  if (score >= 45) {
    const frictionHint = mainFriction ? `特別留意「${mainFriction}」。` : '';
    return `${A.name}與${B.name}的相處之道在於「禮讓」——不是委屈自己，而是真正看見對方的不同。${frictionHint}心理學告訴我們，最好的關係不是找到完全相同的人，而是學會欣賞差異。`;
  }
  if (score >= 30) {
    return `${A.name}與${B.name}的個性差距相當大，但差距從來不是問題的根源，「不願意理解」才是。如果雙方都願意放下自我，帶著好奇心去認識對方的世界，任何距離都能縮短。`;
  }
  return `${A.name}與${B.name}是兩個截然不同的靈魂。相遇本身就是緣分——珍惜這份緣，不強求改變對方，尊重彼此的獨特，就是這段關係最大的智慧。`;
}
