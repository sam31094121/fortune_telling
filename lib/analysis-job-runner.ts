import { analyzeNumberCore, validateNumberCoreInput } from './number-core-engine';
import { buildNumberFiveElementResult, buildNameologyFiveElementResult, buildBaziFiveElementResult, buildZodiacFiveElementResult, type FiveElementKey } from './five-element-engine';
import { getNamePersonalityScores } from './name-model-db';
import { buildNameologyAnalysis } from './nameology-engine';
import { buildNameologyBaziCrossCheck, normalizeNameologyShichen } from './nameology-bazi-crosscheck';
import { loadLocalNameologyDictionary } from './nameology-dictionary-loader';
import { generateInsightAnalysis } from './insight-engine';
import { analyzeBazi, type BaziAnalysisInput } from './bazi-engine';
import { attachBaziProfessionalCoreV5, type BaziRuntimeInput } from './bazi-professional-result-v5';
import { analyzeZodiac } from './zodiac-engine';
import { isValidBirthday } from './validation';
import type { BloodType, Gender, InsightRequest } from './types';
import { TAROT_CARDS } from '../features/tarot/data/cards';
import { ANALYSIS_MODULES, moduleIdForAnalysisType, type AnalysisModuleId } from './analysis-module-router';
import {
  completeAnalysisJob,
  failAnalysisJob,
  getAnalysisJob,
  updateAnalysisJob,
  type AnalysisJob,
} from './analysis-job-store';

const VALID_BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const VALID_GENDERS = ['male', 'female'] as const;
const TRADITIONAL_TO_FIVE_ELEMENT: Record<string, FiveElementKey> = {
  '\u91d1': 'metal',
  '\u6728': 'wood',
  '\u6c34': 'water',
  '\u706b': 'fire',
  '\u571f': 'earth',
};

function traditionalToFiveElement(element: string): FiveElementKey {
  return TRADITIONAL_TO_FIVE_ELEMENT[element] ?? 'earth';
}

function buildBaziElementEnergy(elementCounts: Record<string, number>) {
  const keys: FiveElementKey[] = ['metal', 'wood', 'water', 'fire', 'earth'];
  const raw = Object.fromEntries(keys.map((key) => [key, 0])) as Record<FiveElementKey, number>;
  Object.entries(elementCounts).forEach(([traditional, count]) => {
    raw[traditionalToFiveElement(traditional)] += Number(count) || 0;
  });
  const max = Math.max(...keys.map((key) => raw[key]), 1);
  return Object.fromEntries(keys.map((key) => [key, Math.round((raw[key] / max) * 100)])) as Record<FiveElementKey, number>;
}

type NameologyJobInput = {
  name: string;
  birthDate: string;
  gender: Gender;
};

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('\u8acb\u63d0\u4f9b\u6709\u6548\u7684\u5206\u6790\u8cc7\u6599\u3002');
}

function normalizeNameologyInput(value: unknown): NameologyJobInput {
  assertRecord(value);
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const birthDate = typeof value.birthDate === 'string' ? value.birthDate : '';
  const gender = value.gender as Gender;

  if (name.length < 2) throw new Error('\u8acb\u8f38\u5165\u81f3\u5c11 2 \u500b\u5b57\u7684\u59d3\u540d\u3002');
  if (name.length > 20) throw new Error('\u59d3\u540d\u8acb\u52ff\u8d85\u904e 20 \u500b\u5b57\u3002');
  if (!isValidBirthday(birthDate)) throw new Error('\u8acb\u63d0\u4f9b\u6709\u6548\u751f\u65e5\u3002');
  if (!VALID_GENDERS.includes(gender)) throw new Error('\u8acb\u9078\u64c7\u6709\u6548\u6027\u5225\u3002');
  return { name, birthDate, gender };
}

function normalizeInsightInput(value: unknown): InsightRequest {
  const input = normalizeNameologyInput(value);
  assertRecord(value);
  // 紫微既有血型規則保留；姓名學不再收集或校正血型。
  const bloodType = value.bloodType as Exclude<BloodType, ''>;
  if (!VALID_BLOOD_TYPES.includes(bloodType)) throw new Error('\u8acb\u9078\u64c7\u6709\u6548\u8840\u578b\u3002');
  const rawShichen = value.shichen;
  const shichen = rawShichen === undefined || rawShichen === null || rawShichen === 'unknown'
    ? rawShichen as InsightRequest['shichen']
    : typeof rawShichen === 'number' && Number.isInteger(rawShichen) && rawShichen >= 0 && rawShichen <= 11
      ? rawShichen
      : null;

  return {
    ...input,
    birthTime: typeof value.birthTime === 'string' && value.birthTime.length > 0 ? value.birthTime : '12:00',
    shichen,
    longitude: typeof value.longitude === 'number' && Number.isFinite(value.longitude) ? value.longitude : undefined,
  };
}

