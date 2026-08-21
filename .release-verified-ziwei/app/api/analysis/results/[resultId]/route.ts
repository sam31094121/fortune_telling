import { NextResponse } from 'next/server';
import { createRequestId, friendlyErrorResponse } from '@/lib/api-stability';
import { getAnalysisJob, getAnalysisResult } from '@/lib/analysis-job-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ resultId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { resultId } = await context.params;
  const stored = getAnalysisResult(resultId);

  if (!stored) {
    return friendlyErrorResponse(requestId, 'RESULT_NOT_FOUND', '分析結果狀態已重整，系統會自動用同一份資料接續分析。', 404);
  }

  const job = getAnalysisJob(stored.jobId);
  if (!job || job.status !== 'COMPLETED') {
    return friendlyErrorResponse(requestId, 'RESULT_NOT_READY', '\u5206\u6790\u5c1a\u672a\u5b8c\u6210\uff0c\u8acb\u7a0d\u5019\u518d\u67e5\u770b\u7d50\u679c\u3002', 409);
  }

  return NextResponse.json(
    { ok: true, requestId, success: true, data: stored.result, jobId: stored.jobId, resultId },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
