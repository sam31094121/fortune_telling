import {
  MAJOR_STARS,
  createZiweiCore,
  hourToTimeIndex,
  normalizeZiweiGender,
  type ZiweiBirthInput,
  type ZiweiCalendarType,
  type ZiweiCoreGender,
  type ZiweiCoreResult,
  type ZiweiLegacyGender,
  type ZiweiMajorStarName,
  type ZiweiPalaceKey,
  type ZiweiPalaceResult,
} from './engine';

export {
  MAJOR_STARS,
  createZiweiAstrolabe,
  createZiweiCore,
  debugZiweiCore,
  extractMajorStars,
  hourToTimeIndex,
  normalizeZiweiGender,
  validateZiweiCore,
  type ZiweiBirthInput,
  type ZiweiCalendarType,
  type ZiweiCoreGender,
  type ZiweiCoreResult,
  type ZiweiMajorStarName,
  type ZiweiPalaceKey,
} from './engine';

export type ZiweiGender = ZiweiLegacyGender;

export interface ZiweiInput {
  birthDate?: string;
  birthHour?: number;
  calendarType?: ZiweiCalendarType;
  date?: string;
  gender: ZiweiGender | ZiweiCoreGender;
  timeIndex?: number;
  isLeapMonth?: boolean;
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
  positions: Array<{ star: ZiweiMajorStarName; palace: string; branch: string; palaceKey: ZiweiPalaceKey }>;
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
  chartCertified: boolean;
  birthInput: ZiweiBirthInput;
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

function toLegacyPalace(palace: ZiweiPalaceResult): ZiweiPalace {
  return {
    key: palace.key,
    name: palace.name,
    heavenlyStem: palace.heavenlyStem,
    earthlyBranch: palace.earthlyBranch,
    isBodyPalace: palace.isBodyPalace,
    majorStars: palace.majorStarDetails,
    minorStars: palace.minorStars,
  };
}

function toLegacyChart(core: ZiweiCoreResult): ZiweiChartResult {
  const palaces = core.palaces.map(toLegacyPalace);
  const byKey = (key: ZiweiPalaceKey) => {
    const palace = palaces.find((item) => item.key === key);
    if (!palace) throw new Error(`ZIWEI_REQUIRED_PALACE_NOT_FOUND:${key}`);
    return palace;
  };

  return {
    engine: core.engine,
    engineVersion: core.engineVersion,
    chartCertified: core.validation.passed,
    birthInput: core.birthInput,
    soulPalaceBranch: core.lifePalace.earthlyBranch,
    bodyPalaceBranch: core.bodyPalace?.earthlyBranch ?? '',
    soulMaster: core.raw.soulMaster,
    bodyMaster: core.raw.bodyMaster,
    fiveElementsClass: core.raw.fiveElementsClass,
    palaces,
    lifePalace: byKey('MING'),
    bodyPalace: core.bodyPalace ? byKey(core.bodyPalace.key) : null,
    sanFangSiZheng: {
      target: byKey(core.sanFangSiZheng.target.key),
      wealth: byKey(core.sanFangSiZheng.wealth.key),
      career: byKey(core.sanFangSiZheng.career.key),
      opposite: byKey(core.sanFangSiZheng.opposite.key),
    },
    validation: {
      passed: core.validation.passed,
      lifePalacePassed: core.validation.lifePalaceFound,
      twelvePalaces: {
        passed: core.validation.palaceCount && core.validation.missingPalaces.length === 0,
        missing: core.validation.missingPalaces,
        present: core.palaces.map((palace) => palace.name),
      },
      majorStars: {
        passed: core.validation.majorStarsComplete && core.validation.noMajorStarDuplicate,
        missing: core.validation.missingMajorStars,
        duplicate: core.validation.duplicateMajorStars,
        positions: core.majorStarPositions.map((item) => ({
          star: item.star,
          palace: item.palace,
          branch: item.earthlyBranch,
          palaceKey: item.palaceKey,
        })),
      },
    },
  };
}

export function getLifePalace(chart: { palaces: ZiweiPalace[] }) {
  const palace = chart.palaces.find((item) => item.key === 'MING' || item.name === '命宮' || item.name === '命');
  if (!palace) throw new Error('ZIWEI_LIFE_PALACE_NOT_FOUND');
  return palace;
}

export function validateTwelvePalaces(chart: { palaces: ZiweiPalace[] }): ZiweiPalaceValidation {
  const required: ZiweiPalaceKey[] = [
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
  const keys = new Set(chart.palaces.map((palace) => palace.key));
  const missing = required.filter((key) => !keys.has(key));

  return {
    passed: missing.length === 0 && chart.palaces.length === 12,
    missing,
    present: chart.palaces.map((palace) => palace.name),
  };
}

export function validateMajorStars(chart: { palaces: ZiweiPalace[] }): ZiweiMajorStarValidation {
  const positions = chart.palaces.flatMap((palace) =>
    palace.majorStars.map((star) => ({
      star: star.name,
      palace: palace.name,
      branch: palace.earthlyBranch,
      palaceKey: palace.key,
    })),
  );
  const names = positions.map((item) => item.star);
  const missing = MAJOR_STARS.filter((star) => !names.includes(star));
  const duplicate = MAJOR_STARS.filter((star) => names.filter((name) => name === star).length > 1);

  return {
    passed: missing.length === 0 && duplicate.length === 0 && names.length === new Set(names).size,
    missing,
    duplicate,
    positions,
  };
}

function toBirthInput(input: ZiweiInput): ZiweiBirthInput {
  const date = input.date ?? input.birthDate;
  if (!date) throw new Error('INVALID_ZIWEI_BIRTH_DATE');

  const timeIndex = typeof input.timeIndex === 'number'
    ? input.timeIndex
    : typeof input.birthHour === 'number'
      ? hourToTimeIndex(input.birthHour)
      : NaN;

  return {
    calendarType: input.calendarType ?? 'solar',
    date,
    gender: normalizeZiweiGender(input.gender),
    timeIndex,
    isLeapMonth: input.isLeapMonth,
    fixLeap: input.fixLeap,
  };
}

export function generateZiweiChart(input: ZiweiInput): ZiweiChartResult {
  return toLegacyChart(createZiweiCore(toBirthInput(input)));
}

export function assertChartCertifiedForAi(
  chart: ZiweiChartResult,
  options: { isTimeKnown: boolean; birthDate?: string; gender?: ZiweiGender | ZiweiCoreGender },
): void {
  if (!options.isTimeKnown || !chart.validation.passed) {
    console.error('ZIWEI_CHART_VALIDATION_FAILED', {
      reason: !options.isTimeKnown ? 'BIRTH_TIME_NOT_CERTIFIED' : 'VALIDATION_NOT_PASSED',
      birthDate: options.birthDate,
      gender: options.gender,
      birthInput: chart.birthInput,
      lifePalace: `${chart.lifePalace.name}/${chart.lifePalace.earthlyBranch}`,
      missingPalaces: chart.validation.twelvePalaces.missing,
      missingMajorStars: chart.validation.majorStars.missing,
      duplicateMajorStars: chart.validation.majorStars.duplicate,
    });
    throw new Error('紫微斗數排盤驗證失敗，禁止進入 AI 解盤');
  }
}

export function isChartCertified(chart: ZiweiChartResult, isTimeKnown: boolean): boolean {
  return Boolean(isTimeKnown) && chart.validation.passed;
}

