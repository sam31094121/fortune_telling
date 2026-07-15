import type { InsightRequest } from './types';
import type { ZiweiPalaceEvidence, ZiweiSanFangAnalysis } from './ziwei-sanfang-engine';

type PalaceKey = ZiweiPalaceEvidence['key'];

interface AnnualFortuneInput {
  request: InsightRequest;
  ziweiSanFang: ZiweiSanFangAnalysis;
  sourceSignals: Array<{ dimension: string; score: number }>;
  targetYear?: number;
}

export interface AnnualPalaceFortune {
  palaceKey: PalaceKey;
  palaceName: string;
  focus: string;
  score: number;
  trend: string;
  basis: string;
  strengths: string[];
  tensions: string[];
  behaviorTags: string[];
  scores: {
    initiative: number;
    stability: number;
    flexibility: number;
    social: number;
    execution: number;
    resource: number;
    pressure: number;
    growth: number;
  };
  advice: string;
  encouragement: string;
  action: string;
}

export interface AdviceMatrix {
  confidence: number;
  initiative: number;
  patience: number;
  communication: number;
  execution: number;
  financialDiscipline: number;
  adaptability: number;
  relationshipAwareness: number;
  stressManagement: number;
  learningGrowth: number;
}

export interface AnnualFortuneAnalysis {
  year: number;
  ganzhi: string;
  yearElement: string;
  level: string;
  overallScore: number;
  annualTheme: string;
  timeConfidence: 'exact' | 'estimated';
  baziFocus: {
    dayMaster: string;
    yearRelation: string;
    elementBalanceSummary: string;
    advice: string;
  };
  sanFangFourZheng: AnnualPalaceFortune[];
  adviceMatrix: AdviceMatrix;
  motivation: {
    coreEncouragement: string;
    mainStrength: string;
    mainWarning: string;
    actionAdvice: string;
    growthReminder: string;
  };
  recommendations: string[];
  encouragements: string[];
  summary: string;
  ruleVersion: string;
}

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const STEM_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
  庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const STAR_ELEMENT: Record<string, string> = {
  紫微: '土', 天機: '木', 太陽: '火', 武曲: '金', 天同: '水', 廉貞: '火', 天府: '土',
  太陰: '水', 貪狼: '木', 巨門: '水', 天相: '水', 天梁: '土', 七殺: '金', 破軍: '水',
};

const GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const POSITIVE_TRANSFORMATIONS = new Set(['祿', '權', '科']);
const PALACE_SCORE_LABELS: Record<keyof AnnualPalaceFortune['scores'], string> = {
  initiative: '主動推進',
  stability: '穩定累積',
  flexibility: '彈性調整',
  social: '人際連結',
  execution: '執行落地',
  resource: '資源整合',
  pressure: '壓力承載',
  growth: '學習成長',
};

