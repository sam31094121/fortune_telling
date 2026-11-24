'use client';

/**
 * 全站背景循環音（2026-11-22 用戶指定上線兩首）：
 * - home：首頁背景循環（迷霧開場，120 s 無縫）。
 * - asura：阿修羅戰鼓新版（180 s 無縫）。
 *
 * 共用一個 AudioContext；同一時間只播一首（換曲時舊的立刻淡出），不會兩首疊在一起。
 * 用 fetch＋decodeAudioData 解碼成 AudioBuffer，AudioBufferSourceNode loop＋loopStart／loopEnd 無縫循環（不用 <audio loop>）。
 * 瀏覽器不允許有聲自動播放：進頁先嘗試播放，被擋就等使用者第一次點擊／觸碰／按鍵再開始。
 * 分頁隱藏時淡出暫停，回到分頁再淡入；所有擁有者都放開（離開頁面、卸載）就停止。
 * 播放失敗一律靜默略過。界面不顯示任何音效資訊。
 */

export type BgmTrackId = 'home' | 'asura';

interface TrackSpec {
  src: string;
  /** 名目循環長度（秒）；實際 loopStart 會扣掉解碼後殘留的 mp3 前置靜音。 */
  loopSeconds: number;
  volume: number;
  fadeInS: number;
  /** 是否尊重全站靜音設定（localStorage site-sound-muted／sound-muted）。 */
  respectSiteMute: boolean;
}

const TRACKS: Record<BgmTrackId, TrackSpec> = {
  home: { src: '/sfx/home-bgm-v1.mp3', loopSeconds: 120, volume: 0.45, fadeInS: 3, respectSiteMute: true },
  // 阿修羅：依技能檔「互動音效」，不看網站靜音設定。
  asura: { src: '/sfx/asura-wardrum-v2-3min.mp3', loopSeconds: 180, volume: 0.6, fadeInS: 0.6, respectSiteMute: false },
};

const FADE_OUT_S = 0.15;
const SITE_MUTE_KEYS = ['site-sound-muted', 'sound-muted'] as const;

type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<BgmTrackId, AudioBuffer>();
const loads = new Map<BgmTrackId, Promise<AudioBuffer | null>>();
const owners = new Map<BgmTrackId, Set<string>>();
let active: BgmTrackId | null = null;
let playing: { track: BgmTrackId; source: AudioBufferSourceNode; gain: GainNode; loopStart: number } | null = null;
let token = 0;
let gestureArmed = false;
let lifecycleArmed = false;
let hiddenPaused = false;

function ctorOf(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function siteMuted(): boolean {
  try {
    return SITE_MUTE_KEYS.some((k) => {
      const v = window.localStorage.getItem(k);
      return v === '1' || v === 'true';
    });
  } catch {
    return false;
  }
}

function preferPlaybackSession(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
  } catch {
    /* 不支援就略過 */
  }
}

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const C = ctorOf();
  if (!C) return null;
  try {
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
  return ctx;
}

