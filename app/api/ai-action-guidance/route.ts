import { NextResponse } from 'next/server';
import { createRequestId } from '@/lib/api-stability';
import { buildAiActionGuidanceSnapshot } from '@/lib/ai-action-guidance-center';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const requestId = createRequestId();

  return NextResponse.json(
    {
      success: true,
      requestId,
      data: buildAiActionGuidanceSnapshot(),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