const PALACE_COPY: Record<PalaceKey, {
  theme: string;
  high: string[];
  mid: string[];
  low: string[];
  action: string[];
  strengths: string[];
  tensions: string[];
  tags: string[];
}> = {
  MING: {
    theme: '自我定位與行動節奏',
    high: [
      '今年適合把主導權拿回來，先定義自己的節奏，再決定要接受哪些邀請。',
      '今年命宮能量偏主動，越清楚自己的優先順序，越容易把機會握在手上。',
      '今年可以把「我真正想成為誰」放在前面，行動會比等待更能開運。',
    ],
    mid: [
      '今年重點是穩住內在節奏，少被外界推著走，先把真正重要的事排到前面。',
      '今年適合先整理生活秩序，再推動較大的計畫，穩住就會有進展。',
      '今年命宮提醒你不必急著衝刺，先把方向看清楚，速度自然會回來。',
    ],
    low: [
      '今年不要急著證明自己，先把作息、情緒與承諾整理好，氣場會慢慢回正。',
      '今年先練習少承擔不必要的期待，把精神收回到真正能掌控的事。',
      '今年命宮比較需要養氣，先把自己照顧好，才有力氣處理外界要求。',
    ],
    action: [
      '每週固定檢查一次目標，留下三件最值得投入的事。',
      '每天先完成一件能推動長期目標的小事。',
      '遇到重要選擇時，先寫下「我要什麼」再回覆別人。',
    ],
    strengths: ['行動主導', '自我校準', '目標意識'],
    tensions: ['過度承擔', '節奏被外界打亂', '急著證明自己'],
    tags: ['initiative', 'identity', 'self-leadership'],
  },
  CAI_BO: {
    theme: '資源配置與金錢安全感',
    high: [
      '今年財帛訊號偏開，適合做資源整合、技能變現與長期配置。',
      '今年適合把能力轉成可累積的資源，收入來源可從穩定小步開始擴張。',
      '今年財帛宮支持你重新整理價值感，懂得收費、分配與累積會更順。',
    ],
    mid: [
      '今年財務宜走穩健路線，先把現金流、支出習慣與合作條件看清楚。',
      '今年適合建立預算感，不必冒進，先讓每筆資源都有清楚位置。',
      '今年財務重點在穩，不在賭；越能紀律管理，越能看見安全感。',
    ],
    low: [
      '今年財帛宮提醒你保守一點，不要因為情緒或人情做太快的金錢決定。',
      '今年金錢壓力若變強，先暫停大額承諾，把基本盤守住就是轉運。',
      '今年不適合用衝動換短暫安心，資源要先留給真正重要的方向。',
    ],
    action: [
      '先做一份三個月資金表，再決定投資、進修或合作的順序。',
      '把收入、必要支出、成長投資分成固定比例。',
      '每週檢查一次花費，把一項消耗改成一項累積。',
    ],
    strengths: ['資源整合', '長期累積', '價值交換'],
    tensions: ['衝動支出', '人情壓力', '安全感不足'],
    tags: ['resource', 'finance', 'discipline'],
  },
  GUAN_LU: {
    theme: '職涯推進與角色升級',
    high: [
      '今年官祿宮有推進感，適合承接更高責任，讓專業被看見。',
      '今年工作舞台可以更往前一步，主動提出方案會比等待安排更有利。',
      '今年適合把專業做成作品，讓別人看見你的可靠度與執行力。',
    ],
    mid: [
      '今年工作運不是硬衝，而是把流程、作品與人脈慢慢堆成可信任的招牌。',
      '今年職涯重點在打底，穩定完成比華麗表現更能累積口碑。',
      '今年適合把責任分層處理，先把基本盤做好，再承接更大的任務。',
    ],
    low: [
      '今年職涯先別貪多，越想一次到位越容易分散，專注一條主線會比較順。',
      '今年工作壓力若集中，先拆階段、排順序，不要把所有事都扛在同一天。',
      '今年官祿宮提醒你慢一點反而更準，先修正方法，再追求速度。',
    ],
    action: [
      '挑一個最能累積履歷的任務，連續三十天做出可展示成果。',
      '把今年最重要的工作目標拆成四個可驗收節點。',
      '每週整理一次成果紀錄，讓努力變成能被看見的證據。',
    ],
    strengths: ['執行落地', '責任承擔', '專業累積'],
    tensions: ['任務過載', '方向分散', '壓力延宕'],
    tags: ['career', 'execution', 'responsibility'],
  },
  QIAN_YI: {
    theme: '外部機會與貴人環境',
    high: [
      '今年外部機會明顯，適合走出去、曝光、談合作，讓環境替你開門。',
      '今年離開熟悉圈子後反而容易看見新可能，適合主動連結不同領域。',
      '今年遷移宮帶來舞台感，越願意被看見，越容易遇到可合作的人。',
    ],
    mid: [
      '今年貴人運來自穩定互動，不必急著換圈子，先把既有人脈經營深。',
      '今年外部機會需要篩選，不是每個邀請都要接，選對場域更重要。',
      '今年適合慢慢擴大活動半徑，先讓新環境認識你的價值。',
    ],
    low: [
      '今年外部變動較多，先觀察環境規則，確認安全再擴張會比較有利。',
      '今年遇到陌生合作要先看清條件，不急著承諾，保留彈性會更穩。',
      '今年遷移宮提醒你先守住界線，外界機會才不會變成消耗。',
    ],
    action: [
      '每月主動連結兩位關鍵人物，重點放在交換價值，不只是求幫忙。',
      '每次進入新圈子前，先設定一個明確目的。',
      '安排一個能提升曝光或拓展視野的小行動。',
    ],
    strengths: ['外部連結', '環境適應', '貴人互動'],
    tensions: ['界線模糊', '環境壓力', '過度迎合'],
    tags: ['adaptability', 'network', 'opportunity'],
  },
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickStable<T>(items: T[], seed: number, salt = 0) {
  return items[(seed + salt) % items.length];
}

function calculateGanzhiYear(year: number) {
  const stem = STEMS[((year - 4) % 10 + 10) % 10];
  const branch = BRANCHES[((year - 4) % 12 + 12) % 12];
  return {
    stem,
    branch,
    ganzhi: `${stem}${branch}`,
    element: STEM_ELEMENT[stem] ?? '未知',
  };
}

function getElementRelation(dayMasterElement: string, annualElement: string) {
  if (annualElement === dayMasterElement) return '比和';
  if (GENERATES[annualElement] === dayMasterElement) return '流年生扶日主';
  if (GENERATES[dayMasterElement] === annualElement) return '日主向外輸出';
  if (CONTROLS[dayMasterElement] === annualElement) return '日主可制化流年';
  if (CONTROLS[annualElement] === dayMasterElement) return '流年帶來壓力鍛鍊';
  return '五行關係待校';
}

function relationScore(relation: string) {
  if (relation === '比和') return 8;
  if (relation.includes('生扶')) return 12;
  if (relation.includes('輸出')) return 6;
  if (relation.includes('制化')) return 4;
  if (relation.includes('壓力')) return -8;
  return 0;
}

function trendLabel(score: number) {
  if (score >= 85) return '強勢開展';
  if (score >= 75) return '正向推進';
  if (score >= 65) return '穩定累積';
  if (score >= 50) return '需要調整';
  return '先守後進';
}

function overallLevel(score: number) {
  if (score >= 85) return '高正向';
  if (score >= 75) return '偏正向';
  if (score >= 65) return '穩定上升';
  if (score >= 50) return '調整期';
  return '修整蓄力';
}

function elementBalanceSummary(balance: Record<string, number>) {
  const sorted = Object.entries(balance).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0];
  const lightest = sorted[sorted.length - 1];
  return `四柱五行以${strongest?.[0] ?? '未知'}較明顯，${lightest?.[0] ?? '未知'}相對較少。`;
}

