import { HAPTIC_RATE_LIMIT_MS } from './level01.constants';
import type { BalanceState } from './Level01Physics';

export type HapticMode = 'LIVE' | 'NO_HAPTIC_MODE';

export class Level01HapticController {
  mode: HapticMode = 'NO_HAPTIC_MODE';
  private lastPulseAt = 0;
  private lastBalanceAt = 0;
  private reducedMotion = false;
  private hasVibrated = false;

  constructor() {
    this.syncSupport();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  syncSupport() {
    this.mode = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? 'LIVE'
      : 'NO_HAPTIC_MODE';
  }

  stop() {
    // 沒震過就不要呼叫 vibrate(0)：未經使用者手勢的呼叫會被瀏覽器攔下並吐 console error。
    if (this.mode !== 'LIVE' || !this.hasVibrated) return;
    this.hasVibrated = false;
    try {
      navigator.vibrate(0);
    } catch {
      this.mode = 'NO_HAPTIC_MODE';
    }
  }

  pulse(input: { now: number; motionEnergy: number; balanceState: BalanceState; lockChime: boolean }) {
    if (this.mode !== 'LIVE' || this.reducedMotion) return;
    if (input.balanceState === 'LOCKED' && !input.lockChime) return;

    if (input.lockChime || input.balanceState === 'BALANCED') {
      if (input.now - this.lastBalanceAt < 900) return;
      this.lastBalanceAt = input.now;
      this.safeVibrate(input.lockChime ? [16, 40, 22] : [12]);
      return;
    }

    if (input.now - this.lastPulseAt < HAPTIC_RATE_LIMIT_MS) return;
    if (input.motionEnergy < 0.28) return;

    this.lastPulseAt = input.now;
    if (input.motionEnergy >= 0.75) this.safeVibrate(18);
    else if (input.motionEnergy >= 0.5) this.safeVibrate(12);
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
