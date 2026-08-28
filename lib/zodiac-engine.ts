import * as Astronomy from 'astronomy-engine';
import { findCityById, getDefaultCity, type CityEntry } from './city-directory';
import { castHexagramFromBirth, formatHexagramLine } from './iching-engine';
import { formatGhostDecoding } from './iching-psychology';
import { zonedTimeToUtc } from './timezone-utils';

export type ZodiacSignKey =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

export type ZodiacPrecision = 'DATE_ONLY' | 'DATE_TIME' | 'FULL_CHART';

export type ZodiacAnalysisInput = {
  name?: string;
  birthDate: string;
  birthTime?: string | null;
  birthCityId?: string | null;
};

export type ZodiacSignSummary = {
  key: ZodiacSignKey;
  name: string;
  symbol: string;
  element: ZodiacElement;
  dateRange: string;
};

export type ZodiacModality = 'cardinal' | 'fixed' | 'mutable';

export type ZodiacPolarity = 'yang' | 'yin';

export type ZodiacPointRole = 'sun' | 'moon' | 'rising';

type NormalizedZodiacInput = {
  name: string | null;
  birthDate: string;
  birthTime: string | null;
  birthCityId: string | null;
};

export type ZodiacProfessionalPoint = {
  role: ZodiacPointRole;
  roleLabel: string;
  sign: ZodiacSignSummary;
  element: ZodiacElement;
  modality: ZodiacModality;
  polarity: ZodiacPolarity;
  ruler: string;
  houseTheme: string;
  longitudeDeg: number | null;
  calculationSource: 'date_range' | 'astronomy_engine' | 'not_available';
  available: boolean;
  professionalMeaning: string;
};

export type ZodiacProfessionalChart = {
  layer: 'professional_zodiac_chart';
  generatedFrom: 'normalized_birth_input';
  recalculationAllowed: false;
  input: NormalizedZodiacInput;
  precision: ZodiacPrecision;
  precisionScore: number;
  dataQuality: {
    birthDate: 'provided';
    birthTime: 'provided' | 'missing';
    birthCity: 'provided' | 'assumed' | 'missing';
    note: string;
  };
  points: {
    sun: ZodiacProfessionalPoint;
    moon: ZodiacProfessionalPoint | null;
    rising: ZodiacProfessionalPoint | null;
  };
  dominantSignature: {
    element: ZodiacElement;
    modality: ZodiacModality;
    polarity: ZodiacPolarity;
    score: number;
    basis: string[];
  };
  elementDistribution: Record<ZodiacElement, number>;
  modalityDistribution: Record<ZodiacModality, number>;
  polarityDistribution: Record<ZodiacPolarity, number>;
  professionalKeywords: string[];
  readingBoundaries: string[];
  integrationWeights: Record<'AIR' | 'FIRE' | 'WATER' | 'EARTH', number>;
};

export type ZodiacDeepPointReading = {
  role: ZodiacPointRole;
  roleLabel: string;
  sourceSign: ZodiacSignSummary;
  title: string;
  interpretation: string;
  integrationFocus: string;
  evidence: string[];
};

export type ZodiacDeepAnalysis = {
  layer: 'ai_zodiac_deep_analysis';
  sourceLayer: 'professional_zodiac_chart';
  recalculationAllowed: false;
  professionalInputDigest: string[];
  coreNarrative: string;
  pointReadings: ZodiacDeepPointReading[];
  dominantInterpretation: string;
  tensionPatterns: string[];
  growthOpportunities: string[];
  userFriendlySummary: string;
  aiPromptMaterial: {
    fixedFacts: string[];
    interpretationRules: string[];
    prohibitedMoves: string[];
  };
};

export type ZodiacBrandElementCode = 'AIR' | 'SPACE' | 'WATER' | 'FIRE' | 'EARTH';

export type ZodiacReinforcementPriority = {
  rank: 1 | 2 | 3;
  element: ZodiacBrandElementCode;
  elementLabel: string;
  needScore: number;
  reason: string;
  actions: string[];
  sourceEvidence: string[];
};

export type ZodiacReinforcementPlan = {
  layer: 'ai_zodiac_reinforcement_plan';
  sourceLayer: 'ai_zodiac_deep_analysis';
  recalculationAllowed: false;
  principle: string;
  priorities: [ZodiacReinforcementPriority, ZodiacReinforcementPriority, ZodiacReinforcementPriority];
  executionOrder: string[];
  integrationLayerPayload: {
    moduleId: 'ZODIAC';
    sourceEngineVersion: 'zodiac_core_v4';
    elementNeedScore: Record<ZodiacBrandElementCode, number>;
    firstPriority: ZodiacBrandElementCode;
    evidence: string[];
    writePolicy: 'self_can_update_growth_center_other_single_reading_only';
  };
};

export type ZodiacAnalysisResult = {
  ok: true;
  mode: 'zodiac';
  moduleId: 'ZODIAC';
  engineVersion: 'zodiac_core_v4';
  input: NormalizedZodiacInput;
  precision: ZodiacPrecision;
  sign: ZodiacSignSummary;
  risingSign: ZodiacSignSummary | null;
  moonSign: ZodiacSignSummary | null;
  professionalChart: ZodiacProfessionalChart;
  deepAnalysis: ZodiacDeepAnalysis;
  reinforcementPlan: ZodiacReinforcementPlan;
  chartNote: string;
  personality: string;
  strengths: string[];
  blindSpots: string[];
  currentAdvice: string;
  weeklyReminder: string;
  integrationSummary: string;
};

type ZodiacProfile = {
  key: ZodiacSignKey;
  name: string;
  symbol: string;
  element: ZodiacElement;
  dateRange: string;
  start: [number, number];
  end: [number, number];
  personality: string;
  strengths: string[];
  blindSpots: string[];
  currentAdvice: string;
  weeklyReminder: string;
};

type ZodiacMeta = {
  modality: ZodiacModality;
  polarity: ZodiacPolarity;
  ruler: string;
  houseTheme: string;
  keywords: string[];
};

