import { NextResponse } from 'next/server';
import { analyzeBazi, type BaziAnalysisInput } from '@/lib/bazi-engine';
import { attachBaziProfessionalCoreV5, type BaziRuntimeInput } from '@/lib/bazi-professional-result-v5';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BaziApiBody = Partial<BaziAnalysisInput> & {
  inputData?: Partial<BaziRuntimeInput>;
  calculationId?: string;
  birthTimeKnown?: boolean;
  timeUnknown?: boolean;
  birthHourBranch?: string;
  traditionalHour?: string;
  calendarType?: 'solar' | 'lunar' | 'SOLAR' | 'LUNAR';
};

function normalizeInput(body: BaziApiBody): BaziRuntimeInput {
  const source = body.inputData && typeof body.inputData === 'object' ? body.inputData : body;
  const runtimeSource = source as BaziApiBody;
  const timeUnknown = runtimeSource.timeUnknown === true || runtimeSource.birthHourBranch === 'unknown' || runtimeSource.birthTimeKnown === false;
  return {
    name: typeof source.name === 'string' ? source.name.trim() : '',
    birthDate: typeof source.birthDate === 'string' ? source.birthDate.trim() : '',
    birthTime: typeof source.birthTime === 'string' && source.birthTime.trim() ? source.birthTime.trim() : timeUnknown ? '12:00' : '',
    gender: source.gender === 'male' || source.gender === 'female' ? source.gender : '' as BaziAnalysisInput['gender'],
    country: typeof source.country === 'string' && source.country.trim() ? source.country.trim() : '台灣',
    city: typeof source.city === 'string' && source.city.trim() ? source.city.trim() : '台北',
    calculationId: typeof runtimeSource.calculationId === 'string' ? runtimeSource.calculationId : undefined,
    birthTimeKnown: timeUnknown ? false : runtimeSource.birthTimeKnown,
    timeUnknown,
    birthHourBranch: typeof runtimeSource.birthHourBranch === 'string' ? runtimeSource.birthHourBranch : undefined,
    traditionalHour: typeof runtimeSource.traditionalHour === 'string' ? runtimeSource.traditionalHour : undefined,
    calendarType: runtimeSource.calendarType,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as BaziApiBody;
    const input = normalizeInput(body);
    const missing = ['birthDate', 'gender'].filter((field) => !input[field as keyof BaziAnalysisInput]);
    if (!input.timeUnknown && !input.birthTime) missing.push('birthTime');
    if (missing.length > 0) {
      return NextResponse.json({ success: false, ok: false, error: missing.join(', ') + ' is required' }, { status: 400 });
    }

    const result = attachBaziProfessionalCoreV5(analyzeBazi(input), input);
    return NextResponse.json({ success: true, ok: true, data: result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '八字命盤目前無法完成。';
    console.error('[bazi] request failed', message);
    return NextResponse.json({ success: false, ok: false, error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
