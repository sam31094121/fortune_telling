/**
 * ============================================================
 * 天地人 AI｜太極中央 24 韻互動聲音引擎
 * Engineer Production Version
 * ============================================================
 *
 * 1. 太極中央每點擊一次，推進 1/24。
 * 2. 第 1 韻最長、最深；第 2～23 韻逐步收短；第 24 韻最短並觸發彩蛋。
 * 3. 24 韻連貫（微滑音 + 共用殘響），禁止像鍵盤 24 個獨立提示音。
 * 4. 快速連點不爆音（Compressor + minClickGap），不互撞、不重新起音。
 * 5. 手機 Safari / Chrome 優先：AudioContext 由第一次使用者觸控啟動。
 */

export interface Taiji24State {
  step: number;
  progress: number;
  completed: boolean;
}

interface Taiji24Options {
  minClickGap?: number;
  masterVolume?: number;
  autoReset?: boolean;
  onComplete?: (state: Taiji24State) => void;
  onStep?: (state: Taiji24State) => void;
}

interface StepSound {
  frequency: number;
  duration: number;
  volume: number;
  overtone: number;
}

export class Taiji24SoundEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  private step = 0;
  private readonly maxStep = 24;
  private lastClickTime = 0;

  private readonly minClickGap: number;
  private readonly masterVolume: number;
  private readonly autoReset: boolean;
  private readonly onComplete: (state: Taiji24State) => void;
  private readonly onStep: (state: Taiji24State) => void;

  /** 24 韻：第一聲最長；中段黏著；後段收緊；第 24 聲最短 */
  private readonly sequence: StepSound[] = [
    // 01～08｜太極甦醒
    { frequency: 110.0, duration: 2.4, volume: 0.7, overtone: 0.15 },
    { frequency: 116.54, duration: 1.95, volume: 0.65, overtone: 0.16 },
    { frequency: 123.47, duration: 1.8, volume: 0.64, overtone: 0.17 },
    { frequency: 130.81, duration: 1.68, volume: 0.63, overtone: 0.18 },
    { frequency: 138.59, duration: 1.56, volume: 0.64, overtone: 0.19 },
    { frequency: 146.83, duration: 1.46, volume: 0.65, overtone: 0.2 },
    { frequency: 155.56, duration: 1.38, volume: 0.66, overtone: 0.21 },
    { frequency: 164.81, duration: 1.3, volume: 0.67, overtone: 0.22 },
    // 09～16｜開始產生期待與黏著
    { frequency: 174.61, duration: 1.22, volume: 0.69, overtone: 0.24 },
    { frequency: 185.0, duration: 1.15, volume: 0.7, overtone: 0.25 },
    { frequency: 196.0, duration: 1.08, volume: 0.71, overtone: 0.27 },
    { frequency: 207.65, duration: 1.0, volume: 0.72, overtone: 0.28 },
    { frequency: 220.0, duration: 0.92, volume: 0.73, overtone: 0.29 },
    { frequency: 233.08, duration: 0.85, volume: 0.74, overtone: 0.3 },
    { frequency: 246.94, duration: 0.78, volume: 0.75, overtone: 0.31 },
    { frequency: 261.63, duration: 0.71, volume: 0.76, overtone: 0.32 },
    // 17～23｜逐步加速、收緊、準備解鎖
    { frequency: 277.18, duration: 0.64, volume: 0.77, overtone: 0.34 },
    { frequency: 293.66, duration: 0.58, volume: 0.78, overtone: 0.35 },
    { frequency: 311.13, duration: 0.52, volume: 0.79, overtone: 0.36 },
    { frequency: 329.63, duration: 0.46, volume: 0.8, overtone: 0.38 },
    { frequency: 349.23, duration: 0.4, volume: 0.81, overtone: 0.4 },
    { frequency: 369.99, duration: 0.34, volume: 0.82, overtone: 0.42 },
    { frequency: 392.0, duration: 0.28, volume: 0.84, overtone: 0.44 },
    // 24｜最短彩蛋解鎖音
    { frequency: 523.25, duration: 0.18, volume: 0.88, overtone: 0.5 },
  ];

  constructor(options: Taiji24Options = {}) {
    this.minClickGap = options.minClickGap ?? 65;
    this.masterVolume = options.masterVolume ?? 0.38;
    this.autoReset = options.autoReset ?? false;
    this.onComplete = options.onComplete ?? (() => {});
    this.onStep = options.onStep ?? (() => {});
  }

  /** AudioContext 初始化：必須由使用者第一次實際觸控後啟動（手機相容） */
  private async init(): Promise<void> {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      typeof window !== 'undefined'
        ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) {
      console.warn('[Taiji24] Web Audio API 不支援');
      return;
    }
    this.audioContext = new Ctor();

    // Compressor 防爆音
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 22;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.22;

    // Master
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.masterVolume;

    // Dry / Reverb（不依賴外部音檔的空間尾韻）
    this.dryGain = this.audioContext.createGain();
    this.dryGain.gain.value = 0.82;
    this.reverbGain = this.audioContext.createGain();
    this.reverbGain.gain.value = 0.23;
    this.reverb = this.audioContext.createConvolver();
    this.reverb.buffer = this.createImpulseResponse(this.audioContext, 2.2, 2.8);

    this.dryGain.connect(this.compressor);
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
  }

  private createImpulseResponse(context: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = context.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = context.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  /** 點擊入口：回傳目前狀態供前端動畫同步 */
  async click(): Promise<Taiji24State> {
    const nowMs = performance.now();
    if (nowMs - this.lastClickTime < this.minClickGap) {
      return this.getState();
    }
    this.lastClickTime = nowMs;

    await this.init();
    if (!this.audioContext) return this.getState();

    if (this.step >= this.maxStep) {
      if (this.autoReset) this.reset();
      else return this.getState();
    }

    this.step++;
    const sound = this.sequence[this.step - 1];
    if (this.step === this.maxStep) {
      this.playFinalEgg(sound);
    } else {
      this.playStepSound(sound, this.step);
    }

    const state = this.getState();
    this.onStep(state);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taiji24:step', { detail: state }));
    }
    if (this.step === this.maxStep) this.complete();
    return state;
  }

  /** 第 1～23 韻 */
  private playStepSound(sound: StepSound, step: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // 主音：sine 圓潤 + 微滑音（能量往前推，不像獨立按鍵）
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(sound.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(sound.frequency * 1.025, now + sound.duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(sound.volume, now + 0.018);
    // 第一韻 Attack 更慢：太極核心被喚醒
    const sustainPoint = step === 1 ? sound.duration * 0.42 : sound.duration * 0.3;
    gain.gain.exponentialRampToValueAtTime(sound.volume * 0.62, now + sustainPoint);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sound.duration);

    oscillator.connect(gain);
    gain.connect(this.dryGain!);
    gain.connect(this.reverb!);
    oscillator.start(now);
    oscillator.stop(now + sound.duration + 0.05);

    this.playOvertone(sound, now);
    if (step <= 16) this.playSubTone(sound, step, now);
  }

  /** 泛音：科技水晶質感 */
  private playOvertone(sound: StepSound, now: number): void {
    const ctx = this.audioContext!;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = sound.frequency * 2.01;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(sound.volume * sound.overtone, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sound.duration * 0.72);
    oscillator.connect(gain);
    gain.connect(this.dryGain!);
    gain.connect(this.reverb!);
    oscillator.start(now);
    oscillator.stop(now + sound.duration * 0.72 + 0.05);
  }

  /** 低頻共鳴：前段明顯、後段遞減 */
  private playSubTone(sound: StepSound, step: number, now: number): void {
    const ctx = this.audioContext!;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = sound.frequency * 0.5;
    const subLevel = sound.volume * 0.34 * (1 - step / 20);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(subLevel, 0.02), now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sound.duration * 0.85);
    oscillator.connect(gain);
    gain.connect(this.dryGain!);
    oscillator.start(now);
    oscillator.stop(now + sound.duration * 0.85 + 0.05);
  }

  /** 第 24 韻：最短主音 + 專屬彩蛋上行琶音 */
  private playFinalEgg(sound: StepSound): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;
    this.playStepSound(sound, this.maxStep);

    // 彩蛋：C6-E6-G6-C7 快速上行水晶琶音
    const arpeggio = [1046.5, 1318.51, 1567.98, 2093.0];
    arpeggio.forEach((freq, i) => {
      const t0 = now + 0.12 + i * 0.09;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.26 - i * 0.03, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
      oscillator.connect(gain);
      gain.connect(this.dryGain!);
      gain.connect(this.reverb!);
      oscillator.start(t0);
      oscillator.stop(t0 + 0.7);
    });
  }

  private complete(): void {
    const state = this.getState();
    this.onComplete(state);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taiji24:complete', { detail: state }));
    }
  }

  getState(): Taiji24State {
    return {
      step: this.step,
      progress: this.step / this.maxStep,
      completed: this.step >= this.maxStep,
    };
  }

  reset(): void {
    this.step = 0;
  }
}
