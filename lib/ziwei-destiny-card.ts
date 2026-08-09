import type { FiveElementIntegrationResult, FiveElementKey } from './five-element-engine';
import type { ZiweiSanFangAnalysis, ZiweiFullPalaceEvidence } from './ziwei-sanfang-engine';

export type ZiweiVisualArchetype =
  | 'SOVEREIGN_CENTER'
  | 'BREAKER_COMMANDER'
  | 'STRATEGIST'
  | 'INNER_MOON'
  | 'RESOURCE_EXECUTOR'
  | 'PROTECTOR'
  | 'CREATOR'
  | 'CONNECTOR'
  | 'TRANSFORMER'
  | 'OBSERVER'
  | 'BUILDER'
  | 'GUIDE'
  | 'UNKNOWN';

export type ZiweiDestinyElementSignal = 'SPACE' | 'AIR' | 'WATER' | 'FIRE' | 'EARTH';
export type ZiweiDestinyTransformationType = 'LU' | 'QUAN' | 'KE' | 'JI';

export interface ZiweiDestinyCardSource {
  palaceId: string;
  palaceName: string;
  primaryStars: Array<{
    id: string;
    name: string;
    archetype: ZiweiVisualArchetype;
  }>;
  supportingStars: Array<{
    id: string;
    name: string;
  }>;
  transformations: Array<{
    starName: string;
    type: ZiweiDestinyTransformationType;
  }>;
  threeHarmony: Array<{
    palaceName: string;
    signal: string;
  }>;
}

export interface ZiweiDestinyCard {
  cardId: string;
  analysisId: string;
  cardType: 'DESTINY_CARD' | 'BIRTHDAY_THEME_CARD';
  title: string;
  subtitle: string;
  palace: {
    name: string;
    symbol: string;
  };
  heroStars: Array<{
    name: string;
    archetype: ZiweiVisualArchetype;
  }>;
  supportingSymbols: string[];
  visualTheme: {
    archetype: ZiweiVisualArchetype;
    keywords: string[];
    elementSignals: ZiweiDestinyElementSignal[];
  };
  customerCopy: {
    coreTheme: string;
    power: string;
    challenge: string;
    direction: string;
    action: string;
  };
  evidence: {
    palace: string;
    stars: string[];
    transformations: string[];
    threeHarmony: string[];
  };
  verification: {
    chartVerified: boolean;
    mappingVerified: boolean;
    customerCopyVerified: boolean;
    readyForFrontend: boolean;
  };
}

const STAR_ARCHETYPE_MAP: Record<string, ZiweiVisualArchetype> = {
  紫微: 'SOVEREIGN_CENTER',
  七殺: 'BREAKER_COMMANDER',
  天機: 'STRATEGIST',
  太陰: 'INNER_MOON',
  武曲: 'RESOURCE_EXECUTOR',
  天梁: 'PROTECTOR',
  天府: 'BUILDER',
  天相: 'CONNECTOR',
  太陽: 'GUIDE',
  破軍: 'TRANSFORMER',
  廉貞: 'OBSERVER',
  貪狼: 'CREATOR',
  巨門: 'OBSERVER',
  天同: 'CONNECTOR',
};

