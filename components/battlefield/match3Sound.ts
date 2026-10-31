/** 寶珠介面提示音；不取代六秒戰鬥影片或神獸登錄原聲。 */
export type Match3SoundCue = 'clear' | 'charge' | 'impact' | 'shield' | 'fusion' | 'counter' | 'guard' | 'drop' | 'merge';
type Tone = { hz: number; to?: number; at?: number; duration: number; gain: number; type?: OscillatorType };
const CUES: Record<Match3SoundCue, readonly Tone[]> = {
  // 落珠只作圓潤低音回饋；命中與護盾仍保有聲音優先權。
  merge: [{ hz: 247, to: 165, duration: .24, gain: .08 }, { hz: 165, to: 123, at: .03, duration: .30, gain: .065 }],
  drop: [{ hz: 196, to: 147, duration: .20, gain: .09 }, { hz: 294, to: 196, at: .025, duration: .12, gain: .04 }],
  // 高音只作短促辨識，較長尾音交給往下收的低聲部；不增加回合等待。
  clear: [{ hz: 420, to: 210, duration: .18, gain: .06 }, { hz: 315, at: .035, to: 196, duration: .14, gain: .035 }, { hz: 196, to: 147, duration: .28, gain: .075 }],
  charge: [{ hz: 220, to: 294, duration: .36, gain: .13 }, { hz: 440, to: 330, at: .1, duration: .12, gain: .035 }],
  impact: [{ hz: 135, to: 65, duration: .38, gain: .2, type: 'triangle' }, { hz: 1080, to: 360, duration: .05, gain: .04 }],
  shield: [{ hz: 660, to: 330, duration: .55, gain: .13 }, { hz: 990, to: 495, at: .055, duration: .12, gain: .045 }, { hz: 1320, to: 660, at: .11, duration: .09, gain: .025 }],
  fusion: [{ hz: 440, to: 220, duration: .26, gain: .1 }, { hz: 550, to: 275, at: .05, duration: .19, gain: .06 }, { hz: 880, to: 440, at: .1, duration: .12, gain: .035 }, { hz: 110, to: 82.4, at: .29, duration: .48, gain: .2, type: 'triangle' }],
  counter: [{ hz: 190, to: 95, duration: .28, gain: .16, type: 'triangle' }, { hz: 410, to: 205, duration: .06, gain: .035 }],
  guard: [{ hz: 330, to: 165, duration: .45, gain: .15 }, { hz: 660, to: 330, at: .025, duration: .1, gain: .035 }],
};

export function createMatch3Sound() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let softener: BiquadFilterNode | null = null;
  let muted = false;
  let disposed = false;
  let priorityUntil = 0;
  let lastDropAt = -Infinity;
  let lastMergeAt = -Infinity;
  let mergeUntil = 0;
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
  const stop = () => { priorityUntil = 0; lastDropAt = -Infinity; lastMergeAt = -Infinity; mergeUntil = 0; stopVoices(); };
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
          // 不額外壓低裝置媒體音量；各聲部保留混音餘裕與柔和包絡。
          master.gain.value = 1;
          softener = context.createBiquadFilter();
          softener.type = 'lowpass';
          softener.frequency.value = 1400;
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
      const now = context.currentTime;
      if (cue === 'drop' && (now < priorityUntil || now < mergeUntil || now - lastDropAt < .12)) return;
      if (cue === 'merge' && (now < priorityUntil || now - lastMergeAt < .18)) return;
      stopVoices();
      if (cue === 'drop') lastDropAt = now;
      else if (cue === 'merge') {
        lastMergeAt = now;
        mergeUntil = now + Math.max(...CUES.merge.map(tone => (tone.at ?? 0) + tone.duration)) + .01;
      } else {
        mergeUntil = 0;
        priorityUntil = now + Math.max(...CUES[cue].map(tone => (tone.at ?? 0) + tone.duration)) + .01;
      }
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
      disposed = true; priorityUntil = 0; lastDropAt = -Infinity; stopVoices(true);
      try { master?.disconnect(); } catch { /* Already disconnected. */ }
      try { softener?.disconnect(); } catch { /* Already disconnected. */ }
      try { void context?.close().catch(() => {}); } catch { /* Already closed. */ }
      master = null; softener = null; context = null;
    },
  };
}