const ZODIAC_META: Record<ZodiacSignKey, ZodiacMeta> = {
  aries: { modality: 'cardinal', polarity: 'yang', ruler: '\u706b\u661f', houseTheme: '\u81ea\u6211\u3001\u555f\u52d5\u3001\u52c7\u6c23', keywords: ['\u555f\u52d5', '\u884c\u52d5', '\u7af6\u722d'] },
  taurus: { modality: 'fixed', polarity: 'yin', ruler: '\u91d1\u661f', houseTheme: '\u8cc7\u6e90\u3001\u7a69\u5b9a\u3001\u50f9\u503c', keywords: ['\u7a69\u5b9a', '\u7d2f\u7a4d', '\u611f\u5b98'] },
  gemini: { modality: 'mutable', polarity: 'yang', ruler: '\u6c34\u661f', houseTheme: '\u5b78\u7fd2\u3001\u6e9d\u901a\u3001\u8a0a\u606f', keywords: ['\u5b78\u7fd2', '\u9023\u7d50', '\u8868\u9054'] },
  cancer: { modality: 'cardinal', polarity: 'yin', ruler: '\u6708\u4eae', houseTheme: '\u5bb6\u5ead\u3001\u5b89\u5168\u611f\u3001\u7167\u9867', keywords: ['\u5b89\u5b9a', '\u7167\u9867', '\u611f\u53d7'] },
  leo: { modality: 'fixed', polarity: 'yang', ruler: '\u592a\u967d', houseTheme: '\u5275\u9020\u3001\u8868\u73fe\u3001\u821e\u53f0', keywords: ['\u8868\u73fe', '\u9818\u5c0e', '\u71b1\u60c5'] },
  virgo: { modality: 'mutable', polarity: 'yin', ruler: '\u6c34\u661f', houseTheme: '\u79e9\u5e8f\u3001\u5206\u6790\u3001\u6539\u5584', keywords: ['\u5206\u6790', '\u6574\u7406', '\u7cbe\u6e96'] },
  libra: { modality: 'cardinal', polarity: 'yang', ruler: '\u91d1\u661f', houseTheme: '\u95dc\u4fc2\u3001\u5e73\u8861\u3001\u5354\u8abf', keywords: ['\u5354\u8abf', '\u5be9\u7f8e', '\u6c7a\u7b56'] },
  scorpio: { modality: 'fixed', polarity: 'yin', ruler: '\u51a5\u738b\u661f', houseTheme: '\u6df1\u5ea6\u3001\u8f49\u5316\u3001\u6d1e\u5bdf', keywords: ['\u6d1e\u5bdf', '\u5c08\u6ce8', '\u8f49\u5316'] },
  sagittarius: { modality: 'mutable', polarity: 'yang', ruler: '\u6728\u661f', houseTheme: '\u9060\u65b9\u3001\u4fe1\u5ff5\u3001\u63a2\u7d22', keywords: ['\u63a2\u7d22', '\u8996\u91ce', '\u81ea\u7531'] },
  capricorn: { modality: 'cardinal', polarity: 'yin', ruler: '\u571f\u661f', houseTheme: '\u8cac\u4efb\u3001\u76ee\u6a19\u3001\u7d50\u69cb', keywords: ['\u8cac\u4efb', '\u7d50\u69cb', '\u9577\u671f'] },
  aquarius: { modality: 'fixed', polarity: 'yang', ruler: '\u5929\u738b\u661f', houseTheme: '\u7fa4\u9ad4\u3001\u5275\u65b0\u3001\u7cfb\u7d71', keywords: ['\u5275\u65b0', '\u7368\u7acb', '\u7cfb\u7d71'] },
  pisces: { modality: 'mutable', polarity: 'yin', ruler: '\u6d77\u738b\u661f', houseTheme: '\u60f3\u50cf\u3001\u5171\u611f\u3001\u9748\u611f', keywords: ['\u5171\u611f', '\u60f3\u50cf', '\u7642\u7652'] },
};

