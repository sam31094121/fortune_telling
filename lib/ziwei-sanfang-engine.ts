import { calculateHourByIndex, calculateTrueSolarTime, ziwei } from '@ziweijs/core';
import { LunarHour } from 'tyme4ts';
import { getShichenInfo, shichenFromClockHour } from './shichen-engine';

const PALACE_CONFIG = [
  { key: 'MING', name: '命宮', focus: '核心人格與行動動能' },
  { key: 'CAI_BO', name: '財帛宮', focus: '資源運用與財務策略' },
  { key: 'GUAN_LU', name: '官祿宮', focus: '職涯定位與工作模式' },
  { key: 'QIAN_YI', name: '遷移宮', focus: '外部環境與三方四正對照' },
] as const;

type PalaceKey = (typeof PALACE_CONFIG)[number]['key'];

export interface ZiweiSanFangInput {
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  shichen: number | 'unknown' | null;
  isTimeConfirmed?: boolean;
  longitude?: number | null;
}

export interface ZiweiPalaceEvidence {
  key: PalaceKey;
  name: string;
  focus: string;
  branch: string;
  palaceStem: string;
  majorStars: string[];
  minorStars: string[];
  transformations: string[];
}

export interface ZiweiCrossCheck {
  palaceKey: PalaceKey;
  status: 'reinforce' | 'neutral' | 'tension';
  title: string;
  detail: string;
  ruleId: string;
}

export interface ZiweiPattern {
  name: string;
  stars: string[];
  description: string;
  basis: string;
}

export interface ZiweiPatternMetrics {
  coreStarCount: number;
  patternStarCount: number;
  patternCoverage: number;
  trinePalaceCoverage: number;
  oppositePalaceStarCount: number;
  transformationCount: number;
  supportiveRelationCount: number;
  constrainingRelationCount: number;
  methodology: string;
}

export interface ZiweiSanFangAnalysis {
  methodVersion: string;
  timeConfidence: 'exact' | 'estimated';
  timeNote: string;
  trueSolarTimeApplied: boolean;
  dataCompleteness: number;
  consistencyScore: number;
  summary: string;
  bazi: {
    year: string;
    month: string;
    day: string;
    hour: string;
    dayMaster: string;
    elementBalance: Record<string, number>;
  };
  palaces: ZiweiPalaceEvidence[];
  crossChecks: ZiweiCrossCheck[];
  pattern: ZiweiPattern;
  patternMetrics: ZiweiPatternMetrics;
  ruleCount: number;
}

const STEM_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
  庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const BRANCH_ELEMENT: Record<string, string> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金', 亥: '水', 子: '水',
};

const POSITIVE_TRANSFORMATIONS = new Set(['祿', '權', '科']);
const STAR_ELEMENT: Record<string, string> = {
  紫微: '土', 天機: '木', 太陽: '火', 武曲: '金', 天同: '水', 廉貞: '火', 天府: '土',
  太陰: '水', 貪狼: '木', 巨門: '水', 天相: '水', 天梁: '土', 七殺: '金', 破軍: '水',
};
const GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('出生日期格式錯誤。');

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('出生日期不存在。');
  }

  return { year, month, day };
}

function resolveShichen(value: ZiweiSanFangInput['shichen'], isTimeConfirmed?: boolean) {
  if (typeof value === 'number' && value >= 0 && value <= 11) {
    return { index: value, confidence: isTimeConfirmed === false ? 'estimated' as const : 'exact' as const };
  }

  // The existing form permits an unknown hour. Keep the output usable, but mark it as an estimate.
  return { index: 1, confidence: 'estimated' as const };
}

function parseBirthTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error('出生時間格式錯誤，請使用 HH:mm。');

  return { hour: Number(match[1]), minute: Number(match[2]), second: 0 };
}

function getElementBalance(pillars: string[]) {
  const balance = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  for (const pillar of pillars) {
    for (const symbol of pillar) {
      const element = STEM_ELEMENT[symbol] ?? BRANCH_ELEMENT[symbol];
      if (element) balance[element as keyof typeof balance] += 1;
    }
  }

  return balance;
}

function transformationLabel(value: { key?: string; name?: string } | undefined) {
  if (!value?.key) return null;
  const keyMap: Record<string, string> = { A: '祿', B: '權', C: '科', D: '忌' };
  return keyMap[value.key] ?? value.name ?? null;
}

function getDayMasterRelation(dayMasterElement: string, starElement: string) {
  if (starElement === dayMasterElement) return '比和';
  if (GENERATES[starElement] === dayMasterElement) return '生扶日主';
  if (GENERATES[dayMasterElement] === starElement) return '日主洩秀';
  if (CONTROLS[dayMasterElement] === starElement) return '日主制化';
  if (CONTROLS[starElement] === dayMasterElement) return '制約日主';
  return '五行待校';
}

