'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'element-unseal-sound-muted';
const VOLUME_KEY = 'element-unseal-sound-volume';
const CHANGE_EVENT = 'element-unseal-sound-change';
type ElementSoundKey = '空' | '風' | '水' | '火' | '地';

// 五顆共用同一個播放框架，但各自有獨立音色：宇宙、台風、海嘯、熔岩、岩裂。
const ELEMENT_SOUND_PROFILE: Record<ElementSoundKey, {
  humStart: number;
  humEnd: number;
  chimeStart: number;
  chimeEnd: number;
  atmosphere: 'cosmic' | 'wind' | 'ocean' | 'fire' | 'earth';
  noiseStart: number;
  noiseEnd: number;
  noiseGain: number;
  impactStart: number;
  impactEnd: number;
  impactGain: number;
  impactType: OscillatorType;
}> = {
  空: { humStart: 46, humEnd: 118, chimeStart: 560, chimeEnd: 1120, atmosphere: 'cosmic', noiseStart: 420, noiseEnd: 3_100, noiseGain: 0.17, impactStart: 150, impactEnd: 430, impactGain: 0.29, impactType: 'triangle' },
  風: { humStart: 58, humEnd: 146, chimeStart: 640, chimeEnd: 1280, atmosphere: 'wind', noiseStart: 240, noiseEnd: 2_300, noiseGain: 0.22, impactStart: 190, impactEnd: 720, impactGain: 0.27, impactType: 'sawtooth' },
  水: { humStart: 28, humEnd: 88, chimeStart: 460, chimeEnd: 960, atmosphere: 'ocean', noiseStart: 180, noiseEnd: 1_750, noiseGain: 0.24, impactStart: 110, impactEnd: 310, impactGain: 0.34, impactType: 'triangle' },
  火: { humStart: 54, humEnd: 162, chimeStart: 610, chimeEnd: 1360, atmosphere: 'fire', noiseStart: 390, noiseEnd: 3_300, noiseGain: 0.22, impactStart: 175, impactEnd: 650, impactGain: 0.31, impactType: 'sawtooth' },
  地: { humStart: 40, humEnd: 98, chimeStart: 520, chimeEnd: 1020, atmosphere: 'earth', noiseStart: 110, noiseEnd: 920, noiseGain: 0.22, impactStart: 82, impactEnd: 230, impactGain: 0.35, impactType: 'triangle' },
};

function soundIsMuted() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

function soundIsEnhanced() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(VOLUME_KEY) === 'enhanced';
}

/**
 * 五元素共用的唯一解封儀式聲音。只可由使用者點擊事件呼叫；不自動、不循環、無外部音檔。
 * 音色由短生命週期 Web Audio 節點合成，結束後自動釋放，避免手機持續重播或卡頓。
 */
