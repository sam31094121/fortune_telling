import { AUDIO_GAIN_LIMIT, MAX_FLICK_SPIN_SPEED } from './level01.constants';
import type { BalanceState } from './Level01Physics';
import { LEVEL01_REENTRY_CHEER_PROGRESS, LEVEL01_REENTRY_DURATION_SECONDS, level01ReentrySoundEnvelope } from './Level01Reentry';
import type { Level01TiltDirection } from './Level01Physics';
import {
  pentatonicFrequency,
  rotationBurstTimeline,
  rotationFeedbackProfile,
  TAIJI_ACTIVATION_FEEDBACK,
  type RotationFeedbackProfile,
} from './Level01SensoryFeedback';
import type { TaijiSoundVariant } from '@/lib/taiji/experience-types';

// 「醒」啟動音的四種候選音色：不同根音＋不同波形，交給 Level01SoundPreferenceEngine
// 匿名累積真實互動資料後再決定哪一種留下來當預設，這裡本身不判定哪個「最好」。
const ACTIVATION_VARIANT_TONE: Record<TaijiSoundVariant, { noteIndex: number; type: OscillatorType }> = {
  SOFT_WOOD: { noteIndex: 0, type: 'triangle' },
  WARM_BELL: { noteIndex: 2, type: 'sine' },
  AIR_CHIME: { noteIndex: 4, type: 'sine' },
  LOW_RESONANCE: { noteIndex: 1, type: 'sine' },
};