function buildPalaceScores(
  palace: ZiweiPalaceEvidence,
  signal: number,
  annualStarSupport: number,
  positiveCount: number,
  tabooCount: number,
  relation: string,
  seed: number,
): AnnualPalaceFortune['scores'] {
  const relationBoost = relationScore(relation);
  const starDensity = Math.min(18, palace.majorStars.length * 4 + palace.minorStars.length);
  const offset = (seed % 11) - 5;
  const pressureBase = 35 + tabooCount * 18 + Math.max(0, -relationBoost) + ((seed >> 3) % 10);

  return {
    initiative: clampScore(signal * 0.45 + starDensity + positiveCount * 6 + relationBoost + offset),
    stability: clampScore(52 + signal * 0.25 + positiveCount * 4 - tabooCount * 7 + ((seed >> 4) % 12)),
    flexibility: clampScore(46 + annualStarSupport * 9 + ((seed >> 5) % 24) - tabooCount * 3),
    social: clampScore(44 + palace.minorStars.length * 2 + annualStarSupport * 6 + ((seed >> 6) % 20)),
    execution: clampScore(signal * 0.42 + positiveCount * 8 + starDensity - tabooCount * 5 + ((seed >> 7) % 10)),
    resource: clampScore(48 + signal * 0.35 + annualStarSupport * 5 + positiveCount * 6 - tabooCount * 4),
    pressure: clampScore(pressureBase),
    growth: clampScore(55 + annualStarSupport * 7 + positiveCount * 6 + Math.max(0, relationBoost) + ((seed >> 8) % 12)),
  };
}

