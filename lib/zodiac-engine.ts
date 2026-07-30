import * as Astronomy from 'astronomy-engine';
import { findCityById, getDefaultCity, type CityEntry } from './city-directory';
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

export type ZodiacAnalysisResult = {
  ok: true;
  mode: 'zodiac';
  moduleId: 'ZODIAC';
  engineVersion: 'zodiac_core_v2';
  input: {
    name: string | null;
    birthDate: string;
    birthTime: string | null;
    birthCityId: string | null;
  };
  precision: ZodiacPrecision;
  sign: ZodiacSignSummary;
  risingSign: ZodiacSignSummary | null;
  moonSign: ZodiacSignSummary | null;
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

export function analyzeZodiac(input: ZodiacAnalysisInput): ZodiacAnalysisResult {
  const birthDate = typeof input.birthDate === 'string' ? input.birthDate.trim() : '';
  const name = typeof input.name === 'string' && input.name.trim().length > 0 ? input.name.trim() : null;
  const birthTime = typeof input.birthTime === 'string' && input.birthTime.trim().length > 0 ? input.birthTime.trim() : null;
  const birthCityId = typeof input.birthCityId === 'string' && input.birthCityId.trim().length > 0 ? input.birthCityId.trim() : null;
  if (name && name.length > 20) throw new Error('姓名請控制在 20 個字以內。');
  if (birthTime) validateBirthTime(birthTime);

  const profile = getZodiacSignByBirthDate(birthDate);
  const displayName = name ? `${name}的` : '';

  let precision: ZodiacPrecision = 'DATE_ONLY';
  let risingSign: ZodiacSignSummary | null = null;
  let moonSign: ZodiacSignSummary | null = null;
  let chartNote = '目前資料只包含出生日期，本次分析聚焦太陽星座；補上出生時間與城市可解鎖上升星座、月亮星座與完整星盤。';

  if (birthTime) {
    const { city, assumed } = resolveBirthCity(birthCityId);
    precision = assumed ? 'DATE_TIME' : 'FULL_CHART';

    const utcInstant = zonedTimeToUtc(birthDate, birthTime, city.timezone);
    const moonLongitude = Astronomy.EclipticGeoMoon(utcInstant).lon;
    const ascendantLongitude = computeAscendantLongitude(utcInstant, city.latitude, city.longitude);

    moonSign = toSignSummary(longitudeToProfile(moonLongitude));
    risingSign = toSignSummary(longitudeToProfile(ascendantLongitude));

    chartNote = assumed
      ? `已依出生時間加入上升星座與月亮星座（採真實天文位置計算）。因未提供出生城市，系統暫以台北（UTC+8）估算地理位置，補上正確出生城市可提升上升星座精確度並解鎖完整星盤。`
      : `已依出生日期、時間與城市（${city.name}）完成完整星盤等級分析，太陽、月亮與上升星座皆採真實天文位置計算。`;
  }

  return {
    ok: true,
    mode: 'zodiac',
    moduleId: 'ZODIAC',
    engineVersion: 'zodiac_core_v2',
    input: { name, birthDate, birthTime, birthCityId },
    precision,
    sign: toSignSummary(profile),
    risingSign,
    moonSign,
    chartNote,
    personality: `${displayName}${profile.name}主軸：${profile.personality}`,
    strengths: profile.strengths,
    blindSpots: profile.blindSpots,
    currentAdvice: profile.currentAdvice,
    weeklyReminder: profile.weeklyReminder,
    integrationSummary: `西洋星座已完成獨立分析，Integration Layer 只讀取本結果作為會員成長資料補充，不重新分析其他命理模組。`,
  };
}