export class Level01SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private osc: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private harmonicOsc: OscillatorNode | null = null;
  private harmonicGain: GainNode | null = null;
  private toneFilter: BiquadFilterNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private balanceOsc: OscillatorNode | null = null;
  private balanceGain: GainNode | null = null;
  private airTexture: AudioBuffer | null = null;
  private blocked = false;
  private reducedMotion = false;
  private enabled = true;
  private paused = false;
  private lockPlayed = false;
  private reentryUntil = 0;
  private lastTiltAccentAt = 0;
  private lastLightningAt = -Infinity;

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
    if (this.blocked || !this.enabled) return false;
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
        this.toneFilter = this.context.createBiquadFilter();
        this.toneFilter.type = 'lowpass';
        this.toneFilter.frequency.value = 1450;
        this.toneFilter.Q.value = 0.34;
        this.toneFilter.connect(this.master);
        this.oscGain = this.context.createGain();
        this.oscGain.gain.value = 0;
        this.osc = this.context.createOscillator();
        this.osc.type = 'sine';
        this.osc.frequency.value = pentatonicFrequency(2);
        this.osc.connect(this.oscGain);
        this.oscGain.connect(this.toneFilter);
        this.osc.start();
        this.harmonicGain = this.context.createGain();
        this.harmonicGain.gain.value = 0;
        this.harmonicOsc = this.context.createOscillator();
        this.harmonicOsc.type = 'triangle';
        this.harmonicOsc.frequency.value = pentatonicFrequency(2) * 1.5;
        this.harmonicOsc.connect(this.harmonicGain);
        this.harmonicGain.connect(this.toneFilter);
        this.harmonicOsc.start();
        this.ambientGain = this.context.createGain();
        this.ambientGain.gain.value = 0;
        this.ambientOsc = this.context.createOscillator();
        this.ambientOsc.type = 'sine';
        this.ambientOsc.frequency.value = 65.41;
        this.ambientOsc.connect(this.ambientGain);
        this.ambientGain.connect(this.toneFilter);
        this.ambientOsc.start();
        this.balanceGain = this.context.createGain();
        this.balanceGain.gain.value = 0;
        this.balanceOsc = this.context.createOscillator();
        this.balanceOsc.type = 'sine';
        this.balanceOsc.frequency.value = 261.63;
        this.balanceOsc.connect(this.balanceGain);
        this.balanceGain.connect(this.toneFilter);
        this.balanceOsc.start();
        // One reusable, very short air texture. This removes the old "beep" feel
        // and makes each rotation pulse read as a soft physical pass-by.
        const sampleRate = this.context.sampleRate;
        this.airTexture = this.context.createBuffer(1, Math.round(sampleRate * 0.18), sampleRate);
        const channel = this.airTexture.getChannelData(0);
        for (let index = 0; index < channel.length; index += 1) {
          const envelope = Math.sin((index / channel.length) * Math.PI) ** 2;
          channel[index] = (Math.random() * 2 - 1) * envelope;
        }
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
    if (this.blocked || !this.context || !this.master || !this.osc || !this.oscGain || !this.harmonicOsc || !this.harmonicGain || !this.toneFilter || !this.ambientGain || !this.balanceGain) return;
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
    const gain = Math.min(0.052, (energy * 0.34 + spin * 0.66) * 0.05 * quiet);
    const tone = rotationFeedbackProfile({
      spin,
      energy,
      pulseIndex: Math.round(Math.abs(input.angularVelocity) * 0.72),
      reducedMotion: this.reducedMotion,
    });
    this.osc.frequency.setTargetAtTime(tone.frequency, now, 0.065);
    this.harmonicOsc.frequency.setTargetAtTime(tone.harmonicFrequency, now, 0.075);
    this.oscGain.gain.setTargetAtTime(gain * 0.68, now, 0.09);
    this.harmonicGain.gain.setTargetAtTime(gain * 0.07, now, 0.11);
    this.toneFilter.frequency.setTargetAtTime(720 + energy * 440 + spin * 360, now, 0.12);
    this.ambientGain.gain.setTargetAtTime(Math.min(0.012, AUDIO_GAIN_LIMIT * 0.04), now, 0.3);
    this.balanceGain.gain.setTargetAtTime(balancing ? Math.min(0.024, AUDIO_GAIN_LIMIT * 0.085) : 0, now, 0.16);
    this.master.gain.setTargetAtTime(Math.min(AUDIO_GAIN_LIMIT, 0.72), now, 0.12);
  }

  playRotationPulse(profile: RotationFeedbackProfile) {
    if (!this.enabled || this.paused || this.blocked || !this.context || !this.toneFilter || !this.master) return;
    const now = this.context.currentTime + 0.004;
    this.schedulePentatonicTone(profile, now);
  }

  playRotationBurst(turns: number, durationSeconds: number, momentum: number) {
    if (!this.enabled || this.paused || this.reducedMotion || this.blocked || !this.context) return;
    const now = this.context.currentTime + 0.004;
    rotationBurstTimeline(turns, durationSeconds, momentum).forEach((beat) => {
      this.schedulePentatonicTone(beat, now + beat.offsetMs / 1000);
    });
  }

  playChaseHit(hits: number) {
    if (!this.enabled || this.paused || this.blocked || !this.context || !this.toneFilter || !this.master) return;
    const intensity = Math.min(1, 0.48 + Math.max(0, hits - 1) * 0.12);
    this.schedulePentatonicTone(rotationFeedbackProfile({
      spin: intensity,
      energy: intensity,
      pulseIndex: hits + 1,
      reducedMotion: this.reducedMotion,
    }), this.context.currentTime + 0.004);
  }

  playLightningStrike() {
    if (!this.enabled || this.paused || this.blocked || !this.context || !this.master) return;
    const now = this.context.currentTime;
    if (now - this.lastLightningAt < 0.72) return;
    this.lastLightningAt = now;
    try {
      // Large perceived scale, bounded peak: a sharp electric crack rides over
      // a low falling pressure wave, both contained by the shared compressor.
      const boom = this.context.createOscillator();
      const boomGain = this.context.createGain();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(86, now);
      boom.frequency.exponentialRampToValueAtTime(38, now + 0.46);
      boomGain.gain.setValueAtTime(0.0001, now);
      boomGain.gain.exponentialRampToValueAtTime(0.085, now + 0.018);
      boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
      boom.connect(boomGain);
      boomGain.connect(this.master);
      boom.start(now);
      boom.stop(now + 0.62);

      if (this.airTexture) {
        const crack = this.context.createBufferSource();
        const crackFilter = this.context.createBiquadFilter();
        const crackGain = this.context.createGain();
        crack.buffer = this.airTexture;
        crackFilter.type = 'bandpass';
        crackFilter.frequency.setValueAtTime(1900, now);
        crackFilter.frequency.exponentialRampToValueAtTime(420, now + 0.34);
        crackFilter.Q.value = 0.74;
        crackGain.gain.setValueAtTime(0.0001, now);
        crackGain.gain.exponentialRampToValueAtTime(0.072, now + 0.006);
        crackGain.gain.exponentialRampToValueAtTime(0.012, now + 0.1);
        crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
        crack.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(this.master);
        crack.start(now);
        crack.stop(now + 0.45);
      }

      // The visual burn aftershock starts after the lightning web lands. A
      // filtered low growl expands across the stereo field, then folds inward
      // with the red spatial wave instead of adding another sharp peak.
      const aftershockAt = now + 0.285;
      const burn = this.context.createOscillator();
      const burnFilter = this.context.createBiquadFilter();
      const burnGain = this.context.createGain();
      const burnPan = this.context.createStereoPanner();
      burn.type = 'triangle';
      burn.frequency.setValueAtTime(148, aftershockAt);
      burn.frequency.exponentialRampToValueAtTime(46, aftershockAt + 0.42);
      burnFilter.type = 'lowpass';
      burnFilter.frequency.setValueAtTime(760, aftershockAt);
      burnFilter.frequency.exponentialRampToValueAtTime(180, aftershockAt + 0.44);
      burnFilter.Q.value = 1.15;
      burnGain.gain.setValueAtTime(0.0001, aftershockAt);
      burnGain.gain.exponentialRampToValueAtTime(0.034, aftershockAt + 0.055);
      burnGain.gain.exponentialRampToValueAtTime(0.0001, aftershockAt + 0.48);
      burnPan.pan.setValueAtTime(-0.46, aftershockAt);
      burnPan.pan.linearRampToValueAtTime(0.42, aftershockAt + 0.22);
      burnPan.pan.linearRampToValueAtTime(0, aftershockAt + 0.46);
      burn.connect(burnFilter);
      burnFilter.connect(burnGain);
      burnGain.connect(burnPan);
      burnPan.connect(this.master);
      burn.start(aftershockAt);
      burn.stop(aftershockAt + 0.5);
      this.master.gain.setTargetAtTime(Math.min(AUDIO_GAIN_LIMIT, 0.72), now, 0.006);
    } catch {
      // Thunder is enhancement-only; visual capture and haptics remain playable.
    }
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
    this.harmonicGain?.gain.setTargetAtTime(0, now, 0.03);
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
      const base = direction === 'E' ? pentatonicFrequency(4) : direction === 'W' ? pentatonicFrequency(1) : direction === 'S' ? pentatonicFrequency(3) : pentatonicFrequency(2);
      const peak = Math.min(0.036, 0.017 + motionEnergy * 0.014);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 0.86, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.toneFilter ?? this.master);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Accent is enhancement-only; normal motion audio remains available.
    }
  }

  /**
   * 「醒」——第一次觸碰啟動時的一次性招呼音，只在 armFromUserGesture 播一次。
   * 用哪個音色由 Level01SoundPreferenceEngine 決定（匿名 A/B），這裡只負責播放。
   */
  playActivationChime(variant: TaijiSoundVariant) {
    if (this.reducedMotion || !this.enabled || this.blocked || !this.context || !this.master) return;
    const now = this.context.currentTime;
    const tone = ACTIVATION_VARIANT_TONE[variant];
    const base = pentatonicFrequency(tone.noteIndex);
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(base * 0.94, now);
      osc.frequency.exponentialRampToValueAtTime(base, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(gain);
      gain.connect(this.toneFilter ?? this.master);
      osc.start(now);
      osc.stop(now + 0.45);
      // A low, rounded impulse lands with the palm haptic; it is felt as weight,
      // while the higher tone supplies the brief "awake" sparkle.
      const impact = this.context.createOscillator();
      const impactGain = this.context.createGain();
      impact.type = 'sine';
      impact.frequency.setValueAtTime(TAIJI_ACTIVATION_FEEDBACK.impactStartHz, now);
      impact.frequency.exponentialRampToValueAtTime(TAIJI_ACTIVATION_FEEDBACK.impactEndHz, now + TAIJI_ACTIVATION_FEEDBACK.impactDurationSeconds * 0.8);
      impactGain.gain.setValueAtTime(0.0001, now);
      impactGain.gain.exponentialRampToValueAtTime(0.046, now + 0.012);
      impactGain.gain.exponentialRampToValueAtTime(0.0001, now + TAIJI_ACTIVATION_FEEDBACK.impactDurationSeconds);
      impact.connect(impactGain);
      impactGain.connect(this.master);
      impact.start(now);
      impact.stop(now + TAIJI_ACTIVATION_FEEDBACK.impactDurationSeconds + 0.02);
    } catch {
      // Activation chime is enhancement-only; the ritual continues silently.
    }
  }

  dispose() {
    this.disposeGraph();
  }

  private playLockChime(now: number) {
    if (!this.context || !this.master || !this.osc || this.lockPlayed) return;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(Math.min(AUDIO_GAIN_LIMIT, 0.72), now, 0.012);
    [261.63, 329.63, 392].forEach((frequency, index) => {
      this.schedulePentatonicTone({
        frequency,
        harmonicFrequency: frequency * 1.5,
        gain: 0.026 - index * 0.003,
        durationMs: 245,
        hapticMs: 0,
        intensity: 0.58,
      }, now + index * 0.045);
    });
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
      gain.connect(this.toneFilter ?? this.master);
      osc.start(at);
      osc.stop(end + 0.01);
    } catch {
      // The return remains complete without this optional closing accent.
    }
  }

  private schedulePentatonicTone(profile: RotationFeedbackProfile, at: number) {
    if (!this.context || !this.master || !this.toneFilter) return;
    try {
      const duration = Math.max(0.06, Math.min(0.18, profile.durationMs / 1000));
      const end = at + duration;
      const createVoice = (frequency: number, peak: number, type: OscillatorType) => {
        const oscillator = this.context!.createOscillator();
        const gain = this.context!.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, at);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.985, end);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(gain);
        gain.connect(this.toneFilter!);
        oscillator.start(at);
        oscillator.stop(end + 0.012);
      };
      createVoice(profile.frequency * 0.75, profile.gain * 0.58, 'sine');
      createVoice(profile.harmonicFrequency * 0.75, profile.gain * 0.07, 'triangle');
      if (this.airTexture) {
        const air = this.context.createBufferSource();
        const airFilter = this.context.createBiquadFilter();
        const airGain = this.context.createGain();
        air.buffer = this.airTexture;
        airFilter.type = 'bandpass';
        airFilter.frequency.value = 480 + profile.intensity * 880;
        airFilter.Q.value = 0.72;
        airGain.gain.setValueAtTime(0.0001, at);
        airGain.gain.exponentialRampToValueAtTime(Math.max(0.001, profile.gain * 0.34), at + 0.014);
        airGain.gain.exponentialRampToValueAtTime(0.0001, end);
        air.connect(airFilter);
        airFilter.connect(airGain);
        airGain.connect(this.toneFilter!);
        air.start(at);
        air.stop(end + 0.012);
      }
      this.master.gain.setTargetAtTime(Math.min(AUDIO_GAIN_LIMIT, 0.72), at, 0.01);
    } catch {
      // Rotation sound is enhancement-only; the game and haptic remain usable.
    }
  }

  private disposeGraph() {
    try {
      this.osc?.stop();
      this.harmonicOsc?.stop();
      this.ambientOsc?.stop();
      this.balanceOsc?.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.osc?.disconnect();
      this.oscGain?.disconnect();
      this.harmonicOsc?.disconnect();
      this.harmonicGain?.disconnect();
      this.ambientOsc?.disconnect();
      this.ambientGain?.disconnect();
      this.balanceOsc?.disconnect();
      this.balanceGain?.disconnect();
      this.toneFilter?.disconnect();
      this.master?.disconnect();
      this.compressor?.disconnect();
      void this.context?.close();
    } catch {
      /* enhancement only */
    }
    this.osc = null;
    this.oscGain = null;
    this.harmonicOsc = null;
    this.harmonicGain = null;
    this.toneFilter = null;
    this.ambientOsc = null;
    this.ambientGain = null;
    this.balanceOsc = null;
    this.balanceGain = null;
    this.airTexture = null;
    this.master = null;
    this.compressor = null;
    this.context = null;
  }
}

export { Level01SoundEngine as Level01AudioEngine };