function mergeAdviceMatrix(
  palaces: AnnualPalaceFortune[],
  dataCompleteness: number,
): AdviceMatrix {
  const weightMap: Record<PalaceKey, number> = {
    MING: 0.35,
    CAI_BO: 0.2,
    GUAN_LU: 0.25,
    QIAN_YI: 0.2,
  };
  const weighted = (selector: (item: AnnualPalaceFortune) => number) => clampScore(
    palaces.reduce((sum, item) => sum + selector(item) * weightMap[item.palaceKey], 0),
  );
  const pressure = weighted((item) => item.scores.pressure);

  return {
    confidence: clampScore(dataCompleteness),
    initiative: weighted((item) => item.scores.initiative),
    patience: weighted((item) => item.scores.stability),
    communication: weighted((item) => (item.scores.social + item.scores.flexibility) / 2),
    execution: weighted((item) => item.scores.execution),
    financialDiscipline: weighted((item) => item.palaceKey === 'CAI_BO' ? item.scores.resource : item.scores.stability),
    adaptability: weighted((item) => item.palaceKey === 'QIAN_YI' ? item.scores.flexibility : item.scores.growth),
    relationshipAwareness: weighted((item) => (item.scores.social + item.scores.pressure) / 2),
    stressManagement: clampScore(100 - pressure * 0.55 + weighted((item) => item.scores.stability) * 0.25),
    learningGrowth: weighted((item) => item.scores.growth),
  };
}

function matrixTopAndBottom(matrix: AdviceMatrix) {
  const entries = [
    ['主動推進', matrix.initiative],
    ['耐心累積', matrix.patience],
    ['溝通協調', matrix.communication],
    ['執行落地', matrix.execution],
    ['財務紀律', matrix.financialDiscipline],
    ['環境適應', matrix.adaptability],
    ['關係覺察', matrix.relationshipAwareness],
    ['壓力管理', matrix.stressManagement],
    ['學習成長', matrix.learningGrowth],
  ] as const;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return { top: sorted[0], bottom: sorted[sorted.length - 1] };
}

function buildPalaceFortune(
  palace: ZiweiPalaceEvidence,
  input: AnnualFortuneInput,
  relation: string,
  annualElement: string,
): AnnualPalaceFortune {
  const copy = PALACE_COPY[palace.key];
  const positiveCount = palace.transformations.filter((item) => POSITIVE_TRANSFORMATIONS.has(item)).length;
  const tabooCount = palace.transformations.filter((item) => item === '忌').length;
  const majorStars = palace.majorStars.length > 0 ? palace.majorStars : ['無主星'];
  const annualStarSupport = majorStars.reduce((count, star) => {
    const element = STAR_ELEMENT[star];
    if (!element) return count;
    if (element === annualElement || GENERATES[annualElement] === element || GENERATES[element] === annualElement) {
      return count + 1;
    }
    return count;
  }, 0);
  const seed = stableHash(`${input.request.name}|${input.request.birthDate}|${input.request.bloodType}|${palace.key}|${input.targetYear ?? ''}`);
  const signal = input.sourceSignals[seed % Math.max(1, input.sourceSignals.length)]?.score ?? 62;
  const personalOffset = (seed % 13) - 6;
  const score = clampScore(
    45
    + signal * 0.25
    + relationScore(relation)
    + positiveCount * 7
    + annualStarSupport * 4
    - tabooCount * 10
    + personalOffset,
  );
  const trend = trendLabel(score);
  const advicePool = score >= 75 ? copy.high : score >= 60 ? copy.mid : copy.low;
  const advice = pickStable(advicePool, seed, score);
  const action = pickStable(copy.action, seed, score * 3);
  const starsText = majorStars.join('、');
  const transformations = palace.transformations.length > 0 ? palace.transformations.join('、') : '無四化';
  const scores = buildPalaceScores(palace, signal, annualStarSupport, positiveCount, tabooCount, relation, seed);
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const strengths = [
    pickStable(copy.strengths, seed, 1),
    `${PALACE_SCORE_LABELS[sortedScores[0][0] as keyof AnnualPalaceFortune['scores']]} ${sortedScores[0][1]}分`,
  ];
  const tensions = [
    tabooCount > 0 ? '四化忌帶來年度壓力' : pickStable(copy.tensions, seed, 2),
    scores.pressure >= 70 ? '責任集中時要拆階段處理' : '避免把能量分散在不必要承諾',
  ];
  const behaviorTags = [...new Set([
    ...copy.tags,
    score >= 75 ? 'annual-strong' : score >= 60 ? 'annual-steady' : 'annual-adjust',
    annualStarSupport > 0 ? 'year-element-support' : 'year-element-neutral',
  ])];

  return {
    palaceKey: palace.key,
    palaceName: palace.name,
    focus: copy.theme,
    score,
    trend,
    basis: `${palace.name}主星 ${starsText}，四化 ${transformations}；今年流年五行為${annualElement}，與此宮形成 ${annualStarSupport} 個星曜呼應訊號。`,
    strengths,
    tensions,
    behaviorTags,
    scores,
    advice,
    encouragement: `${input.request.name.trim()}，今年${palace.name}的課題不是要你變成別人，而是把「${copy.theme}」練得更穩。${scores.growth >= 75 ? '你已經具備把壓力轉成成長的條件。' : '你只要願意每天推進一點，運勢就會從可控的小事開始打開。'}`,
    action,
  };
}

