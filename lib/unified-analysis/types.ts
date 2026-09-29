export type SubjectType = 'SELF' | 'OTHER';

export type CalendarType = 'SOLAR' | 'LUNAR';

export type TimeCorrectionMode = 'STANDARD_TIME' | 'TRUE_SOLAR_TIME';

export type BirthTimePrecision = 'EXACT_MINUTE' | 'TRADITIONAL_HOUR_RANGE' | 'UNKNOWN';

export type UnifiedGender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';

export type ZiweiAnalysisMode = 'FULL_CHART' | 'DATE_ONLY_REFERENCE';

export interface TraditionalHourRange {
  start: string;
  end: string;
}

export interface UnifiedBirthInput {
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime?: string;
  traditionalHour?: string;
  timeRange?: TraditionalHourRange;
  birthTimePrecision: BirthTimePrecision;
  birthCountry: string;
  birthCity: string;
  timezone: string;
  gender: UnifiedGender;
  calendarType: CalendarType;
  timeCorrectionMode: TimeCorrectionMode;
}

export interface UnifiedAnalysisRequest {
  subjectType: SubjectType;
  fullName: string;
  birth: UnifiedBirthInput;
}

export function resolveZiweiAnalysisMode(birth: UnifiedBirthInput): ZiweiAnalysisMode {
  if (!birth.birthTimeKnown || birth.birthTimePrecision === 'UNKNOWN') {
    return 'DATE_ONLY_REFERENCE';
  }

  return 'FULL_CHART';
}

export function normalizeUnifiedBirthDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const rocMatch = trimmed.match(/^(\d{2,3})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!rocMatch) return trimmed;

  const year = Number(rocMatch[1]) + 1911;
  const month = rocMatch[2].padStart(2, '0');
  const day = rocMatch[3].padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validateUnifiedAnalysisRequest(request: UnifiedAnalysisRequest): void {
  if (request.subjectType !== 'SELF' && request.subjectType !== 'OTHER') {
    throw new Error('UNIFIED_SUBJECT_TYPE_INVALID');
  }

  if (!request.fullName.trim()) {
    throw new Error('UNIFIED_FULL_NAME_REQUIRED');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizeUnifiedBirthDate(request.birth.birthDate))) {
    throw new Error('UNIFIED_BIRTH_DATE_INVALID');
  }

  if (request.birth.birthTimeKnown && !request.birth.birthTime && !request.birth.traditionalHour) {
    throw new Error('UNIFIED_BIRTH_TIME_REQUIRED_WHEN_KNOWN');
  }

  if (request.birth.birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(request.birth.birthTime)) {
    throw new Error('UNIFIED_BIRTH_TIME_INVALID');
  }

  if (!request.birth.birthCountry.trim() || !request.birth.birthCity.trim() || !request.birth.timezone.trim()) {
    throw new Error('UNIFIED_BIRTH_PLACE_REQUIRED');
  }
}
