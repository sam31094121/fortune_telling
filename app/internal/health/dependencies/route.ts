import { NextResponse } from 'next/server';

import { NUMBER_CORE_ENGINE_VERSION, analyzeNumberCore } from '@/lib/number-core-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET() {
  const numberProbe = analyzeNumberCore('1688');

  return NextResponse.json(
    {
      ok: numberProbe.ok,
      status: numberProbe.ok ? 'ready' : 'recovering',
      dependencies: {
        api: 'ready',
        numberCoreEngine: numberProbe.ok ? 'ready' : 'recovering',
        aiService: 'not_checked',
        database: 'not_checked',
        cache: 'not_checked',
      },
      versions: {
        numberCoreEngine: NUMBER_CORE_ENGINE_VERSION,
      },
      checkedAt: new Date().toISOString(),
    },
    {
      status: numberProbe.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