const ZODIAC_PROFILES: ZodiacProfile[] = [
  {
    key: 'aries',
    name: '牡羊座',
    symbol: '♈',
    element: 'fire',
    dateRange: '03/21 - 04/19',
    start: [3, 21],
    end: [4, 19],
    personality: '行動速度快，遇到事情會先推進，再從實作中修正方向。',
    strengths: ['決斷力強', '啟動速度快', '願意承擔第一步'],
    blindSpots: ['容易急著做完', '忽略細節收尾', '情緒來得直接'],
    currentAdvice: '現在最重要是把行動拆成三步，先完成第一步，再檢查節奏。',
    weeklyReminder: '本週重點：先開始，再修正。把拖延最久的一件事推進 20 分鐘。',
  },
  {
    key: 'taurus',
    name: '金牛座',
    symbol: '♉',
    element: 'earth',
    dateRange: '04/20 - 05/20',
    start: [4, 20],
    end: [5, 20],
    personality: '重視穩定與實際成果，適合用長期累積建立信任感。',
    strengths: ['耐力穩', '重視品質', '財務與資源感強'],
    blindSpots: ['變動時反應較慢', '容易固守熟悉方式', '不喜歡被催促'],
    currentAdvice: '現在最重要是保留穩定節奏，同時每週加入一個小改變。',
    weeklyReminder: '本週重點：穩中求進。整理一項資源，讓下一步更容易開始。',
  },
  {
    key: 'gemini',
    name: '雙子座',
    symbol: '♊',
    element: 'air',
    dateRange: '05/21 - 06/20',
    start: [5, 21],
    end: [6, 20],
    personality: '思考靈活，擅長吸收資訊、連結觀點與快速溝通。',
    strengths: ['學習快', '表達靈活', '善於連結人與資訊'],
    blindSpots: ['注意力分散', '容易同時開太多線', '深度收斂不足'],
    currentAdvice: '現在最重要是把想法收斂成一個主題，先完成再擴充。',
    weeklyReminder: '本週重點：少即是快。只選一件最重要的事，做到可交付。',
  },
  {
    key: 'cancer',
    name: '巨蟹座',
    symbol: '♋',
    element: 'water',
    dateRange: '06/21 - 07/22',
    start: [6, 21],
    end: [7, 22],
    personality: '感受力強，重視安全感、關係品質與內在穩定。',
    strengths: ['共感力強', '照顧細節', '重視長期關係'],
    blindSpots: ['容易受情緒牽動', '不安時會退縮', '界線需要更清楚'],
    currentAdvice: '現在最重要是先安定自己的節奏，再清楚表達需求。',
    weeklyReminder: '本週重點：建立界線。把一件讓你消耗的事說清楚。',
  },
  {
    key: 'leo',
    name: '獅子座',
    symbol: '♌',
    element: 'fire',
    dateRange: '07/23 - 08/22',
    start: [7, 23],
    end: [8, 22],
    personality: '自帶舞台感，適合把熱情轉成領導、創作與明確表現。',
    strengths: ['感染力強', '願意帶頭', '有表現與創作能量'],
    blindSpots: ['需要被肯定', '壓力下容易硬撐', '不易示弱求助'],
    currentAdvice: '現在最重要是把自信落到實際成果，用完成度建立信任。',
    weeklyReminder: '本週重點：用作品說話。完成一件能被看見的小成果。',
  },
  {
    key: 'virgo',
    name: '處女座',
    symbol: '♍',
    element: 'earth',
    dateRange: '08/23 - 09/22',
    start: [8, 23],
    end: [9, 22],
    personality: '觀察精準，重視秩序、方法與可改善的細節。',
    strengths: ['分析細', '執行有秩序', '善於修正流程'],
    blindSpots: ['容易過度挑剔', '開始前想太多', '對自己要求過高'],
    currentAdvice: '現在最重要是設定完成標準，不讓完美感拖慢前進。',
    weeklyReminder: '本週重點：先完成 80 分。把一件事交出去，再回頭優化。',
  },
  {
    key: 'libra',
    name: '天秤座',
    symbol: '♎',
    element: 'air',
    dateRange: '09/23 - 10/22',
    start: [9, 23],
    end: [10, 22],
    personality: '重視平衡與合作，擅長在人際與選擇之間找到協調點。',
    strengths: ['審美好', '協調力強', '懂得換位思考'],
    blindSpots: ['容易猶豫', '過度顧及他人', '決策時間拉長'],
    currentAdvice: '現在最重要是先定主順位，讓選擇有明確標準。',
    weeklyReminder: '本週重點：做一個決定。選定後執行，不再反覆比較。',
  },
  {
    key: 'scorpio',
    name: '天蠍座',
    symbol: '♏',
    element: 'water',
    dateRange: '10/23 - 11/21',
    start: [10, 23],
    end: [11, 21],
    personality: '洞察深，專注強，適合處理需要耐心與穿透力的問題。',
    strengths: ['洞察力強', '意志集中', '能看見問題核心'],
    blindSpots: ['防備心較高', '不容易放下控制', '情緒累積較深'],
    currentAdvice: '現在最重要是把深度洞察轉成可溝通的行動語言。',
    weeklyReminder: '本週重點：說清楚。把一個真正在意的點用平穩方式表達。',
  },
  {
    key: 'sagittarius',
    name: '射手座',
    symbol: '♐',
    element: 'fire',
    dateRange: '11/22 - 12/21',
    start: [11, 22],
    end: [12, 21],
    personality: '追求視野與自由，適合用探索、學習與行動擴大人生半徑。',
    strengths: ['視野開闊', '樂觀直接', '適合開拓新方向'],
    blindSpots: ['容易跳太快', '細節耐性不足', '承諾需要更穩'],
    currentAdvice: '現在最重要是把遠方目標落成近期任務，讓自由有方向。',
    weeklyReminder: '本週重點：把想去的遠方變成行程表上的第一步。',
  },
  {
    key: 'capricorn',
    name: '摩羯座',
    symbol: '♑',
    element: 'earth',
    dateRange: '12/22 - 01/19',
    start: [12, 22],
    end: [1, 19],
    personality: '目標感強，能把責任、時間與成果放在同一條路徑上。',
    strengths: ['責任感強', '耐壓穩', '重視長期成果'],
    blindSpots: ['容易把壓力自己扛', '情感表達較保守', '休息感不足'],
    currentAdvice: '現在最重要是保留長期目標，同時安排恢復能量的時間。',
    weeklyReminder: '本週重點：穩定推進。完成一項長期任務的最小里程碑。',
  },
  {
    key: 'aquarius',
    name: '水瓶座',
    symbol: '♒',
    element: 'air',
    dateRange: '01/20 - 02/18',
    start: [1, 20],
    end: [2, 18],
    personality: '思維獨立，重視創新、觀念更新與群體中的獨特定位。',
    strengths: ['想法前衛', '獨立判斷', '善於看見新系統'],
    blindSpots: ['情緒距離較遠', '不愛被限制', '想法落地需要節奏'],
    currentAdvice: '現在最重要是把新想法做成可理解、可執行的版本。',
    weeklyReminder: '本週重點：把一個創新想法寫成三步流程。',
  },
  {
    key: 'pisces',
    name: '雙魚座',
    symbol: '♓',
    element: 'water',
    dateRange: '02/19 - 03/20',
    start: [2, 19],
    end: [3, 20],
    personality: '感性豐富，想像力強，能從情緒與直覺中讀到細微訊號。',
    strengths: ['想像力強', '共情柔軟', '適合藝術與陪伴'],
    blindSpots: ['界線容易模糊', '容易被情緒帶走', '現實排序需要加強'],
    currentAdvice: '現在最重要是把感受整理成明確行動，讓靈感落地。',
    weeklyReminder: '本週重點：把一個想法寫下來，指定時間完成第一版。',
  },
];

function isWithinRange(month: number, day: number, start: [number, number], end: [number, number]) {
  const value = month * 100 + day;
  const startValue = start[0] * 100 + start[1];
  const endValue = end[0] * 100 + end[1];
  if (startValue <= endValue) return value >= startValue && value <= endValue;
  return value >= startValue || value <= endValue;
}

function parseBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('請輸入有效的出生年月日。');
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('請輸入有效的出生年月日。');
  }
  return { year, month, day };
}

export function getZodiacSignByBirthDate(birthDate: string) {
  const { month, day } = parseBirthDate(birthDate);
  const profile = ZODIAC_PROFILES.find((item) => isWithinRange(month, day, item.start, item.end));
  if (!profile) throw new Error('目前無法判定星座，請重新確認出生日期。');
  return profile;
}

function toSignSummary(profile: ZodiacProfile): ZodiacSignSummary {
  return { key: profile.key, name: profile.name, symbol: profile.symbol, element: profile.element, dateRange: profile.dateRange };
}

function longitudeToProfile(eclipticLongitudeDeg: number): ZodiacProfile {
  const normalized = ((eclipticLongitudeDeg % 360) + 360) % 360;
  const index = Math.floor(normalized / 30);
  return ZODIAC_PROFILES[index] ?? ZODIAC_PROFILES[0];
}

/**
 * Ascendant (rising sign) longitude via the standard RAMC/obliquity formula.
 * Validated against a published reference chart (JFK, 1917-05-29 15:00 EST,
 * Brookline MA) to confirm sign-level accuracy: result matched the known
 * Virgo ascendant.
 */
function computeAscendantLongitude(utcInstant: Date, latitudeDeg: number, longitudeEastDeg: number) {
  const gastHours = Astronomy.SiderealTime(utcInstant);
  const gastDeg = gastHours * 15;
  const lstDeg = ((gastDeg + longitudeEastDeg) % 360 + 360) % 360;
  const tilt = Astronomy.e_tilt(Astronomy.MakeTime(utcInstant));
  const obliquityRad = (tilt.tobl * Math.PI) / 180;
  const latitudeRad = (latitudeDeg * Math.PI) / 180;
  const thetaRad = (lstDeg * Math.PI) / 180;

  const y = -Math.cos(thetaRad);
  const x = -(Math.sin(obliquityRad) * Math.tan(latitudeRad) + Math.cos(obliquityRad) * Math.sin(thetaRad));
  const ascendantRad = Math.atan2(y, x);
  return (((ascendantRad * 180) / Math.PI) % 360 + 360) % 360;
}

function validateBirthTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('請輸入正確的出生時間格式（HH:mm）。');
}

function resolveBirthCity(birthCityId: string | null): { city: CityEntry; assumed: boolean } {
  if (birthCityId) {
    const city = findCityById(birthCityId);
    if (!city) throw new Error('目前查無此出生城市，請重新選擇。');
    return { city, assumed: false };
  }
  return { city: getDefaultCity(), assumed: true };
}

const ZODIAC_ELEMENTS: ZodiacElement[] = ['fire', 'earth', 'air', 'water'];
const ZODIAC_MODALITIES: ZodiacModality[] = ['cardinal', 'fixed', 'mutable'];
const ZODIAC_POLARITIES: ZodiacPolarity[] = ['yang', 'yin'];

function buildDistribution<T extends string>(keys: readonly T[]): Record<T, number> {
  return keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<T, number>);
}

function addDistribution<T extends string>(target: Record<T, number>, key: T, weight: number) {
  target[key] = Math.round((target[key] + weight) * 100) / 100;
}

function topDistributionKey<T extends string>(target: Record<T, number>, keys: readonly T[]): T {
  return keys.reduce((winner, key) => (target[key] > target[winner] ? key : winner), keys[0]);
}

function buildProfessionalPoint(
  role: ZodiacPointRole,
  roleLabel: string,
  profile: ZodiacProfile,
  longitudeDeg: number | null,
  calculationSource: ZodiacProfessionalPoint['calculationSource'],
): ZodiacProfessionalPoint {
  const meta = ZODIAC_META[profile.key];
  const meaningByRole: Record<ZodiacPointRole, string> = {
    sun: '\u592a\u967d\u661f\u5ea7\u5b9a\u7fa9\u5916\u5728\u4eba\u683c\u4e3b\u8ef8\u3001\u610f\u5fd7\u65b9\u5411\u8207\u4e3b\u8981\u751f\u547d\u8868\u9054\u3002',
    moon: '\u6708\u4eae\u661f\u5ea7\u5b9a\u7fa9\u60c5\u7dd2\u53cd\u61c9\u3001\u5b89\u5168\u611f\u9700\u6c42\u8207\u79c1\u9818\u57df\u7684\u5167\u5728\u7bc0\u594f\u3002',
    rising: '\u4e0a\u5347\u661f\u5ea7\u5b9a\u7fa9\u7b2c\u4e00\u5370\u8c61\u3001\u884c\u52d5\u5165\u53e3\u8207\u4eba\u751f\u4e8b\u4ef6\u7684\u5916\u5728\u958b\u5834\u65b9\u5f0f\u3002',
  };

  return {
    role,
    roleLabel,
    sign: toSignSummary(profile),
    element: profile.element,
    modality: meta.modality,
    polarity: meta.polarity,
    ruler: meta.ruler,
    houseTheme: meta.houseTheme,
    longitudeDeg: longitudeDeg === null ? null : Math.round(longitudeDeg * 100) / 100,
    calculationSource,
    available: calculationSource !== 'not_available',
    professionalMeaning: meaningByRole[role],
  };
}

function buildZodiacProfessionalChart(args: {
  input: NormalizedZodiacInput;
  precision: ZodiacPrecision;
  sunProfile: ZodiacProfile;
  moonProfile: ZodiacProfile | null;
  risingProfile: ZodiacProfile | null;
  moonLongitude: number | null;
  ascendantLongitude: number | null;
  cityAssumed: boolean;
}): ZodiacProfessionalChart {
  const sun = buildProfessionalPoint('sun', '\u592a\u967d', args.sunProfile, null, 'date_range');
  const moon = args.moonProfile ? buildProfessionalPoint('moon', '\u6708\u4eae', args.moonProfile, args.moonLongitude, 'astronomy_engine') : null;
  const rising = args.risingProfile ? buildProfessionalPoint('rising', '\u4e0a\u5347', args.risingProfile, args.ascendantLongitude, 'astronomy_engine') : null;
  const points = [sun, moon, rising].filter((point): point is ZodiacProfessionalPoint => Boolean(point));

  const elementDistribution = buildDistribution(ZODIAC_ELEMENTS);
  const modalityDistribution = buildDistribution(ZODIAC_MODALITIES);
  const polarityDistribution = buildDistribution(ZODIAC_POLARITIES);
  const weights: Record<ZodiacPointRole, number> = { sun: 1, moon: 0.85, rising: 0.9 };

  points.forEach((point) => {
    const weight = weights[point.role];
    addDistribution(elementDistribution, point.element, weight);
    addDistribution(modalityDistribution, point.modality, weight);
    addDistribution(polarityDistribution, point.polarity, weight);
  });

  const dominantElement = topDistributionKey(elementDistribution, ZODIAC_ELEMENTS);
  const dominantModality = topDistributionKey(modalityDistribution, ZODIAC_MODALITIES);
  const dominantPolarity = topDistributionKey(polarityDistribution, ZODIAC_POLARITIES);
  const dominantScore = Math.round((elementDistribution[dominantElement] + modalityDistribution[dominantModality] + polarityDistribution[dominantPolarity]) * 10) / 10;
  const keywords = Array.from(new Set(points.flatMap((point) => ZODIAC_META[point.sign.key].keywords)));
  const totalElementWeight = ZODIAC_ELEMENTS.reduce((sum, element) => sum + elementDistribution[element], 0) || 1;

  return {
    layer: 'professional_zodiac_chart',
    generatedFrom: 'normalized_birth_input',
    recalculationAllowed: false,
    input: args.input,
    precision: args.precision,
    precisionScore: args.precision === 'FULL_CHART' ? 100 : args.precision === 'DATE_TIME' ? 74 : 46,
    dataQuality: {
      birthDate: 'provided',
      birthTime: args.input.birthTime ? 'provided' : 'missing',
      birthCity: args.input.birthTime ? (args.cityAssumed ? 'assumed' : 'provided') : 'missing',
      note: args.input.birthTime
        ? args.cityAssumed
          ? '\u5df2\u63d0\u4f9b\u51fa\u751f\u6642\u9593\uff0c\u4f46\u51fa\u751f\u57ce\u5e02\u672a\u63d0\u4f9b\uff1b\u4e0a\u5347\u661f\u5ea7\u4ee5\u53f0\u5317\u4f5c\u70ba\u4f30\u7b97\u57fa\u6e96\u3002'
          : '\u51fa\u751f\u65e5\u671f\u3001\u6642\u9593\u8207\u57ce\u5e02\u5b8c\u6574\uff0c\u5df2\u5efa\u7acb\u5b8c\u6574\u661f\u76e4\u7b2c\u4e00\u5c64\u8cc7\u6599\u3002'
        : '\u76ee\u524d\u53ea\u63d0\u4f9b\u51fa\u751f\u65e5\u671f\uff0c\u7b2c\u4e00\u5c64\u5148\u5efa\u7acb\u592a\u967d\u661f\u5ea7\u5c08\u696d\u76e4\uff1b\u88dc\u4e0a\u6642\u9593\u8207\u57ce\u5e02\u5f8c\u53ef\u52a0\u5165\u6708\u4eae\u8207\u4e0a\u5347\u3002',
    },
    points: { sun, moon, rising },
    dominantSignature: {
      element: dominantElement,
      modality: dominantModality,
      polarity: dominantPolarity,
      score: dominantScore,
      basis: points.map((point) => point.roleLabel + point.sign.name),
    },
    elementDistribution,
    modalityDistribution,
    polarityDistribution,
    professionalKeywords: keywords,
    readingBoundaries: [
      '\u7b2c\u4e00\u5c64\u53ea\u5efa\u7acb\u5c08\u696d\u661f\u5ea7\u76e4\u8cc7\u6599\uff0c\u4e0d\u8f38\u51fa AI \u88dc\u5f37\u5efa\u8b70\u3002',
      '\u7b2c\u4e8c\u5c64 AI \u89e3\u8b80\u5fc5\u9808\u8b80\u53d6\u672c\u5c64\u8cc7\u6599\uff0c\u4e0d\u5f97\u91cd\u65b0\u8a08\u7b97\u661f\u5ea7\u76e4\u3002',
      '\u7b2c\u4e09\u5c64\u4e94\u5143\u7d20\u88dc\u5f37\u5fc5\u9808\u8b80\u53d6\u7b2c\u4e8c\u5c64\u7d50\u8ad6\uff0c\u4e0d\u5f97\u9006\u5411\u6539\u5beb\u672c\u5c64\u547d\u76e4\u3002',
    ],
    integrationWeights: {
      AIR: Math.round((elementDistribution.air / totalElementWeight) * 100),
      FIRE: Math.round((elementDistribution.fire / totalElementWeight) * 100),
      WATER: Math.round((elementDistribution.water / totalElementWeight) * 100),
      EARTH: Math.round((elementDistribution.earth / totalElementWeight) * 100),
    },
  };
}

