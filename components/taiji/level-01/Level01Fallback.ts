export type Level01Permission = 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported';

export type Level01Mode = 'LIVE' | 'FALLBACK_MODE';

export function resolveLevel01Mode(input: {
  permission: Level01Permission;
  hasSensorData: boolean;
  layerEnabled: boolean;
}): Level01Mode {
  if (!input.layerEnabled) return 'FALLBACK_MODE';
  if (input.permission === 'denied' || input.permission === 'unsupported') return 'FALLBACK_MODE';
  if (input.permission === 'granted' && input.hasSensorData) return 'LIVE';
  return 'FALLBACK_MODE';
}

export function isLevel01Driving(mode: Level01Mode) {
  return mode === 'LIVE';
}
