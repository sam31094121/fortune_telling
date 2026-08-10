import { astro } from 'iztro';

export type ZiweiGender = 'male' | 'female';

export const MAJOR_STARS = [
  '紫微',
  '天機',
  '太陽',
  '武曲',
  '天同',
  '廉貞',
  '天府',
  '太陰',
  '貪狼',
  '巨門',
  '天相',
  '天梁',
  '七殺',
  '破軍',
] as const;

export type ZiweiMajorStarName = (typeof MAJOR_STARS)[number];
export type ZiweiPalaceKey =
  | 'MING'
  | 'XIONG_DI'
  | 'FU_QI'
  | 'ZI_NV'
  | 'CAI_BO'
  | 'JI_E'
  | 'QIAN_YI'
  | 'JIAO_YOU'
  | 'GUAN_LU'
  | 'TIAN_ZHAI'
  | 'FU_DE'
  | 'FU_MU';

export interface ZiweiInput {
  birthDate: string;
  birthHour: number;
  gender: ZiweiGender;
  fixLeap?: boolean;
}

export interface ZiweiMajorStar {
  name: ZiweiMajorStarName;
  brightness?: string;
  mutagen?: string;
}

export interface ZiweiSupportStar {
  name: string;
  brightness?: string;
  mutagen?: string;
}

export interface ZiweiPalace {
  key: ZiweiPalaceKey;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  majorStars: ZiweiMajorStar[];
  minorStars: ZiweiSupportStar[];
}

export interface ZiweiMajorStarValidation {
  passed: boolean;
  missing: ZiweiMajorStarName[];
  duplicate: ZiweiMajorStarName[];
  positions: Array<{ star: ZiweiMajorStarName; palace: string; branch: string }>;
}

export interface ZiweiPalaceValidation {
  passed: boolean;
  missing: string[];
  present: string[];
}

export interface ZiweiChartValidation {
  passed: boolean;
  lifePalacePassed: boolean;
  twelvePalaces: ZiweiPalaceValidation;
  majorStars: ZiweiMajorStarValidation;
}

export interface ZiweiChartResult {
  engine: 'iztro';
  engineVersion: string;
  soulPalaceBranch: string;
  bodyPalaceBranch: string;
  soulMaster?: string;
  bodyMaster?: string;
  fiveElementsClass?: string;
  palaces: ZiweiPalace[];
  lifePalace: ZiweiPalace;
  bodyPalace: ZiweiPalace | null;
  sanFangSiZheng: {
    target: ZiweiPalace;
    wealth: ZiweiPalace;
    career: ZiweiPalace;
    opposite: ZiweiPalace;
  };
  validation: ZiweiChartValidation;
}

const REQUIRED_PALACE_KEYS: ZiweiPalaceKey[] = [
  'MING',
  'XIONG_DI',
  'FU_QI',
  'ZI_NV',
  'CAI_BO',
  'JI_E',
  'QIAN_YI',
  'JIAO_YOU',
  'GUAN_LU',
  'TIAN_ZHAI',
  'FU_DE',
  'FU_MU',
];

const PALACE_LABEL_BY_KEY: Record<ZiweiPalaceKey, string> = {
  MING: '命宮',
  XIONG_DI: '兄弟',
  FU_QI: '夫妻',
  ZI_NV: '子女',
  CAI_BO: '財帛',
  JI_E: '疾厄',
  QIAN_YI: '遷移',
  JIAO_YOU: '交友',
  GUAN_LU: '官祿',
  TIAN_ZHAI: '田宅',
  FU_DE: '福德',
  FU_MU: '父母',
};

const PALACE_KEY_BY_NORMALIZED_NAME: Record<string, ZiweiPalaceKey> = {
  命: 'MING',
  命宮: 'MING',
  兄弟: 'XIONG_DI',
  兄弟宮: 'XIONG_DI',
  夫妻: 'FU_QI',
  夫妻宮: 'FU_QI',
  子女: 'ZI_NV',
  子女宮: 'ZI_NV',
  財帛: 'CAI_BO',
  財帛宮: 'CAI_BO',
  疾厄: 'JI_E',
  疾厄宮: 'JI_E',
  遷移: 'QIAN_YI',
  遷移宮: 'QIAN_YI',
  僕役: 'JIAO_YOU',
  僕役宮: 'JIAO_YOU',
  交友: 'JIAO_YOU',
  交友宮: 'JIAO_YOU',
  官祿: 'GUAN_LU',
  官祿宮: 'GUAN_LU',
  事業: 'GUAN_LU',
  事業宮: 'GUAN_LU',
  田宅: 'TIAN_ZHAI',
  田宅宮: 'TIAN_ZHAI',
  福德: 'FU_DE',
  福德宮: 'FU_DE',
  父母: 'FU_MU',
  父母宮: 'FU_MU',
};

