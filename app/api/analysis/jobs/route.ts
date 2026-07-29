import { NextResponse } from 'next/server';
import { createRequestId, friendlyErrorResponse } from '@/lib/api-stability';
import { createAnalysisJob, publicAnalysisJob } from '@/lib/analysis-job-store';
import { runAnalysisJob } from '@/lib/analysis-job-runner';
import { normalizeAnalysisType } from '@/lib/analysis-module-router';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

type CreateJobRequest = {
  analysisType?: unknown;
  idempotencyKey?: unknown;
  sessionId?: unknown;
  userId?: unknown;
  inputData?: unknown;
};

export async function POST(request: Request) {
  const requestId = createRequestId();
  let body: CreateJobRequest;

  try {
    body = await request.json() as CreateJobRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '\u8acb\u63d0\u4f9b\u6709\u6548\u7684 JSON \u8acb\u6c42\u3002', 400);
  }

  const analysisType = normalizeAnalysisType(body.analysisType);
  if (!analysisType) {
    return friendlyErrorResponse(requestId, 'INVALID_ANALYSIS_TYPE', '\u9019\u500b\u5206\u6790\u6a21\u7d44\u5c1a\u672a\u8a3b\u518a\u5230\u5171\u7528\u4efb\u52d9\u7cfb\u7d71\uff0c\u8acb\u78ba\u8a8d\u9996\u9801\u5361\u7247\u5165\u53e3\u3002', 400);
  }

  const job = createAnalysisJob({
    analysisType,
    requestPayload: body.inputData ?? {},
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : null,
    sessionId: typeof body.sessionId === 'string' ? body.sessionId : null,
    userId: typeof body.userId === 'string' ? body.userId : null,
  });

  if (job.status === 'QUEUED') {
    void runAnalysisJob(job.jobId, body.inputData ?? {});
  }

  return NextResponse.json(
    { ok: true, requestId, success: true, data: publicAnalysisJob(job) },
    { status: 202, headers: { 'Cache-Control': 'no-store' } },
  );
}
