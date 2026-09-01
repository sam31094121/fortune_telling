export type TaijiSoundVariant = 'SOFT_WOOD' | 'WARM_BELL' | 'AIR_CHIME' | 'LOW_RESONANCE';

export interface TaijiExperienceConfig {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  soundVariant: TaijiSoundVariant;
  durationMs: number;
  reducedMotion: boolean;
}

export interface TaijiPreferenceEvent {
  soundVariant: TaijiSoundVariant;
  completedInteraction: boolean;
  mutedImmediately: boolean;
  replayed: boolean;
  nextStepCompleted: boolean;
}
