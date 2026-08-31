export const LEVEL01_REENTRY_DURATION_SECONDS = 0.76;

export function shouldTriggerLevel01Reentry(previousLayer: number, nextLayer: number) {
  return previousLayer > 1 && nextLayer === 1;
}

export function level01ReentryPose(elapsedSeconds: number, reducedMotion: boolean) {
  if (reducedMotion || elapsedSeconds >= LEVEL01_REENTRY_DURATION_SECONDS) {
    return { active: false, spin: 0, x: 0, y: 0, z: 0 };
  }
  const progress = Math.max(0, Math.min(1, elapsedSeconds / LEVEL01_REENTRY_DURATION_SECONDS));
  const remaining = 1 - progress;
  // Four-and-a-half turns unwind quickly. A tiny, decaying side-to-side and
  // vertical settle keeps the return alive without turning into a continuous shake.
  const microSway = Math.sin(progress * Math.PI * 3) * remaining * 0.008;
  return {
    active: true,
    spin: remaining * remaining * Math.PI * 9,
    x: Math.sin(progress * Math.PI) * 0.07 + microSway,
    y: Math.sin(progress * Math.PI) * 0.045 + Math.sin(progress * Math.PI * 2) * remaining * 0.011,
    z: Math.sin(progress * Math.PI) * 0.055 - microSway * 0.7,
  };
}

/**
 * The return sound follows the same easing as the visible 2 → 1 unwind.
 * It is intentionally a bounded envelope, so the tail always reaches silence
 * exactly when the re-entry pose settles.
 */
export function level01ReentrySoundEnvelope(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const kinetic = (1 - clamped) ** 2;
  return {
    frequency: 148 + 232 * kinetic,
    gain: 0.0001 + 0.108 * kinetic,
  };
}
