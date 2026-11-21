/**
 * 鬼魅阿修羅｜點「現在」格的音效（第五版 W：甦醒段＋60 秒無縫循環）。
 * 依技能檔「互動音效」16:55 版（用戶親口指定）：
 * - 按「現在」展開就播：先播甦醒段，接著在循環區無縫循環（Web Audio loopStart／loopEnd）。
 * - 收起「現在」、改開其他格、離開頁面（隱藏、pagehide、卸載）就停，120 ms 淡出，不拖尾。
 * - 不疊放：再按一次從頭開始。
 * - 不看網站靜音設定、不設開關；iPhone 設定 audioSession 為 playback，不受側邊靜音鍵影響。
 * - 界面不顯示任何音效相關資訊；播放失敗一律靜默略過。
 * 純畫面層：不讀、不改任何阿修羅資料、運算、文案或 API。
 */

const SRC = '/sfx/asura-now-v5w.mp3';
/** 甦醒段長度 925206 樣本 ÷ 44100 Hz；循環區 60 秒（檔尾另墊 1 秒循環開頭，供解碼尾端安全）。 */
const LOOP_START_S = 925206 / 44100;
const LOOP_END_S = LOOP_START_S + 60;
const VOLUME = 0.6;
const FADE_IN_S = 0.012;
const FADE_OUT_S = 0.12;

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<AudioBuffer | null> | null = null;
let current: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
let playToken = 0;

function getCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function preferPlaybackSession(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
  } catch {
    /* 不支援就略過 */
  }
}

function decode(data: ArrayBuffer, target: BaseAudioContext): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const result = target.decodeAudioData(data, resolve, reject);
    if (result && typeof (result as Promise<AudioBuffer>).then === 'function') {
      (result as Promise<AudioBuffer>).then(resolve, reject);
    }
  });
}

function loadBuffer(): Promise<AudioBuffer | null> {
  if (buffer) return Promise.resolve(buffer);
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch(SRC);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.arrayBuffer();
      let target: BaseAudioContext | null = ctx;
      if (!target && typeof OfflineAudioContext !== 'undefined') {
        // 未經點擊前用離線環境解碼，避免提早建立會被瀏覽器擋下的 AudioContext
        target = new OfflineAudioContext(1, 1, 44100);
      }
      if (!target) return null;
      buffer = await decode(data, target);
      return buffer;
    } catch {
      loading = null;
      return null;
    }
  })();
  return loading;
}

/** 卡片出現後、閒置時先下載並解碼音檔（不播放）。 */
export function primeAsuraNowSfx(): void {
  try {
    void loadBuffer();
  } catch {
    /* 靜默 */
  }
}

function stopCurrent(fadeS: number): void {
  const playing = current;
  current = null;
  if (!playing || !ctx) return;
  try {
    const now = ctx.currentTime;
    const g = playing.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + fadeS);
    playing.source.stop(now + fadeS + 0.02);
  } catch {
    try {
      playing.source.stop();
    } catch {
      /* 靜默 */
    }
  }
}

/** 使用者按「現在」展開時呼叫（須在點擊事件內）：從頭播甦醒段，接著無縫循環。 */
export function playAsuraNowSfx(): void {
  try {
    const Ctor = getCtor();
    if (!Ctor) return;
    preferPlaybackSession();
    if (!ctx) ctx = new Ctor({ latencyHint: 'playback' });
    const audio = ctx;
    if (audio.state !== 'running') void audio.resume().catch(() => {});
    stopCurrent(0.03);
    const token = ++playToken;
    void loadBuffer().then((buf) => {
      if (!buf || token !== playToken || !ctx) return;
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;
      source.loopStart = LOOP_START_S;
      source.loopEnd = Math.min(LOOP_END_S, buf.duration);
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(VOLUME, now + FADE_IN_S);
      source.connect(gain).connect(ctx.destination);
      source.start(now);
      current = { source, gain };
    });
  } catch {
    /* 靜默 */
  }
}

/** 收起「現在」、改開其他格、離開頁面或卸載時呼叫：120 ms 淡出後停止。 */
export function stopAsuraNowSfx(): void {
  try {
    playToken += 1;
    stopCurrent(FADE_OUT_S);
  } catch {
    /* 靜默 */
  }
}
