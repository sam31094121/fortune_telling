import { analyzeNumberCore, validateNumberCoreInput } from './number-core-engine';
import { buildNumberFiveElementResult, buildNameologyFiveElementResult } from './five-element-engine';
import { getNamePersonalityScores } from './name-model-db';
import { buildNameologyAnalysis } from './nameology-engine';
import { generateInsightAnalysis } from './insight-engine';
import { isValidBirthday } from './validation';
import type { BloodType, Gender, InsightRequest } from './types';
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
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: '\u6b63\u5728\u78ba\u8a8d\u6578\u5b57\u683c\u5f0f\u3002' });
  assertRecord(inputData);
  const value = typeof inputData.value === 'string' ? inputData.value.trim() : '';
  const mode = validateNumberCoreInput(value);
  if (typeof mode !== 'string') throw new Error(mode.message);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: '\u6b63\u5728\u4f9d\u7167\u6578\u5b57\u898f\u5247\u771f\u5be6\u904b\u7b97\u3002' });
  const result = analyzeNumberCore(value);
  if (!result.ok) throw new Error(result.message);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: '\u6b63\u5728\u6574\u7406\u4e94\u5143\u7d20\u88dc\u5f37\u7d50\u679c\u3002' });
  return { ...result, mode, fiveElement: buildNumberFiveElementResult(result) };
}

async function runNameologyJob(job: AnalysisJob, inputData: unknown) {
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: '\u6b63\u5728\u78ba\u8a8d\u59d3\u540d\u5b78\u8cc7\u6599\u3002' });
  const input = normalizeNameologyInput(inputData);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'RUNNING_ENGINE', progressPercent: null, message: '\u6b63\u5728\u904b\u7b97\u59d3\u540d\u7b46\u756b\u3001\u4e94\u683c\u8207\u6027\u60c5\u77e9\u9663\u3002' });
  const nameScores = getNamePersonalityScores(input.name);
  const analysis = buildNameologyAnalysis(input.name, nameScores, input);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: '\u6b63\u5728\u6574\u7406\u4e94\u5143\u7d20\u624b\u93c8\u88dc\u5f37\u65b9\u6848\u3002' });
  return { ok: true, mode: 'nameology', analysis, nameScores, fiveElement: buildNameologyFiveElementResult(analysis) };
}

async function runInsightJob(job: AnalysisJob, inputData: unknown) {
  updateAnalysisJob(job.jobId, { status: 'VALIDATING', progressStage: 'VALIDATING_INPUT', progressPercent: null, message: '\u6b63\u5728\u78ba\u8a8d\u5929\u5730\u4eba\u5206\u6790\u8cc7\u6599\u3002' });
  const input = normalizeInsightInput(inputData);

  updateAnalysisJob(job.jobId, { status: 'PROCESSING', progressStage: 'CROSS_ANALYSIS', progressPercent: null, message: '\u6b63\u5728\u4ea4\u53c9\u904b\u7b97\u59d3\u540d\u5b78\u3001\u7d2b\u5fae\u6597\u6578\u3001\u516b\u5b57\u8207\u4e94\u5143\u7d20\u3002' });
  const result = await withJobTimeout(generateInsightAnalysis(input), 60_000);

  updateAnalysisJob(job.jobId, { status: 'FINALIZING', progressStage: 'BUILDING_RESULT', progressPercent: null, message: '\u6b63\u5728\u6574\u7406\u5b8c\u6574\u7d50\u679c\u9801\u3002' });
  return result;
}

export async function runAnalysisJob(jobId: string, inputData: unknown) {
  const job = getAnalysisJob(jobId);
  if (!job) return null;

  try {
    let result: unknown;
    if (job.analysisType === 'number') result = await runNumberJob(job, inputData);
    else if (job.analysisType === 'nameology') result = await runNameologyJob(job, inputData);
    else if (job.analysisType === 'insight') result = await runInsightJob(job, inputData);
    else {
      throw new Error('\u9019\u500b\u5206\u6790\u985e\u578b\u6b63\u5728\u63a5\u5165\u5171\u7528\u4efb\u52d9\u7cfb\u7d71\uff0c\u8acb\u5148\u4f7f\u7528\u539f\u672c\u529f\u80fd\u9001\u51fa\u3002');
    }
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
