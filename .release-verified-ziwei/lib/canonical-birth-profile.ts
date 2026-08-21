/**
 * 唯一出生資料（CanonicalBirthProfile）
 *
 * 目的：八字與紫微目前各自收一套出生資料、互不相通（詳見階段一稽核）。
 * 這裡只新增一個共用型別 + 雙向轉換函式，不改動任一引擎內部邏輯——
 * `lib/bazi/engine.ts`、`lib/ziwei/engine.ts` 兩個確定性排盤引擎完全不觸碰。
 *
 * 鐵律：這個檔案只做「資料格式轉換」，不做任何排盤、猜測或補值。
 * 缺什麼欄位就是缺，轉換出來的下游型別該是 undefined 就是 undefined。
 */

import { BRANCHES, type Branch as BaziBranch, type BaziBirthInput } from './bazi/engine';
import type { ZiweiSanFangInput } from './ziwei-sanfang-engine';
import type { BirthProfile as UnifiedBirthProfile, BirthHourBranch } from '@/components/UnifiedBirthForm';
import { shichenFromClockHour } from './shichen-engine';

export interface CanonicalBirthProfile {
  subjectType: 'SELF' | 'OTHER';

  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNSPECIFIED';

  calendarType: 'SOLAR' | 'LUNAR';

  birthDate: string;

  birthTimeKnown: boolean;
  birthTime?: string;

  /** 傳統時辰地支，例如「酉」 */
  traditionalHour?: string;

  birthCountry: string;
  birthCity: string;
  timezone: string;

  timePrecision: 'EXACT' | 'TRADITIONAL_HOUR' | 'UNKNOWN';

  timeCorrection: 'STANDARD_TIME' | 'TRUE_SOLAR_TIME';
}

/** 空白唯一出生資料——所有欄位都是「還沒填」，不是猜出來的預設值 */
export function emptyCanonicalBirthProfile(): CanonicalBirthProfile {
  return {
    subjectType: 'SELF',
    name: '',
    gender: 'UNSPECIFIED',
    calendarType: 'SOLAR',
    birthDate: '',
    birthTimeKnown: false,
    birthCountry: '',
    birthCity: '',
    timezone: '',
    timePrecision: 'UNKNOWN',
    timeCorrection: 'STANDARD_TIME',
  };
}

/* ---------------- 地支 ↔ 時辰序號（兩者順序本來就相同：子丑寅卯…） ---------------- */

function branchToShichenIndex(branch?: string): number | undefined {
  if (!branch) return undefined;
  const index = (BRANCHES as readonly string[]).indexOf(branch);
  return index >= 0 ? index : undefined;
}

/* ==================== → 八字 Engine 輸入 ==================== */

export function toBaziBirthInput(profile: CanonicalBirthProfile): BaziBirthInput | null {
  if (profile.gender === 'UNSPECIFIED' || !profile.birthDate) return null;
  return {
    name: profile.name || undefined,
    gender: profile.gender === 'MALE' ? 'male' : 'female',
    birthDate: profile.birthDate,
    birthTimeKnown: profile.birthTimeKnown,
    birthTime: profile.timePrecision === 'EXACT' ? profile.birthTime : undefined,
    traditionalHour: profile.timePrecision === 'TRADITIONAL_HOUR' ? (profile.traditionalHour as BaziBranch | undefined) : undefined,
    birthCountry: profile.birthCountry || undefined,
    birthCity: profile.birthCity || undefined,
    timezone: profile.timezone || undefined,
    calendarType: profile.calendarType,
  };
}

/* ==================== → 紫微 Engine 輸入 ==================== */

export function toZiweiSanFangInput(profile: CanonicalBirthProfile): ZiweiSanFangInput | null {
  if (profile.gender === 'UNSPECIFIED' || !profile.birthDate) return null;

  let shichen: number | 'unknown' | null = 'unknown';
  let birthTime = '';
  if (profile.timePrecision === 'TRADITIONAL_HOUR' && profile.traditionalHour) {
    const index = branchToShichenIndex(profile.traditionalHour);
    if (index !== undefined) {
      shichen = index;
      birthTime = `${String((index * 2 + 23) % 24).padStart(2, '0')}:00`;
    }
  } else if (profile.timePrecision === 'EXACT' && profile.birthTime) {
    const hour = Number(profile.birthTime.split(':')[0]);
    if (Number.isInteger(hour)) {
      shichen = shichenFromClockHour(hour);
      birthTime = profile.birthTime;
    }
  }

  return {
    birthDate: profile.birthDate,
    birthTime,
    gender: profile.gender === 'MALE' ? 'male' : 'female',
    shichen,
    isTimeConfirmed: profile.timePrecision !== 'UNKNOWN',
    longitude: null,
  };
}

