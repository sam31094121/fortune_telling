import { createHash } from 'crypto';
import { PLATFORM_FORBIDDEN_ANALYSIS_CALLS } from './platform-stability-layer';

export type AiIntegrationModuleId = 'nameology' | 'ziwei' | 'number' | 'soul_match' | 'music' | 'bazi' | 'zodiac' | 'tarot';
export type AiIntegrationElement = 'EARTH' | 'WATER' | 'FIRE' | 'AIR' | 'SPACE';
export type AiIntegrationElementScore = Record<AiIntegrationElement, number>;
export type AiCompanionStageId = 'empty' | 'starter' | 'cross_module' | 'complete';

export type AiIntegrationInput = {
  userId?: string | null;
  anonymousProfileId?: string | null;
  completedModules?: AiIntegrationModuleId[];
  primaryElement?: AiIntegrationElement | null;
  secondaryElement?: AiIntegrationElement | null;
  elementScore?: Partial<AiIntegrationElementScore> | null;
  avoidElement?: AiIntegrationElement | null;
  analysisHash?: string | null;
  now?: Date;
};

export type AiIntegrationModuleMeta = {
  id: AiIntegrationModuleId;
  title: string;
  shortTitle: string;
  href: string;
  defaultElement: AiIntegrationElement;
  evidence: string;
};

export type AiCompanionStage = {
  id: AiCompanionStageId;
  label: string;
  description: string;
  returnReason: string;
};

export type AiIntegrationResult = {
  version: 'ai_integration_layer_v1';
  role: 'read_only_weekly_companion';
  profileId: string;
  weekKey: string;
  monthKey: string;
  personalizationSeed: string;
  monthlySeed: string;
  analysisHash: string;
  completedModules: AiIntegrationModuleId[];
  missingModules: AiIntegrationModuleId[];
  completed: number;
  total: number;
  unlockLevel: AiCompanionStageId;
  companionStage: AiCompanionStage;
  primaryElement: AiIntegrationElement;
  secondaryElement: AiIntegrationElement;
  elementScore: AiIntegrationElementScore;
  avoidElement: AiIntegrationElement | null;
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
  nextModule: AiIntegrationModuleMeta | null;
  nextWeeklyUpdateAt: string;
  nextMonthlyUpdateAt: string;
  dataPolicy: string;
  ecosystemPolicy: string;
  sourceModules: AiIntegrationModuleId[];
  forbiddenCalls: string[];
  pipeline: string[];
};

export const AI_INTEGRATION_MODULES: AiIntegrationModuleMeta[] = [
  {
    id: 'nameology',
    title: 'AI 姓名學',
    shortTitle: '姓名學',
    href: '/nameology',
    defaultElement: 'AIR',
    evidence: '姓名學已提供文字頻率、音韻與人格外顯訊號。',
  },
  {
    id: 'ziwei',
    title: 'AI 紫微斗數',
    shortTitle: '紫微',
    href: '/insight',
    defaultElement: 'SPACE',
    evidence: '紫微斗數已提供命盤宮位、主星與長期結構訊號。',
  },
  {
    id: 'number',
    title: 'AI 數字論吉凶',
    shortTitle: '數字',
    href: '/numerology',
    defaultElement: 'FIRE',
    evidence: '數字論吉凶已提供行動節奏、數字磁場與決策推進訊號。',
  },
  {
    id: 'soul_match',
    title: 'AI 靈魂配對',
    shortTitle: '配對',
    href: '/match',
    defaultElement: 'WATER',
    evidence: '靈魂配對已提供雙人互動、情緒流動與關係界線訊號。',
  },
  {
    id: 'music',
    title: 'AI 生成歌曲',
    shortTitle: '歌曲',
    href: '/music',
    defaultElement: 'EARTH',
    evidence: 'AI 生成歌曲已提供聲音記憶、陪伴節奏與穩定落地訊號。',
  },
  {
    id: 'bazi',
    title: 'AI 八字命盤',
    shortTitle: '八字',
    href: '/bazi',
    defaultElement: 'EARTH',
    evidence: '八字命盤已提供出生時間、干支結構與五行平衡訊號。',
  },
  {
    id: 'zodiac',
    title: 'AI 西洋星座',
    shortTitle: '星座',
    href: '/zodiac',
    defaultElement: 'AIR',
    evidence: '西洋星座已提供星座特質、外在互動與心理傾向訊號。',
  },
  {
    id: 'tarot',
    title: 'AI 塔羅牌',
    shortTitle: '塔羅牌',
    href: '/tarot',
    defaultElement: 'SPACE',
    evidence: '塔羅牌已提供牌陣、正逆位、象徵語義與五元素權重訊號。',
  },
];