function decodeWith(context: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer | null> {
  return new Promise((resolve) => {
    try {
      const p = context.decodeAudioData(data, (b) => resolve(b), () => resolve(null));
      if (p && typeof p.then === 'function') p.then(resolve, () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

function load(track: BgmTrackId): Promise<AudioBuffer | null> {
  const cached = buffers.get(track);
  if (cached) return Promise.resolve(cached);
  const pending = loads.get(track);
  if (pending) return pending;
  const job = (async () => {
    try {
      const res = await fetch(TRACKS[track].src);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      let target: BaseAudioContext | null = ctx;
      if (!target) {
        const w = window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext };
        const Offline = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
        if (Offline) target = new Offline(2, 1, 44100);
      }
      if (!target) return null;
      const buf = await decodeWith(target, data);
      if (buf) {
        // 只留目前要播的那首在記憶體（長音檔解碼後很大，手機省記憶體）
        for (const k of [...buffers.keys()]) if (k !== track) buffers.delete(k);
        buffers.set(track, buf);
      }
      return buf;
    } catch {
      return null;
    } finally {
      loads.delete(track);
    }
  })();
  loads.set(track, job);
  return job;
}

/** 解碼後若殘留 mp3 前置靜音（部分瀏覽器不裁掉），把循環起點往後移，維持名目長度。 */
function loopPoints(buf: AudioBuffer, seconds: number): { start: number; end: number } {
  let lead = 0;
  try {
    const d = buf.getChannelData(0);
    const max = Math.min(d.length, Math.round(buf.sampleRate * 0.08));
    let i = 0;
    while (i < max && Math.abs(d[i]) < 1e-6) i += 1;
    if (i < max && buf.duration - i / buf.sampleRate >= seconds - 0.002) lead = i / buf.sampleRate;
  } catch {
    lead = 0;
  }
  return { start: lead, end: Math.min(lead + seconds, buf.duration) };
}

function stopPlaying(fadeS: number): void {
  const node = playing;
  playing = null;
  if (!node || !ctx) return;
  try {
    const t = ctx.currentTime;
    const g = node.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + fadeS);
    node.source.stop(t + fadeS + 0.01);
    node.source.onended = () => {
      try {
        node.source.disconnect();
        node.gain.disconnect();
      } catch {
        /* 靜默 */
      }
    };
  } catch {
    try {
      node.source.stop();
    } catch {
      /* 靜默 */
    }
  }
}

function startNow(track: BgmTrackId, buf: AudioBuffer): void {
  if (!ctx || !master) return;
  const spec = TRACKS[track];
  const { start, end } = loopPoints(buf, spec.loopSeconds);
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(spec.volume, t + spec.fadeInS);
  gain.connect(master);
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  source.loopStart = start;
  source.loopEnd = end;
  source.connect(gain);
  source.start(t, start);
  playing = { track, source, gain, loopStart: start };
}

function armGesture(): void {
  if (gestureArmed || typeof window === 'undefined') return;
  gestureArmed = true;
  const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
  const onGesture = () => {
    if (!ctx || ctx.state === 'running') {
      disarm();
      kick();
      return;
    }
    preferPlaybackSession();
    void ctx.resume().then(() => {
      if (ctx && ctx.state === 'running') {
        disarm();
        kick();
      }
    }, () => {});
  };
  const disarm = () => {
    gestureArmed = false;
    events.forEach((e) => window.removeEventListener(e, onGesture, true));
  };
  events.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }));
}

function armLifecycle(): void {
  if (lifecycleArmed || typeof document === 'undefined') return;
  lifecycleArmed = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (playing) {
        hiddenPaused = true;
        token += 1;
        stopPlaying(FADE_OUT_S);
      }
    } else if (hiddenPaused) {
      hiddenPaused = false;
      kick();
    }
  });
  window.addEventListener('pagehide', () => {
    token += 1;
    stopPlaying(FADE_OUT_S);
  });
  // 從上一頁快取（bfcache）返回時，若畫面仍要求播放就再開始
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) kick();
  });
}

/** 依目前擁有者決定要播哪一首：最後被要求的那首（active）。 */
function kick(): void {
  const track = active;
  if (!track || !(owners.get(track)?.size)) {
    token += 1;
    stopPlaying(FADE_OUT_S);
    return;
  }
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    hiddenPaused = true;
    return;
  }
  if (TRACKS[track].respectSiteMute && siteMuted()) return;
  if (playing?.track === track) return; // 已在播，不重來、不疊放
  const context = ensureContext();
  if (!context) return;
  if (playing) stopPlaying(FADE_OUT_S); // 換曲：舊的淡出
  const my = ++token;
  if (context.state !== 'running') {
    void context.resume().catch(() => {});
    armGesture();
  }
  void load(track).then((buf) => {
    if (!buf || my !== token || active !== track || !ctx) return;
    if (ctx.state !== 'running') {
      // 被自動播放限制擋住：等第一次手勢（armGesture 會再呼叫 kick）
      armGesture();
      const c = ctx;
      void c.resume().then(() => {
        if (my === token && c.state === 'running' && !playing) startNow(track, buf);
      }, () => {});
      return;
    }
    if (!playing) startNow(track, buf);
  });
}

/** 某個畫面（owner）要求播放某首；同一首重複要求不重播。 */
export function acquireBgm(track: BgmTrackId, owner: string): void {
  try {
    if (typeof window === 'undefined') return;
    armLifecycle();
    let set = owners.get(track);
    if (!set) owners.set(track, (set = new Set()));
    set.add(owner);
    // 其他曲目的擁有者交出（同時只播一首）
    for (const [k, s] of owners) if (k !== track) s.clear();
    active = track;
    preferPlaybackSession();
    kick();
  } catch {
    /* 靜默 */
  }
}

/** 該畫面放開；沒有擁有者時淡出停止。 */
export function releaseBgm(track: BgmTrackId, owner: string): void {
  try {
    owners.get(track)?.delete(owner);
    if (active === track && !owners.get(track)?.size) {
      active = null;
      token += 1;
      stopPlaying(FADE_OUT_S);
    }
  } catch {
    /* 靜默 */
  }
}

/** 先下載並解碼（不播放）。 */
export function primeBgm(track: BgmTrackId): void {
  try {
    if (typeof window !== 'undefined') void load(track);
  } catch {
    /* 靜默 */
  }
}

/** 其他音效（例如首頁頌缽）響起時，背景音暫時壓低 dB 約 holdS 秒。 */
export function duckBgm(db = 5, holdS = 1): void {
  try {
    if (!ctx || !master || !playing) return;
    const t = ctx.currentTime;
    const g = master.gain;
    const low = Math.pow(10, -Math.abs(db) / 20);
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(low, t + 0.08);
    g.setValueAtTime(low, t + 0.08 + holdS);
    g.linearRampToValueAtTime(1, t + 0.08 + holdS + 0.4);
  } catch {
    /* 靜默 */
  }
}
