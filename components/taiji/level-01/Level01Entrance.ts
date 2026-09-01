export const LEVEL01_ENTRANCE_DURATION_SECONDS = 0.92;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;

/** One-shot, bounded game entrance. Whole turns finish aligned before hand control takes over. */
export function level01EntrancePose(elapsedSeconds: number, reducedMotion: boolean) {
  const progress = clamp01(elapsedSeconds / LEVEL01_ENTRANCE_DURATION_SECONDS);
  if (elapsedSeconds < 0 || progress >= 1) {
    return { active: false, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1, energy: 0 };
  }
  const launch = Math.sin(Math.min(1, progress / 0.42) * Math.PI);
  const settle = 1 - easeOutCubic(progress);
  const strength = reducedMotion ? 0.34 : 1;
  const turns = easeOutCubic(progress) * Math.PI * 4;
  return {
    active: true,
    x: Math.sin(progress * Math.PI * 2.1) * 0.035 * settle * strength,
    y: launch * 0.052 * strength,
    z: launch * 0.12 * strength,
    rx: turns * 0.52 * strength,
    ry: turns * strength,
    rz: -turns * 0.38 * strength,
    scale: 1 + launch * 0.075 * strength,
    energy: launch * strength,
  };
}