function buildMotivationOutput(
  request: InsightRequest,
  matrix: AdviceMatrix,
  palaces: AnnualPalaceFortune[],
  yearLabel: string,
) {
  const { top, bottom } = matrixTopAndBottom(matrix);
  const strongestPalace = [...palaces].sort((a, b) => b.score - a.score)[0];
  const pressurePalace = [...palaces].sort((a, b) => b.scores.pressure - a.scores.pressure)[0];
  const seed = stableHash(`${request.name}|${request.birthDate}|${yearLabel}|motivation|${top[0]}|${bottom[0]}`);

  const encouragementOptions = [
    `${request.name.trim()}，${yearLabel}不是要你一次翻轉人生，而是把最有力的「${top[0]}」練成每天都能使用的能力。`,
    `${request.name.trim()}，今年真正重要的不是完美，而是讓「${strongestPalace.focus}」變成你穩定前進的底氣。`,
    `${request.name.trim()}，你今年的運勢關鍵在於把能做的事做深，先穩住一個方向，其他機會會慢慢靠近。`,
  ];
  const warningOptions = [
    `今年要留意「${bottom[0]}」相對需要補強，重要事情適合先拆小再執行，不必一次扛完。`,
    `今年${pressurePalace.palaceName}壓力訊號較明顯，遇到責任集中時，先排順序，再談速度。`,
    `今年不要用焦慮推動自己，越是關鍵選擇，越需要先整理條件與界線。`,
  ];
  const actionOptions = [
    matrix.financialDiscipline >= 75
      ? '把收入、支出與成長投資分成固定比例，讓財務安全感變成長期優勢。'
      : '先建立一個每週可檢查的小目標，用穩定節奏累積今年的成果。',
    matrix.adaptability >= 75
      ? '主動接觸不同領域，但每次只設定一個明確目標，避免機會太多反而分散。'
      : '今年先選一個最重要的方向深耕，少做消耗型承諾。',
    matrix.execution >= 70
      ? '把想法變成三十天行動表，讓執行力真正落地。'
      : '先把任務拆成三段，完成第一段後再擴大，不急著一次到位。',
  ];

  return {
    coreEncouragement: pickStable(encouragementOptions, seed),
    mainStrength: `目前優勢在「${top[0]}」與「${strongestPalace.palaceName}」，今年適合優先用在${strongestPalace.focus}。`,
    mainWarning: pickStable(warningOptions, seed, 3),
    actionAdvice: pickStable(actionOptions, seed, 7),
    growthReminder: `成長提醒：${bottom[0]}不是弱點標籤，而是今年最值得用小步驟修正的轉運點。`,
  };
}

