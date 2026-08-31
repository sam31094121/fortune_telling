import { HAPTIC_RATE_LIMIT_MS } from './level01.constants';
import { LEVEL01_REENTRY_CHEER_PROGRESS, LEVEL01_REENTRY_DURATION_SECONDS } from './Level01Reentry';
import type { BalanceState, Level01TiltDirection } from './Level01Physics';

export type HapticMode = 'LIVE' | 'NO_HAPTIC_MODE';

export class Level01HapticController {
  mode: HapticMode = 'NO_HAPTIC_MODE';
  private lastPulseAt = 0;
  private lastBalanceAt = 0;
  private reducedMotion = false;
  private hasVibrated = false;
  private armedByUserGesture = false;
  private lastDirection: Level01TiltDirection | null = null;
  private lastDirectionAt = 0;
  private reentryCheerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.syncSupport();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  armFromUserGesture() {
    this.armedByUserGesture = true;
    this.syncSupport();
  }

  syncSupport() {
    this.mode = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? 'LIVE'
      : 'NO_HAPTIC_MODE';
  }

  stop() {
    if (this.reentryCheerTimer) {
      clearTimeout(this.reentryCheerTimer);
      this.reentryCheerTimer = null;
    }
    // 沒震過就不要呼叫 vibrate(0)：未經使用者手勢的呼叫會被瀏覽器攔下並吐 console error。
    if (this.mode !== 'LIVE' || !this.hasVibrated) return;
    this.hasVibrated = false;
    try {
      navigator.vibrate(0);
    } catch {
      this.mode = 'NO_HAPTIC_MODE';
    }
  }

  scheduleReentryCheer() {
    if (this.mode !== 'LIVE' || this.reducedMotion || !this.armedByUserGesture) return;
    if (this.reentryCheerTimer) clearTimeout(this.reentryCheerTimer);
    this.reentryCheerTimer = setTimeout(() => {
      this.reentryCheerTimer = null;
      if (this.mode === 'LIVE' && !this.reducedMotion && this.armedByUserGesture) this.safeVibrate(8);
    }, Math.round(LEVEL01_REENTRY_DURATION_SECONDS * LEVEL01_REENTRY_CHEER_PROGRESS * 1000));
  }

  pulse(input: { now: number; motionEnergy: number; balanceState: BalanceState; lockChime: boolean; direction: Level01TiltDirection | null }) {
    if (this.mode !== 'LIVE' || this.reducedMotion || !this.armedByUserGesture) return false;
    if (input.balanceState === 'LOCKED' && !input.lockChime) return;

    if (input.lockChime || input.balanceState === 'BALANCED') {
      if (input.now - this.lastBalanceAt < 900) return;
      this.lastBalanceAt = input.now;
      this.safeVibrate(input.lockChime ? [16, 40, 22] : [12]);
      return false;
    }

    // A deliberate, clear four-way tilt gets one light acknowledgement. The
    // direction must change and pass a cooldown, so held/rough sensor data
    // cannot become a continuous vibration.
    if (input.direction && input.motionEnergy >= 0.16
      && input.direction !== this.lastDirection
      && input.now - this.lastDirectionAt >= 280) {
      this.lastDirection = input.direction;
      this.lastDirectionAt = input.now;
      this.safeVibrate(10);
      return true;
    }
    if (!input.direction) this.lastDirection = null;

    if (input.now - this.lastPulseAt < HAPTIC_RATE_LIMIT_MS) return;
    if (input.motionEnergy < 0.28) return;

    this.lastPulseAt = input.now;
    if (input.motionEnergy >= 0.75) this.safeVibrate(18);
    else if (input.motionEnergy >= 0.5) this.safeVibrate(12);
    return false;
  }

  private safeVibrate(pattern: number | number[]) {
    try {
      this.hasVibrated = true;
      navigator.vibrate(pattern);
    } catch {
      this.mode = 'NO_HAPTIC_MODE';
    }
  }
}
