'use client';

/**
 * 本人出生資料檔案（Self Birth Profile）
 *
 * 概念：選「我自己」＝以後自動帶入本人之前填過的資料，不用重複填寫；
 *       選「親朋好友」＝空白表單手動填寫，不動本人檔案。
 *
 * 來源：只儲存「使用者自己親手填過、且以『我自己』身分送出」的資料。
 * 不推算、不補值；沒填過的欄位維持空白。
 */

import type { BirthProfile } from '@/components/UnifiedBirthForm';

const SELF_PROFILE_STORAGE_KEY = 'tdh_self_birth_profile_v1';

export function readSelfBirthProfile(): BirthProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SELF_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BirthProfile;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** 只在「我自己」身分送出分析時呼叫；只存有值的欄位 */
export function saveSelfBirthProfile(profile: BirthProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readSelfBirthProfile() ?? {};
    const cleaned: BirthProfile = { ...existing };
    (Object.keys(profile) as Array<keyof BirthProfile>).forEach((key) => {
      const value = profile[key];
      if (value !== undefined && value !== null && value !== '') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cleaned as any)[key] = value;
      }
    });
    // timeUnknown 為 boolean，false 也要保存（代表使用者確認過有時辰）
    if (typeof profile.timeUnknown === 'boolean') cleaned.timeUnknown = profile.timeUnknown;
    window.localStorage.setItem(SELF_PROFILE_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    /* in-app browser 可能封鎖 storage：靜默略過，不影響流程 */
  }
}

export function clearSelfBirthProfile(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(SELF_PROFILE_STORAGE_KEY); } catch { /* noop */ }
}
