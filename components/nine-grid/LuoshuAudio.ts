/**
 * 洛書九宮：落宮紙聲＋極低環境底音。全部用 Web Audio 即時合成（無外部音檔、無授權問題）。
 * 只在使用者點擊（送出生日）之後才會建立 AudioContext；靜音偏好記在 localStorage。
 * 減少動態（prefers-reduced-motion）時預設靜音。
 */
export const LUOSHU_SOUND_KEY = 'luoshu-sound-muted';
export const RUSTLE_GAIN = 0.06; // 每次落宮紙聲峰值
export const BED_GAIN = 0.012; // 環境底音

let ctx: AudioContext | null = null;
let bed: { stop: () => void } | null = null;

export function luoshuSoundMuted() {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(LUOSHU_SOUND_KEY);
  if (v !== null) return v === '1';
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function setLuoshuSoundMuted(muted: boolean) {
  window.localStorage.setItem(LUOSHU_SOUND_KEY, muted ? '1' : '0');
  if (muted) stopLuoshuBed();
}

function context() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

/** 古書翻頁般的短紙聲：帶通濾波的雜訊，兩段微弱沙沙 */
export function playLuoshuRustle() {
  if (luoshuSoundMuted()) return;
  const c = context();
  if (!c) return;
  const now = c.currentTime;
  const len = Math.floor(c.sampleRate * 0.22);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 37));
  const src = c.createBufferSource();
  src.buffer = buf;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(2600, now);
  band.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
  band.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(RUSTLE_GAIN, now + 0.015);
  g.gain.exponentialRampToValueAtTime(RUSTLE_GAIN * 0.35, now + 0.08);
  g.gain.linearRampToValueAtTime(RUSTLE_GAIN * 0.55, now + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
  src.connect(band).connect(g).connect(c.destination);
  src.start(now);
  src.stop(now + 0.22);
}

/** 極低的環境底音（兩個低頻正弦＋低通），淡入淡出 */
export function startLuoshuBed() {
  if (bed || luoshuSoundMuted()) return;
  const c = context();
  if (!c) return;
  const now = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(BED_GAIN, now + 2.5);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 220;
  const oscs = [55, 82.4].map((f) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(lp); o.start(now); return o; });
  lp.connect(g).connect(c.destination);
  bed = {
    stop: () => {
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      oscs.forEach((o) => o.stop(t + 0.85));
    },
  };
}

export function stopLuoshuBed() {
  bed?.stop();
  bed = null;
}