function normalizeBaziInput(value: unknown): BaziRuntimeInput {
  assertRecord(value);
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const birthDate = typeof value.birthDate === 'string' ? value.birthDate : '';
  const timeUnknown = value.timeUnknown === true || value.birthHourBranch === 'unknown' || value.birthTimeKnown === false;
  const birthTime = typeof value.birthTime === 'string' && value.birthTime.length > 0 ? value.birthTime : '12:00';
  const gender = value.gender as BaziAnalysisInput['gender'];
  const country = typeof value.country === 'string' && value.country.trim().length > 0 ? value.country.trim() : '台灣';
  const city = typeof value.city === 'string' && value.city.trim().length > 0 ? value.city.trim() : '台北';

  if (name.length > 20) throw new Error('姓名請勿超過 20 個字。');
  if (!isValidBirthday(birthDate)) throw new Error('請提供有效生日。');
  if (!timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) throw new Error('請選擇有效出生時間。');
  if (!VALID_GENDERS.includes(gender)) throw new Error('請選擇有效性別。');
  return {
    name,
    birthDate,
    birthTime,
    gender,
    country,
    city,
    calculationId: typeof value.calculationId === 'string' ? value.calculationId : undefined,
    birthTimeKnown: timeUnknown ? false : value.birthTimeKnown as boolean | undefined,
    timeUnknown,
    birthHourBranch: typeof value.birthHourBranch === 'string' ? value.birthHourBranch : undefined,
    traditionalHour: typeof value.traditionalHour === 'string' ? value.traditionalHour : undefined,
    calendarType: value.calendarType === 'lunar' || value.calendarType === 'LUNAR' ? value.calendarType : 'solar',
  };
}

async function withJobTimeout<T>(task: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runNumberJob(job: AnalysisJob, inputData: unknown) {
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: ANALYSIS_MODULES.NUMBER.loadingCopy.validating });
  assertRecord(inputData);
  const value = typeof inputData.value === 'string' ? inputData.value.trim() : '';
  const mode = validateNumberCoreInput(value);
  if (typeof mode !== 'string') throw new Error(mode.message);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: ANALYSIS_MODULES.NUMBER.loadingCopy.processing });
  const result = analyzeNumberCore(value);
  if (!result.ok) throw new Error(result.message);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: ANALYSIS_MODULES.NUMBER.loadingCopy.finalizing });
  return { ...result, mode, moduleId: job.moduleId, fiveElement: buildNumberFiveElementResult(result) };
}

async function runNameologyJob(job: AnalysisJob, inputData: unknown) {
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: ANALYSIS_MODULES.NAMEOLOGY.loadingCopy.validating });
  const input = normalizeNameologyInput(inputData);
  const shichen = normalizeNameologyShichen((inputData as Record<string, unknown>).shichen);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: ANALYSIS_MODULES.NAMEOLOGY.loadingCopy.processing });
  const nameScores = getNamePersonalityScores(input.name);
  const dictionarySnapshot = await loadLocalNameologyDictionary();
  const analysis = buildNameologyAnalysis(input.name, nameScores, { ...input, dictionarySnapshot });
  analysis.baziCrossCheck = buildNameologyBaziCrossCheck({ ...input, shichen }, analysis.characters);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: ANALYSIS_MODULES.NAMEOLOGY.loadingCopy.finalizing });

  // CALCULATE_ELEMENTS (儀式感第 8 步) 的真實運算發生在這裡，不是在 buildNameologyAnalysis
  // 內部；因此它在引擎內先被記成 PASSED（代表姓名學本體資料齊備、可以送進五元素計算），
  // 這裡才是這一步真正的後端驗證依據：五元素真的算出來了才視為通過，若拋例外則如實
  // 標記 FAILED，並鎖住後面「三層結果」「最終驗證」步驟。
  const elementStep = analysis.ritualSteps.find((step) => step.id === 'CALCULATE_ELEMENTS');
  try {
    const fiveElement = buildNameologyFiveElementResult(analysis);
    return { ok: true, mode: 'nameology', moduleId: job.moduleId, analysis, nameScores, fiveElement };
  } catch (error) {
    if (elementStep) {
      const failIndex = analysis.ritualSteps.indexOf(elementStep);
      analysis.ritualSteps = analysis.ritualSteps.map((step, index) => {
        if (index < failIndex) return step;
        if (index === failIndex) return { ...step, status: 'FAILED', verifiedAt: null, errorCode: 'ELEMENT_CALC_FAILED' };
        return { ...step, status: 'LOCKED', verifiedAt: null };
      });
    }
    throw error;
  }
}

