export const NUMBER_CORE_ENGINE_VERSION = 'V5.0.0';

export type NumberAnalysisMode = 'digit2' | 'digit3' | 'last4' | 'digit5' | 'six6' | 'digit7' | 'digit8' | 'digit9' | 'phone10';

export type NumberFortuneLevel =
  | '大吉'
  | '吉'
  | '次吉'
  | '吉中帶凶'
  | '中平'
  | '凶中帶吉'
  | '平下'
  | '凶'
  | '大凶'
  | '最凶';

export type NumberMatrixKey =
  | 'wealth'
  | 'career'
  | 'love'
  | 'family'
  | 'social'
  | 'health'
  | 'growth'
  | 'risk'
  | 'pressure'
  | 'stability';

export type NumberAnalysisMatrix = Record<NumberMatrixKey, number>;

export interface NumberAnalysisIndexes {
  structure: number;
  balance: number;
  pattern: number;
  stability: number;
  trend: number;
}

export interface NumberPatternEvidence {
  pattern: string;
  affectedDimension: NumberMatrixKey;
  weight: number;
  sourceType: 'traditional_rule' | 'internal_statistical_model' | 'verified_feedback';
  note: string;
}

export interface NumberAnalysisEvidence {
  digitFrequency: Record<string, number>;
  repeatPatterns: Array<{ digit: string; count: number; positions: number[] }>;
  sequencePatterns: Array<{ value: string; direction: 'ascending' | 'descending'; start: number; length: number }>;
  mirrorPatterns: string[];
  mirrorPattern: boolean;
  adjacentPairs: string[];
  pairPatterns: NumberPatternEvidence[];
  triplePatterns: string[];
  rootNumber: number;
  digitSum: number;
  oddRatio: number;
  evenRatio: number;
  highDigitRatio: number;
  lowDigitRatio: number;
  headDigit: string;
  tailDigit: string;
  lastFour: string;
  maxRepeatLength: number;
  concentration: number;
  structureBalance: number;
  arrangementDirection: 'ascending' | 'descending' | 'mixed' | 'flat';
  combinationDirection: 'forward' | 'repeating' | 'mirrored' | 'mixed';
  segmentRatios?: {
    front: number;
    middle: number;
    back: number;
  };
  tenDigitSegments?: {
    front: string;
    middle: string;
    back: string;
  };
}

export interface NumberAnalysisResponse {
  ok: true;
  analysisId?: string;
  engine: 'Number Core Engine';
  engineVersion: typeof NUMBER_CORE_ENGINE_VERSION;
  mode: NumberAnalysisMode;
  value: string;
  valueMasked: string;
  score: number;
  finalScore: number;
  level: NumberFortuneLevel;
  fortuneLevel: NumberFortuneLevel;
  confidenceScore: number;
  indexes: NumberAnalysisIndexes;
  matrix: NumberAnalysisMatrix;
  evidence: NumberAnalysisEvidence;
  summary: string;
  strengths: string[];
  cautions: string[];
  suitableDirections: string[];
  advice: string;
  interpretation: {
    summary: string;
    strengths: string[];
    warnings: string[];
    directions: string[];
    advice: string;
  };
  ruleVersion: typeof NUMBER_CORE_ENGINE_VERSION;
}

export interface NumberAnalysisError {
  ok: false;
  message: string;
  ruleVersion: typeof NUMBER_CORE_ENGINE_VERSION;
}

const MATRIX_KEYS: NumberMatrixKey[] = [
  'wealth',
  'career',
  'love',
  'family',
  'social',
  'health',
  'growth',
  'risk',
  'pressure',
  'stability',
];

const LAST4_WEIGHTS = {
  singleDigit: 15,
  pair: 20,
  triple: 15,
  whole: 20,
  repeat: 10,
  arrangement: 10,
  sumRoot: 10,
} as const;

const PHONE10_WEIGHTS = {
  fullDigit: 15,
  front: 10,
  middle: 15,
  back: 25,
  combination: 15,
  repeatArrangement: 10,
  sumRoot: 10,
} as const;

const DIGIT8_WEIGHTS = {
  fullDigit: 15,
  front: 12,
  middle: 18,
  back: 25,
  combination: 15,
  repeatArrangement: 8,
  sumRoot: 7,
} as const;

const EMPTY_MATRIX: NumberAnalysisMatrix = {
  wealth: 0,
  career: 0,
  love: 0,
  family: 0,
  social: 0,
  health: 0,
  growth: 0,
  risk: 0,
  pressure: 0,
  stability: 0,
};

const NEUTRAL_MATRIX: NumberAnalysisMatrix = {
  wealth: 50,
  career: 50,
  love: 50,
  family: 50,
  social: 50,
  health: 50,
  growth: 50,
  risk: 50,
  pressure: 50,
  stability: 50,
};

const DIGIT_MATRIX: Record<string, NumberAnalysisMatrix> = {
  '0': { wealth: 44, career: 45, love: 46, family: 48, social: 45, health: 52, growth: 54, risk: 56, pressure: 56, stability: 58 },
  '1': { wealth: 58, career: 66, love: 48, family: 48, social: 50, health: 54, growth: 64, risk: 45, pressure: 48, stability: 52 },
  '2': { wealth: 52, career: 50, love: 68, family: 66, social: 68, health: 58, growth: 56, risk: 42, pressure: 46, stability: 60 },
  '3': { wealth: 60, career: 62, love: 58, family: 56, social: 64, health: 56, growth: 72, risk: 45, pressure: 47, stability: 50 },
  '4': { wealth: 42, career: 46, love: 45, family: 48, social: 45, health: 50, growth: 48, risk: 66, pressure: 68, stability: 62 },
  '5': { wealth: 56, career: 56, love: 55, family: 56, social: 60, health: 58, growth: 60, risk: 50, pressure: 52, stability: 54 },
  '6': { wealth: 74, career: 62, love: 68, family: 72, social: 62, health: 64, growth: 60, risk: 38, pressure: 40, stability: 72 },
  '7': { wealth: 54, career: 70, love: 48, family: 46, social: 50, health: 52, growth: 66, risk: 54, pressure: 58, stability: 48 },
  '8': { wealth: 78, career: 74, love: 54, family: 58, social: 58, health: 58, growth: 68, risk: 44, pressure: 48, stability: 66 },
  '9': { wealth: 62, career: 60, love: 56, family: 56, social: 64, health: 60, growth: 78, risk: 52, pressure: 55, stability: 48 },
};

