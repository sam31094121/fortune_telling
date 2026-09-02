import { createHash, randomUUID } from 'node:crypto';
import { getModuleByAnalysisType, moduleIdForAnalysisType, type AnalysisModuleId, type AnalysisType } from './analysis-module-router';

export type AnalysisJobStatus = 'IDLE' | 'VALIDATING' | 'QUEUED' | 'PROCESSING' | 'FINALIZING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

export type AnalysisProgressStage =
  | 'READY'
  | 'VALIDATING_INPUT'
  | 'WAITING_FOR_WORKER'
  | 'RUNNING_ENGINE'
  | 'CROSS_ANALYSIS'
  | 'BUILDING_RESULT'
  | 'DONE'
  | 'ERROR'
  | 'TIMEOUT'
  | 'CANCELLED';

export type AnalysisJob = {
  id: string;
  jobId: string;
  analysisType: AnalysisType;
  moduleId: AnalysisModuleId;
  userId: string | null;
  sessionId: string | null;
  idempotencyKey: string;
  status: AnalysisJobStatus;
  progressStage: AnalysisProgressStage;
  progressPercent: number | null;
  message: string;
  requestPayloadHash: string;
  resultId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  expiresAt: string;
};

const JOB_TTL_MS = 30 * 60 * 1000;
type AnalysisRuntimeStore = {
  jobs: Map<string, AnalysisJob>;
  results: Map<string, { jobId: string; result: unknown; createdAt: string; expiresAt: string }>;
  idempotencyIndex: Map<string, string>;
};

const runtimeStore = ((globalThis as typeof globalThis & { __analysisRuntimeStore?: AnalysisRuntimeStore }).__analysisRuntimeStore ??= {
  jobs: new Map<string, AnalysisJob>(),
  results: new Map<string, { jobId: string; result: unknown; createdAt: string; expiresAt: string }>(),
  idempotencyIndex: new Map<string, string>(),
});

const jobs = runtimeStore.jobs;
const resultStore = runtimeStore.results;
const idempotencyIndex = runtimeStore.idempotencyIndex;

function nowIso() {
  return new Date().toISOString();
}

export function hashAnalysisPayload(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

function cleanupExpiredJobs() {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (Date.parse(job.expiresAt) <= now) jobs.delete(jobId);
  }
  for (const [resultId, value] of resultStore.entries()) {
    if (Date.parse(value.expiresAt) <= now) resultStore.delete(resultId);
  }
  for (const [key, jobId] of idempotencyIndex.entries()) {
    if (!jobs.has(jobId)) idempotencyIndex.delete(key);
  }
}

export function createAnalysisJob(input: {
  analysisType: AnalysisType;
  requestPayload: unknown;
  idempotencyKey?: string | null;
  sessionId?: string | null;
  userId?: string | null;
}) {
  cleanupExpiredJobs();
  const requestPayloadHash = hashAnalysisPayload(input.requestPayload);
  const idempotencyKey = input.idempotencyKey || requestPayloadHash;
  const indexKey = [input.analysisType, input.sessionId ?? '', input.userId ?? '', idempotencyKey].join('|');
  const existingJobId = idempotencyIndex.get(indexKey);
  if (existingJobId) {
    const existing = jobs.get(existingJobId);
    if (existing) return existing;
  }

  const createdAt = nowIso();
  const analysisModule = getModuleByAnalysisType(input.analysisType);
  const job: AnalysisJob = {
    id: randomUUID(),
    jobId: 'job_' + randomUUID(),
    analysisType: input.analysisType,
    moduleId: moduleIdForAnalysisType(input.analysisType),
    userId: input.userId ?? null,
    sessionId: input.sessionId ?? null,
    idempotencyKey,
    status: 'QUEUED',
    progressStage: 'WAITING_FOR_WORKER',
    progressPercent: null,
    message: analysisModule?.loadingCopy.queued ?? '\u5df2\u6536\u5230\u5206\u6790\u8acb\u6c42\uff0c\u6b63\u5728\u5b89\u6392\u771f\u5be6\u904b\u7b97\u3002',
    requestPayloadHash,
    resultId: null,
    errorCode: null,
    errorMessage: null,
    createdAt,
    startedAt: null,
    completedAt: null,
    updatedAt: createdAt,
    expiresAt: new Date(Date.now() + JOB_TTL_MS).toISOString(),
  };
  jobs.set(job.jobId, job);
  idempotencyIndex.set(indexKey, job.jobId);
  return job;
}

