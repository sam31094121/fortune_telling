import { NextResponse } from 'next/server';
import { analyzeBazi } from '@/lib/bazi-engine';
import { isValidBirthday } from '@/lib/validation';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { buildSingleRedLuanHeartbeat } from '@/lib/red-luan-heartbeat-engine';
import { createRequestId, friendlyErrorResponse } from '@/lib/api-stability';

export const dynamic = 'force-dynamic';

type SinglePersonRequest = {
  name: string;
  birthDate: string;
  birthHourBranch?: string;
  gender: 'male' | 'female';
};

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '請提供有效的出生資料。';
  const person = body as Partial<SinglePersonRequest>;
  if (typeof person.name !== 'string' || person.name.trim().length < 2 || person.name.trim().length > 20) {
    return '姓名至少需要 2 個字。';
  }
  if (!isValidBirthday(person.birthDate)) return '生日日期無效。';
  if (!['male', 'female'].includes(person.gender ?? '')) return '請選擇性別。';
  if (person.birthHourBranch && person.birthHourBranch !== 'unknown' && !SHICHEN_LIST.some((item) => item.branch === person.birthHourBranch)) {
    return '出生時辰無效。';
  }
  return null;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  let person: SinglePersonRequest;

  try {
    person = (await request.json()) as SinglePersonRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '無法解析請求資料。', 400);
  }

  const invalid = validate(person);
  if (invalid) return friendlyErrorResponse(requestId, 'INVALID_INPUT', invalid, 400);

  try {
    const hourKnown = Boolean(person.birthHourBranch && person.birthHourBranch !== 'unknown');
    const chart = analyzeBazi({
      name: person.name.trim(),
      birthDate: person.birthDate,
      birthTime: '12:00',
      birthTimeKnown: hourKnown,
      timeUnknown: !hourKnown,
      traditionalHour: hourKnown ? person.birthHourBranch : undefined,
      gender: person.gender,
      country: 'TW',
      city: 'Taipei',
    });
    const timeIndex = SHICHEN_LIST.find((item) => item.branch === person.birthHourBranch)?.branchIndex;
    const result = buildSingleRedLuanHeartbeat({
      yearBranch: chart.pillars.year.branch,
      dayBranch: chart.pillars.day.branch,
      presentBranches: [
        { pillar: '年', branch: chart.pillars.year.branch },
        { pillar: '月', branch: chart.pillars.month.branch },
        { pillar: '日', branch: chart.pillars.day.branch },
        { pillar: '時', branch: chart.pillars.hour.branch },
      ],
      hourKnown,
      annualYear: new Date().getFullYear(),
      ziweiBirth: timeIndex === undefined
        ? null
        : { calendarType: 'solar', date: person.birthDate, gender: person.gender === 'female' ? '女' : '男', timeIndex },
    });

    return NextResponse.json({ person: { name: person.name.trim(), birthDate: person.birthDate, hourKnown }, result });
  } catch (error) {
    console.error('[red-luan-heartbeat] request failed', requestId, error instanceof Error ? error.message : String(error));
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '系統正在重新同步，請稍候再試。', 503);
  }
}
