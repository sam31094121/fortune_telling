import type { BloodType } from './types';

export const VALID_BLOOD_TYPES: readonly Exclude<BloodType, ''>[] = ['A', 'B', 'AB', 'O'];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidBirthday(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getTime() <= Date.now();
}

export function isValidBloodType(value: unknown): value is Exclude<BloodType, ''> {
  return typeof value === 'string' && VALID_BLOOD_TYPES.includes(value as Exclude<BloodType, ''>);
}
