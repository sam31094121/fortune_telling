import { analyzeNumberCore, validateNumberCoreInput } from './number-core-engine';
import { buildNumberFiveElementResult, buildNameologyFiveElementResult } from './five-element-engine';
import { getNamePersonalityScores } from './name-model-db';
import { buildNameologyAnalysis } from './nameology-engine';
import { generateInsightAnalysis } from './insight-engine';
import { analyzeBazi, type BaziAnalysisInput } from './bazi-engine';
import { isValidBirthday } from './validation';
import type { BloodType, Gender, InsightRequest } from './types';
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

type NameologyJobInput = {
  name: string;
  birthDate: string;
  bloodType: Exclude<BloodType, ''>;
  gender: Gender;
};

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('\u8acb\u63d0\u4f9b\u6709\u6548\u7684\u5206\u6790\u8cc7\u6599\u3002');
}

function normalizeNameologyInput(value: unknown): NameologyJobInput {
  assertRecord(value);
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const birthDate = typeof value.birthDate === 'string' ? value.birthDate : '';
  const bloodType = value.bloodType as Exclude<BloodType, ''>;
  const gender = value.gender as Gender;

  if (name.length < 2) throw new Error('\u8acb\u8f38\u5165\u81f3\u5c11 2 \u500b\u5b57\u7684\u59d3\u540d\u3002');
  if (name.length > 20) throw new Error('\u59d3\u540d\u8acb\u52ff\u8d85\u904e 20 \u500b\u5b57\u3002');
  if (!isValidBirthday(birthDate)) throw new Error('\u8acb\u63d0\u4f9b\u6709\u6548\u751f\u65e5\u3002');
  if (!VALID_BLOOD_TYPES.includes(bloodType)) throw new Error('\u8acb\u9078\u64c7\u6709\u6548\u8840\u578b\u3002');
  if (!VALID_GENDERS.includes(gender)) throw new Error('\u8acb\u9078\u64c7\u6709\u6548\u6027\u5225\u3002');
  return { name, birthDate, bloodType, gender };
}

function normalizeInsightInput(value: unknown): InsightRequest {
  const input = normalizeNameologyInput(value) as InsightRequest;
  assertRecord(value);
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

function normalizeBaziInput(value: unknown): BaziAnalysisInput {
  assertRecord(value);
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const birthDate = typeof value.birthDate === 'string' ? value.birthDate : '';
  const birthTime = typeof value.birthTime === 'string' && value.birthTime.length > 0 ? value.birthTime : '12:00';
  const gender = value.gender as BaziAnalysisInput['gender'];
  const country = typeof value.country === 'string' && value.country.trim().length > 0 ? value.country.trim() : '台灣';
  const city = typeof value.city === 'string' && value.city.trim().length > 0 ? value.city.trim() : '台北';

  if (name.length > 20) throw new Error('姓名可不填；若要填寫，請勿超過 20 個字。');
  if (!isValidBirthday(birthDate)) throw new Error('\u8acb\u63d0\u4f9b\u6709\u6548\u751f\u65e5\u3002');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) throw new Error('\u8acb\u9078\u64c7\u6709\u6548\u51fa\u751f\u6642\u9593\u3002');
  if (!VALID_GENDERS.includes(gender)) throw new Error('\u8acb\u9078\u64c7\u6709\u6548\u6027\u5225\u3002');
  return { name, birthDate, birthTime, gender, country, city };
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

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: ANALYSIS_MODULES.NAMEOLOGY.loadingCopy.processing });
  const nameScores = getNamePersonalityScores(input.name);
  const analysis = buildNameologyAnalysis(input.name, nameScores, input);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: ANALYSIS_MODULES.NAMEOLOGY.loadingCopy.finalizing });
  return { ok: true, mode: 'nameology', moduleId: job.moduleId, analysis, nameScores, fiveElement: buildNameologyFiveElementResult(analysis) };
}

async function runInsightJob(job: AnalysisJob, inputData: unknown) {
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: ANALYSIS_MODULES.ZIWEI.loadingCopy.validating });
  const input = normalizeInsightInput(inputData);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: ANALYSIS_MODULES.ZIWEI.loadingCopy.processing });
  const result = await withJobTimeout(generateInsightAnalysis(input), 60_000);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: ANALYSIS_MODULES.ZIWEI.loadingCopy.finalizing });
  return typeof result === 'object' && result !== null ? { ...result, mode: 'insight', moduleId: job.moduleId } : result;
}

async function runBaziJob(job: AnalysisJob, inputData: unknown) {
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: ANALYSIS_MODULES.BAZI.loadingCopy.validating });
  const input = normalizeBaziInput(inputData);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: ANALYSIS_MODULES.BAZI.loadingCopy.processing });
  const result = analyzeBazi(input);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: ANALYSIS_MODULES.BAZI.loadingCopy.finalizing });
  return { ...result, moduleId: job.moduleId };
}

type AnalysisModuleRunner = (job: AnalysisJob, inputData: unknown) => Promise<unknown>;

const MODULE_RUNNERS: Record<AnalysisModuleId, AnalysisModuleRunner> = {
  NUMBER: runNumberJob,
  NAMEOLOGY: runNameologyJob,
  ZIWEI: runInsightJob,
  BAZI: runBaziJob,
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