const MODULE_INDEX = new Map(AI_INTEGRATION_MODULES.map((item, index) => [item.id, index]));
const MODULE_BY_ID = new Map(AI_INTEGRATION_MODULES.map((item) => [item.id, item]));
const ELEMENT_ORDER: AiIntegrationElement[] = ['EARTH', 'WATER', 'FIRE', 'AIR', 'SPACE'];

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function pick<T>(items: T[], seed: string, salt: string) {
  const n = Number.parseInt(hashText(`${seed}:${salt}`).slice(0, 8), 16);
  return items[n % items.length];
}

function taipeiDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')) };
}

function getWeekKey(now: Date) {
  const { year, month, day } = taipeiDateParts(now);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${weekYear}-W${String(weekNo).padStart(2, '0')}`;
}

function getMonthKey(now: Date) {
  const { year, month } = taipeiDateParts(now);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function nextMondayTaipei(now: Date) {
  const { year, month, day } = taipeiDateParts(now);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const dayNum = localDate.getUTCDay() || 7;
  localDate.setUTCDate(localDate.getUTCDate() + (8 - dayNum));
  return `${localDate.toISOString().slice(0, 10)}T00:00:00+08:00`;
}

function nextMonthTaipei(now: Date) {
  const { year, month } = taipeiDateParts(now);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+08:00`;
}

function normalizeModules(input?: AiIntegrationModuleId[]) {
  const known = new Set(AI_INTEGRATION_MODULES.map((item) => item.id));
  const result = Array.from(new Set((input ?? []).filter((item): item is AiIntegrationModuleId => known.has(item))));
  return result.sort((a, b) => (MODULE_INDEX.get(a) ?? 0) - (MODULE_INDEX.get(b) ?? 0));
}

function moduleElementScore(modules: AiIntegrationModuleId[]) {
  const score = Object.fromEntries(ELEMENT_ORDER.map((element) => [element, 0])) as Record<AiIntegrationElement, number>;
  modules.forEach((moduleId) => {
    const meta = MODULE_BY_ID.get(moduleId);
    if (!meta) return;
    score[meta.defaultElement] += 2;
  });
  if (modules.includes('bazi') && modules.includes('number')) score.FIRE += 1;
  if (modules.includes('soul_match') && modules.includes('nameology')) score.WATER += 1;
  if (modules.includes('ziwei') && modules.includes('music')) score.SPACE += 1;
  if (modules.includes('bazi') && modules.includes('music')) score.EARTH += 1;
  if (modules.includes('zodiac') && modules.includes('nameology')) score.AIR += 1;
  if (modules.includes('tarot') && modules.includes('ziwei')) score.SPACE += 1;
  if (modules.includes('tarot') && modules.includes('soul_match')) score.WATER += 1;
  if (modules.includes('tarot') && modules.includes('bazi')) score.EARTH += 1;
  return score;
}

function inferPrimaryElement(modules: AiIntegrationModuleId[], seed: string, explicit?: AiIntegrationElement | null) {
  if (explicit) return explicit;
  if (modules.length === 0) return pick(ELEMENT_ORDER, seed, 'empty-primary');
  const score = moduleElementScore(modules);
  return ELEMENT_ORDER
    .map((element) => ({ element, value: score[element], tie: Number.parseInt(hashText(`${seed}:${element}`).slice(0, 4), 16) }))
    .sort((a, b) => b.value - a.value || a.tie - b.tie)[0].element;
}

function inferSecondaryElement(primary: AiIntegrationElement, modules: AiIntegrationModuleId[], seed: string, explicit?: AiIntegrationElement | null) {
  if (explicit && explicit !== primary) return explicit;
  const score = moduleElementScore(modules);
  const sorted = ELEMENT_ORDER
    .filter((element) => element !== primary)
    .map((element) => ({ element, value: score[element], tie: Number.parseInt(hashText(`${seed}:secondary:${element}`).slice(0, 4), 16) }))
    .sort((a, b) => b.value - a.value || a.tie - b.tie);
  return sorted[0]?.element ?? pick(ELEMENT_ORDER.filter((element) => element !== primary), seed, 'secondary');
}

function clampElementScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildIntegrationElementScore(
  modules: AiIntegrationModuleId[],
  primary: AiIntegrationElement,
  secondary: AiIntegrationElement,
  explicit?: Partial<AiIntegrationElementScore> | null,
): AiIntegrationElementScore {
  const base = moduleElementScore(modules);
  const max = Math.max(...ELEMENT_ORDER.map((element) => base[element]), 1);
  const score = Object.fromEntries(ELEMENT_ORDER.map((element) => {
    const explicitValue = explicit?.[element];
    if (typeof explicitValue === 'number' && Number.isFinite(explicitValue)) return [element, clampElementScore(explicitValue)];
    return [element, clampElementScore((base[element] / max) * 70 + 20)];
  })) as AiIntegrationElementScore;

  score[primary] = Math.max(score[primary], 91);
  score[secondary] = Math.max(score[secondary], 76);
  return score;
}