export function playElementUnsealSound(element: ElementSoundKey = '空') {
  if (typeof window === 'undefined' || soundIsMuted()) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const profile = ELEMENT_SOUND_PROFILE[element];
  const masterLevel = soundIsEnhanced() ? 0.38 : 0.28;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const now = context.currentTime;
  compressor.threshold.setValueAtTime(-20, now);
  compressor.knee.setValueAtTime(8, now);
  compressor.ratio.setValueAtTime(10, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.24, now);
  master.gain.setValueAtTime(0.0001, now);
  // 讓手機也聽得到主要撞擊；壓縮器限制瞬間峰值，避免削波與突發爆音。
  master.gain.exponentialRampToValueAtTime(masterLevel, now + 0.08);
  master.gain.setValueAtTime(masterLevel, now + 1.15);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.65);
  master.connect(compressor).connect(context.destination);

  // 第一段：萬年封印的低沉震動。
  const hum = context.createOscillator();
  const humGain = context.createGain();
  hum.type = 'triangle';
  hum.frequency.setValueAtTime(profile.humStart, now);
  hum.frequency.exponentialRampToValueAtTime(profile.humEnd, now + 0.95);
  humGain.gain.setValueAtTime(element === '水' || element === '地' ? 0.62 : 0.5, now);
  humGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.48);
  hum.connect(humGain).connect(master);

  // 第二段主撞擊：刻意放在手機可重播的中頻，不把力量只藏在低頻裡。
  const impact = context.createOscillator();
  const impactGain = context.createGain();
  const impactFilter = context.createBiquadFilter();
  impact.type = profile.impactType;
  impact.frequency.setValueAtTime(profile.impactStart, now + 0.46);
  impact.frequency.exponentialRampToValueAtTime(profile.impactEnd, now + 0.96);
  impactFilter.type = 'lowpass';
  impactFilter.frequency.setValueAtTime(element === '風' || element === '火' ? 1_900 : 1_250, now + 0.46);
  impactFilter.Q.value = 0.55;
  impactGain.gain.setValueAtTime(0.0001, now);
  impactGain.gain.exponentialRampToValueAtTime(profile.impactGain, now + 0.5);
  impactGain.gain.setValueAtTime(profile.impactGain * 0.76, now + 0.7);
  impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.28);
  impact.connect(impactFilter).connect(impactGain).connect(master);

  // 第二段：短促上衝與裂開。極小噪聲緩衝只播放一次，不保留、不循環。
  const crackBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.16), context.sampleRate);
  const crackData = crackBuffer.getChannelData(0);
  for (let index = 0; index < crackData.length; index += 1) {
    crackData[index] = (Math.random() * 2 - 1) * (1 - index / crackData.length);
  }
  const crack = context.createBufferSource();
  const crackFilter = context.createBiquadFilter();
  const crackGain = context.createGain();
  crack.buffer = crackBuffer;
  crackFilter.type = 'bandpass';
  crackFilter.frequency.setValueAtTime(720, now + 0.54);
  crackFilter.frequency.exponentialRampToValueAtTime(2_600, now + 0.7);
  crackFilter.Q.value = 0.85;
  crackGain.gain.setValueAtTime(0.0001, now);
  crackGain.gain.exponentialRampToValueAtTime(element === '火' || element === '地' ? 0.28 : 0.23, now + 0.56);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.74);
  crack.connect(crackFilter).connect(crackGain).connect(master);

  // 第三段：明亮上行與宇宙感餘韻。
  const chime = context.createOscillator();
  const chimeGain = context.createGain();
  chime.type = 'sine';
  chime.frequency.setValueAtTime(profile.chimeStart, now + 0.54);
  chime.frequency.exponentialRampToValueAtTime(profile.chimeEnd, now + 1.42);
  chimeGain.gain.setValueAtTime(0.0001, now);
  chimeGain.gain.exponentialRampToValueAtTime(0.2, now + 0.64);
  chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.48);
  chime.connect(chimeGain).connect(master);

  const starlight = context.createOscillator();
  const starlightGain = context.createGain();
  starlight.type = 'sine';
  starlight.frequency.setValueAtTime(1_220, now + 0.86);
  starlight.frequency.exponentialRampToValueAtTime(1_680, now + 1.72);
  starlightGain.gain.setValueAtTime(0.0001, now);
  starlightGain.gain.exponentialRampToValueAtTime(0.09, now + 0.92);
  starlightGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.52);
  starlight.connect(starlightGain).connect(master);

  // 元素專屬氣流層：小型一次性噪聲緩衝，經不同包絡與濾波變成星塵、台風、巨浪、熔岩或岩裂。
  const atmosphereDuration = profile.atmosphere === 'ocean' ? 1.45 : 1.2;
  const atmosphereBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * atmosphereDuration), context.sampleRate);
  const atmosphereData = atmosphereBuffer.getChannelData(0);
  let earthRumble = 0;
  for (let index = 0; index < atmosphereData.length; index += 1) {
    const progress = index / atmosphereData.length;
    const random = Math.random() * 2 - 1;
    const envelope = profile.atmosphere === 'fire'
      ? Math.max(0, 1 - progress) * (0.46 + (index % 997 < 18 ? 0.54 : 0))
      : profile.atmosphere === 'wind'
        ? Math.sin(progress * Math.PI) ** 1.15
        : profile.atmosphere === 'earth'
          ? Math.sin(progress * Math.PI) ** 0.72
          : profile.atmosphere === 'ocean'
            ? Math.min(1, Math.sin(progress * Math.PI) ** 1.15 + Math.exp(-1 * (((progress - 0.58) / 0.115) ** 2)) * 0.72)
            : Math.sin(progress * Math.PI) ** 2.2;
    if (profile.atmosphere === 'earth') {
      earthRumble = earthRumble * 0.94 + random * 0.06;
      atmosphereData[index] = earthRumble * envelope;
    } else {
      atmosphereData[index] = random * envelope;
    }
  }
  const atmosphere = context.createBufferSource();
  const atmosphereFilter = context.createBiquadFilter();
  const atmosphereGain = context.createGain();
  atmosphere.buffer = atmosphereBuffer;
  atmosphereFilter.type = profile.atmosphere === 'ocean' || profile.atmosphere === 'earth' ? 'lowpass' : 'bandpass';
  atmosphereFilter.frequency.setValueAtTime(profile.noiseStart, now + 0.28);
  atmosphereFilter.frequency.exponentialRampToValueAtTime(profile.noiseEnd, now + 0.9);
  atmosphereFilter.Q.value = profile.atmosphere === 'wind' ? 0.55 : profile.atmosphere === 'fire' ? 1.15 : 0.8;
  atmosphereGain.gain.setValueAtTime(0.0001, now);
  atmosphereGain.gain.exponentialRampToValueAtTime(profile.noiseGain, now + 0.5);
  atmosphereGain.gain.setValueAtTime(profile.noiseGain * 0.82, now + 0.95);
  atmosphereGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
  atmosphere.connect(atmosphereFilter).connect(atmosphereGain).connect(master);

  // 水元素限定的深海潮壓：低頻先壓住，再隨海嘯主衝擊快速上湧，音量仍受 master 安全上限控制。
  let waterPressure: OscillatorNode | null = null;
  if (profile.atmosphere === 'ocean') {
    waterPressure = context.createOscillator();
    const pressureGain = context.createGain();
    waterPressure.type = 'sine';
    waterPressure.frequency.setValueAtTime(27, now);
    waterPressure.frequency.exponentialRampToValueAtTime(54, now + 0.92);
    pressureGain.gain.setValueAtTime(0.0001, now);
    pressureGain.gain.exponentialRampToValueAtTime(0.28, now + 0.2);
    pressureGain.gain.exponentialRampToValueAtTime(0.46, now + 0.62);
    pressureGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.92);
    waterPressure.connect(pressureGain).connect(master);
  }

  void context.resume().then(() => {
    hum.start(now);
    impact.start(now);
    crack.start(now + 0.54);
    chime.start(now);
    starlight.start(now);
    atmosphere.start(now + 0.24);
    waterPressure?.start(now);
    hum.stop(now + 1.5);
    impact.stop(now + 1.3);
    crack.stop(now + 0.75);
    chime.stop(now + 2.5);
    starlight.stop(now + 2.55);
    atmosphere.stop(now + 1.92);
    waterPressure?.stop(now + 1.94);
  }).catch(() => context.close());

  window.setTimeout(() => void context.close(), 2_900);
}