export function updateAnalysisJob(jobId: string, patch: Partial<Pick<AnalysisJob, 'status' | 'progressStage' | 'progressPercent' | 'message' | 'errorCode' | 'errorMessage'>>) {
  const job = jobs.get(jobId);
  if (!job) return null;
  const updated: AnalysisJob = {
    ...job,
    ...patch,
    startedAt: patch.status === 'PROCESSING' && !job.startedAt ? nowIso() : job.startedAt,
    updatedAt: nowIso(),
  };
  jobs.set(jobId, updated);
  return updated;
}

export function completeAnalysisJob(jobId: string, result: unknown) {
  const job = jobs.get(jobId);
  if (!job) return null;
  const resultId = 'result_' + randomUUID();
  const completedAt = nowIso();
  const expiresAt = new Date(Date.now() + JOB_TTL_MS).toISOString();
  resultStore.set(resultId, { jobId, result, createdAt: completedAt, expiresAt });
  const updated: AnalysisJob = {
    ...job,
    status: 'COMPLETED',
    progressStage: 'DONE',
    progressPercent: 100,
    message: '\u5206\u6790\u5b8c\u6210\uff0c\u7d50\u679c\u5df2\u6e96\u5099\u597d\u3002',
    resultId,
    completedAt,
    updatedAt: completedAt,
    expiresAt,
  };
  jobs.set(jobId, updated);
  return updated;
}

export function failAnalysisJob(jobId: string, errorCode: string, message: string, status: Extract<AnalysisJobStatus, 'FAILED' | 'TIMEOUT' | 'CANCELLED'> = 'FAILED') {
  const job = jobs.get(jobId);
  if (!job) return null;
  const completedAt = nowIso();
  const updated: AnalysisJob = {
    ...job,
    status,
    progressStage: status === 'TIMEOUT' ? 'TIMEOUT' : status === 'CANCELLED' ? 'CANCELLED' : 'ERROR',
    progressPercent: null,
    message,
    errorCode,
    errorMessage: message,
    completedAt,
    updatedAt: completedAt,
  };
  jobs.set(jobId, updated);
  return updated;
}

export function getAnalysisJob(jobId: string) {
  cleanupExpiredJobs();
  return jobs.get(jobId) ?? null;
}

export function getAnalysisResult(resultId: string) {
  cleanupExpiredJobs();
  return resultStore.get(resultId) ?? null;
}

export function publicAnalysisJob(job: AnalysisJob) {
  // Vercel serverless functions do not share memory across instances. The POST that
  // creates+runs a job and a later GET for its status/result can land on different
  // instances, so a follow-up lookup by id can spuriously come back empty even though
  // the job genuinely completed. To avoid depending on that lookup ever succeeding,
  // embed the actual result payload here (when available) so callers that already
  // have this response never need a second round trip to read it back.
  const inlineResult = job.status === 'COMPLETED' && job.resultId ? getAnalysisResult(job.resultId) : null;
  return {
    jobId: job.jobId,
    analysisType: job.analysisType,
    moduleId: job.moduleId,
    status: job.status,
    progressStage: job.progressStage,
    progressPercent: job.progressPercent,
    message: job.message,
    resultId: job.resultId,
    result: inlineResult ? inlineResult.result : undefined,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
  };
}
