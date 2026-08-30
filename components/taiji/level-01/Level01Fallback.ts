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

/**
 * 感測器暖機逾時只降級顯示，不得寫死 permission。
 * 事件晚到（Android 慢啟動）時必須能自動回到 LIVE，不需要重新整理。
 */
export function resolveEffectivePermission(input: {
  permission: Level01Permission;
  sensorTimedOut: boolean;
  hasSensorData: boolean;
}): Level01Permission {
  if (input.permission === 'granted' && input.sensorTimedOut && !input.hasSensorData) {
    return 'unsupported';
  }
  return input.permission;
}
