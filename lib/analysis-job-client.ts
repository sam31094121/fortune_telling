'use client';

export type AnalysisJobStatus = 'IDLE' | 'VALIDATING' | 'QUEUED' | 'PROCESSING' | 'FINALIZING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

export type AnalysisJobPublic = {
  jobId: string;
  moduleId?: string;
  status: AnalysisJobStatus;
  progressStage: string;
  progressPercent: number | null;
  message: string;
  resultId: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type ApiResponse<T> = { ok: boolean; success?: boolean; data?: T; result?: unknown; message?: string; error?: string; code?: string };

async function safeJson<T>(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<{ status: number; body: T }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = (await response.json()) as T;
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('\u5206\u6790\u66ab\u6642\u5931\u6557\uff1a\u7cfb\u7d71\u8d85\u904e\u6642\u9593\u9650\u5236\u6c92\u6709\u5b8c\u6210\u56de\u61c9\uff0c\u8acb\u91cd\u65b0\u5617\u8a66\u3002');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Shared entry point for the Taiji AI Core job pipeline.
 */
export async function runAnalysisJobClient<TResult>(options: {
  analysisType: string;
  inputData: unknown;
  sessionId: string;
  idempotencyKey: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  maxRecoveryAttempts?: number;
  onJob?: (job: AnalysisJobPublic) => void;
}): Promise<TResult> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const pollIntervalMs = options.pollIntervalMs ?? 650;
  const maxRecoveryAttempts = options.maxRecoveryAttempts ?? 2;
  const started = Date.now();
  const remaining = () => Math.max(1, timeoutMs - (Date.now() - started));
  let recoveryAttempts = 0;

  async function createJob(attempt: number): Promise<{ job: AnalysisJobPublic; result?: TResult }> {
    const created = await safeJson<ApiResponse<AnalysisJobPublic>>('/api/analysis/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisType: options.analysisType,
        idempotencyKey: attempt === 0 ? options.idempotencyKey : `${options.idempotencyKey}:recovery:${attempt}`,
        sessionId: options.sessionId,
        inputData: options.inputData,
      }),
    }, remaining());

    if (!created.body.ok || !created.body.data?.jobId) {
      throw new Error(created.body.message || created.body.error || '\u76ee\u524d\u7121\u6cd5\u5efa\u7acb\u5206\u6790\u4efb\u52d9\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002');
    }

    return { job: created.body.data, result: created.body.result as TResult | undefined };
  }

  function canRecover(response: { status: number; body: ApiResponse<unknown> }) {
    return (
      recoveryAttempts < maxRecoveryAttempts &&
      response.status === 404 &&
      (response.body.code === 'JOB_NOT_FOUND' || response.body.code === 'RESULT_NOT_FOUND')
    );
  }

  let createdJob = await createJob(recoveryAttempts);
  if (createdJob.result !== undefined) return createdJob.result;
  let job = createdJob.job;
  options.onJob?.(job);

  while (Date.now() - started < timeoutMs) {
    if (job.status === 'COMPLETED' && job.resultId) {
      const result = await safeJson<ApiResponse<TResult>>('/api/analysis/results/' + job.resultId, undefined, remaining());
      if (result.body.ok && result.body.data) return result.body.data;
      if (canRecover(result)) {
        recoveryAttempts += 1;
        createdJob = await createJob(recoveryAttempts);
        if (createdJob.result !== undefined) return createdJob.result;
        job = createdJob.job;
        options.onJob?.(job);
        continue;
      }
      throw new Error(result.body.message || result.body.error || '\u5206\u6790\u7d50\u679c\u5c1a\u672a\u5b8c\u6210\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002');
    }
    if (job.status === 'FAILED' || job.status === 'TIMEOUT' || job.status === 'CANCELLED') {
      throw new Error(job.errorMessage || job.message || '\u76ee\u524d\u7121\u6cd5\u5b8c\u6210\u5206\u6790\u3002');
    }

    await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs));
    const next = await safeJson<ApiResponse<AnalysisJobPublic>>('/api/analysis/jobs/' + job.jobId, undefined, remaining());
    if (!next.body.ok || !next.body.data) {
      if (canRecover(next)) {
        recoveryAttempts += 1;
        createdJob = await createJob(recoveryAttempts);
        if (createdJob.result !== undefined) return createdJob.result;
        job = createdJob.job;
        options.onJob?.(job);
        continue;
      }
      throw new Error(next.body.message || next.body.error || '\u76ee\u524d\u7121\u6cd5\u8b80\u53d6\u5206\u6790\u72c0\u614b\u3002');
    }
    job = next.body.data;
    options.onJob?.(job);
  }

  throw new Error('\u5206\u6790\u66ab\u6642\u5931\u6557\uff1a\u7cfb\u7d71\u8d85\u904e\u6642\u9593\u9650\u5236\u6c92\u6709\u5b8c\u6210\u56de\u61c9\uff0c\u8acb\u91cd\u65b0\u5617\u8a66\u3002');
}
