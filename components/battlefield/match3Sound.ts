/** 寶珠介面提示音；不取代六秒戰鬥影片或神獸登錄原聲。 */
export type Match3SoundCue = 'clear' | 'charge' | 'impact' | 'shield' | 'fusion' | 'counter' | 'guard';
type Tone = { hz: number; to?: number; at?: number; duration: number; gain: number; type?: OscillatorType };
const CUES: Record<Match3SoundCue, readonly Tone[]> = {
  clear: [{ hz: 1100, to: 784, duration: .12, gain: .14 }, { hz: 1320, at: .035, duration: .1, gain: .06 }],
  charge: [{ hz: 220, to: 660, duration: .25, gain: .15, type: 'triangle' }, { hz: 660, to: 990, at: .1, duration: .2, gain: .08 }],
  impact: [{ hz: 135, to: 55, duration: .22, gain: .23, type: 'triangle' }, { hz: 1080, to: 540, duration: .065, gain: .1 }],
  shield: [{ hz: 660, duration: .34, gain: .13 }, { hz: 990, at: .055, duration: .32, gain: .09 }, { hz: 1320, at: .11, duration: .3, gain: .05 }],
  fusion: [{ hz: 440, to: 660, duration: .29, gain: .11 }, { hz: 550, to: 660, at: .05, duration: .25, gain: .1 }, { hz: 880, to: 660, at: .1, duration: .2, gain: .08 }, { hz: 110, to: 82.4, at: .29, duration: .48, gain: .2, type: 'triangle' }],
  counter: [{ hz: 190, to: 85, duration: .16, gain: .18, type: 'triangle' }, { hz: 410, to: 190, duration: .085, gain: .065 }],
  guard: [{ hz: 330, to: 294, duration: .28, gain: .12 }, { hz: 660, to: 588, at: .025, duration: .25, gain: .065 }],
};

export function createMatch3Sound() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let softener: BiquadFilterNode | null = null;
  let muted = false;
  let disposed = false;
  const voices = new Map<OscillatorNode, { gain: GainNode; start: number; scheduled: boolean; releasing: boolean }>();
  const clean = (source: OscillatorNode, gain: GainNode) => {
    voices.delete(source);
    try { source.disconnect(); } catch { /* Already disconnected. */ }
    try { gain.disconnect(); } catch { /* Already disconnected. */ }
  };
  const stopVoices = (immediate = false) => {
    for (const [source, voice] of voices) {
      const { gain, start, scheduled } = voice;
      const now = context?.currentTime ?? 0;
      if (immediate || !scheduled || context?.state !== 'running' || start >= now) {
        source.onended = null;
        try { source.stop(); } catch { /* Source may have ended between frames. */ }
        clean(source, gain);
      } else if (!voice.releasing) {
        voice.releasing = true;
        try {
          // 保留當下波幅再短淡出，重複停止不得重新拉高音量。
          if (typeof gain.gain.cancelAndHoldAtTime === 'function') gain.gain.cancelAndHoldAtTime(now);
          else {
            const level = gain.gain.value;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(level, now);
          }
          gain.gain.linearRampToValueAtTime(0, now + .009);
          source.stop(now + .01);
          // 已開始音源由 onended 斷線，保留這 9ms 淡出。
        } catch { try { source.stop(); } catch { /* Already ended. */ } clean(source, gain); }
      }
    }
  };
  const stop = () => stopVoices();
  return {
    /** 呼叫端必須在真實手勢中同步呼叫；未解鎖的 play 不排隊補播。 */
    unlock(): void {
      if (disposed || muted || typeof window === 'undefined') return;
      try {
        if (!context) {
          const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!Audio) return;
          context = new Audio();
          master = context.createGain();
          master.gain.value = .2;
          softener = context.createBiquadFilter();
          softener.type = 'lowpass';
          softener.frequency.value = 2200;
          softener.Q.value = .5;
          master.connect(softener);
          softener.connect(context.destination);
        }
        if (context.state !== 'running') void context.resume().catch(() => {});
      } catch { /* Missing/blocked audio must never block the battle. */ }
    },
    play(cue: Match3SoundCue): void {
      if (disposed || muted || !context || !master || context.state !== 'running') return;
      // 新事件接手舊提示，避免連續點擊疊音增大音量或留下延遲音。
      stop();
      try {
        for (const tone of CUES[cue]) {
          const source = context.createOscillator(), gain = context.createGain();
          const start = context.currentTime + (tone.at ?? 0), end = start + tone.duration;
          const voice = { gain, start, scheduled: false, releasing: false };
          voices.set(source, voice);
          source.onended = () => clean(source, gain);
          source.type = tone.type ?? 'sine';
          source.frequency.setValueAtTime(tone.hz, start);
          if (tone.to) source.frequency.exponentialRampToValueAtTime(tone.to, end);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(tone.gain, start + .022);
          gain.gain.exponentialRampToValueAtTime(.0001, end);
          source.connect(gain); gain.connect(master);
          source.start(start); voice.scheduled = true; source.stop(end + .01);
        }
      } catch { stop(); }
    },
    setMuted(value: boolean): void { muted = value; if (muted) stop(); },
    stop,
    dispose(): void {
      if (disposed) return;
      disposed = true; stopVoices(true);
      try { master?.disconnect(); } catch { /* Already disconnected. */ }
      try { softener?.disconnect(); } catch { /* Already disconnected. */ }
      try { void context?.close().catch(() => {}); } catch { /* Already closed. */ }
      master = null; softener = null; context = null;
    },
  };
}