function normalizePalaceName(name: string) {
  return name.trim().replace(/宫/g, '宮');
}

function normalizeMutagen(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined;
  const normalized = value.replace('禄', '祿');
  return ['祿', '權', '科', '忌'].includes(normalized) ? normalized : undefined;
}

function normalizeStarName(name: unknown) {
  return typeof name === 'string' ? name.replace('禄', '祿').replace('钺', '鉞') : '';
}

function isMajorStarName(name: string): name is ZiweiMajorStarName {
  return (MAJOR_STARS as readonly string[]).includes(name);
}

function resolvePalaceKey(name: string) {
  const normalizedName = normalizePalaceName(name);
  const key = PALACE_KEY_BY_NORMALIZED_NAME[normalizedName];
  if (!key) throw new Error(`ZIWEI_PALACE_NAME_UNSUPPORTED:${name}`);
  return key;
}

function getPalaceDisplayName(key: ZiweiPalaceKey) {
  return PALACE_LABEL_BY_KEY[key];
}

function normalizePalace(rawPalace: any): ZiweiPalace {
  const key = resolvePalaceKey(String(rawPalace.name ?? ''));
  const majorStars = (rawPalace.majorStars ?? [])
    .map((star: any) => ({
      name: normalizeStarName(star.name),
      brightness: typeof star.brightness === 'string' && star.brightness ? star.brightness : undefined,
      mutagen: normalizeMutagen(star.mutagen),
    }))
    .filter((star: { name: string }): star is ZiweiMajorStar => isMajorStarName(star.name));

  const minorStars = [...(rawPalace.minorStars ?? []), ...(rawPalace.adjectiveStars ?? [])]
    .map((star: any) => ({
      name: normalizeStarName(star.name),
      brightness: typeof star.brightness === 'string' && star.brightness ? star.brightness : undefined,
      mutagen: normalizeMutagen(star.mutagen),
    }))
    .filter((star: ZiweiSupportStar) => Boolean(star.name) && !isMajorStarName(star.name));

  return {
    key,
    name: getPalaceDisplayName(key),
    heavenlyStem: String(rawPalace.heavenlyStem ?? ''),
    earthlyBranch: String(rawPalace.earthlyBranch ?? ''),
    isBodyPalace: Boolean(rawPalace.isBodyPalace),
    majorStars,
    minorStars,
  };
}

export function hourToTimeIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0;
  if (hour >= 1 && hour < 3) return 1;
  if (hour >= 3 && hour < 5) return 2;
  if (hour >= 5 && hour < 7) return 3;
  if (hour >= 7 && hour < 9) return 4;
  if (hour >= 9 && hour < 11) return 5;
  if (hour >= 11 && hour < 13) return 6;
  if (hour >= 13 && hour < 15) return 7;
  if (hour >= 15 && hour < 17) return 8;
  if (hour >= 17 && hour < 19) return 9;
  if (hour >= 19 && hour < 21) return 10;
  return 11;
}

export function getLifePalace(chart: { palaces: ZiweiPalace[] }) {
  const palace = chart.palaces.find((item) => item.key === 'MING' || item.name === '命宮' || item.name === '命');
  if (!palace) throw new Error('ZIWEI_LIFE_PALACE_NOT_FOUND');
  return palace;
}

export function validateTwelvePalaces(chart: { palaces: ZiweiPalace[] }): ZiweiPalaceValidation {
  const keys = new Set(chart.palaces.map((palace) => palace.key));
  const missing = REQUIRED_PALACE_KEYS.filter((key) => !keys.has(key)).map((key) => PALACE_LABEL_BY_KEY[key] + (key === 'MING' ? '' : '宮'));

  return {
    passed: missing.length === 0 && chart.palaces.length === 12,
    missing,
    present: chart.palaces.map((palace) => palace.name),
  };
}

export function validateMajorStars(chart: { palaces: ZiweiPalace[] }): ZiweiMajorStarValidation {
  const positions = chart.palaces.flatMap((palace) =>
    palace.majorStars.map((star) => ({ star: star.name, palace: palace.name, branch: palace.earthlyBranch })),
  );
  const names = positions.map((item) => item.star);
  const missing = MAJOR_STARS.filter((star) => !names.includes(star));
  const duplicate = MAJOR_STARS.filter((star) => names.filter((name) => name === star).length > 1);

  return {
    passed: missing.length === 0 && duplicate.length === 0,
    missing,
    duplicate,
    positions,
  };
}

function validateChart(chart: { palaces: ZiweiPalace[] }): ZiweiChartValidation {
  const lifePalace = getLifePalace(chart);
  const twelvePalaces = validateTwelvePalaces(chart);
  const majorStars = validateMajorStars(chart);

  return {
    passed: Boolean(lifePalace) && twelvePalaces.passed && majorStars.passed,
    lifePalacePassed: Boolean(lifePalace),
    twelvePalaces,
    majorStars,
  };
}

