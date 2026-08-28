'use client';

/**
 * 姓名學本人資料：只在使用者選擇「我自己」並完成分析後保存。
 * 讓同一台裝置下次點「我自己」時，直接帶回本人已填過的資料；
 * 選擇親朋好友時不讀取、也不覆寫這份資料。
 */

import type { Gender } from '@/lib/types';

export type NameologySelfProfile = {
  name: string;
  birthDate: string;
  gender: Gender;
  shichen?: number | null;
};

const STORAGE_KEY = 'tdh_nameology_self_profile_v1';

export function readNameologySelfProfile(): NameologySelfProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as NameologySelfProfile;
    return profile && typeof profile === 'object' && profile.name
      ? { name: profile.name, birthDate: profile.birthDate, gender: profile.gender, shichen: typeof profile.shichen === 'number' && Number.isInteger(profile.shichen) && profile.shichen >= 0 && profile.shichen <= 11 ? profile.shichen : null }
      : null;
  } catch {
    return null;
  }
}

export function saveNameologySelfProfile(profile: NameologySelfProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: profile.name, birthDate: profile.birthDate, gender: profile.gender, shichen: profile.shichen ?? null }));
  } catch {
    // 部分內嵌瀏覽器可能封鎖 localStorage；表單流程仍可正常使用。
  }
}
