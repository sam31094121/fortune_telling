import { NextResponse } from 'next/server';
import { createBaziCore } from '@/lib/bazi/engine';
import { SHICHEN_LIST, shichenFromClockHour } from '@/lib/shichen-engine';
import { isValidBirthday } from '@/lib/validation';
import {
  buildRedLuanContextAlignment,
  buildRedLuanAffinityProfile,
  defaultPartnerGenderFor,
  validateRedLuanPartnerGender,
  type RedLuanPartnerGender,
  buildSingleRedLuanHeartbeat,
  normalizeRedLuanAttractedType,
  normalizeRedLuanSelfReportedContext,
  validateRedLuanAttractedType,
  validateRedLuanSelfReportedContext,
  type RedLuanAttractedType,
  type RedLuanSelfReportedContext,
} from '@/lib/red-luan-heartbeat-engine';
import { buildRedLuanIChingReading } from '@/lib/red-luan-iching-reading';
import { generateRedLuanCulturalReading } from '@/lib/red-luan-cultural-reading';
import { createRequestId, friendlyErrorResponse } from '@/lib/api-stability';
import { RED_LUAN_ARCHIVE_COPY, RED_LUAN_PUBLIC_ARCHIVED } from '@/lib/red-luan-public-access';

export const dynamic = 'force-dynamic';

type SinglePersonRequest = {
  name: string;
  birthDate: string;
  calendarType?: 'SOLAR' | 'LUNAR';
  isLeapMonth?: boolean;
  timezone?: 'Asia/Taipei';
  timePrecision?: 'EXACT_TIME' | 'TRADITIONAL_HOUR' | 'UNKNOWN_TIME';
  birthTime?: string;
  birthHourBranch?: string;
  gender: 'male' | 'female';
} & Partial<RedLuanSelfReportedContext> & { attractedType?: RedLuanAttractedType | 'UNSPECIFIED'; partnerGender?: RedLuanPartnerGender };

function resolvedTimePrecision(person: Partial<SinglePersonRequest>) {
  if (person.timePrecision) return person.timePrecision;
  return person.birthHourBranch && person.birthHourBranch !== 'unknown' ? 'TRADITIONAL_HOUR' as const : 'UNKNOWN_TIME' as const;
}

function exactTimeBranch(time?: string) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return undefined;
  const hour = Number(time.slice(0, 2));
  const index = shichenFromClockHour(hour);
  return SHICHEN_LIST[index];
}

