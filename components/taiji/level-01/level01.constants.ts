/**
 * LEVEL_01 專屬上限與校準值。
 * 禁止被 LEVEL_02～24 引用。
 */

export const LEVEL_01_LAYER = 1;

export const ENTER_BALANCE_THRESHOLD_DEG = 3;
export const EXIT_BALANCE_THRESHOLD_DEG = 5;
// Backwards-compatible LEVEL_01-only alias for the original physics tests.
export const LEVEL_THRESHOLD_DEG = ENTER_BALANCE_THRESHOLD_DEG;
export const APPROACHING_THRESHOLD_DEG = 8;
export const BALANCED_CONFIRM_MS = 90;
export const LOCKED_HOLD_MS = 800;
export const LEVEL_COMPLETE_DELAY_MS = 900;
export const WAKE_THRESHOLD = 0.22;
export const LOW_PASS_FACTOR = 0.12;
export const SENSOR_DEAD_ZONE_DEG = 0.65;
export const SENSOR_ROTATION_DEAD_ZONE = 1.5;
export const SENSOR_SPIKE_THRESHOLD_DEG = 82;
export const SENSOR_CALIBRATION_MIN_MS = 360;
export const SENSOR_CALIBRATION_MAX_MS = 620;
export const SENSOR_CALIBRATION_MIN_SAMPLES = 8;
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
// Shared by the real-audio scheduler and the 3D route envelope: this is the
// single arrival instant for a cardinal strike.
export const LEVEL01_STRIKE_IMPACT_SECONDS = .17;
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
export const PERFORMANCE_SAMPLE_MS = 1000;
export const QUALITY_DEGRADE_FPS = 45;
export const QUALITY_CRITICAL_FPS = 30;
export const QUALITY_RECOVER_FPS = 56;
export const QUALITY_DEGRADE_HOLD_MS = 1500;
export const QUALITY_RECOVER_HOLD_MS = 8000;

// V3：LOCKED 必須角度小「且」角速度小，避免殘留自轉時誤鎖。
export const ANGULAR_VELOCITY_LOCK_THRESHOLD = 0.35;
// V3：傾斜軸（beta/gamma）改走跟自轉一樣手法的阻尼追蹤，避免感測雜訊直接反映在畫面上。
export const TILT_DAMPING = 9;
// V3：死區改成越過門檻後短距離線性斜坡漸入，取代硬切為 0。
export const SENSOR_DEAD_ZONE_RAMP_DEG = 0.8;
// V3：角速度上限改軟限幅（tanh 漸近），這是漸近曲線的縮放係數，非硬牆。
export const ANGULAR_VELOCITY_SOFT_KNEE = MAX_FLICK_SPIN_SPEED * 0.82;

export const MOTION_ENERGY_WEIGHTS = {
  orientation: 0.3,
  rotation: 0.45,
  acceleration: 0.25,
} as const;
