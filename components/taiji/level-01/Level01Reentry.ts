// The fast launch needs to read clearly, but most of the return is deliberately
// spent coasting down. 1.08s is long enough to feel alive without slowing touch.
export const LEVEL01_REENTRY_DURATION_SECONDS = 1.08;
export const LEVEL01_REENTRY_CHEER_PROGRESS = 0.88;

export function shouldTriggerLevel01Reentry(previousLayer: number, nextLayer: number) {
  return previousLayer > 1 && nextLayer === 1;
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function easeOutQuad(value: number) {
  return 1 - (1 - value) ** 2;
}

export function level01ReentryTimeline(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const launchEnd = 0.14;
  const coastEnd = 0.76;
  if (clamped <= launchEnd) {
    const local = clamped / launchEnd;
    return {
      phase: 'LAUNCH' as const,
      spinProgress: 0.34 * easeOutCubic(local),
      energy: 0.64 + 0.36 * easeOutQuad(local),
      settle: 0,
      tailVelocity: -0.68,
    };
  }
  if (clamped <= coastEnd) {
    const local = (clamped - launchEnd) / (coastEnd - launchEnd);
    return {
      phase: 'COAST' as const,
      spinProgress: 0.34 + 0.6 * easeOutCubic(local),
      energy: 0.98 * (1 - 0.78 * easeOutQuad(local)),
      settle: 0,
      tailVelocity: -0.5,
    };
  }
  const local = (clamped - coastEnd) / (1 - coastEnd);
  return {
    phase: 'SETTLE' as const,
    spinProgress: 0.94 + 0.06 * easeOutQuad(local),
    energy: 0.216 * (1 - local) ** 2,
    settle: local,
    tailVelocity: -0.34 + local * 0.12,
  };
}

/** A single, low-amplitude greeting at the end of the return — never a loop. */
export function level01ReentryCheer(settle: number) {
  const local = Math.max(0, Math.min(1, settle));
  const arc = Math.sin(local * Math.PI);
  return {
    x: Math.sin(local * Math.PI * 1.12 + 0.2) * arc * 0.0045,
    y: arc * 0.012,
    z: -arc * 0.003,
  };
}

export function level01ReentryPose(elapsedSeconds: number, reducedMotion: boolean) {
  if (reducedMotion || elapsedSeconds >= LEVEL01_REENTRY_DURATION_SECONDS) {
    return { active: false, spin: 0, x: 0, y: 0, z: 0, tailVelocity: 0 };
  }
  const progress = Math.max(0, Math.min(1, elapsedSeconds / LEVEL01_REENTRY_DURATION_SECONDS));
  const timeline = level01ReentryTimeline(progress);
  const flight = Math.sin(Math.min(1, progress / 0.76) * Math.PI);
  // A five-turn offset begins and ends visually aligned. The short launch carries
  // the first 34%, then most of the spin is a smooth coast before a soft settle.
  const settleSway = Math.sin(timeline.settle * Math.PI * 1.18 + 0.42) * (1 - timeline.settle) * 0.008;
  const cheer = level01ReentryCheer(timeline.settle);
  return {
    active: true,
    // Leave a sub-quarter-radian tail at the handoff. TaijiSystem damps this
    // residual velocity into the level-01 pose instead of snapping to zero.
    spin: (1 - timeline.spinProgress) * Math.PI * 10 + 0.18 * progress * progress,
    x: flight * 0.064 + settleSway + cheer.x,
    y: flight * 0.04 + Math.sin(progress * Math.PI * 1.6 + 0.35) * (1 - progress) * 0.007 + settleSway * 0.58 + cheer.y,
    z: flight * 0.052 - settleSway * 0.68 + cheer.z,
    tailVelocity: timeline.tailVelocity,
  };
}

/**
 * The return sound follows the same easing as the visible 2 → 1 unwind.
 * It is intentionally a bounded envelope, so the tail always reaches silence
 * exactly when the re-entry pose settles.
 */
export function level01ReentrySoundEnvelope(progress: number) {
  const kinetic = level01ReentryTimeline(progress).energy;
  return {
    frequency: 148 + 232 * kinetic,
    gain: 0.0001 + 0.108 * kinetic,
  };
}
