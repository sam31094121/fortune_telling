export const LEVEL01_REENTRY_DURATION_SECONDS = 0.76;

export function shouldTriggerLevel01Reentry(previousLayer: number, nextLayer: number) {
  return previousLayer === 2 && nextLayer === 1;
}

export function level01ReentryPose(elapsedSeconds: number, reducedMotion: boolean) {
  if (reducedMotion || elapsedSeconds >= LEVEL01_REENTRY_DURATION_SECONDS) {
    return { active: false, spin: 0, x: 0, y: 0, z: 0 };
  }
  const progress = Math.max(0, Math.min(1, elapsedSeconds / LEVEL01_REENTRY_DURATION_SECONDS));
  const remaining = 1 - progress;
  // Four-and-a-half turns unwind quickly, while the small arc keeps the return tactile rather than abrupt.
  return {
    active: true,
    spin: remaining * remaining * Math.PI * 9,
    x: Math.sin(progress * Math.PI) * 0.07,
    y: Math.sin(progress * Math.PI) * 0.045,
    z: Math.sin(progress * Math.PI) * 0.055,
  };
}
