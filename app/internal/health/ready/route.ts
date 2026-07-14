import { NextResponse } from 'next/server';

import { NUMBER_CORE_ENGINE_VERSION, analyzeNumberCore } from '@/lib/number-core-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET() {
  const probe = analyzeNumberCore('1688');

  return NextResponse.json(
    {
      ok: probe.ok,
      status: probe.ok ? 'ready' : 'recovering',
      numberCoreEngine: probe.ok ? NUMBER_CORE_ENGINE_VERSION : 'unavailable',
      checkedAt: new Date().toISOString(),
    },
    {
      status: probe.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
