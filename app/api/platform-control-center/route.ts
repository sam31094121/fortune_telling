import { NextResponse } from 'next/server';
import { createRequestId } from '@/lib/api-stability';
import { buildPlatformControlCenter } from '@/lib/platform-control-center';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const requestId = createRequestId();
  const result = buildPlatformControlCenter();

  return NextResponse.json(
    { ...result, requestId },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}