function getCompanionStage(completed: number, total: number): AiCompanionStage {
  if (completed === 0) {
    return {
      id: 'empty',
      label: '尚未啟動',
      description: '尚未完成任何分析，成長中心只顯示啟動提示。',
      returnReason: '先完成任一張分析卡片，AI 才能建立第一層陪伴資料。',
    };
  }
  if (completed < 3) {
    return {
      id: 'starter',
      label: '初始陪伴',
      description: '已累積第一批分析訊號，成長中心開始整理每週方向。',
      returnReason: '再完成兩項分析，AI 的交叉整理會更精準。',
    };
  }
  if (completed < total) {
    return {
      id: 'cross_module',
      label: '交叉整合',
      description: '已具備跨模組訊號，成長中心會輸出更明確的元素補強排序。',
      returnReason: '繼續完成剩餘卡片，讓平台形成完整陪伴循環。',
    };
  }
  return {
    id: 'complete',
    label: '完整陪伴循環',
    description: '全部分析卡片已完成，成長中心每週只輸出陪伴、提醒、能量色、任務與一句激勵。',
    returnReason: '每週回來看新的提醒與任務，讓平台變成長期陪伴。',
  };
}

export function buildAiIntegrationLayer(input: AiIntegrationInput): AiIntegrationResult {
  const now = input.now ?? new Date();
  const completedModules = normalizeModules(input.completedModules);
  const missingModules = AI_INTEGRATION_MODULES.map((item) => item.id).filter((id) => !completedModules.includes(id));
  const identity = input.userId || input.anonymousProfileId || 'anonymous';
  const profileId = hashText(identity).slice(0, 16);
  const analysisHash = input.analysisHash || hashText(completedModules.join('|') || 'empty').slice(0, 16);
  const weekKey = getWeekKey(now);
  const monthKey = getMonthKey(now);
  const personalizationSeed = hashText([identity, weekKey, completedModules.join(','), analysisHash, 'ai_integration_layer_v1'].join('|'));
  const monthlySeed = hashText([identity, monthKey, completedModules.join(','), analysisHash, 'ai_lifetime_companion_v1'].join('|'));
  const primaryElement = inferPrimaryElement(completedModules, personalizationSeed, input.primaryElement);
  const secondaryElement = inferSecondaryElement(primaryElement, completedModules, personalizationSeed, input.secondaryElement);
  const elementScore = buildIntegrationElementScore(completedModules, primaryElement, secondaryElement, input.elementScore);
  const completed = completedModules.length;
  const total = AI_INTEGRATION_MODULES.length;
  const nextModule = AI_INTEGRATION_MODULES.find((item) => !completedModules.includes(item.id)) ?? null;
  const companionStage = getCompanionStage(completed, total);

  return {
    version: 'ai_integration_layer_v1',
    role: 'read_only_weekly_companion',
    profileId,
    weekKey,
    monthKey,
    personalizationSeed,
    monthlySeed,
    analysisHash,
    completedModules,
    missingModules,
    completed,
    total,
    unlockLevel: companionStage.id,
    companionStage,
    primaryElement,
    secondaryElement,
    elementScore,
    avoidElement: input.avoidElement ?? null,
    confidence: completed >= 3 ? 'high' : completed >= 1 ? 'medium' : 'low',
    evidence: completedModules.map((moduleId) => MODULE_BY_ID.get(moduleId)?.evidence ?? `${moduleId} 已完成。`),
    nextModule,
    nextWeeklyUpdateAt: nextMondayTaipei(now),
    nextMonthlyUpdateAt: nextMonthTaipei(now),
    dataPolicy: 'AI Integration Layer 只讀取八張分析卡片已完成的狀態與元素方向，不重新排盤、不重新算命、不重複呼叫任何命理分析。',
    ecosystemPolicy: '第五層只建立長期陪伴生態，不新增命理、不重複各卡片內容、不覆蓋任何命理結果。',
    sourceModules: completedModules,
    forbiddenCalls: [...PLATFORM_FORBIDDEN_ANALYSIS_CALLS],
    pipeline: ['ReadCompletedModuleState', 'NormalizeElementSignal', 'ChooseWeeklyPrimaryElement', 'BuildWeeklyCompanionPayload', 'BuildCompanionReturnLoop', 'BuildLifetimeCompanionEcosystem', 'ReturnGrowthCenterViewModel'],
  };
}

export function parseAiIntegrationModules(value: string | null): AiIntegrationModuleId[] {
  if (!value) return [];
  const known = new Set(AI_INTEGRATION_MODULES.map((item) => item.id));
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is AiIntegrationModuleId => known.has(item as AiIntegrationModuleId));
}