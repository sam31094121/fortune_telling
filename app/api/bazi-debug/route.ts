import { NextResponse } from 'next/server';
import { createBaziCore, debugBaziCore, type BaziBirthInput, type Branch } from '@/lib/bazi/engine';

export const dynamic = 'force-dynamic';

/**
 * Traditional Bazi Core V1｜Debug 模式（只讀唯一排盤入口 createBaziCore）
 *
 * 用法：
 *   /api/bazi-debug?debugBazi=1&date=1988-6-15&time=08:30&gender=female
 *   /api/bazi-debug?debugBazi=1&date=1979-9-2&hourBranch=寅&gender=female
 *   /api/bazi-debug?debugBazi=1&date=1979-9-2&gender=female            （未知時辰 → PARTIAL_BAZI）
 *   /api/bazi-debug?debugBazi=1&calendar=lunar&date=1979-7-11&time=04:00&gender=female
 *
 * 只輸出排盤驗證資訊；AI 解盤不在此路由。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('debugBazi') !== '1') {
    return NextResponse.json({ error: 'debugBazi=1 required' }, { status: 400 });
  }

  const date = url.searchParams.get('date') ?? '';
  const time = url.searchParams.get('time');
  const hourBranch = url.searchParams.get('hourBranch');
  const gender = url.searchParams.get('gender') === 'male' ? 'male' as const : 'female' as const;
  const calendarType = url.searchParams.get('calendar') === 'lunar' ? 'LUNAR' as const : 'SOLAR' as const;
  const isLeapMonth = url.searchParams.get('leap') === '1';

  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(date)) {
    return NextResponse.json({ error: 'date=YYYY-M-D 必填', example: '/api/bazi-debug?debugBazi=1&date=1988-6-15&time=08:30&gender=female' }, { status: 400 });
  }

  const input: BaziBirthInput = {
    gender,
    birthDate: date,
    birthTimeKnown: Boolean(time || hourBranch),
    birthTime: time ?? undefined,
    traditionalHour: (hourBranch as Branch) ?? undefined,
    calendarType,
    isLeapMonth,
  };

  try {
    const core = createBaziCore(input);
    return NextResponse.json({
      標題: '【傳統八字排盤驗證｜Traditional Bazi Core V1】',
      摘要: debugBaziCore(core),
      完整結果: core,
      BAZI_CHART_CERTIFIED: core.verification.readyForInterpretation,
    });
  } catch (error) {
    return NextResponse.json(
      { BAZI_CHART_CERTIFIED: false, error: error instanceof Error ? error.message : 'BAZI_UNKNOWN_ERROR' },
      { status: 500 },
    );
  }
}