export function calculateAnnualFortune(input: AnnualFortuneInput): AnnualFortuneAnalysis {
  const year = input.targetYear ?? new Date().getFullYear();
  const annual = calculateGanzhiYear(year);
  const dayMaster = input.ziweiSanFang.bazi.dayMaster;
  const dayMasterElement = dayMaster.replace(/^[甲乙丙丁戊己庚辛壬癸]/, '');
  const relation = getElementRelation(dayMasterElement, annual.element);
  const palaceFortunes = input.ziweiSanFang.palaces.map((palace) => (
    buildPalaceFortune(palace, input, relation, annual.element)
  ));
  const adviceMatrix = mergeAdviceMatrix(palaceFortunes, input.ziweiSanFang.dataCompleteness);
  const motivation = buildMotivationOutput(input.request, adviceMatrix, palaceFortunes, `${year} ${annual.ganzhi}年`);
  const matrixSignal = matrixTopAndBottom(adviceMatrix);
  const overallScore = clampScore(
    palaceFortunes.reduce((sum, item) => sum + item.score, 0) / Math.max(1, palaceFortunes.length)
    + relationScore(relation) * 0.35
  );
  const strongest = [...palaceFortunes].sort((a, b) => b.score - a.score)[0];
  const weakest = [...palaceFortunes].sort((a, b) => a.score - b.score)[0];
  const level = overallLevel(overallScore);
  const balanceSummary = elementBalanceSummary(input.ziweiSanFang.bazi.elementBalance);
  const confidenceNote = input.ziweiSanFang.timeConfidence === 'exact'
    ? '此區只判讀今年流年運勢，並已使用使用者選定時辰。'
    : '此區只判讀今年流年運勢；目前先採暫定良辰，真實時辰可再校正今年三方四正細節。';

  return {
    year,
    ganzhi: annual.ganzhi,
    yearElement: annual.element,
    level,
    overallScore,
    annualTheme: `本區只看${year} ${annual.ganzhi}年的流年運勢。${annual.ganzhi}年以${annual.element}氣為主，對日主${dayMaster}形成「${relation}」；今年主軸落在${strongest.focus}，同時需要照顧${weakest.focus}。`,
    timeConfidence: input.ziweiSanFang.timeConfidence,
    baziFocus: {
      dayMaster,
      yearRelation: relation,
      elementBalanceSummary: balanceSummary,
      advice: `${balanceSummary}${relation.includes('壓力') ? '今年遇到壓力時，先把節奏放慢，壓力會變成磨出能力的材料。' : '今年適合把順勢而來的資源整理成固定節奏，讓好運變成可持續的成果。'}`,
    },
    sanFangFourZheng: palaceFortunes,
    adviceMatrix,
    motivation,
    recommendations: [
      `先把今年最強的「${strongest.palaceName}」用在${strongest.focus}，不要把力氣平均分散。`,
      `相對需要照顧的「${weakest.palaceName}」不必害怕，照著小行動補強，反而會成為今年的轉運點。`,
      adviceMatrix.financialDiscipline >= 75
        ? '今年財務紀律是可用優勢，重大決定先看長期累積，不追短線刺激。'
        : '所有重大決定先看三件事：是否能累積作品、是否能穩定現金流、是否讓你靠近更好的環境。',
      `今年矩陣最高訊號是「${matrixSignal.top[0]}」，最低訊號是「${matrixSignal.bottom[0]}」，建議用強項帶動待補區。`,
    ],
    encouragements: [
      motivation.coreEncouragement,
      `當你願意把每天的小進度守住，${annual.ganzhi}年的能量會慢慢變成你的底氣。`,
      motivation.growthReminder,
    ],
    summary: `${year} ${annual.ganzhi}年流年運勢整體為「${level}」傾向，綜合分數 ${overallScore}。${confidenceNote} 這不是終身本命定論，只是今年命盤三方四正的年度參考。今年最值得把握的是${strongest.palaceName}的${strongest.focus}，需要留意的是${weakest.palaceName}的${weakest.focus}；建議以穩定行動累積成果，不做恐懼式決策。`,
    ruleVersion: 'Annual Ziwei Bazi Fortune V1.0',
  };
}
