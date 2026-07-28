import { NextResponse } from 'next/server';
import { createRequestId, friendlyErrorResponse } from '@/lib/api-stability';
import { getAnalysisJob, publicAnalysisJob } from '@/lib/analysis-job-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { jobId } = await context.params;
  const job = getAnalysisJob(jobId);

  if (!job) {
    return friendlyErrorResponse(requestId, 'JOB_NOT_FOUND', '\u627e\u4e0d\u5230\u9019\u7b46\u5206\u6790\u4efb\u52d9\uff0c\u8acb\u91cd\u65b0\u9001\u51fa\u3002', 404);
  }

  return NextResponse.json(
    { ok: true, requestId, success: true, data: publicAnalysisJob(job) },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