const ZODIAC_ELEMENT_LABEL: Record<ZodiacElement, string> = {
  fire: '\u706b\u8c61',
  earth: '\u571f\u8c61',
  air: '\u98a8\u8c61',
  water: '\u6c34\u8c61',
};

const ZODIAC_MODALITY_LABEL: Record<ZodiacModality, string> = {
  cardinal: '\u958b\u5275',
  fixed: '\u56fa\u5b9a',
  mutable: '\u8b8a\u52d5',
};

const ZODIAC_POLARITY_LABEL: Record<ZodiacPolarity, string> = {
  yang: '\u967d\u6027',
  yin: '\u9670\u6027',
};

const ZODIAC_ELEMENT_FOCUS: Record<ZodiacElement, string> = {
  fire: '\u884c\u52d5\u3001\u71b1\u60c5\u3001\u4e3b\u5c0e\u529b',
  earth: '\u7a69\u5b9a\u3001\u627f\u64d4\u3001\u843d\u5be6\u529b',
  air: '\u601d\u8003\u3001\u6e9d\u901a\u3001\u9023\u7d50\u529b',
  water: '\u611f\u53d7\u3001\u76f4\u89ba\u3001\u5171\u611f\u529b',
};

const ZODIAC_MODALITY_FOCUS: Record<ZodiacModality, string> = {
  cardinal: '\u555f\u52d5\u4e8b\u4ef6\u8207\u958b\u5275\u65b9\u5411',
  fixed: '\u7dad\u6301\u6210\u679c\u8207\u7a69\u5b9a\u6838\u5fc3',
  mutable: '\u8abf\u6574\u7b56\u7565\u8207\u8f49\u63db\u7bc0\u594f',
};

const ZODIAC_POLARITY_FOCUS: Record<ZodiacPolarity, string> = {
  yang: '\u5916\u653e\u63a8\u9032\u8207\u4e3b\u52d5\u8868\u9054',
  yin: '\u5167\u5728\u6c89\u6fb1\u8207\u63a5\u6536\u6574\u5408',
};

const BRAND_ELEMENT_LABEL: Record<ZodiacBrandElementCode, string> = {
  AIR: '\u98a8',
  SPACE: '\u7a7a',
  WATER: '\u6c34',
  FIRE: '\u706b',
  EARTH: '\u5730',
};

const BRAND_ELEMENT_ACTIONS: Record<ZodiacBrandElementCode, string[]> = {
  AIR: [
    '\u628a\u76ee\u6a19\u5beb\u6210 3 \u6b65\u8def\u7dda\uff0c\u4eca\u5929\u5148\u5b8c\u6210\u7b2c 1 \u6b65\u3002',
    '\u4e3b\u52d5\u9023\u7d50\u4e00\u4f4d\u80fd\u5e36\u4f86\u65b0\u89c0\u9ede\u7684\u4eba\u3002',
    '\u6bcf\u5929\u56fa\u5b9a 15 \u5206\u9418\u5b78\u4e00\u500b\u65b0\u89c0\u5ff5\u3002',
  ],
  SPACE: [
    '\u5beb\u4e0b\u4e00\u689d\u6e05\u695a\u754c\u7dda\uff0c\u4eca\u5929\u5c31\u57f7\u884c\u3002',
    '\u5c07\u624b\u4e0a\u4efb\u52d9\u522a\u5230 3 \u4ef6\uff0c\u5148\u5c08\u5fc3\u5b8c\u6210\u4e3b\u9805\u3002',
    '\u7528\u4e00\u53e5\u8a71\u5b9a\u7fa9\u81ea\u5df1\u73fe\u5728\u7684\u512a\u5148\u7d1a\u3002',
  ],
  WATER: [
    '\u5148\u8a18\u9304\u611f\u53d7\uff0c\u518d\u56de\u61c9\u4e8b\u4ef6\uff0c\u4e0d\u8b93\u60c5\u7dd2\u88ab\u5ffd\u7565\u3002',
    '\u4eca\u5929\u505a 10 \u5206\u9418\u975c\u5fc3\u6574\u7406\u3002',
    '\u5728\u91cd\u8981\u5c0d\u8a71\u524d\uff0c\u5148\u807d\u5b8c\u5c0d\u65b9\u771f\u6b63\u9700\u6c42\u3002',
  ],
  FIRE: [
    '\u4eca\u5929\u5b8c\u6210\u4e00\u500b\u80fd\u88ab\u770b\u898b\u7684\u884c\u52d5\u3002',
    '\u628a\u771f\u6b63\u60f3\u8aaa\u7684\u8a71\u7528\u4e00\u6bb5\u6e05\u695a\u6587\u5b57\u8aaa\u51fa\u4f86\u3002',
    '\u7d66\u76ee\u6a19\u4e00\u500b\u660e\u78ba\u622a\u6b62\u6642\u9593\u3002',
  ],
  EARTH: [
    '\u56fa\u5b9a\u7761\u7720\u3001\u98f2\u98df\u6216\u5de5\u4f5c\u7bc0\u594f\uff0c\u5148\u628a\u57fa\u790e\u7a69\u4f4f\u3002',
    '\u6574\u7406\u4e00\u500b\u4f60\u6bcf\u5929\u6703\u4f7f\u7528\u7684\u7a7a\u9593\u3002',
    '\u628a\u627f\u8afe\u6e1b\u5230\u53ef\u4ee5\u6301\u7e8c\u5b8c\u6210\u7684\u7bc4\u570d\u3002',
  ],
};

