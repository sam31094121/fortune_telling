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

type ApiResponse<T> = { ok: boolean; success?: boolean; data?: T; message?: string; error?: string; code?: string };

async function safeJson<T>(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<{ status: number; body: T }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = (await response.json()) as T;
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('分析暫時失敗：系統超過時間限制沒有完成回應，請重新嘗試。');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Shared entry point for the 太極 AI Core job pipeline (create job → poll status → fetch result).
 * Any feature page that wants to route through the shared analysis-job-runner/module-router
 * instead of calling its own bespoke API route should go through this helper.
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

  async function createJob(attempt: number) {
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
      throw new Error(created.body.message || created.body.error || '目前無法建立分析任務，請稍後再試。');
    }

    return created.body.data;
  }

  function canRecover(response: { status: number; body: ApiResponse<unknown> }) {
    return (
      recoveryAttempts < maxRecoveryAttempts &&
      response.status === 404 &&
      (response.body.code === 'JOB_NOT_FOUND' || response.body.code === 'RESULT_NOT_FOUND')
    );
  }

  let job = await createJob(recoveryAttempts);
  options.onJob?.(job);

  while (Date.now() - started < timeoutMs) {
    if (job.status === 'COMPLETED' && job.resultId) {
      const result = await safeJson<ApiResponse<TResult>>('/api/analysis/results/' + job.resultId, undefined, remaining());
      if (result.body.ok && result.body.data) return result.body.data;
      if (canRecover(result)) {
        recoveryAttempts += 1;
        job = await createJob(recoveryAttempts);
        options.onJob?.(job);
        continue;
      }
      throw new Error(result.body.message || result.body.error || '分析結果尚未完成，請稍後再試。');
    }
    if (job.status === 'FAILED' || job.status === 'TIMEOUT' || job.status === 'CANCELLED') {
      throw new Error(job.errorMessage || job.message || '目前無法完成分析。');
    }

    await new Promise((resolve) => window.setTimeout(resolve, pollIntervalMs));
    const next = await safeJson<ApiResponse<AnalysisJobPublic>>('/api/analysis/jobs/' + job.jobId, undefined, remaining());
    if (!next.body.ok || !next.body.data) {
      if (canRecover(next)) {
        recoveryAttempts += 1;
        job = await createJob(recoveryAttempts);
        options.onJob?.(job);
        continue;
      }
      throw new Error(next.body.message || next.body.error || '目前無法讀取分析狀態。');
    }
    job = next.body.data;
    options.onJob?.(job);
  }

  throw new Error('分析暫時失敗：系統超過時間限制沒有完成回應，請重新嘗試。');
}