/* ==================== ↔ 既有八字表單型別（UnifiedBirthForm 的 BirthProfile） ==================== */

export function fromUnifiedBirthProfile(bp: UnifiedBirthProfile): CanonicalBirthProfile {
  const timeUnknown = Boolean(bp.timeUnknown) || bp.birthHourBranch === 'unknown';
  const hasHourBranch = !timeUnknown && Boolean(bp.birthHourBranch) && bp.birthHourBranch !== 'unknown';

  return {
    subjectType: 'SELF',
    name: bp.name ?? '',
    gender: bp.gender === 'male' ? 'MALE' : bp.gender === 'female' ? 'FEMALE' : 'UNSPECIFIED',
    calendarType: bp.calendarType === 'lunar' ? 'LUNAR' : 'SOLAR',
    birthDate: bp.birthDate ?? '',
    birthTimeKnown: !timeUnknown,
    birthTime: hasHourBranch ? undefined : bp.birthTime,
    traditionalHour: hasHourBranch ? hourBranchToChar(bp.birthHourBranch) : undefined,
    birthCountry: bp.country ?? '',
    birthCity: bp.city ?? '',
    timezone: '',
    timePrecision: timeUnknown ? 'UNKNOWN' : hasHourBranch ? 'TRADITIONAL_HOUR' : bp.birthTime ? 'EXACT' : 'UNKNOWN',
    timeCorrection: 'STANDARD_TIME',
  };
}

export function toUnifiedBirthProfile(profile: CanonicalBirthProfile): UnifiedBirthProfile {
  return {
    name: profile.name || undefined,
    gender: profile.gender === 'MALE' ? 'male' : profile.gender === 'FEMALE' ? 'female' : undefined,
    birthDate: profile.birthDate || undefined,
    birthTime: profile.timePrecision === 'EXACT' ? profile.birthTime : undefined,
    birthHourBranch:
      profile.timePrecision === 'TRADITIONAL_HOUR'
        ? charToHourBranch(profile.traditionalHour)
        : profile.timePrecision === 'UNKNOWN'
          ? 'unknown'
          : undefined,
    birthPlace: [profile.birthCountry, profile.birthCity].filter(Boolean).join(' ') || undefined,
    country: profile.birthCountry || undefined,
    city: profile.birthCity || undefined,
    calendarType: profile.calendarType === 'LUNAR' ? 'lunar' : 'solar',
    timeUnknown: profile.timePrecision === 'UNKNOWN',
  };
}

const HOUR_BRANCH_TO_CHAR: Record<Exclude<BirthHourBranch, 'unknown'>, string> = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};
const CHAR_TO_HOUR_BRANCH = Object.fromEntries(
  Object.entries(HOUR_BRANCH_TO_CHAR).map(([branch, char]) => [char, branch as BirthHourBranch]),
) as Record<string, BirthHourBranch>;

function hourBranchToChar(branch?: string): string | undefined {
  if (!branch || branch === 'unknown') return undefined;
  return HOUR_BRANCH_TO_CHAR[branch as Exclude<BirthHourBranch, 'unknown'>];
}
function charToHourBranch(char?: string): BirthHourBranch | undefined {
  if (!char) return undefined;
  return CHAR_TO_HOUR_BRANCH[char];
}

/* ==================== ↔ 既有紫微頁面內部狀態（app/insight/page.tsx 的 InsightData） ==================== */

export type InsightBirthLike = {
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  shichen: number | 'unknown' | 'known' | null;
};

export function fromInsightData(data: InsightBirthLike): CanonicalBirthProfile {
  const known = typeof data.shichen === 'number';
  return {
    subjectType: 'SELF',
    name: data.name ?? '',
    gender: data.gender === 'male' ? 'MALE' : data.gender === 'female' ? 'FEMALE' : 'UNSPECIFIED',
    calendarType: 'SOLAR',
    birthDate: data.birthDate ?? '',
    birthTimeKnown: known,
    traditionalHour: known ? BRANCHES[data.shichen as number] : undefined,
    birthCountry: '',
    birthCity: '',
    timezone: '',
    timePrecision: known ? 'TRADITIONAL_HOUR' : 'UNKNOWN',
    timeCorrection: 'STANDARD_TIME',
  };
}

export function toInsightData(profile: CanonicalBirthProfile): InsightBirthLike {
  const index = profile.timePrecision === 'TRADITIONAL_HOUR' ? branchToShichenIndex(profile.traditionalHour) : undefined;
  return {
    name: profile.name,
    birthDate: profile.birthDate,
    gender: profile.gender === 'FEMALE' ? 'female' : 'male',
    shichen: index ?? (profile.timePrecision === 'UNKNOWN' ? 'unknown' : null),
  };
}