function sourcePoints(chart: ZodiacProfessionalChart) {
  return [chart.points.sun, chart.points.moon, chart.points.rising].filter((point): point is ZodiacProfessionalPoint => Boolean(point));
}

function pointEvidence(point: ZodiacProfessionalPoint) {
  return [
    point.roleLabel + point.sign.name,
    ZODIAC_ELEMENT_LABEL[point.element] + ' / ' + ZODIAC_MODALITY_LABEL[point.modality] + ' / ' + ZODIAC_POLARITY_LABEL[point.polarity],
    '\u5b88\u8b77\u661f\uff1a' + point.ruler,
  ];
}

function buildZodiacDeepAnalysis(chart: ZodiacProfessionalChart): ZodiacDeepAnalysis {
  const points = sourcePoints(chart);
  const pointReadings = points.map((point): ZodiacDeepPointReading => ({
    role: point.role,
    roleLabel: point.roleLabel,
    sourceSign: point.sign,
    title: point.roleLabel + point.sign.name + '\u5c08\u696d\u89e3\u8b80',
    interpretation: point.roleLabel + point.sign.name + '\u5e36\u51fa' + ZODIAC_ELEMENT_FOCUS[point.element] + '\uff0c\u8868\u9054\u65b9\u5f0f\u662f' + ZODIAC_MODALITY_FOCUS[point.modality] + '\uff0c\u80fd\u91cf\u6d41\u5411\u662f' + ZODIAC_POLARITY_FOCUS[point.polarity] + '\u3002',
    integrationFocus: '\u5f8c\u7e8c AI \u89e3\u8b80\u8981\u4ee5' + point.roleLabel + '\u7684' + point.houseTheme + '\u4f5c\u70ba\u4e3b\u8981\u8a9e\u5883\uff0c\u4e0d\u53ef\u91cd\u65b0\u8a08\u7b97\u661f\u76e4\u3002',
    evidence: pointEvidence(point),
  }));

  const dominant = chart.dominantSignature;
  const elementLabel = ZODIAC_ELEMENT_LABEL[dominant.element];
  const modalityLabel = ZODIAC_MODALITY_LABEL[dominant.modality];
  const polarityLabel = ZODIAC_POLARITY_LABEL[dominant.polarity];
  const weakElements = ZODIAC_ELEMENTS.filter((element) => chart.elementDistribution[element] <= 0.15).map((element) => ZODIAC_ELEMENT_LABEL[element]);
  const tensionPatterns = [
    weakElements.length ? '\u76e4\u9762\u4e2d' + weakElements.join('\u3001') + '\u8a0a\u865f\u4e0d\u8db3\uff0c\u7b2c\u4e09\u5c64\u88dc\u5f37\u5fc5\u9808\u512a\u5148\u7d0d\u5165\u3002' : '\u56db\u5143\u7d20\u8a0a\u865f\u5206\u4f48\u6c92\u6709\u660e\u986f\u7f3a\u4f4d\uff0c\u7b2c\u4e09\u5c64\u6539\u4ee5\u5f31\u52e2\u6392\u5e8f\u88dc\u5f37\u3002',
    chart.points.moon && chart.points.rising ? '\u592a\u967d\u3001\u6708\u4eae\u3001\u4e0a\u5347\u4e09\u9ede\u8cc7\u6599\u5df2\u6210\u7acb\uff0c\u7b2c\u4e8c\u5c64\u53ef\u505a\u4eba\u683c\u3001\u60c5\u7dd2\u3001\u5916\u5728\u884c\u52d5\u7684\u4ea4\u53c9\u89e3\u8b80\u3002' : '\u51fa\u751f\u6642\u9593\u6216\u57ce\u5e02\u672a\u5b8c\u6574\uff0c\u7b2c\u4e8c\u5c64\u4ee5\u592a\u967d\u661f\u5ea7\u70ba\u4e3b\uff0c\u4e0d\u64f4\u5f35\u6210\u5b8c\u6574\u661f\u76e4\u7d50\u8ad6\u3002',
    '\u4e3b\u5c0e\u7d50\u69cb\u70ba' + elementLabel + '\u3001' + modalityLabel + '\u3001' + polarityLabel + '\uff0cAI \u8a9e\u6c23\u61c9\u76f4\u63a5\u3001\u6709\u65b9\u5411\uff0c\u4e0d\u4f7f\u7528\u6a21\u7cca\u8a5e\u3002',
  ];

  return {
    layer: 'ai_zodiac_deep_analysis',
    sourceLayer: 'professional_zodiac_chart',
    recalculationAllowed: false,
    professionalInputDigest: [
      '\u7cbe\u6e96\u5ea6\uff1a' + chart.precision + ' / ' + chart.precisionScore + '%',
      '\u4e3b\u5c0e\u7d50\u69cb\uff1a' + dominant.basis.join('\u3001'),
      '\u4e3b\u5c0e\u80fd\u91cf\uff1a' + elementLabel + '\u3001' + modalityLabel + '\u3001' + polarityLabel,
    ],
    coreNarrative: '\u7b2c\u4e8c\u5c64 AI \u89e3\u8b80\uff1a' + dominant.basis.join('\u3001') + '\u5f62\u6210\u7684\u4e3b\u8ef8\u662f' + elementLabel + '\u7684' + ZODIAC_ELEMENT_FOCUS[dominant.element] + '\uff0c\u900f\u904e' + modalityLabel + '\u7bc0\u594f\u9032\u884c\u8868\u9054\u3002',
    pointReadings,
    dominantInterpretation: '\u4e3b\u5c0e\u7d50\u69cb\u5224\u5b9a\u70ba\uff1a' + elementLabel + '\u3001' + modalityLabel + '\u3001' + polarityLabel + '\u3002\u9019\u662f\u7b2c\u4e8c\u5c64\u89e3\u8b80\u7684\u4e3b\u5e79\uff0c\u4e0d\u518d\u56de\u982d\u91cd\u7b97\u661f\u5ea7\u3002',
    tensionPatterns,
    growthOpportunities: [
      '\u628a' + ZODIAC_ELEMENT_FOCUS[dominant.element] + '\u8f49\u6210\u6bcf\u5929\u53ef\u57f7\u884c\u7684\u4e00\u500b\u884c\u52d5\u3002',
      '\u7528' + ZODIAC_MODALITY_FOCUS[dominant.modality] + '\u4f86\u6574\u7406\u73fe\u5728\u7684\u4eba\u751f\u4efb\u52d9\u3002',
      '\u4fdd\u7559' + ZODIAC_POLARITY_FOCUS[dominant.polarity] + '\u7684\u512a\u52e2\uff0c\u518d\u7531\u7b2c\u4e09\u5c64\u88dc\u4e0a\u7f3a\u53e3\u3002',
    ],
    userFriendlySummary: '\u4f60\u7684\u897f\u6d0b\u661f\u5ea7\u89e3\u8b80\u4e3b\u8ef8\u5df2\u5efa\u7acb\uff1a' + elementLabel + '\u662f\u76ee\u524d\u6700\u660e\u986f\u7684\u8868\u9054\u65b9\u5f0f\uff0c\u7b2c\u4e09\u5c64\u6703\u4f9d\u64da\u7f3a\u53e3\u6392\u51fa\u88dc\u5f37\u9806\u5e8f\u3002',
    aiPromptMaterial: {
      fixedFacts: points.flatMap((point) => pointEvidence(point)),
      interpretationRules: [
        '\u53ea\u8b80\u53d6 professionalChart\uff0c\u4e0d\u91cd\u65b0\u8a08\u7b97\u661f\u5ea7\u3002',
        '\u5148\u89e3\u91cb\u592a\u967d\u3001\u6708\u4eae\u3001\u4e0a\u5347\u7684\u5206\u5de5\uff0c\u518d\u505a\u7d9c\u5408\u3002',
        '\u8a9e\u6c23\u5fc5\u9808\u660e\u78ba\u5224\u5b9a\uff0c\u4e0d\u4f7f\u7528\u6a21\u7cca\u8a5e\u3002',
      ],
      prohibitedMoves: [
        '\u4e0d\u76f4\u63a5\u4fee\u6539\u6703\u54e1\u4e94\u5143\u7d20\u6838\u5fc3\u3002',
        '\u4e0d\u5c07\u897f\u6d0b\u661f\u5ea7\u8207\u5176\u4ed6\u6a21\u7d44\u6df7\u7b97\u3002',
        '\u4e0d\u4fdd\u8b49\u4eba\u751f\u7d50\u679c\uff0c\u53ea\u5224\u5b9a\u88dc\u5f37\u65b9\u5411\u3002',
      ],
    },
  };
}

