import type { BloodType, Gender } from './types';

export interface SavedUserData {
  name: string;
  birthday: string; // YYYY-MM-DD
  bloodType: BloodType;
  gender: Gender;
}

const STORAGE_KEY = 'fortune_telling_user_data_v2';

export function loadUserData(): SavedUserData | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load user data from localStorage', e);
    return null;
  }
}

export function saveUserData(data: Partial<SavedUserData>) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadUserData() || { name: '', birthday: '', bloodType: '', gender: 'female' };
    const next = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to save user data to localStorage', e);
  }
}