function makeCrossCheck(
  palace: ZiweiPalaceEvidence,
  dayMasterElement: string,
  elementBalance: Record<string, number>,
): ZiweiCrossCheck {
  const positiveCount = palace.transformations.filter((item) => POSITIVE_TRANSFORMATIONS.has(item)).length;
  const hasTaboo = palace.transformations.includes('忌');
  const dayMasterWeight = elementBalance[dayMasterElement] ?? 0;
  const starRelations = palace.majorStars
    .map((star) => {
      const element = STAR_ELEMENT[star];
      return element ? `${star}${element}（${getDayMasterRelation(dayMasterElement, element)}）` : `${star}（待補星曜五行）`;
    });
  const hasSupport = starRelations.some((relation) => relation.includes('比和') || relation.includes('生扶日主'));
  const status = hasTaboo ? 'tension' : positiveCount > 0 || hasSupport || dayMasterWeight >= 3 ? 'reinforce' : 'neutral';
  const statusText = status === 'reinforce' ? '補強' : status === 'tension' ? '張力' : '中性';
  const stars = palace.majorStars.length > 0 ? palace.majorStars.join('、') : '無十四主星坐守';
  const transformations = palace.transformations.length > 0 ? palace.transformations.join('、') : '無生年四化落入此宮';

  return {
    palaceKey: palace.key,
    status,
    title: `${palace.name} × 八字日主：${statusText}`,
    detail: `${palace.name}主星為${stars}，四化為${transformations}；星曜五行對日主${dayMasterElement}的關係：${starRelations.join('、') || '無十四主星可比對'}。日主五行於四柱出現 ${dayMasterWeight} 次。`,
    ruleId: `ZW-SF-${palace.key}-V1`,
  };
}

function identifyCorePattern(palaces: ZiweiPalaceEvidence[]): ZiweiPattern {
  const corePalaces = palaces.filter((palace) => palace.key !== 'QIAN_YI');
  const coreStars = [...new Set(corePalaces.flatMap((palace) => palace.majorStars))];
  const hasEvery = (stars: string[]) => stars.every((star) => coreStars.includes(star));
  const hasDistributedStars = (stars: string[]) => {
    const coveredPalaces = stars
      .map((star) => corePalaces.find((palace) => palace.majorStars.includes(star))?.key)
      .filter((key): key is PalaceKey => Boolean(key));
    return new Set(coveredPalaces).size === Math.min(stars.length, corePalaces.length);
  };
  const sharesPalace = (stars: string[]) => corePalaces.some((palace) => stars.every((star) => palace.majorStars.includes(star)));

  if (hasEvery(['七殺', '破軍', '貪狼']) && hasDistributedStars(['七殺', '破軍', '貪狼'])) {
    return {
      name: '殺破狼格局',
      stars: ['七殺', '破軍', '貪狼'],
      description: '命、財帛、官祿三方同見七殺、破軍、貪狼。此為變動、開創與突破訊號較集中的三方組合。',
      basis: '七殺、破軍、貪狼分布於命財官三方核心宮位',
    };
  }

  if (hasEvery(['天機', '太陰', '天同', '天梁'])) {
    return {
      name: '機月同梁格局',
      stars: ['天機', '太陰', '天同', '天梁'],
      description: '命財官三方四正同見天機、太陰、天同、天梁，形成思考、協調、規劃與服務能力交會的主星結構。',
      basis: '命財官三方四正完整包含天機、太陰、天同、天梁',
    };
  }

  if (sharesPalace(['紫微', '天府'])) {
    return {
      name: '紫府同宮格局',
      stars: ['紫微', '天府'],
      description: '命宮或三方核心宮位同宮見紫微、天府，形成統整資源、承擔責任與管理全局的主星組合。',
      basis: '同一核心宮位同見紫微、天府',
    };
  }

  if (hasEvery(['紫微', '天府'])) {
    return {
      name: '紫府主星組合',
      stars: ['紫微', '天府'],
      description: '命財官三方同時出現紫微與天府，呈現統整資源、承擔責任與配置全局的主星組合。',
      basis: '命財官三方主星同見紫微、天府',
    };
  }

  if (hasEvery(['太陽', '太陰'])) {
    return {
      name: '日月主星組合',
      stars: ['太陽', '太陰'],
      description: '命財官三方同時出現太陽與太陰，呈現外在推進與內在感受並行的主星組合。',
      basis: '命財官三方主星同見太陽、太陰',
    };
  }

  if (hasEvery(['天府', '天相'])) {
    return {
      name: '府相朝垣格局',
      stars: ['天府', '天相'],
      description: '命財官三方四正同見天府與天相，呈現資源整合、制度協作與穩定承擔的主星結構。',
      basis: '命財官三方四正同見天府、天相',
    };
  }

  return {
    name: '命財官遷綜合格局',
    stars: coreStars,
    description: '依命宮、財帛宮與官祿宮的實際主星組成，搭配遷移對宮完成三方四正的整體判讀。',
    basis: '命財官三方主星組合，遷移宮作對宮交叉比對',
  };
}

