export const HOME_TRUST_EPOCH = 'home-20261108-v2';
export type HomeTrustKind = 'agree' | 'disagree' | 'view';
export type HomeTrustSnapshot = { epoch: typeof HOME_TRUST_EPOCH; agreeCount: number; disagreeCount: number; viewCount: number; revision: number };
export function isHomeTrustSnapshot(value: unknown): value is HomeTrustSnapshot {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.epoch === HOME_TRUST_EPOCH && ['agreeCount', 'disagreeCount', 'viewCount', 'revision'].every(key => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0);
}
