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
    return friendlyErrorResponse(requestId, 'JOB_NOT_FOUND', '任務狀態已重整，系統會自動用同一份資料接續分析。', 404);
  }

  return NextResponse.json(
    { ok: true, requestId, success: true, data: publicAnalysisJob(job) },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