function calculatePatternMetrics(
  palaces: ZiweiPalaceEvidence[],
  pattern: ZiweiPattern,
  dayMasterElement: string,
): ZiweiPatternMetrics {
  const corePalaces = palaces.filter((palace) => palace.key !== 'QIAN_YI');
  const coreStars = [...new Set(corePalaces.flatMap((palace) => palace.majorStars))];
  const patternStarSet = new Set(pattern.stars);
  const patternStarCount = pattern.stars.filter((star) => coreStars.includes(star)).length;
  const trinePalaceCoverage = pattern.stars.length === 0
    ? 0
    : Math.round(
        (corePalaces.filter((palace) => palace.majorStars.some((star) => patternStarSet.has(star))).length /
          Math.max(1, corePalaces.length)) * 100,
      );
  const patternCoverage = pattern.stars.length === 0
    ? 100
    : Math.round((patternStarCount / pattern.stars.length) * 100);
  const oppositePalaceStarCount = palaces.find((palace) => palace.key === 'QIAN_YI')?.majorStars.length ?? 0;
  let supportiveRelationCount = 0;
  let constrainingRelationCount = 0;

  for (const star of coreStars) {
    const starElement = STAR_ELEMENT[star];
    if (!starElement) continue;

    const relation = getDayMasterRelation(dayMasterElement, starElement);
    if (relation === '比和' || relation === '生扶日主') supportiveRelationCount += 1;
    if (relation === '制約日主') constrainingRelationCount += 1;
  }

  return {
    coreStarCount: coreStars.length,
    patternStarCount,
    patternCoverage,
    trinePalaceCoverage,
    oppositePalaceStarCount,
    transformationCount: corePalaces.reduce((count, palace) => count + palace.transformations.length, 0),
    supportiveRelationCount,
    constrainingRelationCount,
    methodology: '關鍵主星覆蓋率 + 三方宮位分布率 + 遷移對宮訊號 + 生年四化 + 八字日主五行關係',
  };
}

function calculateConsistencyScore(
  patternMetrics: ZiweiPatternMetrics,
  pattern: ZiweiPattern,
  dataCompleteness: number,
) {
  const coreStructure = Math.min(100, Math.round((patternMetrics.coreStarCount / 6) * 100));
  const transformationConsistency = Math.min(100, 40 + patternMetrics.transformationCount * 15);
  const relationTotal = patternMetrics.supportiveRelationCount + patternMetrics.constrainingRelationCount;
  const supportiveSignals = relationTotal === 0
    ? 50
    : Math.round((patternMetrics.supportiveRelationCount / relationTotal) * 100);
  const constrainingSignals = relationTotal === 0
    ? 0
    : Math.round((patternMetrics.constrainingRelationCount / relationTotal) * 100);

  const oppositeSignal = Math.min(100, patternMetrics.oppositePalaceStarCount * 50);

  return Math.max(0, Math.min(100, Math.round(
    coreStructure * 0.2
    + patternMetrics.patternCoverage * 0.2
    + patternMetrics.trinePalaceCoverage * 0.2
    + transformationConsistency * 0.1
    + supportiveSignals * 0.1
    + (100 - constrainingSignals) * 0.1
    + oppositeSignal * 0.05
    + dataCompleteness * 0.05,
  )));
}

function buildSanFangSummary(palaces: ZiweiPalaceEvidence[], pattern: ZiweiPattern) {
  const ming = palaces.find((palace) => palace.key === 'MING');
  const coreStars = ming?.majorStars.join('、') || '主星待確認';
  const trineStars = palaces
    .filter((palace) => palace.key === 'CAI_BO' || palace.key === 'GUAN_LU')
    .flatMap((palace) => palace.majorStars)
    .join('、') || '三方主星待確認';

  return `命宮以${coreStars}為核心，財帛與官祿三方匯入${trineStars}的結構訊號；遷移宮作為對宮，整體主要呈現「${pattern.name}」的判讀方向。`;
}

