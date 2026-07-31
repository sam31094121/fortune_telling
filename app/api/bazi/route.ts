import { NextResponse } from 'next/server';
import { analyzeBazi, type BaziAnalysisInput } from '@/lib/bazi-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BaziApiBody = Partial<BaziAnalysisInput> & {
  inputData?: Partial<BaziAnalysisInput>;
};

function normalizeInput(body: BaziApiBody): BaziAnalysisInput {
  const source = body.inputData && typeof body.inputData === 'object' ? body.inputData : body;
  return {
    name: typeof source.name === 'string' ? source.name.trim() : '',
    birthDate: typeof source.birthDate === 'string' ? source.birthDate.trim() : '',
    birthTime: typeof source.birthTime === 'string' ? source.birthTime.trim() : '',
    gender: source.gender === 'male' || source.gender === 'female' ? source.gender : '' as BaziAnalysisInput['gender'],
    country: typeof source.country === 'string' && source.country.trim() ? source.country.trim() : '台灣',
    city: typeof source.city === 'string' && source.city.trim() ? source.city.trim() : '台北',
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as BaziApiBody;
    const input = normalizeInput(body);
    const missing = ['birthDate', 'birthTime', 'gender'].filter((field) => !input[field as keyof BaziAnalysisInput]);
    if (missing.length > 0) {
      return NextResponse.json({ success: false, ok: false, error: missing.join(', ') + ' is required' }, { status: 400 });
    }

    const result = analyzeBazi(input);
    return NextResponse.json({ success: true, ok: true, data: result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '八字命盤目前無法完成。';
    console.error('[bazi] request failed', message);
    return NextResponse.json({ success: false, ok: false, error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}