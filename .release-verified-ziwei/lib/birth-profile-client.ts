'use client';

import { isMemberGrowthTarget } from './identity-split-client';

export type BirthPrecision = 'DATE_ONLY' | 'DATE_TIME' | 'FULL_CHART';

export type BirthProfile = {
  birthDate: string;
  birthTime: string | null;
  birthCityId: string | null;
  birthTimezone: string | null;
  birthPrecision: BirthPrecision;
  updatedAt: string;
};

const PROFILE_STORAGE_KEY = 'tdh_birth_profile_v1';
export const BIRTH_PROFILE_UPDATED_EVENT = 'tdh-birth-profile-updated';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Some in-app browsers restrict localStorage. Birth profile sharing still degrades safely.
  }
}

export function computeBirthPrecision(hasTime: boolean, hasCity: boolean): BirthPrecision {
  if (hasTime && hasCity) return 'FULL_CHART';
  if (hasTime) return 'DATE_TIME';
  return 'DATE_ONLY';
}

export function getBirthProfile(): BirthProfile | null {
  return readJson<BirthProfile | null>(PROFILE_STORAGE_KEY, null);
}

/**
 * Persists the shared birth profile so other modules (astrology, transits, moon
 * cycle reminders, etc.) can reuse it without asking the member to fill it in again.
 * Only SELF analyses write to the shared profile; OTHER (親朋好友) never touches it.
 */
export function saveBirthProfile(input: { birthDate: string; birthTime: string | null; birthCityId: string | null; birthTimezone: string | null }): boolean {
  if (!isMemberGrowthTarget()) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tdh-growth-progress-skipped', {
        detail: { moduleId: 'zodiac', reason: 'guest_analysis' },
      }));
    }
    return false;
  }

  const profile: BirthProfile = {
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthCityId: input.birthCityId,
    birthTimezone: input.birthTimezone,
    birthPrecision: computeBirthPrecision(Boolean(input.birthTime), Boolean(input.birthCityId)),
    updatedAt: new Date().toISOString(),
  };
  writeJson(PROFILE_STORAGE_KEY, profile);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BIRTH_PROFILE_UPDATED_EVENT, { detail: { profile } }));
  }
  return true;
}

export function clearBirthProfile() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