export function calculateZiweiSanFang(input: ZiweiSanFangInput): ZiweiSanFangAnalysis {
  const { year, month, day } = parseBirthDate(input.birthDate);
  const exactClock = parseBirthTime(input.birthTime);
  const exactShichen = shichenFromClockHour(exactClock.hour);
  const shichen = resolveShichen(exactShichen, input.isTimeConfirmed);
  const resolvedShichen = getShichenInfo(shichen.index);
  const [fallbackHour, fallbackMinute, fallbackSecond] = calculateHourByIndex(shichen.index);
  const hour = exactClock.hour ?? fallbackHour;
  const minute = exactClock.minute ?? fallbackMinute;
  const second = exactClock.second ?? fallbackSecond;
  const solarDate = new Date(year, month - 1, day, hour, minute, second);
  const hasLongitude = typeof input.longitude === 'number' && Number.isFinite(input.longitude);
  const calculationDate = hasLongitude
    ? calculateTrueSolarTime(solarDate, input.longitude as number, 8)
    : solarDate;
  const chart = ziwei.bySolar({
    name: '天宿命盤',
    gender: input.gender,
    date: solarDate,
    language: 'zh-Hant',
    longitude: hasLongitude ? input.longitude as number : undefined,
    timezoneOffset: 8,
    useTrueSolarTime: hasLongitude,
  });
  const eightChar = LunarHour.fromYmdHms(
    calculationDate.getFullYear(),
    calculationDate.getMonth() + 1,
    calculationDate.getDate(),
    calculationDate.getHours(),
    calculationDate.getMinutes(),
    calculationDate.getSeconds(),
  ).getEightChar();
  const bazi = {
    year: eightChar.getYear().getName(),
    month: eightChar.getMonth().getName(),
    day: eightChar.getDay().getName(),
    hour: eightChar.getHour().getName(),
  };
  const isExactTime = shichen.confidence === 'exact';
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  const elementBalance = getElementBalance(pillars);
  const dayMaster = bazi.day.charAt(0);
  const dayMasterElement = STEM_ELEMENT[dayMaster] ?? '未知';

  const palaces = PALACE_CONFIG.map((config) => {
    const palace = chart.palaces.find((item) => item.key === config.key);
    if (!palace) throw new Error(`排盤缺少${config.name}。`);

    const transformations = palace.majorStars
      .map((star) => transformationLabel(star.YT))
      .filter((value): value is string => Boolean(value));

    return {
      key: config.key,
      name: config.name,
      focus: config.focus,
      branch: palace.branch,
      palaceStem: palace.stem,
      majorStars: palace.majorStars.map((star) => star.name),
      minorStars: palace.minorStars.map((star) => star.name),
      transformations,
    };
  });

  // 未知時辰也先使用生日挑出的良辰吉時完成暫定排盤，並透過
  // timeConfidence 清楚標記為 estimated，讓客戶可以先取得結果。
  const visiblePalaces = palaces;
  const corePalaces = visiblePalaces.filter((palace) => palace.key !== 'QIAN_YI');
  const crossChecks = corePalaces.map((palace) => makeCrossCheck(palace, dayMasterElement, elementBalance));
  const pattern = identifyCorePattern(palaces);
  const patternMetrics = calculatePatternMetrics(visiblePalaces, pattern, dayMasterElement);
  const dataCompleteness = isExactTime ? (hasLongitude ? 100 : 90) : (hasLongitude ? 75 : 65);
  const consistencyScore = calculateConsistencyScore(patternMetrics, pattern, dataCompleteness);
  const summary = isExactTime
    ? buildSanFangSummary(visiblePalaces, pattern)
    : `系統依生日自動選用${resolvedShichen.label}作為暫定時辰，先完成命財官遷三方四正與「${pattern.name}」判讀；日後補上真實時辰即可重新校正。`;

  return {
    methodVersion: '北派十四主星 + 節氣八字四柱 + 命財官遷三方四正 V1.0',
    timeConfidence: shichen.confidence,
    timeNote: shichen.confidence === 'exact'
      ? hasLongitude ? '已依使用者選定時辰與出生地經度套用真太陽時校正。' : '已依使用者選定時辰排盤；尚未提供出生地經度，採標準時。'
      : `未提供真實出生時辰；系統已依生日自動採用${resolvedShichen.label}（${resolvedShichen.range}）完成暫定排盤，之後可用真實時辰重新校正。`,
    trueSolarTimeApplied: hasLongitude && isExactTime,
    dataCompleteness,
    consistencyScore,
    summary,
    bazi: {
      ...bazi,
      hour: bazi.hour,
      dayMaster: `${dayMaster}${dayMasterElement}`,
      elementBalance,
    },
    palaces: visiblePalaces,
    crossChecks,
    pattern,
    patternMetrics,
    ruleCount: visiblePalaces.length + crossChecks.length + pillars.length + visiblePalaces.reduce((count, palace) => count + palace.majorStars.length, 0),
  };
}