export function ElementUnsealSoundToggle() {
  const [muted, setMuted] = useState(true);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    const sync = () => {
      setMuted(soundIsMuted());
      setEnhanced(soundIsEnhanced());
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const toggle = () => {
    const next = !muted;
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    setMuted(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const toggleVolume = () => {
    const next = !enhanced;
    window.localStorage.setItem(VOLUME_KEY, next ? 'enhanced' : 'standard');
    setEnhanced(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <span className="relative flex flex-wrap justify-end gap-1.5">
      <button
        type="button"
        onClick={toggle}
        className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] font-black tracking-wide text-white/70 transition active:scale-[0.98]"
        aria-pressed={muted}
        aria-label={muted ? '開啟解封儀式聲音' : '關閉解封儀式聲音'}
      >
        {muted ? '解封聲音：關' : '解封聲音：開'}
      </button>
      <button
        type="button"
        onClick={toggleVolume}
        className="rounded-full border border-amber-100/20 bg-amber-200/8 px-3 py-1.5 text-[10px] font-black tracking-wide text-amber-50/75 transition active:scale-[0.98] disabled:opacity-35"
        aria-pressed={enhanced}
        aria-label={enhanced ? '恢復標準解封音量' : '增強解封音量'}
        disabled={muted}
      >
        音量：{enhanced ? '增強' : '標準'}
      </button>
    </span>
  );
}

const SOUND_PREVIEW_ELEMENTS: ElementSoundKey[] = ['空', '風', '水', '火', '地'];

/**
 * 只試聽聲音的控制列：不接受任何解封狀態，也不呼叫卡片儀式，因此不可能改動真實進度。
 */
export function ElementUnsealSoundPreview() {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState<ElementSoundKey | null>(null);
  const [sequenceActive, setSequenceActive] = useState(false);
  const sequenceTimersRef = useRef<number[]>([]);

  const clearSequence = () => {
    sequenceTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    sequenceTimersRef.current = [];
    setSequenceActive(false);
  };

  useEffect(() => {
    const sync = () => setMuted(soundIsMuted());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      sequenceTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setPlaying(null), 2_850);
    return () => window.clearTimeout(timer);
  }, [playing]);

  const preview = (element: ElementSoundKey) => {
    if (muted) return;
    clearSequence();
    setPlaying(element);
    playElementUnsealSound(element);
  };

  const toggleSequence = () => {
    if (muted) return;
    if (sequenceActive) {
      clearSequence();
      setPlaying(null);
      return;
    }
    setSequenceActive(true);
    SOUND_PREVIEW_ELEMENTS.forEach((element, index) => {
      const timer = window.setTimeout(() => {
        setPlaying(element);
        playElementUnsealSound(element);
        if (index === SOUND_PREVIEW_ELEMENTS.length - 1) {
          const finishTimer = window.setTimeout(() => {
            setPlaying(null);
            setSequenceActive(false);
            sequenceTimersRef.current = [];
          }, 2_850);
          sequenceTimersRef.current.push(finishTimer);
        }
      }, index * 3_050);
      sequenceTimersRef.current.push(timer);
    });
  };

  return (
    <section className="mt-3 rounded-xl border border-white/12 bg-black/20 p-3" aria-label="試聽五元素解封聲音">
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-[11px] font-black tracking-[0.12em] text-cyan-50">試聽解封聲音</p>
          <p className="mt-1 text-[10px] font-semibold leading-4 text-white/55">只播放聲音，不會解封或改變進度</p>
        </div>
        <div className="flex justify-start"><ElementUnsealSoundToggle /></div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {SOUND_PREVIEW_ELEMENTS.map((element) => (
          <button
            type="button"
            key={element}
            onClick={() => preview(element)}
            disabled={muted}
            aria-label={`試聽${element}元素解封聲音`}
            className={`relative min-h-10 rounded-lg border px-1 py-2 text-xs font-black transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 ${playing === element ? 'border-cyan-100 bg-cyan-200/20 text-cyan-50' : 'border-white/15 bg-white/5 text-white/75'}`}
          >
            {element}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggleSequence}
        disabled={muted}
        aria-pressed={sequenceActive}
        className="mt-2 min-h-10 w-full rounded-lg border border-amber-100/20 bg-amber-200/8 px-3 py-2 text-[11px] font-black tracking-wide text-amber-50/85 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
      >
        {sequenceActive ? '停止依序試聽' : '依序試聽五元素'}
      </button>
      <p className="mt-2 text-center text-[10px] font-semibold leading-4 text-amber-100/70" aria-live="polite">
        {muted ? '請先把「解封聲音」切換為開' : playing ? `正在試聽${playing}元素・不會啟動解封儀式` : sequenceActive ? '準備依序播放五種聲音' : '可單獨試聽，也可依序比較五種聲音'}
      </p>
    </section>
  );
}
