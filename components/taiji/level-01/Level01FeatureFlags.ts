export const TAIJI_MOTION_GAME_V1 = 'TAIJI_MOTION_GAME_V1' as const;

const isEnabledValue = (value: string | null | undefined) => value === '1' || value === 'true';

/** Production traffic stays off unless the environment flag is enabled. */
export function isTaijiMotionGameV1Enabled(search?: string) {
  if (typeof process !== 'undefined' && isEnabledValue(process.env.NEXT_PUBLIC_TAIJI_MOTION_GAME_V1)) return true;
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  return query ? isEnabledValue(new URLSearchParams(query).get('taijiMotionGame')) : false;
}