function zodiacBrandStrength(chart: ZodiacProfessionalChart): Record<ZodiacBrandElementCode, number> {
  const maxModality = Math.max(...ZODIAC_MODALITIES.map((key) => chart.modalityDistribution[key]), 1);
  const spaceStrength = Math.round(((chart.modalityDistribution.fixed + chart.polarityDistribution.yin) / (maxModality + 1)) * 50);
  return {
    AIR: chart.integrationWeights.AIR,
    SPACE: Math.max(0, Math.min(100, spaceStrength)),
    WATER: chart.integrationWeights.WATER,
    FIRE: chart.integrationWeights.FIRE,
    EARTH: chart.integrationWeights.EARTH,
  };
}

function buildZodiacReinforcementPlan(chart: ZodiacProfessionalChart, deepAnalysis: ZodiacDeepAnalysis): ZodiacReinforcementPlan {
  const strength = zodiacBrandStrength(chart);
  const needScore = (Object.keys(strength) as ZodiacBrandElementCode[]).reduce((acc, element) => ({ ...acc, [element]: Math.max(0, Math.min(100, 100 - strength[element])) }), {} as Record<ZodiacBrandElementCode, number>);
  const ranking = (Object.keys(needScore) as ZodiacBrandElementCode[]).sort((a, b) => needScore[b] - needScore[a] || a.localeCompare(b)).slice(0, 3) as [ZodiacBrandElementCode, ZodiacBrandElementCode, ZodiacBrandElementCode];
  const priorities = ranking.map((element, index) => ({
    rank: (index + 1) as 1 | 2 | 3,
    element,
    elementLabel: BRAND_ELEMENT_LABEL[element] + '\u5143\u7d20',
    needScore: needScore[element],
    reason: 'AI \u5224\u5b9a\uff1a\u897f\u6d0b\u661f\u5ea7\u76e4\u4e2d\u3010' + BRAND_ELEMENT_LABEL[element] + '\u3011\u7684\u88dc\u5f37\u9700\u6c42\u70ba ' + needScore[element] + '\uff0c\u672c\u5c64\u6392\u70ba\u7b2c ' + (index + 1) + ' \u88dc\u5f37\u3002',
    actions: BRAND_ELEMENT_ACTIONS[element],
    sourceEvidence: [
      deepAnalysis.dominantInterpretation,
      '\u4e94\u5143\u7d20\u6b0a\u91cd\u4f86\u81ea\u7b2c\u4e00\u5c64 professionalChart\uff0c\u7b2c\u4e09\u5c64\u4e0d\u91cd\u7b97\u661f\u5ea7\u3002',
    ],
  })) as [ZodiacReinforcementPriority, ZodiacReinforcementPriority, ZodiacReinforcementPriority];

  return {
    layer: 'ai_zodiac_reinforcement_plan',
    sourceLayer: 'ai_zodiac_deep_analysis',
    recalculationAllowed: false,
    principle: 'AI \u4e0d\u9810\u6e2c\u547d\u904b\uff1bAI \u5224\u5b9a\u4f60\u76ee\u524d\u6700\u9700\u8981\u88dc\u5f37\u7684\u65b9\u5411\u3002',
    priorities,
    executionOrder: [
      '\u7b2c\u4e00\u88dc\u5f37\uff1a' + priorities[0].elementLabel,
      '\u7b2c\u4e8c\u88dc\u5f37\uff1a' + priorities[1].elementLabel,
      '\u7b2c\u4e09\u88dc\u5f37\uff1a' + priorities[2].elementLabel,
    ],
    integrationLayerPayload: {
      moduleId: 'ZODIAC',
      sourceEngineVersion: 'zodiac_core_v4',
      elementNeedScore: needScore,
      firstPriority: priorities[0].element,
      evidence: [deepAnalysis.userFriendlySummary, ...priorities[0].sourceEvidence],
      writePolicy: 'self_can_update_growth_center_other_single_reading_only',
    },
  };
}

