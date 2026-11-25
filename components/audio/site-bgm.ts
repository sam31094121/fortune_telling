'use client';

/**
 * 全站背景循環音（2026-11-22 用戶指定上線兩首）：
 * - home：首頁背景循環（迷霧開場，120 s 無縫）。
 * - asura：阿修羅「現在」遠方純貓頭鷹叫聲（2026-11-25 用戶指定取代戰鼓 v2；18 s 無縫，CC0，來源見 public/sfx/asura-owl-distant-v3.SOURCE.txt）。
 *
 * 全站共用 window.__siteAudioCtx 這一個 AudioContext（其他音效也要從 getSharedAudioContext 取用，禁止再 new）。
 * 解碼後的 AudioBuffer 依曲目快取，切頁只換 BufferSource，不再重新抓檔／解碼。
 * 第一次手勢（含 layout 先掛的腳本）同步 resume，並立刻開始 fetch，不等 window.load。
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
  asura: { src: '/sfx/asura-owl-distant-v3.mp3', loopSeconds: 18, volume: 0.6, fadeInS: 0.6, respectSiteMute: false },
};

const FADE_OUT_S = 0.15;
const SITE_MUTE_KEYS = ['site-sound-muted', 'sound-muted'] as const;

type Ctor = typeof AudioContext;

declare global {
  interface Window {
    __siteAudioCtx?: AudioContext;
    __siteAudioFetch?: Record<string, Promise<ArrayBuffer>>;
    __bowlVoices?: { live: number; max: number; cap: number };
    webkitAudioContext?: typeof AudioContext;
  }
}

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

function attachMaster(context: AudioContext): void {
  if (master && master.context === context) return;
  try {
    master = context.createGain();
    master.gain.value = 1;
    master.connect(context.destination);
  } catch {
    master = null;
  }
}

/** 全站唯一 AudioContext：只重用第一次手勢裡建立的那個，此函式不再 new。 */
export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx && ctx.state !== 'closed') return ctx;
  const existing = window.__siteAudioCtx;
  if (existing && existing.state !== 'closed') {
    ctx = existing;
    attachMaster(ctx);
    return ctx;
  }
  return null;
}

/** 只准在第一次使用者手勢裡呼叫（與 boot script 同步 resume）。 */
export function createSharedAudioContext(): AudioContext | null {
  const existing = getSharedAudioContext();
  if (existing) return existing;
  const C = ctorOf();
  if (!C || typeof window === 'undefined') return null;
  try {
    ctx = new C();
    window.__siteAudioCtx = ctx;
    attachMaster(ctx);
  } catch {
    ctx = null;
    master = null;
  }
  return ctx;
}

function ensureContext(): AudioContext | null {
  return getSharedAudioContext();
}

function prefetchSrc(src: string): Promise<ArrayBuffer | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const bag = (window.__siteAudioFetch ??= {});
  if (!bag[src]) {
    const init: RequestInit & { priority?: string } = { priority: 'high' };
    bag[src] = fetch(src, init).then((r) => {
      if (!r.ok) throw new Error('bgm fetch failed');
      return r.arrayBuffer();
    });
  }
  return bag[src].then((buf) => buf, () => {
    delete bag[src];
    return null;
  });
}

/** 第一次手勢務必同步呼叫：resume 共用 context，並立刻開始抓 BGM。 */
export function resumeSharedAudioAndPrefetch(track?: BgmTrackId): void {
  if (typeof window === 'undefined') return;
  preferPlaybackSession();
  const context = createSharedAudioContext();
  if (context && context.state !== 'running') {
    void context.resume();
  }
  const id = track ?? active ?? (location.pathname.startsWith('/ghost-asura') ? 'asura' : null);
  if (id) void prefetchSrc(TRACKS[id].src);
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
      const data = await prefetchSrc(TRACKS[track].src);
      if (!data) return null;
      let target: BaseAudioContext | null = getSharedAudioContext();
      if (!target) {
        const w = window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext };
        const Offline = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
        if (Offline) target = new Offline(2, 1, 44100);
      }
      if (!target) return null;
      const buf = await decodeWith(target, data.slice(0));
      if (buf) buffers.set(track, buf);
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
    resumeSharedAudioAndPrefetch(active ?? undefined);
    const context = getSharedAudioContext();
    if (context && context.state === 'running') {
      disarm();
      kick();
      return;
    }
    if (context) {
      void context.resume().then(() => {
        if (context.state === 'running') {
          disarm();
          kick();
        }
      }, () => {});
    }
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
  const context = getSharedAudioContext();
  if (!context) {
    armGesture();
    return;
  }
  if (playing) stopPlaying(FADE_OUT_S); // 換曲：舊的淡出
  const my = ++token;
  void prefetchSrc(TRACKS[track].src);
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
    armGesture();
    // 尚未有第一次手勢時，不預抓 1.9MB、不建立 AudioContext；等手勢同步 resume＋fetch。
    if (getSharedAudioContext()) {
      void prefetchSrc(TRACKS[track].src);
      kick();
    }
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

const MAX_CONCURRENT_SFX = 2;

type SfxVoice = { stop: () => void };

const sfxVoices: SfxVoice[] = [];

function publishBowlVoices(): void {
  if (typeof window === 'undefined') return;
  const prev = window.__bowlVoices;
  const live = sfxVoices.length;
  window.__bowlVoices = {
    live,
    max: Math.max(prev?.max ?? 0, live),
    cap: MAX_CONCURRENT_SFX,
  };
}

function stopSfxVoice(voice: SfxVoice | undefined): void {
  if (!voice) return;
  try {
    voice.stop();
  } catch {
    /* 靜默 */
  }
}

/**
 * 太極頌缽／演化音：共用同一個 AudioContext，同時最多 2 組發聲。
 * 第 3 組響起時先停掉最舊的那組。不可 close 共用 context。
 */
export function playLimitedSfx(build: (ctx: AudioContext) => { stop: () => void; durationMs: number }): void {
  try {
    const context = getSharedAudioContext();
    if (!context) return;
    if (context.state !== 'running') void context.resume().catch(() => {});
    while (sfxVoices.length >= MAX_CONCURRENT_SFX) {
      stopSfxVoice(sfxVoices.shift());
    }
    publishBowlVoices();
    const voice = build(context);
    sfxVoices.push(voice);
    publishBowlVoices();
    const timer = window.setTimeout(() => {
      const i = sfxVoices.indexOf(voice);
      if (i >= 0) sfxVoices.splice(i, 1);
      stopSfxVoice(voice);
      publishBowlVoices();
    }, Math.max(200, voice.durationMs));
    const prev = voice.stop;
    voice.stop = () => {
      window.clearTimeout(timer);
      prev();
      const i = sfxVoices.indexOf(voice);
      if (i >= 0) sfxVoices.splice(i, 1);
      publishBowlVoices();
    };
  } catch {
    /* 靜默 */
  }
}

export function stopAllLimitedSfx(): void {
  while (sfxVoices.length) stopSfxVoice(sfxVoices.shift());
  publishBowlVoices();
}
