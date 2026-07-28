import { NextResponse } from 'next/server';
import { createRequestId, friendlyErrorResponse } from '@/lib/api-stability';
import { createAnalysisJob, publicAnalysisJob, type AnalysisType } from '@/lib/analysis-job-store';
import { runAnalysisJob } from '@/lib/analysis-job-runner';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const SUPPORTED_ANALYSIS_TYPES: AnalysisType[] = ['number', 'nameology', 'insight', 'match', 'music', 'element'];

type CreateJobRequest = {
  analysisType?: unknown;
  idempotencyKey?: unknown;
  sessionId?: unknown;
  userId?: unknown;
  inputData?: unknown;
};

function normalizeAnalysisType(value: unknown): AnalysisType | null {
  return typeof value === 'string' && SUPPORTED_ANALYSIS_TYPES.includes(value as AnalysisType) ? value as AnalysisType : null;
}

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
    return friendlyErrorResponse(requestId, 'INVALID_ANALYSIS_TYPE', '\u8acb\u63d0\u4f9b\u6709\u6548\u7684\u5206\u6790\u985e\u578b\u3002', 400);
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
