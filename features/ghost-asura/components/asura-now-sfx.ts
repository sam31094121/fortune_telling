/**
 * 鬼魅阿修羅｜「現在」音效（技能檔「互動音效：點『現在』」16:55 版）。
 * - 按「現在」展開就播（開頭即一記戰鼓），展開期間無縫循環；收起、切到別格、離開頁面就停（150 ms 淡出，不拖尾）。
 * - 重複展開從頭開始，只會有一條聲音（不疊放）。
 * - 不看網站靜音設定、不設開關；界面不顯示任何音效資訊。
 * - 用 Web Audio（AudioContext＋解碼後的 buffer，loopStart／loopEnd 無縫循環），並把 iOS audio session 設為 playback，
 *   讓 iPhone 側邊靜音鍵不影響播放（iOS 16.4 以前沒有 audioSession API，無法保證）。
 * - 播放失敗一律靜默略過。純畫面層：不讀、不改任何阿修羅資料或運算。
 */

const SRC = '/sfx/asura-now-wardrum-60s.mp3';
/** 檔頭 0.1 s 墊音（迴圈尾），迴圈區 0.1 s～60.1 s；戰鼓在檔案 0.18 s。 */
const LOOP_START = 0.1;
const LOOP_END = 60.1;
const VOLUME = 0.6;
const FADE_S = 0.15;

type AnyAudioContext = typeof AudioContext;

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let bytes: Promise<ArrayBuffer | null> | null = null;
let decoding: Promise<AudioBuffer | null> | null = null;
let current: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
let want = 0; // 每次 play／stop 遞增；過期的非同步開始一律作廢，避免疊放

function audioContextClass(): AnyAudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AnyAudioContext };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

function fetchBytes(): Promise<ArrayBuffer | null> {
  if (!bytes) {
    bytes = fetch(SRC)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .catch(() => null);
    bytes.then((b) => {
      if (!b) bytes = null; // 失敗可下次重試
    });
  }
  return bytes;
}

function decode(context: BaseAudioContext): Promise<AudioBuffer | null> {
  if (buffer) return Promise.resolve(buffer);
  if (!decoding) {
    decoding = fetchBytes()
      .then((b) =>
        b
          ? new Promise<AudioBuffer | null>((resolve) => {
              try {
                // slice：decodeAudioData 會轉移 ArrayBuffer，留原件給重試
                const p = context.decodeAudioData(b.slice(0), (buf) => resolve(buf), () => resolve(null));
                if (p && typeof p.catch === 'function') p.catch(() => resolve(null));
              } catch {
                resolve(null);
              }
            })
          : null,
      )
      .then((buf) => {
        if (buf) buffer = buf;
        decoding = null;
        return buf;
      });
  }
  return decoding;
}

function preferPlaybackSession(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
  } catch {
    /* 不支援就略過 */
  }
}

/** 卡片出現後閒置時預載並解碼（不建立會發聲的 AudioContext、不播放），讓第一次點擊就能立刻響鼓。 */
export function primeAsuraNowSfx(): void {
  try {
    if (buffer || typeof window === 'undefined') return;
    const w = window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext };
    const Offline = window.OfflineAudioContext ?? w.webkitOfflineAudioContext;
    if (Offline) void decode(new Offline(1, 1, 44100));
    else void fetchBytes();
  } catch {
    /* 靜默 */
  }
}

function startSource(context: AudioContext, buf: AudioBuffer): void {
  const gain = context.createGain();
  gain.gain.value = VOLUME;
  gain.connect(context.destination);
  const source = context.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  source.loopStart = LOOP_START;
  source.loopEnd = Math.min(LOOP_END, buf.duration);
  source.connect(gain);
  source.start(0, 0);
  current = { source, gain };
}

function fadeOut(): void {
  const node = current;
  current = null;
  if (!node || !ctx) return;
  try {
    const t = ctx.currentTime;
    node.gain.gain.cancelScheduledValues(t);
    node.gain.gain.setValueAtTime(node.gain.gain.value, t);
    node.gain.gain.linearRampToValueAtTime(0, t + FADE_S);
    node.source.stop(t + FADE_S + 0.01);
    node.source.onended = () => {
      try {
        node.source.disconnect();
        node.gain.disconnect();
      } catch {
        /* 靜默 */
      }
    };
  } catch {
    /* 靜默 */
  }
}

/** 使用者按「現在」展開時呼叫（必須在點擊事件內同步呼叫，iOS 才會解鎖音訊）。 */
export function playAsuraNowSfx(): void {
  try {
    const Ctor = audioContextClass();
    if (!Ctor) return;
    preferPlaybackSession();
    if (!ctx) ctx = new Ctor();
    const context = ctx;
    if (context.state !== 'running') void context.resume().catch(() => {});
    fadeOut(); // 不疊放：先收掉舊的那條
    const token = ++want;
    if (buffer) {
      startSource(context, buffer);
      return;
    }
    void decode(context).then((buf) => {
      if (!buf || token !== want || ctx !== context) return;
      try {
        startSource(context, buf);
      } catch {
        /* 靜默 */
      }
    });
  } catch {
    /* 靜默 */
  }
}

/** 收起「現在」、切到別格、卸載或離開頁面時呼叫。 */
export function stopAsuraNowSfx(): void {
  want++;
  fadeOut();
}
