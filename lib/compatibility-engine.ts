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

export interface CompatibilityResult {
  totalScore: number;
  grade: '天生一對' | '相輔相成' | '磨合成長' | '禮讓之道' | '差異互見' | '各自精彩';
  gradeColor: string;
  gradeDescription: string;
  dimensions: CompatibilityDimension[];
  frictionPoints: string[];
  strengthPoints: string[];
  wisdomNote: string;
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

  // ── 維度明細 ─────────────────────────────────────────────
  const dimensions: CompatibilityDimension[] = [
    {
      label: '生肖緣分', score: zodiacAnimalScore, emoji: '🐉',
      description: zodiacAnimalScore >= 90 ? '六合至親，天定緣分' :
                   zodiacAnimalScore >= 75 ? '三合吉象，相得益彰' :
                   zodiacAnimalScore >= 50 ? '普通相性，緣分平穩' : '相沖之象，需多包容',
    },
    {
      label: '五行交融', score: wuxingScore, emoji: '☯️',
      description: wuxingScore >= 85 ? '相生互補，能量流動和諧' :
                   wuxingScore >= 65 ? '五行平衡，相安共處' : '相剋之勢，需找共同點',
    },
    {
      label: '星座共振', score: zodiacSignScore, emoji: '✨',
      description: zodiacSignScore >= 85 ? '元素同頻，思維方式相近' :
                   zodiacSignScore >= 65 ? '星性互補，各有特色' : '性格差異，需更多溝通',
    },
    {
      label: '血型默契', score: bloodScore, emoji: '💫',
      description: bloodScore >= 85 ? '行事風格高度默契' :
                   bloodScore >= 65 ? '基本性格互相理解' : '行事方式有差異，需要調整',
    },
    {
      label: '人格互補', score: Math.round(complementScore), emoji: '🔮',
      description: complementScore >= 75 ? '你的長處補了他的短，完美平衡' :
                   complementScore >= 55 ? '有互補空間，可以學習彼此' : '個性太相似，容易相爭',
    },
    {
      label: '靈魂共鳴', score: Math.round(resonanceScore), emoji: '💜',
      description: resonanceScore >= 80 ? '情感頻率高度一致，心靈相通' :
                   resonanceScore >= 60 ? '情感基礎穩固，能互相理解' : '情感表達方式不同，需耐心',
    },
  ];

  // ── 強項 & 摩擦點 ─────────────────────────────────────────
  const strengthPoints: string[] = [];
  const frictionPoints: string[] = [];

  // 五行
  if (wuxingScore >= 80) strengthPoints.push(`${A.wuxing}與${B.wuxing}相生，能量互補，讓彼此都更有力量`);
  else if (wuxingScore < 45) frictionPoints.push(`${A.wuxing}與${B.wuxing}五行相剋，容易在決策上意見分歧`);

  // 生肖
  if (zodiacAnimalScore >= 90) strengthPoints.push(`${A.chineseZodiac}與${B.chineseZodiac}六合，命理上是天定的好搭配`);
  else if (zodiacAnimalScore < 40) frictionPoints.push(`${A.chineseZodiac}與${B.chineseZodiac}相沖，個性上容易直接碰撞`);

  // 人格互補
  const emotionDiff = Math.abs(A.matrix.emotion - B.matrix.emotion);
  if (emotionDiff > 35) frictionPoints.push('情感表達深淺差距大，一方覺得「你不懂我」');
  if (emotionDiff <= 15) strengthPoints.push('情感深度相近，說話不用解釋對方就懂');

  const socialDiff = Math.abs(A.matrix.social - B.matrix.social);
  if (socialDiff > 35) frictionPoints.push('社交需求差異大，一個想出去玩，一個想待在家');
  if (socialDiff <= 10) strengthPoints.push('社交節奏一致，生活方式自然契合');

  const riskDiff = Math.abs(A.matrix.risk - B.matrix.risk);
  if (riskDiff > 40) frictionPoints.push('面對風險態度不同，一方保守一方冒進，容易拉鋸');
  if (riskDiff >= 25 && riskDiff <= 45) strengthPoints.push('一個穩重一個勇敢，正好互相平衡');

  // 邏輯 vs 情感
  const logicA = A.matrix.logic; const emotionA = A.matrix.emotion;
  const logicB = B.matrix.logic; const emotionB = B.matrix.emotion;
  if ((logicA > 75 && emotionB > 75) || (emotionA > 75 && logicB > 75)) {
    strengthPoints.push('一個理性主導，一個感性豐富，思維互補是最好的組合');
  }

  // ── 相處智慧 ─────────────────────────────────────────────
  const wisdomNote = generateWisdom(totalScore, A, B, frictionPoints);

  return { totalScore, grade, gradeColor, gradeDescription, dimensions, frictionPoints, strengthPoints, wisdomNote };
}

function generateWisdom(score: number, A: PersonProfile, B: PersonProfile, frictions: string[]): string {
  if (score >= 85) {
    return `${A.name}與${B.name}的相遇是命運的禮物。你們的靈魂早在前世就已相識，今生的重逢是為了共同完成一段美麗的旅程。珍惜這份難得的緣分，讓愛越來越深。`;
  }
  if (score >= 70) {
    return `${A.name}與${B.name}是彼此生命中最重要的鏡子，你們的差異讓對方看見自己的盲點，你們的相似讓彼此感到安全。在互補中成長，這段關係值得用一生來經營。`;
  }
  if (score >= 55) {
    return `${A.name}與${B.name}之間有真實的火花，也有真實的摩擦。摩擦不是壞事——它是兩個靈魂在彼此雕刻中變得更美的過程。記得：溝通永遠比沉默更有力量。`;
  }
  if (score >= 40) {
    return `${A.name}與${B.name}的相處需要更多的「禮讓」——不是委屈自己，而是真正理解對方的不同。心理學告訴我們，最好的關係不是找到完全相同的人，而是學會欣賞彼此的差異。`;
  }
  return `${A.name}與${B.name}是兩個非常不同的靈魂。不同不是問題，真正的問題是「願不願意去理解」。如果雙方都願意放下自我，帶著好奇心去了解彼此，任何差距都能成為獨特的美麗。`;
}
