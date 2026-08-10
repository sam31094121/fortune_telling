import { astro } from 'iztro';
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe';
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace';
import type { IFunctionalSurpalaces } from 'iztro/lib/astro/FunctionalSurpalaces';

export type ZiweiCalendarType = 'solar' | 'lunar';
export type ZiweiCoreGender = '男' | '女';
export type ZiweiLegacyGender = 'male' | 'female';

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

export type ZiweiBirthInput = {
  calendarType: ZiweiCalendarType;
  date: string;
  gender: ZiweiCoreGender;
  timeIndex: number;
  isLeapMonth?: boolean;
  fixLeap?: boolean;
};

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

export type ZiweiMajorStarDetail = {
  name: ZiweiMajorStarName;
  brightness?: string;
  mutagen?: string;
};

export type ZiweiSupportStarDetail = {
  name: string;
  brightness?: string;
  mutagen?: string;
};

export type ZiweiPalaceResult = {
  key: ZiweiPalaceKey;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: ZiweiMajorStarName[];
  majorStarDetails: ZiweiMajorStarDetail[];
  minorStars: ZiweiSupportStarDetail[];
  isBodyPalace: boolean;
};

export type ZiweiMajorStarPosition = {
  star: ZiweiMajorStarName;
  palace: string;
  palaceKey: ZiweiPalaceKey;
  earthlyBranch: string;
  brightness?: string;
};

export type ZiweiCoreValidation = {
  palaceCount: boolean;
  majorStarsComplete: boolean;
  noMajorStarDuplicate: boolean;
  lifePalaceFound: boolean;
  passed: boolean;
  missingMajorStars: ZiweiMajorStarName[];
  duplicateMajorStars: ZiweiMajorStarName[];
  missingPalaces: string[];
};

export type ZiweiCoreResult = {
  engine: 'iztro';
  engineVersion: string;
  birthInput: ZiweiBirthInput;
  raw: {
    solarDate: string;
    lunarDate: string;
    chineseDate: string;
    time: string;
    timeRange: string;
    soulMaster?: string;
    bodyMaster?: string;
    fiveElementsClass?: string;
  };
  lifePalace: ZiweiPalaceResult;
  bodyPalace?: ZiweiPalaceResult;
  palaces: ZiweiPalaceResult[];
  majorStarPositions: ZiweiMajorStarPosition[];
  sanFangSiZheng: {
    target: ZiweiPalaceResult;
    wealth: ZiweiPalaceResult;
    career: ZiweiPalaceResult;
    opposite: ZiweiPalaceResult;
  };
  validation: ZiweiCoreValidation;
};

export const PALACE_MAP: Record<string, string> = {
  命: '命宮',
  命宮: '命宮',
  兄弟: '兄弟宮',
  兄弟宮: '兄弟宮',
  夫妻: '夫妻宮',
  夫妻宮: '夫妻宮',
  子女: '子女宮',
  子女宮: '子女宮',
  財帛: '財帛宮',
  財帛宮: '財帛宮',
  疾厄: '疾厄宮',
  疾厄宮: '疾厄宮',
  遷移: '遷移宮',
  遷移宮: '遷移宮',
  僕役: '交友宮',
  僕役宮: '交友宮',
  交友: '交友宮',
  交友宮: '交友宮',
  官祿: '官祿宮',
  官祿宮: '官祿宮',
  事業: '官祿宮',
  事業宮: '官祿宮',
  田宅: '田宅宮',
  田宅宮: '田宅宮',
  福德: '福德宮',
  福德宮: '福德宮',
  父母: '父母宮',
  父母宮: '父母宮',
};

const PALACE_KEY_BY_NAME: Record<string, ZiweiPalaceKey> = {
  命宮: 'MING',
  兄弟宮: 'XIONG_DI',
  夫妻宮: 'FU_QI',
  子女宮: 'ZI_NV',
  財帛宮: 'CAI_BO',
  疾厄宮: 'JI_E',
  遷移宮: 'QIAN_YI',
  交友宮: 'JIAO_YOU',
  官祿宮: 'GUAN_LU',
  田宅宮: 'TIAN_ZHAI',
  福德宮: 'FU_DE',
  父母宮: 'FU_MU',
};

const REQUIRED_PALACE_NAMES = Object.keys(PALACE_KEY_BY_NAME);

function normalizeTraditional(value: string) {
  return value
    .trim()
    .replace(/宫/g, '宮')
    .replace(/禄/g, '祿')
    .replace(/钺/g, '鉞');
}

export function normalizeZiweiGender(gender: ZiweiCoreGender | ZiweiLegacyGender): ZiweiCoreGender {
  return gender === 'female' || gender === '女' ? '女' : '男';
}

