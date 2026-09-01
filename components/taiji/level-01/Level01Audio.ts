import { AUDIO_GAIN_LIMIT, MAX_FLICK_SPIN_SPEED } from './level01.constants';
import type { BalanceState } from './Level01Physics';
import { LEVEL01_REENTRY_CHEER_PROGRESS, LEVEL01_REENTRY_DURATION_SECONDS, level01ReentrySoundEnvelope } from './Level01Reentry';
import type { Level01TiltDirection } from './Level01Physics';

export class Level01SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private osc: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private balanceOsc: OscillatorNode | null = null;
  private balanceGain: GainNode | null = null;
  private blocked = false;
  private reducedMotion = false;
  private enabled = true;
  private paused = false;
  private lockPlayed = false;
  private reentryUntil = 0;
  private lastTiltAccentAt = 0;

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value && this.context && this.master) this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.04);
  }

  setPaused(value: boolean) {
    this.paused = value;
    if (!this.context) return;
    if (value) {
      if (this.master) this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
      void this.context.suspend().catch(() => undefined);
    } else if (this.enabled) {
      void this.context.resume().catch(() => undefined);
    }
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
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.006;
        this.compressor.release.value = 0.18;
        this.master.connect(this.compressor);
        this.compressor.connect(this.context.destination);
        this.oscGain = this.context.createGain();
        this.oscGain.gain.value = 0;
        this.osc = this.context.createOscillator();
        this.osc.type = 'sine';
        this.osc.frequency.value = 164;
        this.osc.connect(this.oscGain);
        this.oscGain.connect(this.master);
        this.osc.start();
        this.ambientGain = this.context.createGain();
        this.ambientGain.gain.value = 0;
        this.ambientOsc = this.context.createOscillator();
        this.ambientOsc.type = 'sine';
        this.ambientOsc.frequency.value = 82;
        this.ambientOsc.connect(this.ambientGain);
        this.ambientGain.connect(this.master);
        this.ambientOsc.start();
        this.balanceGain = this.context.createGain();
        this.balanceGain.gain.value = 0;
        this.balanceOsc = this.context.createOscillator();
        this.balanceOsc.type = 'sine';
        this.balanceOsc.frequency.value = 246.94;
        this.balanceOsc.connect(this.balanceGain);
        this.balanceGain.connect(this.master);
        this.balanceOsc.start();
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
    if (this.blocked || !this.context || !this.master || !this.osc || !this.oscGain || !this.ambientGain || !this.balanceGain) return;
    const now = this.context.currentTime;
    if (!this.enabled || this.paused || !input.active) {
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
    const balancing = input.balanceState === 'BALANCED' || input.balanceState === 'HOLDING';
    const quiet = balancing ? 0.18 : 1;
    const gain = Math.min(AUDIO_GAIN_LIMIT, (energy * 0.35 + spin * 0.65) * AUDIO_GAIN_LIMIT * quiet);
    const frequency = 148 + energy * (this.reducedMotion ? 70 : 100) + spin * (this.reducedMotion ? 45 : 190);
    this.osc.frequency.setTargetAtTime(frequency, now, 0.08);
    this.oscGain.gain.setTargetAtTime(gain * 0.72, now, 0.1);
    this.ambientGain.gain.setTargetAtTime(Math.min(0.018, AUDIO_GAIN_LIMIT * 0.06), now, 0.3);
    this.balanceGain.gain.setTargetAtTime(balancing ? Math.min(0.032, AUDIO_GAIN_LIMIT * 0.11) : 0, now, 0.16);
    this.master.gain.setTargetAtTime(Math.min(AUDIO_GAIN_LIMIT, 0.82), now, 0.12);
  }

  playReentryWhoosh() {
    if (this.reducedMotion || this.blocked || !this.context || !this.master || !this.osc) return;
    const now = this.context.currentTime;
    const duration = LEVEL01_REENTRY_DURATION_SECONDS;
    const launchEnd = duration * 0.14;
    const coastMiddle = duration * 0.42;
    const coastEnd = duration * 0.76;
    const start = level01ReentrySoundEnvelope(0);
    const launch = level01ReentrySoundEnvelope(0.14);
    const middle = level01ReentrySoundEnvelope(0.42);
    const coast = level01ReentrySoundEnvelope(0.76);
    const end = level01ReentrySoundEnvelope(1);
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(start.frequency, now);
    this.osc.frequency.exponentialRampToValueAtTime(launch.frequency, now + launchEnd);
    this.osc.frequency.exponentialRampToValueAtTime(middle.frequency, now + coastMiddle);
    this.osc.frequency.exponentialRampToValueAtTime(coast.frequency, now + coastEnd);
    this.osc.frequency.exponentialRampToValueAtTime(end.frequency, now + duration);
    this.master.gain.cancelScheduledValues(now);
    // A brief, firm entry follows the return's initial spin, then the gain
    // follows the same decelerating curve and is silent at the visual settle.
    this.master.gain.setValueAtTime(Math.min(AUDIO_GAIN_LIMIT, start.gain * 0.56), now);
    this.master.gain.exponentialRampToValueAtTime(Math.min(AUDIO_GAIN_LIMIT, launch.gain), now + launchEnd);
    this.master.gain.exponentialRampToValueAtTime(Math.min(AUDIO_GAIN_LIMIT, middle.gain), now + coastMiddle);
    this.master.gain.exponentialRampToValueAtTime(Math.min(AUDIO_GAIN_LIMIT, coast.gain), now + coastEnd);
    this.master.gain.exponentialRampToValueAtTime(end.gain, now + duration);
    this.playReentryCheerAccent(now + duration * LEVEL01_REENTRY_CHEER_PROGRESS, now + duration);
    this.reentryUntil = now + duration;
  }

  playTiltAccent(direction: Level01TiltDirection, motionEnergy: number) {
    if (this.reducedMotion || this.blocked || !this.context || !this.master) return;
    const now = this.context.currentTime;
    if (now - this.lastTiltAccentAt < 0.28) return;
    this.lastTiltAccentAt = now;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const base = direction === 'E' ? 246 : direction === 'W' ? 208 : direction === 'S' ? 184 : 224;
      const peak = Math.min(0.045, 0.021 + motionEnergy * 0.016);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 0.86, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Accent is enhancement-only; normal motion audio remains available.
    }
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

  private playReentryCheerAccent(at: number, endsAt: number) {
    if (!this.context || !this.master) return;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const end = Math.min(endsAt, at + 0.115);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(286, at);
      osc.frequency.exponentialRampToValueAtTime(338, at + 0.055);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.026, at + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(at);
      osc.stop(end + 0.01);
    } catch {
      // The return remains complete without this optional closing accent.
    }
  }

  private disposeGraph() {
    try {
      this.osc?.stop();
      this.ambientOsc?.stop();
      this.balanceOsc?.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.osc?.disconnect();
      this.oscGain?.disconnect();
      this.ambientOsc?.disconnect();
      this.ambientGain?.disconnect();
      this.balanceOsc?.disconnect();
      this.balanceGain?.disconnect();
      this.master?.disconnect();
      this.compressor?.disconnect();
      void this.context?.close();
    } catch {
      /* enhancement only */
    }
    this.osc = null;
    this.oscGain = null;
    this.ambientOsc = null;
    this.ambientGain = null;
    this.balanceOsc = null;
    this.balanceGain = null;
    this.master = null;
    this.compressor = null;
    this.context = null;
  }
}

export { Level01SoundEngine as Level01AudioEngine };
