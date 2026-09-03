export const TAIJI_MOTION_GAME_V1 = 'TAIJI_MOTION_GAME_V1' as const;

const isEnabledValue = (value: string | null | undefined) => value === '1' || value === 'true';

/** Level 01 has completed mobile validation and is now on by default.
 * Operations can still stop the rollout immediately with an explicit false
 * environment value or `?taijiMotionGame=0` during diagnosis. */
export function isTaijiMotionGameV1Enabled(search?: string) {
  const environmentValue = typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_TAIJI_MOTION_GAME_V1
    : undefined;
  if (environmentValue != null && environmentValue !== '') return isEnabledValue(environmentValue);
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const queryValue = query ? new URLSearchParams(query).get('taijiMotionGame') : null;
  if (queryValue != null) return isEnabledValue(queryValue);
  return true;
}
