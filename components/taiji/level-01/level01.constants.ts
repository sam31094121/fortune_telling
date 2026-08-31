/**
 * LEVEL_01 專屬上限與校準值。
 * 禁止被 LEVEL_02～24 引用。
 */

export const LEVEL_01_LAYER = 1;

export const LEVEL_THRESHOLD_DEG = 2.5;
export const APPROACHING_THRESHOLD_DEG = 8;
export const LOCKED_HOLD_MS = 750;
export const WAKE_THRESHOLD = 0.22;
export const LOW_PASS_FACTOR = 0.12;
export const MAX_SAFE_ROTATION_SPEED = 4.2;
// 快甩時允許的短暫慣性上限；與一般傾斜的低速轉動分開校準。
export const MAX_FLICK_SPIN_SPEED = 12;
export const FLICK_ROTATION_THRESHOLD = 70;
export const FLICK_ACCELERATION_THRESHOLD = 3;
export const FLICK_RESPONSE_DAMPING = 4.2;
export const FLICK_COAST_DAMPING = 1.35;
export const MAX_TILT_VISUAL_ANGLE_DEG = 28;
// Prevent sustained shaking from becoming a continuous vibration on a phone.
export const HAPTIC_RATE_LIMIT_MS = 320;
export const AUDIO_GAIN_LIMIT = 0.28;
export const DAMPING = 3.4;
export const LOCKED_DAMPING = 5.8;
export const REDUCED_MOTION_SPEED_SCALE = 0.28;
export const ORIENTATION_NORMALIZE = 25;
export const ROTATION_NORMALIZE = 180;
export const ACCEL_NORMALIZE = 15;
export const SENSOR_TIMEOUT_MS = 1600;
export const SENSOR_WARMUP_TIMEOUT_MS = 2500;
export const GRAVITY_FILTER_FACTOR = 0.08;
export const GRAVITY_MAGNITUDE = 9.80665;
export const FRAME_DELTA_CAP = 1 / 45;
export const HUD_REFRESH_MS = 160;
export const VISUAL_BURST_COOLDOWN_MS = 620;
export const VISUAL_BURST_MIN_TILT_DEG = 1.7;

export const MOTION_ENERGY_WEIGHTS = {
  orientation: 0.3,
  rotation: 0.45,
  acceleration: 0.25,
} as const;
