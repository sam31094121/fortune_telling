import { NextResponse } from 'next/server';
import { createRequestId } from '@/lib/api-stability';
import { buildMasterPlatformFinalOptimizeSnapshot } from '@/lib/master-platform-final-optimize';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const requestId = createRequestId();

  return NextResponse.json(
    {
      success: true,
      requestId,
      data: buildMasterPlatformFinalOptimizeSnapshot(),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}