async function runInsightJob(job: AnalysisJob, inputData: unknown) {
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: ANALYSIS_MODULES.ZIWEI.loadingCopy.validating });
  const input = normalizeInsightInput(inputData);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: ANALYSIS_MODULES.ZIWEI.loadingCopy.processing });
  const result = await withJobTimeout(generateInsightAnalysis(input), 60_000);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: ANALYSIS_MODULES.ZIWEI.loadingCopy.finalizing });
  return typeof result === 'object' && result !== null ? { ...result, mode: 'insight', moduleId: job.moduleId } : result;
}

function hashStringToInt(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickBaziDailyTarotCard(result: ReturnType<typeof analyzeBazi>) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const structure = result.aiDeepAnalysis.professionalSignals.structure;
  const seed = [result.dayMaster.stem, result.dayMaster.element, structure, todayKey].join('|');
  const card = TAROT_CARDS[hashStringToInt(seed) % TAROT_CARDS.length];
  return {
    dateKey: todayKey,
    cardId: card.id,
    nameZh: card.nameZh,
    nameEn: card.nameEn,
    imageUrl: card.imageUrl,
    uprightMeaning: card.uprightMeaning,
    uprightKeywords: card.uprightKeywords,
    reflectionPrompt: card.reflectionPrompt,
    bridge: `今日運勢卡依你的${result.dayMaster.element}日主（${result.dayMaster.stem}）與「${structure}」命盤格局判定，每日固定一張，24 小時後才會依當日日期重新判定。`,
  };
}

async function runBaziJob(job: AnalysisJob, inputData: unknown) {
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: ANALYSIS_MODULES.BAZI.loadingCopy.validating });
  const input = normalizeBaziInput(inputData);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: ANALYSIS_MODULES.BAZI.loadingCopy.processing });
  const result = attachBaziProfessionalCoreV5(analyzeBazi(input), input);
  const fiveElement = buildBaziFiveElementResult({
    analysisId: ['bazi', input.birthDate, input.birthTime, input.gender].join(':'),
    elementEnergy: buildBaziElementEnergy(result.elementCounts),
    elementCounts: result.elementCounts,
    dayMasterElement: traditionalToFiveElement(result.dayMaster.element),
    shichenElement: traditionalToFiveElement(result.pillars.hour.branchElement),
  });

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: ANALYSIS_MODULES.BAZI.loadingCopy.finalizing });
  const dailyTarot = pickBaziDailyTarotCard(result);
  return { ...result, moduleId: job.moduleId, fiveElement, dailyTarot };
}

function logZodiacJob(jobId: string, step: string, detail?: Record<string, unknown>) {
  console.info('[ZODIAC]' + '[' + step + ']', { jobId, ...(detail ?? {}) });
}

function buildZodiacDebugPrompt(input: { name: string; birthDate: string; birthTime: string | null; birthCityId: string | null }, bloodType: BloodType, analysisTarget: unknown) {
  const target = analysisTarget === 'self' ? 'SELF' : analysisTarget === 'guest' ? 'OTHER' : 'UNKNOWN';
  return [
    'AI 西洋星座分析 Prompt',
    `分析模式：${target}`,
    `出生日期：${input.birthDate}`,
    `出生時間：${input.birthTime ?? '未提供'}`,
    `出生城市：${input.birthCityId ?? '未提供'}`,
    `血型：${bloodType || '未提供'}`,
    '任務：判定太陽星座；若有出生時間則加入月亮與上升星座；最後交由五元素與 Integration Layer 整合。',
  ].join('\n');
}

