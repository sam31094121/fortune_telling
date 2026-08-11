import { NextResponse } from 'next/server';
import { analyzeBazi, type BaziAnalysisInput } from '@/lib/bazi-engine';
import { createBaziCore } from '@/lib/bazi/engine';
import { attachBaziProfessionalCoreV5, type BaziRuntimeInput } from '@/lib/bazi-professional-result-v5';

/**
 * SHADOW_MODE（Traditional Bazi Core V1）
 * 正式流量仍由 LEGACY analyzeBazi 服務；
 * 新核心平行計算並比對四柱差異，只記錄於伺服器 log 與回應 _shadow 欄位（內部觀察用）。
 * Golden Test + 人工核對通過後才 CUTOVER。
 */
function runShadowCompare(input: BaziAnalysisInput, legacyResult: unknown) {
  try {
    const core = createBaziCore({
      gender: input.gender,
      birthDate: input.birthDate,
      birthTimeKnown: Boolean(input.birthTime),
      birthTime: input.birthTime || undefined,
    });
    const legacy = legacyResult as { pillars?: Record<string, { stem?: string; branch?: string }> } | null;
    const diff: string[] = [];
    const pairs: Array<[string, 'year' | 'month' | 'day' | 'hour']> = [['year', 'year'], ['month', 'month'], ['day', 'day'], ['hour', 'hour']];
    for (const [legacyKey, coreKey] of pairs) {
      const lp = legacy?.pillars?.[legacyKey];
      const np = core.pillars[coreKey];
      const legacyGZ = lp ? `${lp.stem ?? ''}${lp.branch ?? ''}` : 'N/A';
      const newGZ = np === 'UNKNOWN' ? 'UNKNOWN' : np.ganZhi;
      if (legacyGZ !== newGZ) diff.push(`${coreKey}: legacy=${legacyGZ} new=${newGZ}`);
    }
    if (diff.length > 0) console.warn('[bazi-shadow] PILLAR_DIFF', JSON.stringify(diff));
    return { engine: core.engine.name, version: core.engine.version, certified: core.verification.readyForInterpretation, pillarDiff: diff };
  } catch (error) {
    console.error('[bazi-shadow] failed', error instanceof Error ? error.message : error);
    return { engine: 'TraditionalBaziCore', error: 'SHADOW_FAILED' };
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BaziApiBody = Partial<BaziAnalysisInput> & {
  inputData?: Partial<BaziAnalysisInput>;
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
    const shadow = runShadowCompare(input, result);
    return NextResponse.json({ success: true, ok: true, data: result, _shadow: shadow }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '八字命盤目前無法完成。';
    console.error('[bazi] request failed', message);
    return NextResponse.json({ success: false, ok: false, error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
