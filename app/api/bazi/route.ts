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

const FIELD_LABELS: Record<string, string> = { birthDate: '出生日期', gender: '性別', birthTime: '出生時間' };
const NO_STORE = { 'Cache-Control': 'no-store' };

/** 只有輸入格式錯誤算 400；其餘（引擎例外等）是伺服器端問題，回 500，且不把英文例外訊息丟給客人。 */
function isInputError(message: string) {
  return /BAZI_INPUT_/.test(message) || /\bwrong (year|month|day|hour|minute|second)\b/i.test(message);
}

export async function POST(request: Request) {
  let body: BaziApiBody;
  try {
    body = await request.json() as BaziApiBody;
  } catch {
    return NextResponse.json({ success: false, ok: false, code: 'INVALID_JSON', error: '資料格式無法讀取，請重新送出一次。' }, { status: 400, headers: NO_STORE });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ success: false, ok: false, code: 'INVALID_JSON', error: '資料格式無法讀取，請重新送出一次。' }, { status: 400, headers: NO_STORE });
  }
  try {
    const input = normalizeInput(body);
    const missing = ['birthDate', 'gender'].filter((field) => !input[field as keyof BaziAnalysisInput]);
    if (!input.timeUnknown && !input.birthTime) missing.push('birthTime');
    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        ok: false,
        code: 'MISSING_FIELDS',
        missing,
        error: `請補上：${missing.map((field) => FIELD_LABELS[field] ?? field).join('、')}。`,
      }, { status: 400, headers: NO_STORE });
    }

    const result = attachBaziProfessionalCoreV5(analyzeBazi(input), input);
    return NextResponse.json({ success: true, ok: true, data: result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = typeof (error as { message?: unknown })?.message === 'string' ? (error as { message: string }).message : String(error);
    console.error('[bazi] request failed', message);
    if (isInputError(message)) {
      return NextResponse.json({ success: false, ok: false, code: 'INVALID_INPUT', error: '出生日期或時間不正確，請確認後再送出一次。' }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ success: false, ok: false, code: 'BAZI_FAILED', error: '八字命盤目前無法完成，請稍後再試一次。' }, { status: 500, headers: NO_STORE });
  }
}