function getRequiredPalace(palaces: ZiweiPalace[], key: ZiweiPalaceKey) {
  const palace = palaces.find((item) => item.key === key);
  if (!palace) throw new Error(`ZIWEI_REQUIRED_PALACE_NOT_FOUND:${key}`);
  return palace;
}

/**
 * 安全鎖（規格第十二條）：出生時辰未知時，命宮無法唯一決定。
 *
 * 實證：同一生日（例：1979-09-02 女）在十二個時辰下會得到十二個不同的命宮
 * （申未午巳辰卯寅丑子亥戌酉），命宮主星從「無主星」到「紫微天府」完全不同。
 * 因此系統若自行挑「良辰」補時辰，等於捏造命盤 —— 命宮一錯，
 * 十四主星、三方四正與後續解讀全部連鎖錯位。
 *
 * 規則：時辰未知 ⇒ 不得認證 ⇒ 禁止進入 AI 解盤。
 */
export function assertChartCertifiedForAi(
  chart: ZiweiChartResult,
  options: { isTimeKnown: boolean; birthDate?: string; gender?: ZiweiGender },
): void {
  if (!options.isTimeKnown) {
    console.error('ZIWEI_CHART_VALIDATION_FAILED', {
      reason: 'BIRTH_HOUR_UNKNOWN',
      birthDate: options.birthDate,
      gender: options.gender,
      note: '出生時辰未知，命宮無法唯一決定（十二時辰對應十二個不同命宮），禁止以推估時辰進入 AI 解盤。',
    });
    throw new Error('紫微斗數排盤驗證失敗，禁止進入 AI 解盤');
  }

  if (!chart.validation.passed) {
    console.error('ZIWEI_CHART_VALIDATION_FAILED', {
      reason: 'VALIDATION_NOT_PASSED',
      birthDate: options.birthDate,
      gender: options.gender,
      lifePalace: `${chart.lifePalace.name}/${chart.lifePalace.earthlyBranch}`,
      missingPalaces: chart.validation.twelvePalaces.missing,
      missingMajorStars: chart.validation.majorStars.missing,
      duplicateMajorStars: chart.validation.majorStars.duplicate,
    });
    throw new Error('紫微斗數排盤驗證失敗，禁止進入 AI 解盤');
  }
}

/**
 * 給 UI／Debug 用：這張盤是否可被認證（含時辰是否已知）。
 * 只有 true 才代表 ZIWEI_CHART_CERTIFIED。
 */
export function isChartCertified(chart: ZiweiChartResult, isTimeKnown: boolean): boolean {
  return Boolean(isTimeKnown) && chart.validation.passed;
}

export function generateZiweiChart(input: ZiweiInput): ZiweiChartResult {
  const timeIndex = hourToTimeIndex(input.birthHour);
  const chart = astro.bySolar(input.birthDate, timeIndex, input.gender, input.fixLeap ?? true, 'zh-TW');
  const palaces = chart.palaces.map(normalizePalace);
  const lifePalace = getLifePalace({ palaces });
  const bodyPalace = palaces.find((palace) => palace.isBodyPalace) ?? null;
  const sanFangSiZheng = {
    target: lifePalace,
    wealth: getRequiredPalace(palaces, 'CAI_BO'),
    career: getRequiredPalace(palaces, 'GUAN_LU'),
    opposite: getRequiredPalace(palaces, 'QIAN_YI'),
  };
  const validation = validateChart({ palaces });

  if (!validation.passed) {
    console.error('ZIWEI_CHART_VALIDATION_FAILED', {
      birthDate: input.birthDate,
      birthHour: input.birthHour,
      timeIndex,
      gender: input.gender,
      lifePalace: lifePalace ? `${lifePalace.name}/${lifePalace.earthlyBranch}` : null,
      missingPalaces: validation.twelvePalaces.missing,
      missingMajorStars: validation.majorStars.missing,
      duplicateMajorStars: validation.majorStars.duplicate,
      positions: validation.majorStars.positions,
    });
    throw new Error('紫微斗數排盤驗證失敗，禁止進入 AI 解盤');
  }

  return {
    engine: 'iztro',
    engineVersion: 'iztro@2.5.8',
    soulPalaceBranch: String(chart.earthlyBranchOfSoulPalace ?? lifePalace.earthlyBranch),
    bodyPalaceBranch: String(chart.earthlyBranchOfBodyPalace ?? bodyPalace?.earthlyBranch ?? ''),
    soulMaster: typeof chart.soul === 'string' ? chart.soul : undefined,
    bodyMaster: typeof chart.body === 'string' ? chart.body : undefined,
    fiveElementsClass: typeof chart.fiveElementsClass === 'string' ? chart.fiveElementsClass : undefined,
    palaces,
    lifePalace,
    bodyPalace,
    sanFangSiZheng,
    validation,
  };
}