export function hourToTimeIndex(hour: number): number {
  const normalized = ((Math.trunc(hour) % 24) + 24) % 24;
  if (normalized === 23) return 12;
  if (normalized === 0) return 0;
  if (normalized >= 1 && normalized < 3) return 1;
  if (normalized >= 3 && normalized < 5) return 2;
  if (normalized >= 5 && normalized < 7) return 3;
  if (normalized >= 7 && normalized < 9) return 4;
  if (normalized >= 9 && normalized < 11) return 5;
  if (normalized >= 11 && normalized < 13) return 6;
  if (normalized >= 13 && normalized < 15) return 7;
  if (normalized >= 15 && normalized < 17) return 8;
  if (normalized >= 17 && normalized < 19) return 9;
  if (normalized >= 19 && normalized < 21) return 10;
  return 11;
}

export function assertValidZiweiTimeIndex(timeIndex: number): void {
  if (!Number.isInteger(timeIndex) || timeIndex < 0 || timeIndex > 12) {
    throw new Error('INVALID_ZIWEI_TIME_INDEX');
  }
}

export function normalizePalaceName(name: string) {
  const normalized = normalizeTraditional(name);
  return PALACE_MAP[normalized] ?? normalized;
}

export function resolvePalaceKey(name: string): ZiweiPalaceKey {
  const key = PALACE_KEY_BY_NAME[normalizePalaceName(name)];
  if (!key) throw new Error(`ZIWEI_PALACE_NAME_UNSUPPORTED:${name}`);
  return key;
}

function normalizeMutagen(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined;
  const normalized = normalizeTraditional(value);
  return ['祿', '權', '科', '忌'].includes(normalized) ? normalized : undefined;
}

function normalizeStarName(name: unknown) {
  return typeof name === 'string' ? normalizeTraditional(name) : '';
}

function isMajorStarName(name: string): name is ZiweiMajorStarName {
  return (MAJOR_STARS as readonly string[]).includes(name);
}

function normalizePalace(rawPalace: IFunctionalPalace): ZiweiPalaceResult {
  const name = normalizePalaceName(String(rawPalace.name ?? ''));
  const key = resolvePalaceKey(name);
  const majorStarDetails: ZiweiMajorStarDetail[] = [];
  for (const rawStar of rawPalace.majorStars ?? []) {
    const starName = normalizeStarName((rawStar as { name?: unknown }).name);
    if (!isMajorStarName(starName)) continue;
    const brightness = (rawStar as { brightness?: unknown }).brightness;
    majorStarDetails.push({
      name: starName,
      brightness: typeof brightness === 'string' && brightness ? brightness : undefined,
      mutagen: normalizeMutagen((rawStar as { mutagen?: unknown }).mutagen),
    });
  }

  const minorStars = [...(rawPalace.minorStars ?? []), ...(rawPalace.adjectiveStars ?? [])]
    .map((star: any) => ({
      name: normalizeStarName(star.name),
      brightness: typeof star.brightness === 'string' && star.brightness ? star.brightness : undefined,
      mutagen: normalizeMutagen(star.mutagen),
    }))
    .filter((star: ZiweiSupportStarDetail) => Boolean(star.name) && !isMajorStarName(star.name));

  return {
    key,
    name,
    heavenlyStem: String(rawPalace.heavenlyStem ?? ''),
    earthlyBranch: String(rawPalace.earthlyBranch ?? ''),
    majorStars: majorStarDetails.map((star) => star.name),
    majorStarDetails,
    minorStars,
    isBodyPalace: Boolean(rawPalace.isBodyPalace),
  };
}

function getFunctionalPalace(astrolabe: IFunctionalAstrolabe, palaceName: string) {
  const normalized = normalizePalaceName(palaceName);
  const direct = astrolabe.palace(normalized as any);
  if (direct) return direct;

  return astrolabe.palaces.find((palace) => normalizePalaceName(String(palace.name ?? '')) === normalized);
}

function normalizeSurrounded(surrounded: IFunctionalSurpalaces) {
  return {
    target: normalizePalace(surrounded.target),
    wealth: normalizePalace(surrounded.wealth),
    career: normalizePalace(surrounded.career),
    opposite: normalizePalace(surrounded.opposite),
  };
}

export function createZiweiAstrolabe(input: ZiweiBirthInput): IFunctionalAstrolabe {
  assertValidZiweiTimeIndex(input.timeIndex);

  if (input.calendarType === 'solar') {
    return astro.bySolar(input.date, input.timeIndex, input.gender, input.fixLeap ?? true, 'zh-TW');
  }

  return astro.byLunar(input.date, input.timeIndex, input.gender, input.isLeapMonth ?? false, input.fixLeap ?? true, 'zh-TW');
}