const PAIR_RULES: Record<string, Partial<NumberAnalysisMatrix> & { sourceType: NumberPatternEvidence['sourceType']; note: string }> = {
  '16': { wealth: 78, career: 70, family: 68, stability: 72, risk: 36, sourceType: 'traditional_rule', note: '一六組合偏向資源、貴人與穩定承載。' },
  '24': { wealth: 68, love: 68, family: 72, stability: 68, pressure: 42, sourceType: 'traditional_rule', note: '二四組合偏保守累積，家庭與穩定訊號較明顯。' },
  '32': { career: 70, social: 68, growth: 72, risk: 40, sourceType: 'traditional_rule', note: '三二互補，利溝通、成長與人際協作。' },
  '39': { wealth: 76, career: 72, growth: 76, sourceType: 'traditional_rule', note: '三九偏向擴張與成果顯化。' },
  '52': { career: 64, family: 62, stability: 62, growth: 68, pressure: 44, sourceType: 'traditional_rule', note: '五二適合長線累積，先調整後穩定。' },
  '57': { career: 66, growth: 68, pressure: 54, sourceType: 'traditional_rule', note: '五七帶轉機與推進力，需管理節奏。' },
  '63': { wealth: 74, love: 68, family: 72, social: 66, stability: 70, sourceType: 'traditional_rule', note: '六三偏向人和、家庭與穩定資源。' },
  '68': { wealth: 82, career: 76, family: 70, stability: 74, risk: 34, sourceType: 'traditional_rule', note: '六八偏向財務與穩定兼具。' },
  '86': { wealth: 80, career: 74, stability: 72, risk: 36, sourceType: 'traditional_rule', note: '八六回流，偏向資源整合與守成。' },
  '88': { wealth: 84, career: 78, growth: 72, pressure: 58, sourceType: 'traditional_rule', note: '八八能量集中，利財務動能但壓力同步提高。' },
  '14': { wealth: 40, career: 44, health: 48, pressure: 68, risk: 66, sourceType: 'traditional_rule', note: '一四組合易出現推進受阻，需降低急躁。' },
  '34': { career: 42, stability: 40, pressure: 72, risk: 70, sourceType: 'traditional_rule', note: '三四交界偏波動，需避免高估進度。' },
  '44': { stability: 46, health: 46, pressure: 76, risk: 74, growth: 44, sourceType: 'traditional_rule', note: '四四重疊會放大壓力與風險訊號。' },
  '54': { wealth: 42, career: 44, pressure: 70, risk: 68, sourceType: 'traditional_rule', note: '五四變動遇阻，需重視風險控管。' },
  '74': { career: 46, pressure: 72, risk: 70, sourceType: 'traditional_rule', note: '七四行動帶壓力，忌衝動決策。' },
  '94': { growth: 54, pressure: 70, risk: 68, stability: 42, sourceType: 'traditional_rule', note: '九四變動性較強，適合先做備案。' },
};

const DIRECTION_LABELS: Record<NumberMatrixKey, string> = {
  wealth: '財務資源',
  career: '事業推進',
  love: '情感互動',
  family: '家庭承載',
  social: '人際合作',
  health: '身心節奏',
  growth: '學習成長',
  risk: '風險控管',
  pressure: '壓力管理',
  stability: '穩定累積',
};