const ARCHETYPE_COPY: Record<ZiweiVisualArchetype, { subtitle: string; keywords: string[]; power: string; challenge: string; direction: string; action: string }> = {
  SOVEREIGN_CENTER: { subtitle: '中心裡的掌舵者', keywords: ['王座', '中心光源', '秩序'], power: '你擅長把分散的人事物重新放回秩序。', challenge: '真正要練習的，是不把所有責任都扛成壓力。', direction: '先定核心，再分配資源。', action: '今天只完成一個關鍵決定。' },
  BREAKER_COMMANDER: { subtitle: '破局中的掌舵者', keywords: ['刀鋒', '山峰', '破局'], power: '你擅長在混亂中快速找到突破口。', challenge: '真正要控制的不是力量，而是力量使用的節奏。', direction: '先定目標，再清阻礙。', action: '先完成最重要的一件事。' },
  STRATEGIST: { subtitle: '星軌裡的謀略者', keywords: ['棋盤', '羅盤', '星軌'], power: '你擅長把複雜局面拆成可以移動的步驟。', challenge: '想太多時，容易錯過真正該落子的時間。', direction: '讓策略服務行動。', action: '把問題拆成三步。' },
  INNER_MOON: { subtitle: '月光下的洞察者', keywords: ['月輪', '水面', '內在'], power: '你擅長感受細節，也能讀懂沒有說出口的訊號。', challenge: '情緒太滿時，判斷容易被安全感牽動。', direction: '先安定，再判斷。', action: '先寫下真正感受。' },
  RESOURCE_EXECUTOR: { subtitle: '資源中的執行者', keywords: ['金屬', '財庫', '帳本'], power: '你擅長把目標變成資源、數字與成果。', challenge: '若只看效率，容易忽略人與節奏。', direction: '用制度承接成果。', action: '列出今天的完成清單。' },
  PROTECTOR: { subtitle: '風雨中的守護者', keywords: ['屋梁', '盾牌', '道義'], power: '你有支撐他人與修復局面的能力。', challenge: '保護別人之前，需要先保護自己的能量。', direction: '先守邊界，再給支援。', action: '拒絕一件消耗你的事。' },
  CREATOR: { subtitle: '舞台上的創造者', keywords: ['火光', '舞台', '慾望'], power: '你能把渴望轉成吸引力與作品。', challenge: '熱度若沒有方向，容易變成分心。', direction: '把興趣收束成作品。', action: '完成一個可展示成果。' },
  CONNECTOR: { subtitle: '關係裡的協調者', keywords: ['印章', '橋樑', '圓桌'], power: '你擅長建立合作感，讓不同立場可以對話。', challenge: '過度協調時，容易忘記自己的立場。', direction: '讓善意有規格。', action: '清楚說出你的條件。' },
  TRANSFORMER: { subtitle: '重組中的改革者', keywords: ['浪潮', '斷裂', '重建'], power: '你有打破舊框架、重新組裝路線的能力。', challenge: '改變太快時，容易連重要資源一起推翻。', direction: '改方法，不必全歸零。', action: '保留一個有效資源。' },
  OBSERVER: { subtitle: '門後的洞察者', keywords: ['門', '眼睛', '界線'], power: '你能看見問題背後真正的矛盾。', challenge: '話語太尖銳時，答案會被防衛心擋住。', direction: '把質疑變成提問。', action: '先問一個好問題。' },
  BUILDER: { subtitle: '城池裡的建構者', keywords: ['倉庫', '城池', '土台'], power: '你擅長累積、管理與守住長期資源。', challenge: '太求穩時，可能錯過該升級的時機。', direction: '穩住根基，再做升級。', action: '整理一項核心資源。' },
  GUIDE: { subtitle: '光線中的引路者', keywords: ['太陽', '道路', '旗幟'], power: '你能把方向說清楚，讓人願意跟上。', challenge: '一直照亮別人時，也要看見自己的需要。', direction: '把理念變成清楚指令。', action: '說出你的下一步。' },
  UNKNOWN: { subtitle: '命盤中的待明者', keywords: ['星塵', '空位', '校正'], power: '這股力量已在命盤中出現，仍需以完整宮位交叉判讀。', challenge: '不要急著把未知訊號講成定論。', direction: '回到命盤證據。', action: '先查看命盤依據。' },
};

const PALACE_SYMBOLS: Record<string, string> = {
  MING: '命',
  CAI_BO: '財',
  GUAN_LU: '官',
  QIAN_YI: '遷',
  FU_DE: '福',
  FU_QI: '侶',
  TIAN_ZHAI: '宅',
  JI_E: '疾',
};

const ELEMENT_SIGNAL_MAP: Record<FiveElementKey, ZiweiDestinyElementSignal> = {
  metal: 'SPACE',
  wood: 'AIR',
  water: 'WATER',
  fire: 'FIRE',
  earth: 'EARTH',
};

function shortText(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}

function normalizePalaceName(name: string) {
  return name.endsWith('宮') ? name : `${name}宮`;
}

function transformationType(value: string): ZiweiDestinyTransformationType | null {
  if (value.includes('祿') || value.includes('禄')) return 'LU';
  if (value.includes('權') || value.includes('权')) return 'QUAN';
  if (value.includes('科')) return 'KE';
  if (value.includes('忌')) return 'JI';
  return null;
}

function transformationLabel(type: ZiweiDestinyTransformationType) {
  const labels: Record<ZiweiDestinyTransformationType, string> = { LU: '化祿', QUAN: '化權', KE: '化科', JI: '化忌' };
  return labels[type];
}

function getFocusPalace(chart: ZiweiSanFangAnalysis) {
  return (chart.allPalaces ?? []).find((palace) => palace.key === 'MING')
    ?? chart.palaces.find((palace) => palace.key === 'MING')
    ?? null;
}