function currentTaipeiYear() {
  return Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Taipei' }).format(new Date()));
}

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return '請提供有效的出生資料。';
  const person = body as Partial<SinglePersonRequest>;
  if (typeof person.name !== 'string' || person.name.trim().length < 2 || person.name.trim().length > 20) {
    return '姓名至少需要 2 個字。';
  }
  if (typeof person.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate)) return '生日日期無效。';
  const [year, month, day] = person.birthDate.split('-').map(Number);
  if ((person.calendarType ?? 'SOLAR') === 'SOLAR' && !isValidBirthday(person.birthDate)) return '國曆生日日期無效或晚於今天。';
  if (person.calendarType === 'LUNAR' && (year < 1900 || year > new Date().getFullYear() || month < 1 || month > 12 || day < 1 || day > 30)) {
    return '農曆生日日期超出目前支援範圍。';
  }
  if (!['male', 'female'].includes(person.gender ?? '')) return '請選擇性別。';
  if (person.calendarType && !['SOLAR', 'LUNAR'].includes(person.calendarType)) return '曆法類型無效。';
  if (person.timezone && person.timezone !== 'Asia/Taipei') return '目前此流程僅支援台灣標準時間。';
  const precision = resolvedTimePrecision(person);
  if (!['EXACT_TIME', 'TRADITIONAL_HOUR', 'UNKNOWN_TIME'].includes(precision)) return '出生時間精度無效。';
  if (precision === 'EXACT_TIME' && (!person.birthTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(person.birthTime))) {
    return '請提供有效的精確出生時間。';
  }
  if (precision === 'TRADITIONAL_HOUR' && !SHICHEN_LIST.some((item) => item.branch === person.birthHourBranch)) {
    return '出生時辰無效。';
  }
  const contextError = validateRedLuanSelfReportedContext({
    relationshipStatus: person.relationshipStatus,
    familyResponsibility: person.familyResponsibility,
    currentExpectation: person.currentExpectation,
  });
  if (contextError) return contextError;
  const attractedTypeError = validateRedLuanAttractedType(person.attractedType);
  if (attractedTypeError) return attractedTypeError;
  return validateRedLuanPartnerGender(person.partnerGender);
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  if (RED_LUAN_PUBLIC_ARCHIVED) {
    return friendlyErrorResponse(
      requestId,
      'RED_LUAN_ARCHIVED',
      `${RED_LUAN_ARCHIVE_COPY.title}${RED_LUAN_ARCHIVE_COPY.message}，目前暫停提供運算。`,
      503,
    );
  }
  let person: SinglePersonRequest;

  try {
    person = (await request.json()) as SinglePersonRequest;
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '無法解析請求資料。', 400);
  }

  const invalid = validate(person);
  if (invalid) return friendlyErrorResponse(requestId, 'INVALID_INPUT', invalid, 400);

  try {
    const timePrecision = resolvedTimePrecision(person);
    const hourKnown = timePrecision !== 'UNKNOWN_TIME';
    const exactHour = timePrecision === 'EXACT_TIME' ? exactTimeBranch(person.birthTime) : undefined;
    const selectedHour = timePrecision === 'TRADITIONAL_HOUR'
      ? SHICHEN_LIST.find((item) => item.branch === person.birthHourBranch)
      : exactHour;
    if (!hourKnown || !selectedHour) {
      return friendlyErrorResponse(
        requestId,
        'BIRTH_TIME_REQUIRED_FOR_BAZI_ZIWEI_CROSS_CHECK',
        '請提供可確認的出生時辰；本功能必須完成八字四柱與紫微本命夫妻宮核對後，才會生成紅鸞解讀。',
        422,
      );
    }
    const core = createBaziCore({
      name: person.name.trim(),
      birthDate: person.birthDate,
      birthTimeKnown: hourKnown,
      birthTime: timePrecision === 'EXACT_TIME' ? person.birthTime : undefined,
      traditionalHour: timePrecision === 'TRADITIONAL_HOUR' ? selectedHour?.branch : undefined,
      gender: person.gender,
      calendarType: person.calendarType ?? 'SOLAR',
      isLeapMonth: Boolean(person.isLeapMonth),
      timezone: 'Asia/Taipei (UTC+8, STANDARD_TIME)',
      birthCountry: 'TW',
      birthCity: 'Taipei',
    });
    const primaryReady = core.verification.calendarVerified && core.verification.pillarsVerified && core.verification.tenGodsVerified;
    if (!primaryReady) {
      return friendlyErrorResponse(requestId, 'BAZI_INPUT_NOT_VERIFIED', '出生資料尚未通過確定性排盤核對，暫不進入紅鸞運算。', 422);
    }
    const presentBranches = [
      { pillar: '年' as const, branch: core.pillars.year.earthlyBranch },
      { pillar: '月' as const, branch: core.pillars.month.earthlyBranch },
      { pillar: '日' as const, branch: core.pillars.day.earthlyBranch },
      ...(core.pillars.hour === 'UNKNOWN' ? [] : [{ pillar: '時' as const, branch: core.pillars.hour.earthlyBranch }]),
    ];
    const result = buildSingleRedLuanHeartbeat({
      yearBranch: core.pillars.year.earthlyBranch,
      dayBranch: core.pillars.day.earthlyBranch,
      dayMasterStem: core.dayMaster.stem,
      presentBranches,
      hourKnown,
      annualYear: currentTaipeiYear(),
      ziweiBirth: selectedHour === undefined
        ? null
        : { calendarType: 'solar', date: core.calendar.solarDate, gender: person.gender === 'female' ? '女' : '男', timeIndex: selectedHour.branchIndex },
      normalizedBirth: {
        inputCalendarType: person.calendarType ?? 'SOLAR',
        normalizedSolarDate: core.calendar.solarDate,
        normalizedLunarDate: core.calendar.lunarDate,
        timezone: core.calendar.timezone,
        timePrecision: core.timePrecision,
        exactTime: timePrecision === 'EXACT_TIME' ? person.birthTime : undefined,
        traditionalHour: selectedHour?.branch,
        traditionalHourRange: timePrecision === 'TRADITIONAL_HOUR' ? selectedHour?.range : undefined,
      },
      validation: {
        primaryEngine: core.engine.name,
        primaryEngineVersion: core.engine.version,
        primaryRuleSet: core.engine.ruleSet,
        primaryStatus: 'PASSED',
        qualityGateStatus: 'NOT_TESTED',
        independentReference: 'NOT_TESTED_NO_INDEPENDENT_SOURCE',
        goldenCases: 'NOT_AVAILABLE',
        totalCompared: 0,
        matchedCount: 0,
        differences: [],
        verifiedScope: ['曆法標準化', '年／月／日柱', ...(hourKnown ? ['時柱'] : []), '紅鸞／天喜', '咸池桃花', '天乙貴人', '日支六合／六沖'],
        unverifiedScope: ['獨立第二來源逐欄校驗', '人工黃金案例', '月份級關係訊號', '紫微流年夫妻宮／四化'],
      },
      timelineYears: 6,
    });
    if (result.ziwei.status !== 'READY' || !result.ziwei.palaces?.some((palace) => palace.palace === '夫妻宮')) {
      return friendlyErrorResponse(
        requestId,
        'ZIWEI_VALIDATION_NOT_READY',
        '紫微本命夫妻宮尚未完成核對，暫不生成紅鸞解讀。',
        422,
      );
    }
    // Every context field is optional; blanks collapse to UNSPECIFIED here so the
    // response always reports a complete, explicit position.
    const selfReportedContext: RedLuanSelfReportedContext = normalizeRedLuanSelfReportedContext({
      relationshipStatus: person.relationshipStatus,
      familyResponsibility: person.familyResponsibility,
      currentExpectation: person.currentExpectation,
    });
    const contextAlignment = buildRedLuanContextAlignment(selfReportedContext, result);
    const attractedType = normalizeRedLuanAttractedType(person.attractedType);
    // 有緣方向與卦象都建立在已凍結的 result 上，不回頭改寫任何證據。
    const affinity = buildRedLuanAffinityProfile({
      yearBranch: core.pillars.year.earthlyBranch,
      dayBranch: core.pillars.day.earthlyBranch,
      dayMasterStem: core.dayMaster.stem,
      ziwei: result.ziwei,
      attractedType,
      partnerGender: person.partnerGender ?? defaultPartnerGenderFor(person.gender),
    });
    const ichingReading = buildRedLuanIChingReading({
      name: person.name.trim(),
      birthDate: core.calendar.solarDate,
      shichenIndex: hourKnown && selectedHour ? SHICHEN_LIST.findIndex((item) => item.branch === selectedHour.branch) : null,
      year: result.annualYear,
      peakMonths: result.monthlyRhythm.peakMonths,
      affinity,
    });
    const culturalReading = await generateRedLuanCulturalReading(result);

    return NextResponse.json({
      person: { name: person.name.trim(), birthDate: core.calendar.solarDate, hourKnown },
      relationshipPosition: {
        ...selfReportedContext,
        attractedType,
        usage: 'REFLECTION_GUIDANCE_ONLY',
      },
      contextAlignment,
      affinity,
      ichingReading,
      result: { ...result, culturalReading },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('BAZI_INPUT_INVALID')) {
      return friendlyErrorResponse(requestId, 'INVALID_INPUT', '出生日期或時間無效，請確認後再試。', 400);
    }
    console.error('[red-luan-heartbeat] request failed', requestId, error instanceof Error ? error.message : String(error));
    return friendlyErrorResponse(requestId, 'TEMPORARILY_UNAVAILABLE', '系統正在重新同步，請稍候再試。', 503);
  }
}
