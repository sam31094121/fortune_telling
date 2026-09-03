import { AUDIO_GAIN_LIMIT } from './level01.constants';
import type { BalanceState, Level01TiltDirection } from './Level01Physics';
import type { RotationFeedbackProfile } from './Level01SensoryFeedback';
import type { TaijiSoundVariant } from '@/lib/taiji/experience-types';

export type Level01StrikeOrigin = 'N' | 'E' | 'S' | 'W';

type ThunderSource = {
  path: string;
};

type ThunderProfile = {
  sourceIndex: number;
  maxDuration: number;
  playbackRate: number;
  gain: number;
  lowpassHz?: number;
  tailSeconds?: number;
  tailMix?: number;
};

const THUNDER_SOURCES: readonly ThunderSource[] = [
  { path: '/audio/taiji/lightning-strike.mp3' },
  { path: '/audio/taiji/dry-thunder.mp3' },
  { path: '/audio/taiji/loud-thunder.mp3' },
  { path: '/audio/taiji/peals-of-thunder.mp3' },
  { path: '/audio/taiji/earth-rift.mp3' },
  { path: '/audio/taiji/tide-surge.flac' },
  { path: '/audio/taiji/typhoon-wind.m4a' },
  { path: '/audio/taiji/tornado-wind.m4a' },
] as const;

// The first four recordings are unchanged. The final four are short CC0 field
// recordings that give each natural-force strike a distinct, physical texture.
const THUNDER_PROFILES: readonly ThunderProfile[] = [
  // Original four voices: preserve their existing order and acoustic settings.
  { sourceIndex: 0, maxDuration: 1.08, playbackRate: 1, gain: .88 },
  { sourceIndex: 1, maxDuration: 3.6, playbackRate: .98, gain: .78 },
  { sourceIndex: 2, maxDuration: 4.4, playbackRate: 1.02, gain: .72 },
  { sourceIndex: 3, maxDuration: 4.8, playbackRate: .96, gain: .7 },
  // New natural-force recordings: a small delayed tail blends each release
  // into the next contact without turning the experience into ambient audio.
  { sourceIndex: 4, maxDuration: 4.6, playbackRate: 1, gain: .68, lowpassHz: 980, tailSeconds: .18, tailMix: .16 }, // 地裂
  { sourceIndex: 5, maxDuration: 5.1, playbackRate: 1, gain: .64, lowpassHz: 5200, tailSeconds: .28, tailMix: .18 }, // 潮湧
  { sourceIndex: 6, maxDuration: 5.2, playbackRate: 1, gain: .58, lowpassHz: 6800, tailSeconds: .22, tailMix: .14 }, // 颱風
  { sourceIndex: 7, maxDuration: 5.2, playbackRate: 1, gain: .6, lowpassHz: 5400, tailSeconds: .16, tailMix: .16 }, // 龍捲風
] as const;

const ORIGIN_PAN: Record<Level01StrikeOrigin, number> = {
  N: 0,
  E: .72,
  S: 0,
  W: -.72,
};

/**
 * Level 01 is intentionally event-only: no oscillator, ambient bed, rotation
 * loop or idle tone exists. Real thunder is decoded once and a single bounded
 * recording is played only when a visible lightning strike reaches the Taiji.
 */
