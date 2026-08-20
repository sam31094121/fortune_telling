'use client';

/**
 * 唯一出生資料檔案（Canonical Birth Profile Store）
 *
 * 階段二：新增、並行寫入。八字與紫微各自原本的 localStorage
 * （`tdh_self_birth_profile_v1`／`fortune_telling_user_data_v2`）維持不動、繼續照舊運作；
 * 這裡只是「多存一份共用格式」，讓其中一頁填過的資料，另一頁可以讀到。
 * 之後穩定了才考慮讓舊格式改為從這裡讀出（cutover），本階段不做。
 */

import type { CanonicalBirthProfile } from './canonical-birth-profile';

const CANONICAL_PROFILE_STORAGE_KEY = 'tdh_canonical_birth_profile_v1';

export function readCanonicalBirthProfile(): CanonicalBirthProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CANONICAL_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CanonicalBirthProfile;
    return parsed && typeof parsed === 'object' && parsed.birthDate ? parsed : null;
  } catch {
    return null;
  }
}

/** 只在「本人」身分送出分析時呼叫；覆蓋既有值，缺的欄位維持原樣 */
export function saveCanonicalBirthProfile(profile: CanonicalBirthProfile): void {
  if (typeof window === 'undefined') return;
  if (profile.subjectType !== 'SELF') return; // 親朋好友的資料不寫進本人檔案
  try {
    const existing = readCanonicalBirthProfile();
    const merged: CanonicalBirthProfile = { ...existing, ...profile };
    window.localStorage.setItem(CANONICAL_PROFILE_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* in-app browser 可能封鎖 storage：靜默略過，不影響流程 */
  }
}

export function clearCanonicalBirthProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CANONICAL_PROFILE_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