export function extractMajorStars(palaces: ZiweiPalaceResult[]): ZiweiMajorStarPosition[] {
  return palaces.flatMap((palace) =>
    palace.majorStarDetails.map((star) => ({
      star: star.name,
      palace: palace.name,
      palaceKey: palace.key,
      earthlyBranch: palace.earthlyBranch,
      brightness: star.brightness,
    })),
  );
}

export function validateZiweiCore(result: Omit<ZiweiCoreResult, 'validation'>): ZiweiCoreValidation {
  const starNames = result.majorStarPositions.map((item) => item.star);
  const uniqueStars = new Set(starNames);
  const palaceNames = new Set(result.palaces.map((palace) => palace.name));
  const missingMajorStars = MAJOR_STARS.filter((star) => !uniqueStars.has(star));
  const duplicateMajorStars = MAJOR_STARS.filter((star) => starNames.filter((name) => name === star).length > 1);
  const missingPalaces = REQUIRED_PALACE_NAMES.filter((name) => !palaceNames.has(name));

  const palaceCount = result.palaces.length === 12;
  const lifePalaceFound = Boolean(result.lifePalace);
  const majorStarsComplete = missingMajorStars.length === 0;
  const noMajorStarDuplicate = starNames.length === uniqueStars.size && duplicateMajorStars.length === 0;

  return {
    palaceCount,
    lifePalaceFound,
    majorStarsComplete,
    noMajorStarDuplicate,
    passed: palaceCount && lifePalaceFound && majorStarsComplete && noMajorStarDuplicate && missingPalaces.length === 0,
    missingMajorStars,
    duplicateMajorStars,
    missingPalaces,
  };
}

export function createZiweiCore(input: ZiweiBirthInput): ZiweiCoreResult {
  const astrolabe = createZiweiAstrolabe(input);
  const lifeRaw = getFunctionalPalace(astrolabe, '命宮');
  if (!lifeRaw) throw new Error('ZIWEI_LIFE_PALACE_NOT_FOUND');

  const bodyRaw = getFunctionalPalace(astrolabe, '身宮') ?? astrolabe.palaces.find((palace) => palace.isBodyPalace);
  const palaces = astrolabe.palaces.map(normalizePalace);
  const lifePalace = normalizePalace(lifeRaw);
  const bodyPalace = bodyRaw ? normalizePalace(bodyRaw) : undefined;
  const sanFangSiZheng = normalizeSurrounded(astrolabe.surroundedPalaces(lifeRaw.name as any));
  const majorStarPositions = extractMajorStars(palaces);

  const coreWithoutValidation = {
    engine: 'iztro' as const,
    engineVersion: 'iztro@2.5.8',
    birthInput: input,
    raw: {
      solarDate: String(astrolabe.solarDate ?? ''),
      lunarDate: String(astrolabe.lunarDate ?? ''),
      chineseDate: String(astrolabe.chineseDate ?? ''),
      time: String(astrolabe.time ?? ''),
      timeRange: String(astrolabe.timeRange ?? ''),
      soulMaster: typeof astrolabe.soul === 'string' ? astrolabe.soul : undefined,
      bodyMaster: typeof astrolabe.body === 'string' ? astrolabe.body : undefined,
      fiveElementsClass: typeof astrolabe.fiveElementsClass === 'string' ? astrolabe.fiveElementsClass : undefined,
    },
    lifePalace,
    bodyPalace,
    palaces,
    majorStarPositions,
    sanFangSiZheng,
  };
  const validation = validateZiweiCore(coreWithoutValidation);

  if (!validation.passed) {
    console.error('ZIWEI_CORE_VALIDATION_FAILED', {
      birthInput: input,
      lifePalace: lifePalace ? `${lifePalace.name}/${lifePalace.heavenlyStem}${lifePalace.earthlyBranch}` : null,
      missingPalaces: validation.missingPalaces,
      missingMajorStars: validation.missingMajorStars,
      duplicateMajorStars: validation.duplicateMajorStars,
      positions: majorStarPositions,
    });
    throw new Error('ZIWEI_CORE_VALIDATION_FAILED');
  }

  return { ...coreWithoutValidation, validation };
}

export function debugZiweiCore(result: ZiweiCoreResult): void {
  console.table(
    result.palaces.map((palace) => ({
      palace: palace.name,
      branch: palace.earthlyBranch,
      majorStars: palace.majorStars.join(', '),
    })),
  );
  console.log('命宮', result.lifePalace);
  console.log('紫微核心測試盤', result);
}

