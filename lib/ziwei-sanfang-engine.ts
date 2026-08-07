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
  auspiciousStars: string[];
  maleficStars: string[];
  neutralStars: string[];
  transformations: string[];
}

export interface ZiweiFullPalaceEvidence {
  key: string;
  name: string;
  focus: string;
  branch: string;
  palaceStem: string;
  majorStars: string[];
  minorStars: string[];
  auspiciousStars: string[];
  maleficStars: string[];
  neutralStars: string[];
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

export type ZiweiPrecisionPalaceKey = 'MING' | 'XIONG_DI' | 'FU_QI' | 'ZI_NV' | 'CAI_BO' | 'JI_E' | 'QIAN_YI' | 'JIAO_YOU' | 'GUAN_LU' | 'TIAN_ZHAI' | 'FU_DE' | 'FU_MU';

export interface ZiweiPrecisionEvidence {
  sourceType: 'target_palace' | 'main_star' | 'support_star' | 'opposite_palace' | 'trine_palace' | 'transformation' | 'annual' | 'pattern';
  sourceName: string;
  effect: 'support' | 'pressure' | 'mixed';
  explanation: string;
}

export interface ZiweiPrecisionEvent {
  title: string;
  eventType: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  likelyScenario: string;
  riskScenario?: string;
  conditions: string[];
  evidence: ZiweiPrecisionEvidence[];
}

export interface ZiweiPrecisionPalaceAnalysis {
  palaceKey: ZiweiPrecisionPalaceKey;
  palaceName: string;
  directConclusion: string;
  palaceDefinition: string;
  likelyEvents: ZiweiPrecisionEvent[];
  primaryRisk: {
    title: string;
    description: string;
    triggerConditions: string[];
    preventionActions: string[];
    evidence: ZiweiPrecisionEvidence[];
  };
  primaryOpportunity: {
    title: string;
    description: string;
    activationConditions: string[];
    recommendedActions: string[];
    evidence: ZiweiPrecisionEvidence[];
  };
  actionPlan: {
    doFirst: string[];
    avoid: string[];
    observe: string[];
  };
  evidenceSummary: ZiweiPrecisionEvidence[];
  confidence: {
    birthDataCompleteness: 'high' | 'medium' | 'low';
    ruleCoverage: 'complete' | 'partial' | 'insufficient';
    signalConsistency: 'concentrated' | 'mixed' | 'conflicting';
  };
  limitations: string[];
  ruleVersion: string;
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
  allPalaces: ZiweiFullPalaceEvidence[];
  bodyPalace: ZiweiFullPalaceEvidence | null;
  bodyPalaceStatus: 'provided' | 'not_available_from_core';
  palaceAnalyses: ZiweiPrecisionPalaceAnalysis[];
  crossChecks: ZiweiCrossCheck[];
  pattern: ZiweiPattern;
  patternMetrics: ZiweiPatternMetrics;
  ruleCount: number;
}

const ZIWEI_AUSPICIOUS_STAR_NAMES = new Set([
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬', '恩光', '天貴', '台輔', '封誥', '龍池', '鳳閣', '紅鸞', '天喜', '三台', '八座',
]);

const ZIWEI_MALEFIC_STAR_NAMES = new Set([
  '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '天空', '天刑', '天姚', '陰煞', '劫煞', '災煞', '大耗', '小耗', '白虎', '喪門', '吊客', '官符',
]);

function classifyZiweiSupportStars(stars: string[]) {
  const auspiciousStars: string[] = [];
  const maleficStars: string[] = [];
  const neutralStars: string[] = [];

  stars.forEach((star) => {
    if (ZIWEI_AUSPICIOUS_STAR_NAMES.has(star)) auspiciousStars.push(star);
    else if (ZIWEI_MALEFIC_STAR_NAMES.has(star)) maleficStars.push(star);
    else neutralStars.push(star);
  });

  return { auspiciousStars, maleficStars, neutralStars };
}

const STEM_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
  庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const FULL_PALACE_FOCUS: Record<string, string> = {
  MING: '自我核心、性格底色與今年起心動念',
  XIONG_DI: '手足同輩、協作關係與支援感',
  FU_QI: '伴侶相處、親密關係與互相成全',
  ZI_NV: '子女晚輩、創造力與作品延伸',
  CAI_BO: '財務資源、收入模式與價值配置',
  JI_E: '身心狀態、壓力節奏與健康提醒',
  QIAN_YI: '外出移動、人際舞台與外部機會',
  JIAO_YOU: '朋友團隊、合作網絡與貴人互動',
  GUAN_LU: '事業定位、責任承擔與專業成就',
  TIAN_ZHAI: '家庭居所、資產根基與安全感',
  FU_DE: '精神能量、內在福分與情緒修復',
  FU_MU: '長輩關係、學習傳承與保護力量',
};

function buildFullPalaceFocus(key: string, name: string) {
  return FULL_PALACE_FOCUS[key] ?? `${name}主題、生活場景與今年行動提醒`;
}
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

const TWELVE_PALACE_V4_KEYS: ZiweiPrecisionPalaceKey[] = [
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

const TWELVE_PALACE_V4_COPY: Record<ZiweiPrecisionPalaceKey, {
  name: string;
  definition: string;
  conclusion: string;
  eventTitle: string;
  eventType: string;
  likelyScenario: string;
  riskTitle: string;
  riskDescription: string;
  opportunityTitle: string;
  opportunityDescription: string;
  doFirst: string[];
  avoid: string[];
  observe: string[];
}> = {
  MING: {
    name: '命宮',
    definition: '命宮分析本人今年的自我定位、決策方式、行動節奏、優勢與固執點。',
    conclusion: '今年最先被啟動的是自我定位與行動方式，重點不是想更多，而是把一個方向做出結果。',
    eventTitle: '個人角色與決策權被放大',
    eventType: 'self_direction',
    likelyScenario: '今年較容易遇到需要自己表態、承擔責任、重新決定方向的事情。',
    riskTitle: '急著證明自己而分散力氣',
    riskDescription: '最大的風險不是能力不足，而是同時承接太多角色，造成判斷變急、情緒變緊。',
    opportunityTitle: '把個人定位變成可見成果',
    opportunityDescription: '最值得把握的是把專長、態度與作品整理清楚，讓別人看見你能負責什麼。',
    doFirst: ['列出今年最重要的一個主軸', '把每週行動對齊這個主軸', '重要決定先確認是否能累積成果'],
    avoid: ['同時開太多新計畫', '為了證明自己答應所有要求', '情緒上來就立刻做決定'],
    observe: ['哪些場合讓你最想主導', '哪些人事物會讓你失去耐心', '你的行動是否真的靠近年度主軸'],
  },
  XIONG_DI: {
    name: '兄弟宮',
    definition: '兄弟宮分析兄弟姊妹、同輩朋友、密友、熟人、合作夥伴與同儕競爭。',
    conclusion: '今年同輩與密友關係會變成明顯課題，真正要看的是誰能支持你、誰會消耗你。',
    eventTitle: '同輩支援與界線重新整理',
    eventType: 'peer_boundary',
    likelyScenario: '今年較容易出現朋友求助、舊識聯絡、同輩介紹機會，或合作分工需要重新講清楚。',
    riskTitle: '人情壓力與分工不均',
    riskDescription: '最大的風險來自責任講不清楚，最後變成你幫忙最多、承擔最多。',
    opportunityTitle: '透過可靠同輩取得資訊與合作',
    opportunityDescription: '最值得把握的是守信用、講分工、能交換資源的朋友或合作夥伴。',
    doFirst: ['把合作責任講清楚', '把可深交與只適合普通往來的人分開', '重要金錢往來留下文字紀錄'],
    avoid: ['因不好意思而答應超出能力的事', '和界線不清的人談利益合作', '把朋友情緒全部扛在自己身上'],
    observe: ['誰只在需要時出現', '誰能穩定提供資訊或支援', '哪段關係反覆讓你消耗'],
  },
  FU_QI: {
    name: '夫妻宮',
    definition: '夫妻宮分析婚姻、穩定伴侶、親密互動、承諾、責任、時間與金錢觀念。',
    conclusion: '今年感情重點在關係確認與相處規則，不能只靠感覺，要把期待、時間與責任談清楚。',
    eventTitle: '感情關係進入確認或磨合',
    eventType: 'relationship_alignment',
    likelyScenario: '單身者較容易遇到需要觀察長期條件的對象；有伴侶者較容易討論時間分配、承諾或家庭安排。',
    riskTitle: '期待落差造成沉默累積',
    riskDescription: '最大的風險是用猜測代替溝通，尤其在金錢觀、陪伴時間或責任分配上容易有落差。',
    opportunityTitle: '把關係從情緒拉回共同規則',
    opportunityDescription: '最值得把握的是把彼此需求說清楚，讓關係有可長期運作的方式。',
    doFirst: ['說清楚今年最需要的陪伴方式', '把金錢與家庭責任先談明白', '衝突時先講具體事件，不翻舊帳'],
    avoid: ['用冷淡測試對方', '期待對方自動懂你', '把工作壓力直接帶進關係'],
    observe: ['對方是否願意一起解決問題', '關係是否只有你單方面承擔', '衝突是否反覆集中在同一件事'],
  },
  ZI_NV: {
    name: '子女宮',
    definition: '子女宮分析子女、晚輩、部屬、作品、創造力與成果延續。',
    conclusion: '今年子女宮重點在成果延續與創造輸出，不能只想開始，也要把作品或計畫養到成形。',
    eventTitle: '作品成果與晚輩互動被啟動',
    eventType: 'creation_continuity',
    likelyScenario: '今年較容易遇到子女晚輩需要陪伴、作品需要修改、部屬需要帶領，或創作計畫進入培養期。',
    riskTitle: '急著看到成果導致半途更換方向',
    riskDescription: '最大的風險是耐心不足，成果還沒成熟就否定自己，或因外界反應慢而打亂原本節奏。',
    opportunityTitle: '把心血變成可延續的成果',
    opportunityDescription: '最值得把握的是能累積作品、教學、陪伴、培養部屬或建立長期內容的機會。',
    doFirst: ['選定一個最值得培養的作品或計畫', '每週固定安排輸出或陪伴時間', '把成果拆成可完成的小階段'],
    avoid: ['頻繁更換方向', '只追求短期掌聲', '把晚輩或部屬的問題全部自己扛'],
    observe: ['哪個作品最有延續性', '晚輩或部屬在哪裡最需要你引導', '你的創造力是否被瑣事切碎'],
  },
  CAI_BO: {
    name: '財帛宮',
    definition: '財帛宮分析收入、支出、現金流、賺錢方式、財務管理、破財來源與資源配置。',
    conclusion: '今年錢財重點是現金流與支出控管，收入有機會，但更要防止錢進來後又快速流出去。',
    eventTitle: '收入與支出同步被放大',
    eventType: 'cash_flow',
    likelyScenario: '今年較容易出現工作收入、客戶訂單、副業機會，也較容易因學習、設備、家庭或人情增加支出。',
    riskTitle: '高估短期收益導致現金流緊',
    riskDescription: '最大的風險不是完全沒財，而是收入看起來增加，但付款時間、成本與支出沒有同步控管。',
    opportunityTitle: '整理收入來源並建立安全金',
    opportunityDescription: '最值得把握的是有合約、能回款、能累積客戶或技能的收入機會。',
    doFirst: ['先列固定支出與必要成本', '保留緊急預備金', '確認新收入的付款時間與合約內容'],
    avoid: ['衝動消費', '口頭承諾就先投入大成本', '借貸、槓桿或高風險投機'],
    observe: ['哪一類支出最常超出預算', '哪些收入能穩定回款', '合作款項是否延遲'],
  },
  JI_E: {
    name: '疾厄宮',
    definition: '疾厄宮分析身心負荷、壓力反應、作息節奏、恢復方式與生活管理；不做疾病診斷。',
    conclusion: '今年疾厄宮重點在壓力管理與作息修正，真正要處理的是長期消耗，而不是硬撐。',
    eventTitle: '身心負荷與生活節奏需要調整',
    eventType: 'stress_rhythm',
    likelyScenario: '今年較容易出現睡眠不穩、疲勞累積、效率下降、情緒緊繃，或因工作家庭壓力打亂生活節奏。',
    riskTitle: '長期硬撐讓效率與情緒一起下滑',
    riskDescription: '最大的風險是把疲勞當成正常，等到身心能量明顯下降才被迫停下來。',
    opportunityTitle: '用規律把體力與專注力拉回來',
    opportunityDescription: '最值得把握的是建立固定作息、運動、飲食與放鬆流程，讓身體成為助力。',
    doFirst: ['固定睡眠起床時間', '每週安排規律放鬆或運動', '把高壓任務拆段處理'],
    avoid: ['連續熬夜', '用硬撐取代休息', '把身體警訊當成小事忽略'],
    observe: ['哪種事情最容易讓你失眠或焦躁', '壓力是否集中在固定時段', '休息後效率是否明顯改善'],
  },
  QIAN_YI: {
    name: '遷移宮',
    definition: '遷移宮分析外出發展、異地機會、搬遷、出差、外部環境、公開形象與陌生人評價。',
    conclusion: '今年外部機會比留在原地更容易被看見，但出外前要先準備好作品、界線與行程安排。',
    eventTitle: '外部舞台與異地機會增加',
    eventType: 'external_expansion',
    likelyScenario: '今年較容易遇到出差、外地客戶、新環境、公開曝光、搬動或市場轉換的機會。',
    riskTitle: '準備不足造成外出壓力',
    riskDescription: '最大的風險是行程、交通、溝通或合作條件沒確認，就倉促進入新環境。',
    opportunityTitle: '透過外部曝光打開新市場',
    opportunityDescription: '最值得把握的是能讓外界看見你能力、作品與服務價值的場合。',
    doFirst: ['整理自我介紹與作品', '出外前確認時間、交通與合作條件', '主動連結外部客戶或關鍵人物'],
    avoid: ['準備不足就搬遷或轉換市場', '為了迎合外界而失去界線', '沒有確認條件就答應外部合作'],
    observe: ['外界最常肯定你哪一點', '哪種場合帶來最多機會', '哪些外部邀約其實消耗大於收穫'],
  },
  JIAO_YOU: {
    name: '交友宮',
    definition: '交友宮分析朋友、人脈、合作夥伴、客戶、團隊、部屬與合作品質。',
    conclusion: '今年交友宮重點在人脈篩選與合作品質，機會來自對的人，壓力也會來自不清楚的合作。',
    eventTitle: '人脈合作與客戶關係被放大',
    eventType: 'network_quality',
    likelyScenario: '今年較容易遇到客戶聯繫、合作邀約、團隊協調、朋友介紹資源，或部屬分工需要重新安排。',
    riskTitle: '合作目標不清造成消耗',
    riskDescription: '最大的風險是只看熱情或人情，沒有先確認信用、分工、期限與利益關係。',
    opportunityTitle: '透過高品質人脈放大成果',
    opportunityDescription: '最值得把握的是能互相成就、守信用、能帶來客戶或實際資源的人。',
    doFirst: ['合作前確認目標與分工', '把重要承諾文字化', '優先經營守信用的人脈'],
    avoid: ['和消耗型關係深度綁定', '不好意思談利益分配', '讓團隊問題一直靠你補洞'],
    observe: ['誰能帶來實際資源', '誰只帶來壓力', '哪種客戶最適合長期經營'],
  },
  GUAN_LU: {
    name: '官祿宮',
    definition: '官祿宮分析工作、事業、職涯定位、責任角色、專業成果與社會位置。',
    conclusion: '今年事業重點在責任升級與成果驗收，不能只忙，要把專業做成看得見的成績。',
    eventTitle: '工作責任與職涯定位被檢視',
    eventType: 'career_execution',
    likelyScenario: '今年較容易遇到專案壓力、角色調整、上級要求、工作責任變重，或需要用成果證明能力。',
    riskTitle: '忙碌很多但成果不夠集中',
    riskDescription: '最大的風險是任務太多、優先順序不清，最後變成一直做事卻沒有代表作。',
    opportunityTitle: '把專業整理成可被信任的成果',
    opportunityDescription: '最值得把握的是能建立口碑、升級職責、展現管理或專業能力的工作。',
    doFirst: ['列出今年最重要的工作成果', '把大任務拆成可驗收節點', '主動整理作品或成績給外界看見'],
    avoid: ['用加班取代策略', '同時承接沒有優先順序的任務', '只處理瑣事不累積代表作'],
    observe: ['哪一類工作最能建立信任', '哪些任務消耗大但回報低', '你的職涯是否往更清楚的位置前進'],
  },
  TIAN_ZHAI: {
    name: '田宅宮',
    definition: '田宅宮分析家庭、居住環境、房產、內部資源、資產基礎與安全感；不提供投資保證。',
    conclusion: '今年田宅宮重點在家庭與根基整理，住得穩、資源清楚，外面的發展才不會被後方拖住。',
    eventTitle: '家庭空間與資產根基需要整理',
    eventType: 'home_foundation',
    likelyScenario: '今年較容易出現家中整理、居住安排、家人討論、資產基礎檢視，或安全感來源需要重新建立。',
    riskTitle: '家庭雜務與資產壓力分散心力',
    riskDescription: '最大的風險是家庭共識不清，或環境長期混亂，讓你做其他事時一直被消耗。',
    opportunityTitle: '把家與資源變成穩定後盾',
    opportunityDescription: '最值得把握的是整理空間、建立家庭共識、檢查固定資產與長期支出。',
    doFirst: ['先整理住家中最消耗你的區域', '把家庭責任與支出講清楚', '檢查長期固定支出與資產資料'],
    avoid: ['用衝動決定處理房產或大額支出', '讓家庭問題一直拖延', '把安全感完全放在外界評價'],
    observe: ['哪個空間最影響你的心情', '哪筆家庭支出需要重看', '家人之間是否有未說清楚的責任'],
  },
  FU_DE: {
    name: '福德宮',
    definition: '福德宮分析內心世界、精神狀態、興趣慾望、休息方式與心氣修復。',
    conclusion: '今年福德宮重點在內在消耗與心氣修復，心若不穩，外在做得再多也容易散掉。',
    eventTitle: '精神能量與休息方式被提醒',
    eventType: 'inner_restoration',
    likelyScenario: '今年較容易出現想休息卻放不下、興趣轉換、內心疲倦、睡前想太多，或需要重新找回安定感。',
    riskTitle: '外表正常但內在長期消耗',
    riskDescription: '最大的風險是一直撐住外在責任，卻沒有真正讓心安靜下來。',
    opportunityTitle: '透過修復心氣提升判斷力',
    opportunityDescription: '最值得把握的是建立能讓自己穩定的興趣、休息儀式與獨處時間。',
    doFirst: ['每天留一段不被打擾的安靜時間', '固定一個能修復心情的興趣', '睡前減少讓心躁動的刺激'],
    avoid: ['把休息當浪費時間', '用過度消費填補空虛', '心很累還一直答應別人要求'],
    observe: ['什麼事情最耗你的心氣', '哪個興趣真的讓你恢復', '你是否常常外表正常但心裡很累'],
  },
  FU_MU: {
    name: '父母宮',
    definition: '父母宮分析父母、長輩、上級、制度、教育資源、保護力量與支持系統。',
    conclusion: '今年父母宮重點在長輩、上級與制度資源，壓力可能來自規範，機會也可能來自經驗與支持。',
    eventTitle: '長輩制度與支持資源被啟動',
    eventType: 'authority_support',
    likelyScenario: '今年較容易遇到長輩溝通、上級要求、制度流程、學習證照、資源申請或舊觀念需要修正。',
    riskTitle: '權威期待讓你失去自己的節奏',
    riskDescription: '最大的風險是過度迎合長輩或制度，結果把自己的選擇壓到最後。',
    opportunityTitle: '把經驗與制度轉成助力',
    opportunityDescription: '最值得把握的是請益、學習、申請資源、修正流程，讓支持系統幫你走得更穩。',
    doFirst: ['主動向有經驗的人請益', '把制度流程與文件整理清楚', '把長輩建議轉成可執行步驟'],
    avoid: ['用硬碰硬處理權威關係', '完全照別人期待走而忽略自己', '拖延重要文件或流程'],
    observe: ['誰的建議真的有用', '哪個制度流程可以幫你省力', '你是否因怕被否定而不敢表達'],
  },
};
function evidenceForPalace(
  palace: ZiweiFullPalaceEvidence,
  pattern: ZiweiPattern,
  dataCompleteness: number,
): ZiweiPrecisionEvidence[] {
  const mainStars = palace.majorStars.length > 0 ? palace.majorStars.join('、') : '無主星坐守';
  const evidence: ZiweiPrecisionEvidence[] = [
    {
      sourceType: 'target_palace',
      sourceName: palace.name,
      effect: 'mixed',
      explanation: `${palace.name}落在${palace.palaceStem}${palace.branch}，本宮先決定這一宮今年要看的生活領域。`,
    },
    {
      sourceType: 'main_star',
      sourceName: mainStars,
      effect: palace.majorStars.length > 0 ? 'support' : 'mixed',
      explanation: palace.majorStars.length > 0
        ? `本宮主星為${mainStars}，用來判斷事件呈現方式與行動風格。`
        : '本宮無主星坐守，需加重三方四正與對宮訊號，不直接硬斷。',
    },
    {
      sourceType: 'pattern',
      sourceName: pattern.name,
      effect: 'mixed',
      explanation: `整體格局為${pattern.name}，本宮結論只取與該宮位主題相關的部分。`,
    },
    {
      sourceType: 'annual',
      sourceName: dataCompleteness >= 80 ? '出生資料完整' : '暫定時辰',
      effect: dataCompleteness >= 80 ? 'support' : 'mixed',
      explanation: dataCompleteness >= 80
        ? '出生資料完整度較高，結論可直接作為今年主要提醒。'
        : '出生時辰尚待校正，結論保留為年度參考，不做絕對斷語。',
    },
  ];

  if (palace.transformations.length > 0) {
    evidence.push({
      sourceType: 'transformation',
      sourceName: palace.transformations.join('、'),
      effect: 'mixed',
      explanation: `本宮出現${palace.transformations.join('、')}，表示今年此宮位有資源、責任、名聲或壓力流動。`,
    });
  }

  return evidence;
}

function buildTwelvePalacePrecisionAnalyses(
  allPalaces: ZiweiFullPalaceEvidence[],
  pattern: ZiweiPattern,
  dataCompleteness: number,
  timeConfidence: 'exact' | 'estimated',
): ZiweiPrecisionPalaceAnalysis[] {
  const confidence = {
    birthDataCompleteness: dataCompleteness >= 85 ? 'high' as const : dataCompleteness >= 65 ? 'medium' as const : 'low' as const,
    ruleCoverage: timeConfidence === 'exact' ? 'complete' as const : 'partial' as const,
    signalConsistency: pattern.stars.length >= 3 ? 'concentrated' as const : 'mixed' as const,
  };

  return TWELVE_PALACE_V4_KEYS.map((key) => {
    const copy = TWELVE_PALACE_V4_COPY[key];
    const palace = allPalaces.find((item) => item.key === key);
    const evidence = palace
      ? evidenceForPalace(palace, pattern, dataCompleteness)
      : [{ sourceType: 'target_palace' as const, sourceName: copy.name, effect: 'mixed' as const, explanation: '目前命盤資料未回傳此宮位，前端只顯示保守提醒。' }];

    const eventEvidence = evidence.slice(0, Math.min(3, evidence.length));
    const priority = eventEvidence.length >= 3 ? 'P1' as const : 'P2' as const;

    return {
      palaceKey: key,
      palaceName: copy.name,
      directConclusion: copy.conclusion,
      palaceDefinition: copy.definition,
      likelyEvents: [{
        title: copy.eventTitle,
        eventType: copy.eventType,
        priority,
        likelyScenario: copy.likelyScenario,
        riskScenario: copy.riskDescription,
        conditions: timeConfidence === 'exact'
          ? ['使用者已提供出生時辰', '本宮主題與整體格局同時納入']
          : ['目前採暫定時辰', '補上真實時辰後可再校正宮位細節'],
        evidence: eventEvidence,
      }],
      primaryRisk: {
        title: copy.riskTitle,
        description: copy.riskDescription,
        triggerConditions: copy.observe,
        preventionActions: copy.avoid,
        evidence: eventEvidence,
      },
      primaryOpportunity: {
        title: copy.opportunityTitle,
        description: copy.opportunityDescription,
        activationConditions: copy.observe,
        recommendedActions: copy.doFirst,
        evidence: eventEvidence,
      },
      actionPlan: {
        doFirst: copy.doFirst,
        avoid: copy.avoid,
        observe: copy.observe,
      },
      evidenceSummary: evidence,
      confidence,
      limitations: timeConfidence === 'exact'
        ? ['此結論為年度宮位分析，不等同終身定論。']
        : ['目前採暫定時辰，命宮與十二宮細節需以真實出生時辰校正。'],
      ruleVersion: 'Ziwei Twelve Palace Precision V4.0',
    };
  });
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

  const allPalaces = chart.palaces.map((palace) => {
    const transformations = palace.majorStars
      .map((star) => transformationLabel(star.YT))
      .filter((value): value is string => Boolean(value));

    const minorStars = palace.minorStars.map((star) => star.name);
    const classifiedStars = classifyZiweiSupportStars(minorStars);

    return {
      key: palace.key,
      name: palace.name,
      focus: buildFullPalaceFocus(palace.key, palace.name),
      branch: palace.branch,
      palaceStem: palace.stem,
      majorStars: palace.majorStars.map((star) => star.name),
      minorStars,
      ...classifiedStars,
      transformations,
    };
  });
  const palaces = PALACE_CONFIG.map((config) => {
    const palace = chart.palaces.find((item) => item.key === config.key);
    if (!palace) throw new Error(`排盤缺少${config.name}。`);

    const transformations = palace.majorStars
      .map((star) => transformationLabel(star.YT))
      .filter((value): value is string => Boolean(value));

    const minorStars = palace.minorStars.map((star) => star.name);
    const classifiedStars = classifyZiweiSupportStars(minorStars);

    return {
      key: config.key,
      name: config.name,
      focus: config.focus,
      branch: palace.branch,
      palaceStem: palace.stem,
      majorStars: palace.majorStars.map((star) => star.name),
      minorStars,
      ...classifiedStars,
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
  const palaceAnalyses = buildTwelvePalacePrecisionAnalyses(allPalaces, pattern, dataCompleteness, shichen.confidence);

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
    allPalaces,
    bodyPalace: null,
    bodyPalaceStatus: 'not_available_from_core',
    palaceAnalyses,
    crossChecks,
    pattern,
    patternMetrics,
    ruleCount: visiblePalaces.length + crossChecks.length + pillars.length + visiblePalaces.reduce((count, palace) => count + palace.majorStars.length, 0),
  };
}