export function mapZiweiToDestinySource(chart: ZiweiSanFangAnalysis): ZiweiDestinyCardSource {
  const focusPalace = getFocusPalace(chart);
  if (!focusPalace) throw new Error('ZIWEI_LIFE_PALACE_NOT_FOUND');

  return {
    palaceId: focusPalace.key,
    palaceName: normalizePalaceName(focusPalace.name),
    primaryStars: focusPalace.majorStars.map((name) => ({
      id: name,
      name,
      archetype: STAR_ARCHETYPE_MAP[name] ?? 'UNKNOWN',
    })),
    supportingStars: focusPalace.minorStars.map((name) => ({ id: name, name })),
    transformations: focusPalace.transformations
      .map((item) => transformationType(item))
      .filter((type): type is ZiweiDestinyTransformationType => Boolean(type))
      .map((type) => ({ starName: '正式排盤四化', type })),
    threeHarmony: chart.palaces.map((palace) => ({
      palaceName: normalizePalaceName(palace.name),
      signal: palace.majorStars.length ? palace.majorStars.join('、') : '無主星，借對宮與三方判讀',
    })),
  };
}

export function buildZiweiDestinyCard(input: {
  analysisId: string;
  subjectName?: string;
  chart: ZiweiSanFangAnalysis;
  fiveElement?: FiveElementIntegrationResult;
}): ZiweiDestinyCard | null {
  const chartVerified = input.chart.timeConfidence === 'exact' && Array.isArray(input.chart.allPalaces) && input.chart.allPalaces.length === 12;
  const source = mapZiweiToDestinySource(input.chart);
  const heroStars = source.primaryStars.slice(0, 2);
  const primaryArchetype = heroStars[0]?.archetype ?? 'UNKNOWN';
  const archetypeCopy = ARCHETYPE_COPY[primaryArchetype];
  const elementSignals = [input.fiveElement?.primaryElement, input.fiveElement?.secondaryElement]
    .filter((item): item is FiveElementKey => Boolean(item))
    .map((item) => ELEMENT_SIGNAL_MAP[item])
    .filter((item, index, arr) => arr.indexOf(item) === index);
  const transformationTexts = source.transformations.map((item) => transformationLabel(item.type));
  const starNames = heroStars.map((star) => star.name);
  const title = starNames.length ? starNames.join(' × ') : '命盤主題';
  const cardType = chartVerified ? 'DESTINY_CARD' : 'BIRTHDAY_THEME_CARD';
  const supportingSymbols = [
    ...source.supportingStars.map((star) => star.name),
    ...transformationTexts,
    ...source.threeHarmony.slice(0, 4).map((item) => item.palaceName.replace('宮', '')),
  ];

  const card: ZiweiDestinyCard = {
    cardId: `ziwei-destiny-${input.analysisId}`,
    analysisId: input.analysisId,
    cardType,
    title: shortText(title, 10),
    subtitle: shortText(cardType === 'DESTINY_CARD' ? archetypeCopy.subtitle : '生日主題參考卡', 16),
    palace: {
      name: source.palaceName,
      symbol: PALACE_SYMBOLS[source.palaceId] ?? source.palaceName.slice(0, 1),
    },
    heroStars: heroStars.map((star) => ({ name: star.name, archetype: star.archetype })),
    supportingSymbols: supportingSymbols.slice(0, 8),
    visualTheme: {
      archetype: primaryArchetype,
      keywords: archetypeCopy.keywords,
      elementSignals: elementSignals.length ? elementSignals : ['SPACE'],
    },
    customerCopy: {
      coreTheme: shortText(`${source.palaceName}的核心訊號，是${archetypeCopy.subtitle}。`, 40),
      power: shortText(archetypeCopy.power, 50),
      challenge: shortText(archetypeCopy.challenge, 50),
      direction: shortText(archetypeCopy.direction, 40),
      action: shortText(archetypeCopy.action, 30),
    },
    evidence: {
      palace: source.palaceName,
      stars: [...source.primaryStars.map((star) => star.name), ...source.supportingStars.map((star) => star.name)],
      transformations: transformationTexts,
      threeHarmony: source.threeHarmony.map((item) => `${item.palaceName}:${item.signal}`),
    },
    verification: {
      chartVerified,
      mappingVerified: Boolean(source.palaceId && source.primaryStars.length > 0),
      customerCopyVerified: true,
      readyForFrontend: false,
    },
  };

  card.verification.readyForFrontend = card.verification.chartVerified
    && card.verification.mappingVerified
    && card.verification.customerCopyVerified;

  return card;
}