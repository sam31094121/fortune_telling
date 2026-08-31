import { AUDIO_GAIN_LIMIT, MAX_FLICK_SPIN_SPEED } from './level01.constants';
import type { BalanceState } from './Level01Physics';

export class Level01SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private osc: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private blocked = false;
  private reducedMotion = false;
  private lockPlayed = false;
  private reentryUntil = 0;

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  async armFromUserGesture() {
    if (this.blocked) return false;
    try {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.blocked = true;
        return false;
      }
      if (!this.context) {
        this.context = new Ctor();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
        this.oscGain = this.context.createGain();
        this.oscGain.gain.value = 0;
        this.osc = this.context.createOscillator();
        this.osc.type = 'sine';
        this.osc.frequency.value = 164;
        this.osc.connect(this.oscGain);
        this.oscGain.connect(this.master);
        this.osc.start();
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return true;
    } catch {
      this.blocked = true;
      this.disposeGraph();
      return false;
    }
  }

  sync(input: {
    motionEnergy: number;
    angularVelocity: number;
    balanceState: BalanceState;
    lockChime: boolean;
    active: boolean;
  }) {
    if (this.blocked || !this.context || !this.master || !this.osc || !this.oscGain) return;
    const now = this.context.currentTime;
    if (!input.active) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    if (now < this.reentryUntil) return;

    if (input.lockChime) {
      this.playLockChime(now);
      this.lockPlayed = true;
      return;
    }

    if (input.balanceState === 'LOCKED') {
      this.master.gain.setTargetAtTime(0, now, 0.12);
      return;
    }

    this.lockPlayed = false;
    const energy = this.reducedMotion ? input.motionEnergy * 0.45 : input.motionEnergy;
    const spin = Math.min(1, Math.abs(input.angularVelocity) / MAX_FLICK_SPIN_SPEED);
    const quiet = input.balanceState === 'BALANCED' ? 0.12 : 1;
    // A single, deliberately quiet oscillator avoids a harsh continuous whirr.
    const gain = Math.min(AUDIO_GAIN_LIMIT, (energy * 0.35 + spin * 0.65) * AUDIO_GAIN_LIMIT * quiet);
    const frequency = 148 + energy * (this.reducedMotion ? 70 : 100) + spin * (this.reducedMotion ? 45 : 190);
    this.osc.frequency.setTargetAtTime(frequency, now, 0.08);
    this.master.gain.setTargetAtTime(gain, now, 0.1);
  }

  playReentryWhoosh() {
    if (this.reducedMotion || this.blocked || !this.context || !this.master || !this.osc) return;
    const now = this.context.currentTime;
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(360, now);
    this.osc.frequency.exponentialRampToValueAtTime(148, now + 0.42);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.min(AUDIO_GAIN_LIMIT, 0.105), now);
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    this.reentryUntil = now + 0.42;
  }

  dispose() {
    this.disposeGraph();
  }

  private playLockChime(now: number) {
    if (!this.context || !this.master || !this.osc || this.lockPlayed) return;
    this.osc.frequency.setValueAtTime(392, now);
    this.osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.08);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.min(AUDIO_GAIN_LIMIT, 0.16), now);
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  }

  private disposeGraph() {
    try {
      this.osc?.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.osc?.disconnect();
      this.oscGain?.disconnect();
      this.master?.disconnect();
      void this.context?.close();
    } catch {
      /* enhancement only */
    }
    this.osc = null;
    this.oscGain = null;
    this.master = null;
    this.context = null;
  }
}