async function runZodiacJob(job: AnalysisJob, inputData: unknown) {
  logZodiacJob(job.jobId, 'START', { moduleId: job.moduleId, analysisType: job.analysisType });
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: 12, message: ANALYSIS_MODULES.ZODIAC.loadingCopy.validating });
  assertRecord(inputData);
  logZodiacJob(job.jobId, 'RECEIVED', {
    hasBirthDate: typeof inputData.birthDate === 'string' && inputData.birthDate.trim().length > 0,
    hasBirthTime: typeof inputData.birthTime === 'string' && inputData.birthTime.trim().length > 0,
    hasBloodType: typeof inputData.bloodType === 'string' && inputData.bloodType.trim().length > 0,
    analysisTarget: inputData.analysisTarget === 'self' ? 'SELF' : inputData.analysisTarget === 'guest' ? 'OTHER' : 'UNKNOWN',
  });

  const rawBloodType = typeof inputData.bloodType === 'string' ? inputData.bloodType : '';
  const bloodType: BloodType = VALID_BLOOD_TYPES.includes(rawBloodType as Exclude<BloodType, ''>) ? (rawBloodType as Exclude<BloodType, ''>) : '';
  const input = {
    name: typeof inputData.name === 'string' ? inputData.name.trim() : '',
    birthDate: typeof inputData.birthDate === 'string' ? inputData.birthDate.trim() : '',
    birthTime: typeof inputData.birthTime === 'string' && inputData.birthTime.trim().length > 0 ? inputData.birthTime.trim() : null,
    birthCityId: typeof inputData.birthCityId === 'string' && inputData.birthCityId.trim().length > 0 ? inputData.birthCityId.trim() : null,
  };

  if (!isValidBirthday(input.birthDate)) throw new Error('請提供有效生日。');
  logZodiacJob(job.jobId, 'BLOOD_TYPE', { bloodType: bloodType || 'NONE' });
  const aiPrompt = buildZodiacDebugPrompt(input, bloodType, inputData.analysisTarget);
  if (!aiPrompt.trim()) throw new Error('西洋星座 AI Prompt 建立失敗。');
  logZodiacJob(job.jobId, 'PROMPT_READY', { promptLength: aiPrompt.length });

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: 45, message: ANALYSIS_MODULES.ZODIAC.loadingCopy.processing });
  logZodiacJob(job.jobId, 'ENGINE_START', { birthDate: input.birthDate, hasBirthTime: Boolean(input.birthTime), birthCityId: input.birthCityId });
  const result = analyzeZodiac(input);
  logZodiacJob(job.jobId, 'SIGN_DONE', { sign: result.sign.name, precision: result.precision });

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: 78, message: ANALYSIS_MODULES.ZODIAC.loadingCopy.finalizing });
  const fiveElement = buildZodiacFiveElementResult(result, bloodType || null);
  logZodiacJob(job.jobId, 'FIVE_ELEMENT_DONE', { primaryElement: fiveElement.primaryElement, brandElement: fiveElement.brandElement, confidence: fiveElement.confidence });

  const output = { ...result, moduleId: job.moduleId, fiveElement };
  logZodiacJob(job.jobId, 'DONE', { mode: output.mode, target: inputData.analysisTarget === 'self' ? 'SELF' : inputData.analysisTarget === 'guest' ? 'OTHER' : 'UNKNOWN' });
  return output;
}
type AnalysisModuleRunner = (job: AnalysisJob, inputData: unknown) => Promise<unknown>;

const MODULE_RUNNERS: Record<AnalysisModuleId, AnalysisModuleRunner> = {
  NUMBER: runNumberJob,
  NAMEOLOGY: runNameologyJob,
  ZIWEI: runInsightJob,
  BAZI: runBaziJob,
  ZODIAC: runZodiacJob,
};

export async function runAnalysisJob(jobId: string, inputData: unknown) {
  const job = getAnalysisJob(jobId);
  if (!job) return null;

  try {
    const moduleId = (job as AnalysisJob & { moduleId?: AnalysisModuleId }).moduleId ?? moduleIdForAnalysisType(job.analysisType);
    const runner = MODULE_RUNNERS[moduleId];
    if (!runner) throw new Error('\u6b64\u5206\u6790\u6a21\u7d44\u5c1a\u672a\u8a3b\u518a\u5230 Module Router\u3002');
    const result = await runner({ ...job, moduleId }, inputData);
    return completeAnalysisJob(job.jobId, result);
  } catch (error) {
    const message = error instanceof Error && error.message === 'TIMEOUT'
      ? '\u5206\u6790\u6642\u9593\u8d85\u904e\u7cfb\u7d71\u4fdd\u8b77\u4e0a\u9650\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u4e00\u6b21\u3002'
      : error instanceof Error
        ? error.message
        : '\u76ee\u524d\u66ab\u6642\u7121\u6cd5\u5b8c\u6210\u5206\u6790\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002';
    return failAnalysisJob(job.jobId, error instanceof Error && error.message === 'TIMEOUT' ? 'TIMEOUT' : 'ANALYSIS_FAILED', message, error instanceof Error && error.message === 'TIMEOUT' ? 'TIMEOUT' : 'FAILED');
  }
}