const FORTUNE_LEVEL_RULES: Array<{
  min: number;
  max: number;
  level: NumberFortuneLevel;
  headline: string;
  principle: string;
  adviceTone: string;
  encouragement: string;
}> = [
  {
    min: 90,
    max: 100,
    level: '大吉',
    headline: '大展鴻圖，順勢成局。',
    principle: '正向支撐非常集中，適合把握資源、擴大布局，但仍要守住節奏。',
    adviceTone: '宜主動推進，將好條件落成長期成果。',
    encouragement: '這組數字給你的提醒是：條件已經到位，接下來要靠紀律把機會真正接住。',
  },
  {
    min: 80,
    max: 89,
    level: '吉',
    headline: '名利有望，穩中有進。',
    principle: '整體結構偏順，資源與行動配合度高，適合穩定累積。',
    adviceTone: '宜持續耕耘，避免因過度樂觀而分散焦點。',
    encouragement: '你不需要急著證明自己，只要照著正確方向持續推進，好運會慢慢變成成果。',
  },
  {
    min: 70,
    max: 79,
    level: '次吉',
    headline: '根基穩固，偶有波折。',
    principle: '主體分數具支撐力，但仍有小型阻力，需要用紀律補強。',
    adviceTone: '宜先穩根基，再逐步放大成果。',
    encouragement: '次吉不是差，而是提醒你已經有底氣；只要不要貪快，這組數字適合靠穩定行動慢慢轉強。',
  },
  {
    min: 60,
    max: 69,
    level: '吉中帶凶',
    headline: '表面順勢，內有壓力。',
    principle: '正向條件存在，但風險或壓力訊號同步抬頭，容易先順後緊。',
    adviceTone: '宜先做風險控管，再談擴張與速度。',
    encouragement: '這不是叫你退縮，而是提醒你先把風險看清楚；能穩住的人，後面反而更容易走長遠。',
  },
  {
    min: 50,
    max: 59,
    level: '中平',
    headline: '吉凶參半，成敗看取捨。',
    principle: '結構不偏不倚，結果更依賴使用者的選擇、紀律與執行。',
    adviceTone: '宜用穩定行動累積，不急著下重注。',
    encouragement: '中平代表主導權回到你手上；選擇越清楚、行動越穩，分數背後的能量就越容易被帶起來。',
  },
  {
    min: 40,
    max: 49,
    level: '凶中帶吉',
    headline: '壓力較明，仍有轉機。',
    principle: '阻力訊號高於支撐訊號，但仍保有可調整的方向。',
    adviceTone: '宜先止損、修正節奏，再尋找可用資源。',
    encouragement: '凶中帶吉的重點是轉念與修正；只要願意調整做法，低點也能變成重新開始的入口。',
  },
  {
    min: 30,
    max: 39,
    level: '平下',
    headline: '前進受阻，宜守不宜躁。',
    principle: '穩定與支撐不足，容易因急進而放大阻礙。',
    adviceTone: '宜保守配置，先把基礎補穩。',
    encouragement: '現在最重要的不是衝刺，而是把基本盤顧好；穩住一步，就等於替下一次轉強鋪路。',
  },
  {
    min: 20,
    max: 29,
    level: '凶',
    headline: '波折較多，需避開硬衝。',
    principle: '風險、壓力或失衡訊號偏高，短期不宜冒進。',
    adviceTone: '宜降低槓桿、減少衝動決策，以穩守為先。',
    encouragement: '分數偏低不代表沒有機會，而是提醒你先避開錯誤方向；能停下來修正，就是轉運的開始。',
  },
  {
    min: 10,
    max: 19,
    level: '大凶',
    headline: '阻力沉重，先求穩住。',
    principle: '整體結構偏弱，容易遇到資源消耗或反覆受阻。',
    adviceTone: '宜先整頓、保守、止損，不宜急著擴張。',
    encouragement: '這組數字提醒你先保護自己；把消耗停下來，把心定下來，路才會重新清楚。',
  },
  {
    min: 0,
    max: 9,
    level: '最凶',
    headline: '萬事宜守，重在調整。',
    principle: '此分段代表警示訊號最強，重點不是恐懼，而是立刻降低風險。',
    adviceTone: '宜暫停重大決策，重新校準方向與資源配置。',
    encouragement: '最凶不是終點，而是一個強烈提醒：先止損、先修心、先重整，越早調整越有機會翻盤。',
  },
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function roundMatrix(matrix: NumberAnalysisMatrix): NumberAnalysisMatrix {
  return Object.fromEntries(MATRIX_KEYS.map((key) => [key, Math.round(clamp(matrix[key]))])) as NumberAnalysisMatrix;
}

function addMatrix(target: NumberAnalysisMatrix, matrix: NumberAnalysisMatrix, weight: number) {
  for (const key of MATRIX_KEYS) target[key] += matrix[key] * weight;
}

function averageMatrices(matrices: NumberAnalysisMatrix[]) {
  if (matrices.length === 0) return { ...NEUTRAL_MATRIX };
  const total = { ...EMPTY_MATRIX };
  for (const matrix of matrices) addMatrix(total, matrix, 1 / matrices.length);
  return roundMatrix(total);
}

function mergeMatrix(base: NumberAnalysisMatrix, patch: Partial<NumberAnalysisMatrix>) {
  return roundMatrix({ ...base, ...patch });
}

function digitRoot(sum: number) {
  if (sum === 0) return 0;
  return ((sum - 1) % 9) + 1;
}

function getCombinations(value: string, size: number) {
  const items: string[] = [];
  for (let i = 0; i <= value.length - size; i += 1) items.push(value.slice(i, i + size));
  return items;
}

function getDigitStats(value: string) {
  const digits = value.split('').map(Number);
  const digitFrequency: Record<string, number> = Object.fromEntries(Array.from({ length: 10 }, (_, digit) => [String(digit), 0]));
  value.split('').forEach((digit) => {
    digitFrequency[digit] += 1;
  });

  const repeatPatterns = Object.entries(digitFrequency)
    .filter(([, count]) => count >= 2)
    .map(([digit, count]) => ({
      digit,
      count,
      positions: value.split('').flatMap((item, index) => (item === digit ? [index] : [])),
    }));
  const maxRepeatLength = Math.max(0, ...repeatPatterns.map((item) => item.count));
  const concentration = Number((Math.max(...Object.values(digitFrequency)) / value.length).toFixed(2));

  const sequencePatterns: NumberAnalysisEvidence['sequencePatterns'] = [];
  for (let i = 0; i <= digits.length - 3; i += 1) {
    const chunk = digits.slice(i, i + 3);
    const firstDiff = chunk[1] - chunk[0];
    const secondDiff = chunk[2] - chunk[1];
    if (Math.abs(firstDiff) === 1 && firstDiff === secondDiff) {
      sequencePatterns.push({
        value: value.slice(i, i + 3),
        direction: firstDiff > 0 ? 'ascending' : 'descending',
        start: i,
        length: 3,
      });
    }
  }

  const mirrorPatterns: string[] = [];
  for (const size of [4, 3]) {
    for (const chunk of getCombinations(value, size)) {
      if (chunk === chunk.split('').reverse().join('')) mirrorPatterns.push(chunk);
    }
  }

  const digitSum = digits.reduce((sum, digit) => sum + digit, 0);
  const oddCount = digits.filter((digit) => digit % 2 === 1).length;
  const highCount = digits.filter((digit) => digit >= 5).length;
  const trend = digits.slice(1).map((digit, index) => digit - digits[index]);
  const positiveTrend = trend.filter((item) => item > 0).length;
  const negativeTrend = trend.filter((item) => item < 0).length;
  const flatTrend = trend.filter((item) => item === 0).length;

  return {
    digits,
    digitFrequency,
    repeatPatterns,
    sequencePatterns,
    mirrorPatterns: Array.from(new Set(mirrorPatterns)),
    digitSum,
    rootNumber: digitRoot(digitSum),
    oddRatio: Number((oddCount / digits.length).toFixed(2)),
    evenRatio: Number(((digits.length - oddCount) / digits.length).toFixed(2)),
    highDigitRatio: Number((highCount / digits.length).toFixed(2)),
    lowDigitRatio: Number(((digits.length - highCount) / digits.length).toFixed(2)),
    maxRepeatLength,
    concentration,
    structureBalance: Number((((1 - Math.abs((oddCount / digits.length) - 0.5) * 2) + (1 - Math.abs((highCount / digits.length) - 0.5) * 2)) / 2).toFixed(2)),
    arrangementDirection:
      flatTrend === trend.length ? 'flat' :
      positiveTrend > negativeTrend ? 'ascending' :
      negativeTrend > positiveTrend ? 'descending' :
      'mixed' as NumberAnalysisEvidence['arrangementDirection'],
  };
}

function singleDigitMatrix(value: string) {
  return averageMatrices(value.split('').map((digit) => DIGIT_MATRIX[digit] ?? NEUTRAL_MATRIX));
}

function strongestPatch(patch: Partial<NumberAnalysisMatrix>) {
  const candidates = MATRIX_KEYS
    .filter((key) => typeof patch[key] === 'number')
    .map((key) => [key, Math.abs((patch[key] ?? 50) - 50)] as const)
    .sort((a, b) => b[1] - a[1]);
  return (candidates[0] ?? ['growth', 0]) as readonly [NumberMatrixKey, number];
}

function pairMatrix(value: string, evidence: NumberPatternEvidence[]) {
  const pairs = getCombinations(value, 2);
  const matrices = pairs.map((pair) => {
    const base = averageMatrices(pair.split('').map((digit) => DIGIT_MATRIX[digit]));
    const rule = PAIR_RULES[pair];
    if (!rule) return base;

    const [affectedDimension, weight] = strongestPatch(rule);
    evidence.push({
      pattern: pair,
      affectedDimension,
      weight,
      sourceType: rule.sourceType,
      note: rule.note,
    });
    return mergeMatrix(base, rule);
  });
  return averageMatrices(matrices);
}

function tripleMatrix(value: string) {
  const triples = getCombinations(value, 3);
  if (triples.length === 0) return { ...NEUTRAL_MATRIX };
  return averageMatrices(triples.map((triple) => buildWeightedMatrix([
    { matrix: singleDigitMatrix(triple), weight: 35 },
    { matrix: pairMatrix(triple, []), weight: 30 },
    { matrix: arrangementMatrix(triple), weight: 20 },
    { matrix: repeatMatrix(triple), weight: 15 },
  ])));
}

function wholeMatrix(value: string) {
  return buildWeightedMatrix([
    { matrix: singleDigitMatrix(value), weight: 25 },
    { matrix: pairMatrix(value, []), weight: 25 },
    { matrix: tripleMatrix(value), weight: 20 },
    { matrix: arrangementMatrix(value), weight: 20 },
    { matrix: repeatMatrix(value), weight: 10 },
  ]);
}

function sumRootMatrix(value: string) {
  return buildWeightedMatrix([
    { matrix: rootMatrix(value), weight: 50 },
    { matrix: sumMatrix(value), weight: 50 },
  ]);
}

function combinationMatrix(value: string, evidence: NumberPatternEvidence[]) {
  return buildWeightedMatrix([
    { matrix: pairMatrix(value, evidence), weight: 50 },
    { matrix: tripleMatrix(value), weight: 50 },
  ]);
}

function repeatArrangementMatrix(value: string) {
  return buildWeightedMatrix([
    { matrix: repeatMatrix(value), weight: 50 },
    { matrix: arrangementMatrix(value), weight: 50 },
  ]);
}

function arrangementMatrix(value: string) {
  const stats = getDigitStats(value);
  const hasAscending = stats.sequencePatterns.some((item) => item.direction === 'ascending');
  const hasDescending = stats.sequencePatterns.some((item) => item.direction === 'descending');
  const hasMirror = stats.mirrorPatterns.length > 0;
  const balancedParity = Math.abs(stats.oddRatio - stats.evenRatio) <= 0.25;
  const balancedSize = Math.abs(stats.highDigitRatio - stats.lowDigitRatio) <= 0.25;
  const tail = value[value.length - 1];

  return roundMatrix({
    ...NEUTRAL_MATRIX,
    wealth: 50 + (['6', '8', '9'].includes(tail) ? 10 : 0) + (value.includes('88') ? 8 : 0),
    career: 50 + (hasAscending ? 10 : 0) + (stats.arrangementDirection === 'ascending' ? 6 : 0),
    love: 50 + (hasMirror ? 9 : 0) + (balancedParity ? 5 : 0),
    family: 50 + (hasMirror ? 8 : 0) + (value.includes('6') ? 5 : 0),
    social: 50 + (balancedParity ? 6 : 0) + (balancedSize ? 4 : 0),
    health: 50 + (balancedParity && balancedSize ? 8 : 0) - (value.includes('44') ? 8 : 0),
    growth: 50 + (hasAscending ? 10 : 0) + (stats.rootNumber === 9 ? 6 : 0),
    risk: 50 + (value.includes('44') ? 14 : 0) + (hasDescending ? 6 : 0),
    pressure: 50 + (value.includes('44') ? 16 : 0) + (stats.arrangementDirection === 'descending' ? 7 : 0),
    stability: 50 + (hasMirror ? 8 : 0) + (balancedParity ? 6 : 0) - (hasDescending ? 4 : 0),
  });
}

function repeatMatrix(value: string) {
  const stats = getDigitStats(value);
  const repeatCount = stats.repeatPatterns.reduce((sum, item) => sum + item.count, 0);
  const maxRepeat = Math.max(0, ...stats.repeatPatterns.map((item) => item.count));
  const repeatedEight = stats.repeatPatterns.some((item) => item.digit === '8');
  const repeatedFour = stats.repeatPatterns.some((item) => item.digit === '4');
  const repeatedSix = stats.repeatPatterns.some((item) => item.digit === '6');

  return roundMatrix({
    ...NEUTRAL_MATRIX,
    wealth: 50 + (repeatedEight ? 16 : 0) + (repeatedSix ? 8 : 0),
    career: 50 + (repeatedEight ? 10 : 0),
    love: 50 + (maxRepeat === 2 ? 7 : 0),
    family: 50 + (repeatedSix ? 9 : 0),
    social: 50 - (maxRepeat >= 4 ? 6 : 0),
    health: 50 - (repeatedFour ? 8 : 0) - (maxRepeat >= 4 ? 4 : 0),
    growth: 50 + (repeatCount >= 2 && repeatCount <= value.length * 0.5 ? 6 : 0),
    risk: 50 + (repeatedFour ? 16 : 0) + (maxRepeat >= 4 ? 8 : 0),
    pressure: 50 + (repeatedFour ? 18 : 0) + (maxRepeat >= 4 ? 10 : 0),
    stability: 50 + (maxRepeat === 2 ? 7 : 0) - (maxRepeat >= 4 ? 8 : 0),
  });
}

function rootMatrix(value: string) {
  const root = getDigitStats(value).rootNumber;
  const profiles: Record<number, Partial<NumberAnalysisMatrix>> = {
    0: { stability: 54, growth: 56, pressure: 58, risk: 56 },
    1: { career: 68, growth: 64, stability: 54 },
    2: { love: 68, family: 68, social: 66, stability: 60 },
    3: { career: 62, social: 64, growth: 72 },
    4: { health: 52, stability: 64, pressure: 66, risk: 62 },
    5: { social: 62, growth: 62, pressure: 54 },
    6: { wealth: 72, love: 68, family: 74, stability: 72 },
    7: { career: 70, growth: 66, pressure: 58 },
    8: { wealth: 80, career: 74, stability: 66 },
    9: { social: 64, health: 60, growth: 78 },
  };
  return roundMatrix({ ...NEUTRAL_MATRIX, ...profiles[root] });
}

function sumMatrix(value: string) {
  const stats = getDigitStats(value);
  const average = stats.digitSum / value.length;
  const highEnergy = average >= 5.8;
  const lowEnergy = average <= 3.2;
  const balanced = average > 3.2 && average < 5.8;
  return roundMatrix({
    ...NEUTRAL_MATRIX,
    wealth: 50 + (highEnergy ? 8 : 0),
    career: 50 + (highEnergy ? 6 : 0),
    love: 50 + (balanced ? 6 : 0),
    family: 50 + (balanced ? 7 : 0),
    social: 50 + (balanced ? 5 : 0),
    health: 50 + (balanced ? 8 : 0) - (highEnergy ? 3 : 0),
    growth: 50 + (highEnergy ? 7 : lowEnergy ? 4 : 6),
    risk: 50 + (highEnergy ? 5 : lowEnergy ? 4 : -4),
    pressure: 50 + (highEnergy ? 7 : lowEnergy ? 3 : -4),
    stability: 50 + (balanced ? 8 : -2),
  });
}

function segmentMatrix(value: string) {
  return buildWeightedMatrix([
    { matrix: singleDigitMatrix(value), weight: 45 },
    { matrix: pairMatrix(value, []), weight: 25 },
    { matrix: arrangementMatrix(value), weight: 20 },
    { matrix: repeatMatrix(value), weight: 10 },
  ]);
}

function buildWeightedMatrix(components: Array<{ matrix: NumberAnalysisMatrix; weight: number }>) {
  const total = { ...EMPTY_MATRIX };
  for (const component of components) addMatrix(total, component.matrix, component.weight / 100);
  return roundMatrix(total);
}

function matrixTrendScore(matrix: NumberAnalysisMatrix) {
  return clamp(
    matrix.wealth * 0.12 +
    matrix.career * 0.12 +
    matrix.love * 0.09 +
    matrix.family * 0.09 +
    matrix.social * 0.09 +
    matrix.health * 0.09 +
    matrix.growth * 0.11 +
    (100 - matrix.risk) * 0.10 +
    (100 - matrix.pressure) * 0.10 +
    matrix.stability * 0.09,
  );
}

function balanceScore(ratio: number) {
  return clamp(100 - Math.abs(ratio - 0.5) * 200);
}

function arrangementScore(direction: NumberAnalysisEvidence['arrangementDirection']) {
  if (direction === 'ascending') return 78;
  if (direction === 'flat') return 66;
  if (direction === 'mixed') return 62;
  return 54;
}

function calculateIndexes(matrix: NumberAnalysisMatrix, evidence: NumberAnalysisEvidence): NumberAnalysisIndexes {
  const frequencyStructure = clamp(100 - evidence.concentration * 55);
  const repeatStructure = clamp(100 - Math.max(0, evidence.maxRepeatLength - 2) * 16);
  const patternCoverage = clamp(
    45 +
      evidence.pairPatterns.length * 9 +
      evidence.triplePatterns.length * 4 +
      evidence.sequencePatterns.length * 7 +
      (evidence.mirrorPattern ? 8 : 0),
  );
  const arrangement = arrangementScore(evidence.arrangementDirection);
  const segmentBalance = evidence.segmentRatios
    ? balanceScore(Math.max(evidence.segmentRatios.front, evidence.segmentRatios.middle, evidence.segmentRatios.back))
    : evidence.structureBalance * 100;
  const positiveTrend = matrixTrendScore(matrix);

  return {
    structure: Math.round(clamp(frequencyStructure * 0.25 + arrangement * 0.25 + patternCoverage * 0.30 + repeatStructure * 0.20)),
    balance: Math.round(clamp(balanceScore(evidence.oddRatio) * 0.30 + balanceScore(evidence.highDigitRatio) * 0.25 + segmentBalance * 0.25 + (100 - evidence.concentration * 100) * 0.20)),
    pattern: Math.round(clamp(patternCoverage * 0.60 + (evidence.mirrorPattern ? 78 : 58) * 0.15 + wholeMatrix(evidence.lastFour).growth * 0.25)),
    stability: Math.round(clamp(matrix.stability * 0.35 + repeatStructure * 0.25 + (100 - matrix.pressure) * 0.20 + segmentBalance * 0.20)),
    trend: Math.round(clamp(positiveTrend * 0.70 + (100 - ((matrix.risk + matrix.pressure) / 2)) * 0.30)),
  };
}

function scoreFromIndexes(indexes: NumberAnalysisIndexes) {
  return Math.round(clamp(
    indexes.structure * 0.20 +
    indexes.balance * 0.20 +
    indexes.pattern * 0.20 +
    indexes.stability * 0.20 +
    indexes.trend * 0.20,
  ));
}

function confidenceFromEvidence(mode: NumberAnalysisMode, indexes: NumberAnalysisIndexes, evidence: NumberAnalysisEvidence) {
  const inputCompleteness = mode === 'phone10' ? 100 : mode === 'digit9' ? 97 : mode === 'digit8' ? 94 : mode === 'digit7' ? 91 : mode === 'six6' ? 88 : mode === 'digit5' ? 84 : mode === 'last4' ? 80 : mode === 'digit3' ? 70 : 62;
  const ruleCoverage = clamp(60 + evidence.pairPatterns.length * 8 + evidence.triplePatterns.length * 3 + (evidence.mirrorPattern ? 5 : 0));
  const structureConsistency = Math.round((indexes.structure + indexes.balance + indexes.stability) / 3);
  const modelStability = 96;
  return Math.round(clamp(inputCompleteness * 0.25 + ruleCoverage * 0.25 + structureConsistency * 0.25 + modelStability * 0.25));
}

function levelFromScore(score: number): NumberFortuneLevel {
  return FORTUNE_LEVEL_RULES.find((rule) => score >= rule.min && score <= rule.max)?.level ?? '中平';
}

function levelRuleFromScore(score: number) {
  return FORTUNE_LEVEL_RULES.find((rule) => score >= rule.min && score <= rule.max) ?? FORTUNE_LEVEL_RULES[4];
}

function topDimensions(matrix: NumberAnalysisMatrix, keys: NumberMatrixKey[], count: number) {
  return keys
    .map((key) => ({ key, label: DIRECTION_LABELS[key], value: matrix[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

function maskNumberValue(value: string, mode: NumberAnalysisMode) {
  if (mode === 'phone10') return `${value.slice(0, 4)}***${value.slice(-3)}`;
  if (mode === 'digit8') return `****${value.slice(-4)}`;
  return value;
}

function buildText(value: string, mode: NumberAnalysisMode, score: number, level: NumberFortuneLevel, matrix: NumberAnalysisMatrix, indexes: NumberAnalysisIndexes) {
  const strengths = topDimensions(matrix, ['wealth', 'career', 'love', 'family', 'social', 'health', 'growth', 'stability'], 2);
  const cautions = topDimensions(matrix, ['risk', 'pressure'], 1);
  const directions = strengths.map((item) => item.label);
  const subject = mode === 'phone10'
    ? `十位數字 ${maskNumberValue(value, mode)}`
    : mode === 'digit8'
      ? `八位數字 ${maskNumberValue(value, mode)}`
      : mode === 'six6'
        ? `六位數字 ${value}`
        : mode === 'digit5'
          ? `五位數字 ${value}`
          : mode === 'digit7'
            ? `七位數字 ${value}`
            : mode === 'digit9'
              ? `九位數字 ${value}`
              : mode === 'last4'
                ? `後四碼 ${value}`
                : `${value.length} 位數字 ${value}`;
  const rule = levelRuleFromScore(score);
  const keyStrength = strengths[0]?.label ?? '整體結構';
  const keyCaution = cautions[0]?.label ?? '節奏管理';
  const scorePrinciple = mode === 'phone10'
    ? '十碼模式加重後四碼與三段結構，並交叉檢查全碼統計、重複排列與數字根。'
    : mode === 'digit8'
      ? '八碼模式採前段雙碼結構加重後四碼，並交叉檢查全碼統計、整體組合、重複排列與數字根。'
      : mode === 'six6'
        ? '六碼模式採三段雙碼結構，並交叉檢查後四碼、整體組合、重複排列與數字根。'
        : mode === 'digit2' || mode === 'digit3' || mode === 'digit5' || mode === 'digit7' || mode === 'digit9'
          ? '中間碼數模式採全碼、前段、後四碼、整體組合、重複排列與數字根交叉加權。'
          : '後四碼模式以單碼、雙碼、三碼、整體組合、重複排列與數字根加權。';
  const levelExplanation = `${score} 分屬於「${level}」，代表目前數字結構的主軸是「${rule.headline}」${rule.principle}`;

  return {
    strengths: strengths.map((item) => `${item.label} ${item.value}`),
    cautions: cautions.map((item) => `${item.label} ${item.value}`),
    suitableDirections: directions,
    summary: `${subject} 的要害分數為 ${score} 分，級別為「${level}」。分析解說：${levelExplanation}`,
    advice: `計分原則：${scorePrinciple}系統會把結構、平衡、組合、穩定、趨勢五項合成一個總分，因此前端只呈現一個要害分數。本次最值得把握的是${keyStrength}，最需要留意的是${keyCaution}。建議：${rule.adviceTone}鼓勵：${rule.encouragement}此結果屬數字結構傾向分析，作為調整方向參考。`,
  };
}

function combinationDirection(value: string, stats: ReturnType<typeof getDigitStats>): NumberAnalysisEvidence['combinationDirection'] {
  if (stats.mirrorPatterns.length > 0) return 'mirrored';
  if (stats.repeatPatterns.length > 0) return 'repeating';
  if (stats.arrangementDirection === 'ascending') return 'forward';
  return 'mixed';
}

function buildEvidence(value: string, mode: NumberAnalysisMode, pairPatterns: NumberPatternEvidence[]): NumberAnalysisEvidence {
  const stats = getDigitStats(value);
  const lastFour = value.slice(-4);
  const segmentSumRatio = (segment: string) => {
    if (stats.digitSum === 0) return 0;
    return Number((segment.split('').reduce((sum, digit) => sum + Number(digit), 0) / stats.digitSum).toFixed(2));
  };
  const segmentRatios = mode === 'phone10'
    ? {
        front: segmentSumRatio(value.slice(0, 3)),
        middle: segmentSumRatio(value.slice(3, 6)),
        back: segmentSumRatio(lastFour),
      }
    : mode === 'digit8'
      ? {
          front: segmentSumRatio(value.slice(0, 2)),
          middle: segmentSumRatio(value.slice(2, 4)),
          back: segmentSumRatio(lastFour),
        }
      : mode === 'six6'
        ? {
            front: segmentSumRatio(value.slice(0, 2)),
            middle: segmentSumRatio(value.slice(2, 4)),
            back: segmentSumRatio(value.slice(4, 6)),
          }
        : undefined;

  return {
    digitFrequency: stats.digitFrequency,
    repeatPatterns: stats.repeatPatterns,
    sequencePatterns: stats.sequencePatterns,
    mirrorPatterns: stats.mirrorPatterns,
    mirrorPattern: stats.mirrorPatterns.length > 0,
    adjacentPairs: getCombinations(value, 2),
    pairPatterns,
    triplePatterns: getCombinations(value, 3),
    rootNumber: stats.rootNumber,
    digitSum: stats.digitSum,
    oddRatio: stats.oddRatio,
    evenRatio: stats.evenRatio,
    highDigitRatio: stats.highDigitRatio,
    lowDigitRatio: stats.lowDigitRatio,
    headDigit: value[0],
    tailDigit: value[value.length - 1],
    lastFour,
    maxRepeatLength: stats.maxRepeatLength,
    concentration: stats.concentration,
    structureBalance: stats.structureBalance,
    arrangementDirection: stats.arrangementDirection,
    combinationDirection: combinationDirection(value, stats),
    segmentRatios,
    tenDigitSegments: mode === 'phone10'
      ? { front: value.slice(0, 3), middle: value.slice(3, 6), back: lastFour }
      : undefined,
  };
}

export function validateNumberCoreInput(value: unknown): NumberAnalysisMode | NumberAnalysisError {
  if (typeof value !== 'string') {
    return { ok: false, message: '請輸入後四碼或十位數字。', ruleVersion: NUMBER_CORE_ENGINE_VERSION };
  }
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: '只能輸入 0–9，不能包含空格、符號或英文字母。', ruleVersion: NUMBER_CORE_ENGINE_VERSION };
  }
  if (value.length === 2) return 'digit2';
  if (value.length === 3) return 'digit3';
  if (value.length === 4) return 'last4';
  if (value.length === 5) return 'digit5';
  if (value.length === 6) return 'six6';
  if (value.length === 7) return 'digit7';
  if (value.length === 8) return 'digit8';
  if (value.length === 9) return 'digit9';
  if (value.length === 10) return 'phone10';
  return { ok: false, message: '長度僅允許 2 到 10 碼阿拉伯數字。', ruleVersion: NUMBER_CORE_ENGINE_VERSION };
}

export function analyzeNumberCore(value: string): NumberAnalysisResponse | NumberAnalysisError {
  const mode = validateNumberCoreInput(value);
  if (typeof mode !== 'string') return mode;

  const pairPatterns: NumberPatternEvidence[] = [];
  const back = value.slice(-4);
  const matrix = mode === 'last4'
    ? buildWeightedMatrix([
        { matrix: singleDigitMatrix(value), weight: LAST4_WEIGHTS.singleDigit },
        { matrix: pairMatrix(value, pairPatterns), weight: LAST4_WEIGHTS.pair },
        { matrix: tripleMatrix(value), weight: LAST4_WEIGHTS.triple },
        { matrix: wholeMatrix(value), weight: LAST4_WEIGHTS.whole },
        { matrix: repeatMatrix(value), weight: LAST4_WEIGHTS.repeat },
        { matrix: arrangementMatrix(value), weight: LAST4_WEIGHTS.arrangement },
        { matrix: sumRootMatrix(value), weight: LAST4_WEIGHTS.sumRoot },
      ])
    : mode === 'six6'
      ? buildWeightedMatrix([
          { matrix: singleDigitMatrix(value), weight: 18 },
          { matrix: segmentMatrix(value.slice(0, 2)), weight: 14 },
          { matrix: segmentMatrix(value.slice(2, 4)), weight: 14 },
          { matrix: segmentMatrix(value.slice(4, 6)), weight: 14 },
          { matrix: buildWeightedMatrix([
            { matrix: singleDigitMatrix(back), weight: LAST4_WEIGHTS.singleDigit },
            { matrix: pairMatrix(back, pairPatterns), weight: LAST4_WEIGHTS.pair },
            { matrix: tripleMatrix(back), weight: LAST4_WEIGHTS.triple },
            { matrix: wholeMatrix(back), weight: LAST4_WEIGHTS.whole },
            { matrix: repeatMatrix(back), weight: LAST4_WEIGHTS.repeat },
            { matrix: arrangementMatrix(back), weight: LAST4_WEIGHTS.arrangement },
            { matrix: sumRootMatrix(back), weight: LAST4_WEIGHTS.sumRoot },
          ]), weight: 20 },
          { matrix: combinationMatrix(value, pairPatterns), weight: 12 },
          { matrix: repeatArrangementMatrix(value), weight: 4 },
          { matrix: sumRootMatrix(value), weight: 4 },
        ])
    : mode === 'digit8'
      ? buildWeightedMatrix([
          { matrix: singleDigitMatrix(value), weight: DIGIT8_WEIGHTS.fullDigit },
          { matrix: segmentMatrix(value.slice(0, 2)), weight: DIGIT8_WEIGHTS.front },
          { matrix: segmentMatrix(value.slice(2, 4)), weight: DIGIT8_WEIGHTS.middle },
          { matrix: buildWeightedMatrix([
            { matrix: singleDigitMatrix(back), weight: LAST4_WEIGHTS.singleDigit },
            { matrix: pairMatrix(back, pairPatterns), weight: LAST4_WEIGHTS.pair },
            { matrix: tripleMatrix(back), weight: LAST4_WEIGHTS.triple },
            { matrix: wholeMatrix(back), weight: LAST4_WEIGHTS.whole },
            { matrix: repeatMatrix(back), weight: LAST4_WEIGHTS.repeat },
            { matrix: arrangementMatrix(back), weight: LAST4_WEIGHTS.arrangement },
            { matrix: sumRootMatrix(back), weight: LAST4_WEIGHTS.sumRoot },
          ]), weight: DIGIT8_WEIGHTS.back },
          { matrix: combinationMatrix(value, pairPatterns), weight: DIGIT8_WEIGHTS.combination },
          { matrix: repeatArrangementMatrix(value), weight: DIGIT8_WEIGHTS.repeatArrangement },
          { matrix: sumRootMatrix(value), weight: DIGIT8_WEIGHTS.sumRoot },
        ])
    : mode === 'phone10'
      ? buildWeightedMatrix([
        { matrix: singleDigitMatrix(value), weight: PHONE10_WEIGHTS.fullDigit },
        { matrix: segmentMatrix(value.slice(0, 3)), weight: PHONE10_WEIGHTS.front },
        { matrix: segmentMatrix(value.slice(3, 6)), weight: PHONE10_WEIGHTS.middle },
        { matrix: buildWeightedMatrix([
          { matrix: singleDigitMatrix(back), weight: LAST4_WEIGHTS.singleDigit },
          { matrix: pairMatrix(back, pairPatterns), weight: LAST4_WEIGHTS.pair },
          { matrix: tripleMatrix(back), weight: LAST4_WEIGHTS.triple },
          { matrix: wholeMatrix(back), weight: LAST4_WEIGHTS.whole },
          { matrix: repeatMatrix(back), weight: LAST4_WEIGHTS.repeat },
          { matrix: arrangementMatrix(back), weight: LAST4_WEIGHTS.arrangement },
          { matrix: sumRootMatrix(back), weight: LAST4_WEIGHTS.sumRoot },
        ]), weight: PHONE10_WEIGHTS.back },
        { matrix: combinationMatrix(value, pairPatterns), weight: PHONE10_WEIGHTS.combination },
        { matrix: repeatArrangementMatrix(value), weight: PHONE10_WEIGHTS.repeatArrangement },
          { matrix: sumRootMatrix(value), weight: PHONE10_WEIGHTS.sumRoot },
        ])
      : buildWeightedMatrix([
          { matrix: singleDigitMatrix(value), weight: 30 },
          { matrix: segmentMatrix(value.slice(0, Math.ceil(value.length / 2))), weight: 16 },
          { matrix: buildWeightedMatrix([
            { matrix: singleDigitMatrix(back), weight: LAST4_WEIGHTS.singleDigit },
            { matrix: pairMatrix(back, pairPatterns), weight: LAST4_WEIGHTS.pair },
            { matrix: tripleMatrix(back), weight: LAST4_WEIGHTS.triple },
            { matrix: wholeMatrix(back), weight: LAST4_WEIGHTS.whole },
            { matrix: repeatMatrix(back), weight: LAST4_WEIGHTS.repeat },
            { matrix: arrangementMatrix(back), weight: LAST4_WEIGHTS.arrangement },
            { matrix: sumRootMatrix(back), weight: LAST4_WEIGHTS.sumRoot },
          ]), weight: 28 },
          { matrix: combinationMatrix(value, pairPatterns), weight: 14 },
          { matrix: repeatArrangementMatrix(value), weight: 6 },
          { matrix: sumRootMatrix(value), weight: 6 },
        ]);

  const evidence = buildEvidence(value, mode, pairPatterns);
  const indexes = calculateIndexes(matrix, evidence);
  const score = scoreFromIndexes(indexes);
  const level = levelFromScore(score);
  const confidenceScore = confidenceFromEvidence(mode, indexes, evidence);
  const text = buildText(value, mode, score, level, matrix, indexes);
  const valueMasked = maskNumberValue(value, mode);

  return {
    ok: true,
    engine: 'Number Core Engine',
    engineVersion: NUMBER_CORE_ENGINE_VERSION,
    mode,
    value: valueMasked,
    valueMasked,
    score,
    finalScore: score,
    level,
    fortuneLevel: level,
    confidenceScore,
    indexes,
    matrix,
    evidence,
    summary: text.summary,
    strengths: text.strengths,
    cautions: text.cautions,
    suitableDirections: text.suitableDirections,
    advice: text.advice,
    interpretation: {
      summary: text.summary,
      strengths: text.strengths,
      warnings: text.cautions,
      directions: text.suitableDirections,
      advice: text.advice,
    },
    ruleVersion: NUMBER_CORE_ENGINE_VERSION,
  };
}