export class Level01SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private thunderBytesPromise: Promise<(ArrayBuffer | null)[]> | null = null;
  private thunderBuffers: (AudioBuffer | null)[] = [];
  private activeSources = new Set<AudioBufferSourceNode>();
  private blocked = false;
  private enabled = true;
  private paused = false;
  private lastLightningAt = -Infinity;
  private lightningVariantIndex = 0;

  constructor() {
    this.preloadThunderBytes();
  }

  setReducedMotion(_value: boolean) {
    // Audio is already one-shot and never loops; reduced motion needs no extra bed.
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) this.stopActiveThunder();
  }

  setPaused(value: boolean) {
    this.paused = value;
    if (!this.context) return;
    if (value) {
      this.stopActiveThunder();
      void this.context.suspend().catch(() => undefined);
    } else if (this.enabled) {
      void this.context.resume().catch(() => undefined);
    }
  }

  isReadyForPlayback() {
    return this.enabled
      && !this.paused
      && !this.blocked
      && this.context?.state === 'running'
      && Boolean(this.master)
      && this.thunderBuffers.some(Boolean);
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
        this.master.gain.value = Math.min(AUDIO_GAIN_LIMIT, .72);
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 14;
        this.compressor.ratio.value = 10;
        this.compressor.attack.value = .003;
        this.compressor.release.value = .22;
        this.master.connect(this.compressor);
        this.compressor.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      await this.decodeThunderAssets();
      return this.thunderBuffers.some(Boolean);
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
    if (!input.active) this.stopActiveThunder();
  }

  playRotationPulse(_profile: RotationFeedbackProfile) {
    // Deliberately silent: only a visible lightning strike has sound.
  }

  playRotationBurst(_turns: number, _durationSeconds: number, _momentum: number) {
    // Deliberately silent: phone rotation never creates a repeating hum.
  }

  playChaseHit(_hits: number) {
    // Deliberately silent: gameplay state changes do not beep.
  }

  playLightningStrike(origin: Level01StrikeOrigin = 'N') {
    if (!this.enabled || this.paused || this.blocked || !this.context || !this.master) return;
    const now = this.context.currentTime;
    if (now - this.lastLightningAt < .72) return;

    const available = THUNDER_PROFILES
      .map((profile) => ({ profile, buffer: this.thunderBuffers[profile.sourceIndex] }))
      .filter((entry): entry is { profile: ThunderProfile; buffer: AudioBuffer } => Boolean(entry.buffer));
    if (available.length === 0) return;

    // Direction controls only the spatial origin. The real recordings rotate on
    // an independent deterministic cycle, so repeated or clockwise taps cannot
    // collapse into the same two sounds.
    const voice = available[this.lightningVariantIndex % available.length];
    this.lightningVariantIndex += 1;
    this.lastLightningAt = now;

    try {
      const impactAt = now + .17;
      const duration = Math.min(voice.buffer.duration / voice.profile.playbackRate, voice.profile.maxDuration);
      const source = this.context.createBufferSource();
      const highpass = this.context.createBiquadFilter();
      const lowpass = this.context.createBiquadFilter();
      const tailDelay = this.context.createDelay(.75);
      const tailGain = this.context.createGain();
      const gain = this.context.createGain();
      const panner = this.context.createStereoPanner();
      source.buffer = voice.buffer;
      source.playbackRate.setValueAtTime(voice.profile.playbackRate, impactAt);
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(34, impactAt);
      highpass.Q.value = .38;
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(voice.profile.lowpassHz ?? 20000, impactAt);
      lowpass.Q.value = .42;
      tailDelay.delayTime.setValueAtTime(voice.profile.tailSeconds ?? .01, impactAt);
      tailGain.gain.setValueAtTime(voice.profile.tailMix ?? 0, impactAt);
      gain.gain.setValueAtTime(.0001, impactAt);
      gain.gain.exponentialRampToValueAtTime(voice.profile.gain, impactAt + .012);
      if (duration > .24) {
        gain.gain.setValueAtTime(voice.profile.gain, impactAt + Math.max(.04, duration - .18));
      }
      gain.gain.exponentialRampToValueAtTime(.0001, impactAt + duration);
      panner.pan.setValueAtTime(ORIGIN_PAN[origin], impactAt);
      panner.pan.linearRampToValueAtTime(0, impactAt + Math.min(.26, duration * .32));
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      lowpass.connect(tailDelay);
      tailDelay.connect(tailGain);
      gain.connect(panner);
      tailGain.connect(panner);
      panner.connect(this.master);
      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
        source.disconnect();
        highpass.disconnect();
        lowpass.disconnect();
        tailDelay.disconnect();
        tailGain.disconnect();
        gain.disconnect();
        panner.disconnect();
      };
      source.start(impactAt);
      source.stop(impactAt + duration + .02);
    } catch {
      // Sound is enhancement-only; the 3D strike, recoil and haptics remain playable.
    }
  }

  playReentryWhoosh() {
    // Deliberately silent.
  }

  playTiltAccent(_direction: Level01TiltDirection, _motionEnergy: number) {
    // Deliberately silent.
  }

  playActivationChime(_variant: TaijiSoundVariant) {
    // First unlocked sound is the real lightning strike, never a greeting tone.
  }

  dispose() {
    this.disposeGraph();
  }

  private preloadThunderBytes() {
    if (this.thunderBytesPromise || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    this.thunderBytesPromise = Promise.all(THUNDER_SOURCES.map(async ({ path }) => {
      try {
        const response = await window.fetch(path, { cache: 'force-cache' });
        if (!response.ok) return null;
        return await response.arrayBuffer();
      } catch {
        return null;
      }
    }));
  }

  private async decodeThunderAssets() {
    if (!this.context || this.thunderBuffers.some(Boolean)) return;
    this.preloadThunderBytes();
    const bytes = await this.thunderBytesPromise;
    if (!bytes) return;
    this.thunderBuffers = await Promise.all(bytes.map(async (data) => {
      if (!data || !this.context) return null;
      try {
        return await this.context.decodeAudioData(data.slice(0));
      } catch {
        return null;
      }
    }));
  }

  private stopActiveThunder() {
    this.activeSources.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    this.activeSources.clear();
  }

  private disposeGraph() {
    this.stopActiveThunder();
    try {
      this.master?.disconnect();
      this.compressor?.disconnect();
      void this.context?.close();
    } catch {
      /* enhancement only */
    }
    this.thunderBuffers = [];
    this.master = null;
    this.compressor = null;
    this.context = null;
  }
}

export { Level01SoundEngine as Level01AudioEngine };
