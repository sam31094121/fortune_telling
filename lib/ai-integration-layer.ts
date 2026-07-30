import { createHash } from 'crypto';
import { PLATFORM_FORBIDDEN_ANALYSIS_CALLS } from './platform-stability-layer';

export type AiIntegrationModuleId = 'nameology' | 'ziwei' | 'number' | 'soul_match' | 'music' | 'bazi' | 'zodiac';
export type AiIntegrationElement = 'EARTH' | 'WATER' | 'FIRE' | 'WIND' | 'SPACE';
export type AiCompanionStageId = 'empty' | 'starter' | 'cross_module' | 'complete';

export type AiIntegrationInput = {
  userId?: string | null;
  anonymousProfileId?: string | null;
  completedModules?: AiIntegrationModuleId[];
  primaryElement?: AiIntegrationElement | null;
  secondaryElement?: AiIntegrationElement | null;
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
  total: 7;
  unlockLevel: AiCompanionStageId;
  companionStage: AiCompanionStage;
  primaryElement: AiIntegrationElement;
  secondaryElement: AiIntegrationElement;
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
    defaultElement: 'WIND',
    evidence: '姓名學已完成，整合層只讀取已保存的性格與表達方向作為陪伴參考。',
  },
  {
    id: 'ziwei',
    title: 'AI 紫微斗數',
    shortTitle: '紫微',
    href: '/insight',
    defaultElement: 'SPACE',
    evidence: '紫微斗數已完成，整合層只讀取已保存的整體節奏與人生主題方向。',
  },
  {
    id: 'number',
    title: 'AI 數字論吉凶',
    shortTitle: '數字',
    href: '/numerology',
    defaultElement: 'FIRE',
    evidence: '數字論吉凶已完成，整合層只讀取已保存的行動、判斷與能量提醒。',
  },
  {
    id: 'soul_match',
    title: 'AI 靈魂配對',
    shortTitle: '配對',
    href: '/match',
    defaultElement: 'WATER',
    evidence: '靈魂配對已完成，整合層只讀取已保存的人際互動與情緒流動方向。',
  },
  {
    id: 'music',
    title: 'AI 生成音樂',
    shortTitle: '音樂',
    href: '/music',
    defaultElement: 'EARTH',
    evidence: '生命音樂已完成，整合層只讀取已保存的穩定、節奏與陪伴狀態。',
  },
  {
    id: 'bazi',
    title: 'AI 八字命盤',
    shortTitle: '八字',
    href: '/bazi',
    defaultElement: 'EARTH',
    evidence: '八字命盤已完成，整合層只讀取已保存的命盤摘要與元素方向，不重新排盤。',
  },
  {
    id: 'zodiac',
    title: 'AI 西洋星座',
    shortTitle: '星座',
    href: '/zodiac',
    defaultElement: 'WIND',
    evidence: 'AI 西洋星座已完成獨立分析，提供人格特質、優勢、忽略點與本週提醒作為成長中心補充來源。',
  },
];

const MODULE_INDEX = new Map(AI_INTEGRATION_MODULES.map((item, index) => [item.id, index]));
const MODULE_BY_ID = new Map(AI_INTEGRATION_MODULES.map((item) => [item.id, item]));
const ELEMENT_ORDER: AiIntegrationElement[] = ['EARTH', 'WATER', 'FIRE', 'WIND', 'SPACE'];

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
  if (modules.includes('zodiac') && modules.includes('nameology')) score.WIND += 1;
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

function getCompanionStage(completed: number): AiCompanionStage {
  if (completed === 0) {
    return {
      id: 'empty',
      label: '等待第一份資料',
      description: '成長中心先用固定節奏陪伴，完成任一張卡片後就會更貼近個人狀態。',
      returnReason: '本週先回來看提醒，下一步完成一張卡片即可提升陪伴品質。',
    };
  }
  if (completed < 3) {
    return {
      id: 'starter',
      label: '基礎陪伴啟動',
      description: '已能產生本週提醒、補強元素、能量色與一件行動任務。',
      returnReason: '每週回來完成一件小任務，逐步把陪伴內容變得更準。',
    };
  }
  if (completed < 7) {
    return {
      id: 'cross_module',
      label: '跨卡陪伴中',
      description: '已讀取多張已完成卡片，陪伴內容會更有層次，但仍不重複命理文字。',
      returnReason: '本週回來看第一補強與任務，下週會依同一套整合層更新。',
    };
  }
  return {
    id: 'complete',
    label: '完整陪伴循環',
    description: '六張卡片已完成，成長中心每週只輸出陪伴、提醒、能量色、任務與一句激勵。',
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
  const completed = completedModules.length;
  const nextModule = AI_INTEGRATION_MODULES.find((item) => !completedModules.includes(item.id)) ?? null;
  const companionStage = getCompanionStage(completed);

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
    total: 7,
    unlockLevel: companionStage.id,
    companionStage,
    primaryElement,
    secondaryElement,
    avoidElement: input.avoidElement ?? null,
    confidence: completed >= 3 ? 'high' : completed >= 1 ? 'medium' : 'low',
    evidence: completedModules.map((moduleId) => MODULE_BY_ID.get(moduleId)?.evidence ?? `${moduleId} 已完成。`),
    nextModule,
    nextWeeklyUpdateAt: nextMondayTaipei(now),
    nextMonthlyUpdateAt: nextMonthTaipei(now),
    dataPolicy: 'AI Integration Layer 只讀取六張卡片已完成的分析狀態與元素方向，不重新排盤、不重新算命、不重複呼叫任何命理分析。',
    ecosystemPolicy: '第五層只建立長期陪伴生態，不新增命理、不重複六張卡片內容、不覆蓋任何命理結果。',
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