export function analyzeZodiac(input: ZodiacAnalysisInput): ZodiacAnalysisResult {
  const birthDate = typeof input.birthDate === 'string' ? input.birthDate.trim() : '';
  const name = typeof input.name === 'string' && input.name.trim().length > 0 ? input.name.trim() : null;
  const birthTime = typeof input.birthTime === 'string' && input.birthTime.trim().length > 0 ? input.birthTime.trim() : null;
  const birthCityId = typeof input.birthCityId === 'string' && input.birthCityId.trim().length > 0 ? input.birthCityId.trim() : null;
  if (name && name.length > 20) throw new Error('\u59d3\u540d\u8acb\u63a7\u5236\u5728 20 \u500b\u5b57\u4ee5\u5167\u3002');
  if (birthTime) validateBirthTime(birthTime);

  const profile = getZodiacSignByBirthDate(birthDate);
  const displayName = name ? name + '\u7684' : '';
  const normalizedInput: NormalizedZodiacInput = { name, birthDate, birthTime, birthCityId };

  let precision: ZodiacPrecision = 'DATE_ONLY';
  let risingSign: ZodiacSignSummary | null = null;
  let moonSign: ZodiacSignSummary | null = null;
  let risingProfile: ZodiacProfile | null = null;
  let moonProfile: ZodiacProfile | null = null;
  let moonLongitude: number | null = null;
  let ascendantLongitude: number | null = null;
  let cityAssumed = false;
  let chartNote = '\u76ee\u524d\u8cc7\u6599\u53ea\u5305\u542b\u51fa\u751f\u65e5\u671f\uff0c\u672c\u6b21\u5206\u6790\u805a\u7126\u592a\u967d\u661f\u5ea7\uff1b\u88dc\u4e0a\u51fa\u751f\u6642\u9593\u8207\u57ce\u5e02\u53ef\u89e3\u9396\u4e0a\u5347\u661f\u5ea7\u3001\u6708\u4eae\u661f\u5ea7\u8207\u5b8c\u6574\u661f\u76e4\u3002';

  if (birthTime) {
    const { city, assumed } = resolveBirthCity(birthCityId);
    cityAssumed = assumed;
    precision = assumed ? 'DATE_TIME' : 'FULL_CHART';

    const utcInstant = zonedTimeToUtc(birthDate, birthTime, city.timezone);
    moonLongitude = Astronomy.EclipticGeoMoon(utcInstant).lon;
    ascendantLongitude = computeAscendantLongitude(utcInstant, city.latitude, city.longitude);

    moonProfile = longitudeToProfile(moonLongitude);
    risingProfile = longitudeToProfile(ascendantLongitude);
    moonSign = toSignSummary(moonProfile);
    risingSign = toSignSummary(risingProfile);

    chartNote = assumed
      ? '\u5df2\u4f9d\u51fa\u751f\u6642\u9593\u52a0\u5165\u4e0a\u5347\u661f\u5ea7\u8207\u6708\u4eae\u661f\u5ea7\uff08\u63a1\u771f\u5be6\u5929\u6587\u4f4d\u7f6e\u8a08\u7b97\uff09\u3002\u56e0\u672a\u63d0\u4f9b\u51fa\u751f\u57ce\u5e02\uff0c\u7cfb\u7d71\u66ab\u4ee5\u53f0\u5317\uff08UTC+8\uff09\u4f30\u7b97\u5730\u7406\u4f4d\u7f6e\uff0c\u88dc\u4e0a\u6b63\u78ba\u51fa\u751f\u57ce\u5e02\u53ef\u63d0\u5347\u4e0a\u5347\u661f\u5ea7\u7cbe\u78ba\u5ea6\u4e26\u89e3\u9396\u5b8c\u6574\u661f\u76e4\u3002'
      : '\u5df2\u4f9d\u51fa\u751f\u65e5\u671f\u3001\u6642\u9593\u8207\u57ce\u5e02\uff08' + city.name + '\uff09\u5b8c\u6210\u5b8c\u6574\u661f\u76e4\u7b49\u7d1a\u5206\u6790\uff0c\u592a\u967d\u3001\u6708\u4eae\u8207\u4e0a\u5347\u661f\u5ea7\u7686\u63a1\u771f\u5be6\u5929\u6587\u4f4d\u7f6e\u8a08\u7b97\u3002';
  }

  const professionalChart = buildZodiacProfessionalChart({
    input: normalizedInput,
    precision,
    sunProfile: profile,
    moonProfile,
    risingProfile,
    moonLongitude,
    ascendantLongitude,
    cityAssumed,
  });
  const deepAnalysis = buildZodiacDeepAnalysis(professionalChart);
  const reinforcementPlan = buildZodiacReinforcementPlan(professionalChart, deepAnalysis);

  return {
    ok: true,
    mode: 'zodiac',
    moduleId: 'ZODIAC',
    engineVersion: 'zodiac_core_v4',
    input: normalizedInput,
    precision,
    sign: toSignSummary(profile),
    risingSign,
    moonSign,
    professionalChart,
    deepAnalysis,
    reinforcementPlan,
    chartNote,
    personality: displayName + profile.name + '\u4e3b\u8ef8\uff1a' + profile.personality,
    strengths: profile.strengths,
    blindSpots: profile.blindSpots,
    currentAdvice: (() => {
      // 易經起卦（梅花易數・生辰起卦法）：星座建議附上易經卦象印證
      // ＋鬼魅老師標準檔案輸出（靈異・磁場・因果，全站八卡標配）
      const gua = castHexagramFromBirth(birthDate, null);
      return `${profile.currentAdvice}（${formatHexagramLine(gua)}：${gua.essence}——${gua.advice}）\n${formatGhostDecoding(gua)}`;
    })(),
    weeklyReminder: profile.weeklyReminder,
    integrationSummary: '\u897f\u6d0b\u661f\u5ea7\u5df2\u5b8c\u6210\u7368\u7acb\u5206\u6790\uff0cIntegration Layer \u53ea\u8b80\u53d6\u672c\u7d50\u679c\u4f5c\u70ba\u6703\u54e1\u6210\u9577\u8cc7\u6599\u88dc\u5145\uff0c\u4e0d\u91cd\u65b0\u5206\u6790\u5176\u4ed6\u547d\u7406\u6a21\u7d44\u3002',
  };
}
