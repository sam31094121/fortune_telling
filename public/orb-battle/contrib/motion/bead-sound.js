/* contrib/motion/bead-sound.js：與 lib/beast-game/match3/bead-sound.ts 是同一份合成核心（瀏覽器直接執行版）。 */
(function () {
'use strict';
/* 寶珠音效：完全原創，用 WebAudio 即時合成，不使用任何音檔。
 * 風格是低調奢華：音量低、聲音短、不刺耳（全部經過 lowpass 濾波）。
 * AudioContext 只在使用者第一次手勢（放開手指 pointerup 或 keydown）之後、於閒置時才建立。
 * 靜音狀態存在 localStorage；如果網站已有全站音效開關（SITE_SOUND_KEYS），也會一併遵守。 */
const SOUND = {
  storageKey: 'beast-bead-sound-muted',
  persist: true,          // false：靜音由宿主頁面管理（例如 orb 的 window.BeastSound），不寫 localStorage
  siteMuteKeys: ['site-sound-muted', 'sound-muted'],
  master: 0.13,
  lowpassHz: 3800,
  tickScale: [440, 494, 554, 659, 740, 880, 988, 1109, 1175, 1319],
  tickCap: 10,
};

function createBeadSound(win, cfg) {
  const C = Object.assign({}, SOUND, cfg || {});
  let ctx = null, out = null, muted = false, lastThud = 0, armed = false;
  if (C.muted != null) muted = !!C.muted;
  const subs = new Set();
  const ls = () => { try { return win.localStorage; } catch (_) { return null; } };
  const store = ls();
  if (store && C.persist !== false) {
    muted = store.getItem(C.storageKey) === '1' || C.siteMuteKeys.some((k) => store.getItem(k) === '1' || store.getItem(k) === 'true');
  }

  function unlock() {
    if (muted) return; // 靜音時完全不建立 AudioContext，直到第一次取消靜音
    if (ctx || !(win.AudioContext || win.webkitAudioContext)) { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = win.AudioContext || win.webkitAudioContext;
    ctx = new AC();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = C.lowpassHz; lp.Q.value = 0.4;
    out = ctx.createGain(); out.gain.value = C.master;
    out.connect(lp); lp.connect(ctx.destination);
  }
  // v4：建立 AudioContext 很耗主執行緒（4x 降速下約 350ms）。改在第一次放開手指／按鍵後、
  // 於閒置時才建立，避免卡在第一次拖曳的路徑上；黏性使用者啟用（sticky activation）讓延後建立仍可發聲。
  const onGesture = () => {
    if (armed) return; armed = true;
    win.removeEventListener('pointerup', onGesture, true); win.removeEventListener('keydown', onGesture, true);
    const run = () => unlock();
    if (win.requestIdleCallback) win.requestIdleCallback(run, { timeout: 1500 }); else win.setTimeout(run, 250);
  };
  win.addEventListener('pointerup', onGesture, true);
  win.addEventListener('keydown', onGesture, true);

  const ready = () => !muted && ctx && ctx.state !== 'closed';
  /** 一個音：振盪器加 ADSR 包絡。f1 不為空時，音高會從 f 滑到 f1。 */
  function tone(f, { type = 'sine', at = 0, a = 0.004, d = 0.12, g = 1, f1 = null } = {}) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(g, t + a);
    v.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(v); v.connect(out); o.start(t); o.stop(t + a + d + 0.05);
  }

  const api = {
    unlock,
    get muted() { return muted; },
    setMuted(m) { muted = !!m; const s = C.persist !== false ? ls() : null; if (s) try { s.setItem(C.storageKey, muted ? '1' : '0'); } catch (_) {} subs.forEach((f) => f(muted)); if (!muted && armed) unlock(); },
    toggle() { api.setMuted(!muted); return muted; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    /** 連到第 n 顆：清脆的玻璃輕響，每多一顆升一階，到第 10 顆封頂。 */
    tick(n) { if (!ready()) return; const f = C.tickScale[Math.max(0, Math.min(C.tickCap, n) - 1)];
      tone(f, { d: 0.09, g: 0.5 }); tone(f * 2, { d: 0.05, g: 0.08 }); },
    /** 不足 3 顆就放開：短而悶的取消聲。 */
    cancel() { if (!ready()) return; tone(311, { type: 'triangle', d: 0.07, g: 0.35 }); tone(233, { type: 'triangle', at: 0.06, d: 0.1, g: 0.3 }); },
    /** 消除：水晶鈴聲。 */
    chime(size = 3) { if (!ready()) return; const b = 880;
      [1, 1.5, 2].forEach((m, i) => tone(b * m, { at: i * 0.035, d: 0.45 + Math.min(size, 10) * 0.02, g: 0.28 - i * 0.07 })); },
    /** 生成魔法珠：溫暖的低音鐘（非整數泛音）。 */
    magic() { if (!ready()) return; [[196, 0.42], [392, 0.18], [541, 0.12], [784, 0.05]].forEach(([f, g]) => tone(f, { a: 0.008, d: 1.1, g })); },
    /** 五珠技：金色微光，慢慢浮起。 */
    skill5() { if (!ready()) return; [440, 554, 659, 880].forEach((f, i) => tone(f, { at: i * 0.07, a: 0.28, d: 0.75, g: 0.14 })); tone(1319, { at: 0.3, a: 0.2, d: 0.6, g: 0.04 }); },
    /** 補珠落地：柔軟的悶響，220ms 內只響一次。 */
    thud() { if (!ready()) return; const now = Date.now(); if (now - lastThud < 220) return; lastThud = now;
      tone(120, { a: 0.003, d: 0.14, g: 0.55, f1: 62 }); },
  };
  return api;
}
window.BeadSound = window.BeadSound || createBeadSound(window, window.BeadSoundConfig);
})();
