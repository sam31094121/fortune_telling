export const TAIJI_PENTATONIC_HZ = [130.81, 146.83, 164.81, 196, 220] as const;

export type RotationFeedbackProfile = {
  frequency: number;
  harmonicFrequency: number;
  gain: number;
  durationMs: number;
  hapticMs: number;
  intensity: number;
};

export type RotationBurstBeat = RotationFeedbackProfile & {
  offsetMs: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const wrapIndex = (index: number, length: number) => ((index % length) + length) % length;

export function pentatonicFrequency(index: number, octave = 0) {
  return TAIJI_PENTATONIC_HZ[wrapIndex(index, TAIJI_PENTATONIC_HZ.length)] * (2 ** octave);
}

/** One shared, bounded profile drives both the audible rotation beat and haptic pulse. */
export function rotationFeedbackProfile(input: {
  spin: number;
  energy: number;
  pulseIndex: number;
  reducedMotion?: boolean;
}): RotationFeedbackProfile {
  const spin = clamp01(input.spin);
  const energy = clamp01(input.energy);
  const intensity = clamp01(spin * 0.68 + energy * 0.32);
  const noteIndex = input.pulseIndex + Math.round(spin * 2);
  const octave = intensity > 0.86 ? 1 : 0;
  const frequency = pentatonicFrequency(noteIndex, octave);
  const motionScale = input.reducedMotion ? 0.52 : 1;
  return {
    frequency,
    harmonicFrequency: frequency * 1.5,
    gain: Math.min(0.038, (0.012 + intensity * 0.022) * motionScale),
    durationMs: Math.round((82 + intensity * 42) * (input.reducedMotion ? 0.82 : 1)),
    hapticMs: input.reducedMotion ? 0 : Math.round(4 + intensity * 12),
    intensity,
  };
}

/** Deterministic shared burst timeline: audio notes and vibration use identical beat offsets. */
export function rotationBurstTimeline(turns: number, durationSeconds: number, momentum: number) {
  const count = Math.max(1, Math.min(5, Math.round(turns)));
  const durationMs = Math.max(180, Math.min(1600, durationSeconds * 1000));
  const intervalMs = durationMs / count;
  return Array.from({ length: count }, (_, index): RotationBurstBeat => ({
    ...rotationFeedbackProfile({
      spin: Math.max(0.42, Math.min(1, momentum)),
      energy: Math.min(1, 0.56 + momentum * 0.28),
      pulseIndex: index + Math.round(momentum * 2),
    }),
    offsetMs: Math.round(index * intervalMs),
  }));
}
