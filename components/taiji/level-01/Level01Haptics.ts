import { HAPTIC_RATE_LIMIT_MS } from './level01.constants';
import { LEVEL01_REENTRY_CHEER_PROGRESS, LEVEL01_REENTRY_DURATION_SECONDS } from './Level01Reentry';
import type { BalanceState, Level01TiltDirection } from './Level01Physics';
import type { Level01GameEvent } from './Level01Runtime';
import { rotationBurstTimeline, TAIJI_ACTIVATION_FEEDBACK } from './Level01SensoryFeedback';

export type HapticMode = 'LIVE' | 'NO_HAPTIC_MODE';

export class Level01HapticController {
  mode: HapticMode = 'NO_HAPTIC_MODE';
  private enabled = true;
  private lastPulseAt = 0;
  private lastRotationPulseAt = -Infinity;
  private lastBalanceAt = 0;
  private reducedMotion = false;
  private hasVibrated = false;
  private armedByUserGesture = false;
  private lastDirection: Level01TiltDirection | null = null;
  private lastDirectionAt = 0;
  private reentryCheerTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivationImpactAt = -Infinity;
  private lastChaseHitAt = -Infinity;

  constructor() {
    this.syncSupport();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) this.stop();
  }

  armFromUserGesture() {
    this.armedByUserGesture = true;
    this.syncSupport();
  }

  playActivationImpact(now: number) {
    if (!this.enabled || this.mode !== 'LIVE' || this.reducedMotion || !this.armedByUserGesture) return false;
    if (now - this.lastActivationImpactAt < 700) return false;
    this.lastActivationImpactAt = now;
    // Noticeable in the palm, but short and bounded: impact → recoil.
    this.safeVibrate([...TAIJI_ACTIVATION_FEEDBACK.hapticPattern]);
    return true;
  }

  playChaseHit(now: number, hits: number) {
    if (!this.enabled || this.mode !== 'LIVE' || this.reducedMotion || !this.armedByUserGesture) return false;
    if (now - this.lastChaseHitAt < 240) return false;
    this.lastChaseHitAt = now;
    const primary = Math.min(15, 6 + Math.max(0, hits - 1) * 2);
    this.safeVibrate(hits >= 4 ? [primary, 34, 9] : primary);
    return true;
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
    if (!this.enabled || this.mode !== 'LIVE' || this.reducedMotion || !this.armedByUserGesture) return;
    if (this.reentryCheerTimer) clearTimeout(this.reentryCheerTimer);
    this.reentryCheerTimer = setTimeout(() => {
      this.reentryCheerTimer = null;
      if (this.mode === 'LIVE' && !this.reducedMotion && this.armedByUserGesture) this.safeVibrate(8);
    }, Math.round(LEVEL01_REENTRY_DURATION_SECONDS * LEVEL01_REENTRY_CHEER_PROGRESS * 1000));
  }

  scheduleVisualBurst(turns: number, durationSeconds: number, momentum: number) {
    if (!this.enabled || this.mode !== 'LIVE' || this.reducedMotion || !this.armedByUserGesture) return;
    const timeline = rotationBurstTimeline(turns, durationSeconds, momentum);
    const pattern: number[] = [];
    for (let index = 0; index < timeline.length; index += 1) {
      const beat = timeline[index];
      pattern.push(beat.hapticMs);
      const next = timeline[index + 1];
      if (next) pattern.push(Math.max(52, next.offsetMs - beat.offsetMs - beat.hapticMs));
    }
    this.safeVibrate(pattern);
  }

  pulseRotation(input: { now: number; hapticMs: number; intensity: number }) {
    if (!this.enabled || this.mode !== 'LIVE' || this.reducedMotion || !this.armedByUserGesture || input.hapticMs <= 0) return false;
    const cooldown = Math.round(250 - Math.max(0, Math.min(1, input.intensity)) * 32);
    if (input.now - this.lastRotationPulseAt < cooldown) return false;
    this.lastRotationPulseAt = input.now;
    const primary = Math.max(4, Math.min(16, Math.round(input.hapticMs)));
    // Web vibration exposes duration, not motor amplitude. A single short tap
    // reads as light; high-energy turns add a tiny delayed recoil that reads heavier.
    this.safeVibrate(input.intensity >= 0.76 ? [primary, 34, Math.max(5, primary - 4)] : primary);
    return true;
  }

  pulse(input: { now: number; motionEnergy: number; balanceState: BalanceState; lockChime: boolean; direction: Level01TiltDirection | null; gameEvent?: Level01GameEvent; rotationSynchronized?: boolean; suppressDirectional?: boolean }) {
    if (!this.enabled || this.mode !== 'LIVE' || this.reducedMotion || !this.armedByUserGesture) return false;
    if (input.balanceState === 'LOCKED' && !input.lockChime) return;

    if (input.lockChime || input.gameEvent === 'LOCK_COMPLETE' || input.gameEvent === 'BALANCE_ENTER') {
      if (input.now - this.lastBalanceAt < 900) return;
      this.lastBalanceAt = input.now;
      this.safeVibrate(input.lockChime || input.gameEvent === 'LOCK_COMPLETE' ? [16, 40, 22] : [12]);
      return false;
    }

    if (input.gameEvent === 'BALANCE_BREAK') {
      if (input.now - this.lastBalanceAt < 420) return false;
      this.lastBalanceAt = input.now;
      this.safeVibrate(7);
      return false;
    }

    // A deliberate, clear four-way tilt gets one light acknowledgement. The
    // direction must change and pass a cooldown, so held/rough sensor data
    // cannot become a continuous vibration.
    if (!input.suppressDirectional && input.direction && input.motionEnergy >= 0.16
      && input.direction !== this.lastDirection
      && input.now - this.lastDirectionAt >= 280) {
      this.lastDirection = input.direction;
      this.lastDirectionAt = input.now;
      this.safeVibrate(10);
      return true;
    }
    if (!input.direction) this.lastDirection = null;

    if (input.rotationSynchronized) return false;

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

export { Level01HapticController as Level01HapticEngine };
