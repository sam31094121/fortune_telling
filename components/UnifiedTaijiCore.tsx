'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';

type EvolutionStage = 'idle' | 'taiji' | 'liangyi' | 'sixiang' | 'bagua';

type EvolutionConfig = {
  stage: EvolutionStage;
  label: string;
  description: string;
  durationMs: number;
};

const EVOLUTION_CONFIG: Record<1 | 2 | 4 | 8, EvolutionConfig> = {
  1: {
    stage: 'taiji',
    label: '太極',
    description: '一點初開，能量歸中。',
    durationMs: 1200,
  },
  2: {
    stage: 'liangyi',
    label: '兩儀',
    description: '陰陽分化，黑白相生。',
    durationMs: 1600,
  },
  4: {
    stage: 'sixiang',
    label: '四象',
    description: '四象定位，氣場展開。',
    durationMs: 2000,
  },
  8: {
    stage: 'bagua',
    label: '八卦',
    description: '八方成局，萬象流轉。',
    durationMs: 2400,
  },
};

const BAGUA_SYMBOLS = [
  ['乾', '☰'],
  ['兌', '☱'],
  ['離', '☲'],
  ['震', '☳'],
  ['巽', '☴'],
  ['坎', '☵'],
  ['艮', '☶'],
  ['坤', '☷'],
] as const;

type UnifiedTaijiCoreProps = {
  active?: boolean;
  auraClass?: string;
  auraBadgeClass?: string;
  auraLabel?: string;
  showLabel?: boolean;
};

export default function UnifiedTaijiCore({
  active = false,
  auraClass = '',
  auraBadgeClass = '',
  auraLabel = '',
  showLabel = false,
}: UnifiedTaijiCoreProps) {
  const [tapCount, setTapCount] = useState(0);
  const [evolutionStage, setEvolutionStage] = useState<EvolutionStage>('idle');
  const [evolutionLabel, setEvolutionLabel] = useState('觸碰太極，觀察萬象演化');
  const [evolutionDescription, setEvolutionDescription] = useState('');
  const [mantraLevel, setMantraLevel] = useState<0 | 3 | 6 | 12 | 24>(0);
  const [touchPulse, setTouchPulse] = useState(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolutionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mantraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchTriggerRef = useRef(0);
  const audioContextsRef = useRef<Set<AudioContext>>(new Set());
  const audioTimersRef = useRef<Set<number>>(new Set());

  const closeAudioLater = (ctx: AudioContext, ms: number) => {
    if (typeof window === 'undefined') return;
    audioContextsRef.current.add(ctx);
    const timer = window.setTimeout(() => {
      audioTimersRef.current.delete(timer);
      audioContextsRef.current.delete(ctx);
      void ctx.close().catch(() => {});
    }, ms);
    audioTimersRef.current.add(timer);
  };

  const playBowlSound = (level: 1 | 2 | 3 | 4) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);

      const createOsc = (frequency: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        osc.connect(gainNode);
        return osc;
      };

      if (level === 1) {
        const osc1 = createOsc(292);
        const osc2 = createOsc(292 * 1.52);
        gainNode.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.8);
        osc1.start(); osc2.start();
        osc1.stop(ctx.currentTime + 4); osc2.stop(ctx.currentTime + 4);
        closeAudioLater(ctx, 4200);
      } else if (level === 2) {
        const osc1 = createOsc(144);
        const osc2 = createOsc(432);
        gainNode.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.6);
        osc1.start(); osc2.start();
        osc1.stop(ctx.currentTime + 4.8); osc2.stop(ctx.currentTime + 4.8);
        closeAudioLater(ctx, 5000);
      } else if (level === 3) {
        const tones = [144, 292, 528].map((frequency) => createOsc(frequency));
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.6);
        tones.forEach((osc) => {
          osc.start();
          osc.stop(ctx.currentTime + 5.8);
        });
        closeAudioLater(ctx, 6200);
      } else {
        [108, 216, 432, 528, 999].forEach((frequency, index) => {
          const osc = createOsc(frequency, index === 4 ? 'triangle' : 'sine');
          osc.start();
          osc.stop(ctx.currentTime + 7.5);
        });
        gainNode.gain.linearRampToValueAtTime(0.58, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 7.1);
        closeAudioLater(ctx, 7800);
      }

      gainNode.connect(ctx.destination);
    } catch (error) {
      console.warn('[UnifiedTaijiCore] sound skipped:', error);
    }
  };

  const playEvolutionTone = (stage: EvolutionStage) => {
    if (typeof window === 'undefined' || stage === 'idle') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const frequencies: Record<Exclude<EvolutionStage, 'idle'>, number[]> = {
        taiji: [128, 256, 384],
        liangyi: [216, 324, 432, 648],
        sixiang: [144, 288, 432, 576, 720],
        bagua: [108, 216, 324, 432, 540, 648, 756, 864, 972],
      };
      const duration = stage === 'taiji' ? 1.3 : stage === 'liangyi' ? 1.65 : stage === 'sixiang' ? 2 : 2.55;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(stage === 'bagua' ? 2600 : 1600, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(stage === 'bagua' ? 0.42 : 0.3, ctx.currentTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      frequencies[stage].forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const partialGain = ctx.createGain();
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        partialGain.gain.setValueAtTime(0, ctx.currentTime);
        partialGain.gain.linearRampToValueAtTime(1 / Math.max(2.4, frequencies[stage].length), ctx.currentTime + 0.03 + index * 0.015);
        partialGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(partialGain);
        partialGain.connect(filter);
        osc.start(ctx.currentTime + index * 0.018);
        osc.stop(ctx.currentTime + duration + 0.1);
      });

      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      closeAudioLater(ctx, Math.ceil((duration + 0.3) * 1000));
    } catch (error) {
      console.warn('[UnifiedTaijiCore] evolution tone skipped:', error);
    }
  };

  const triggerEvolution = (config: EvolutionConfig) => {
    setEvolutionStage(config.stage);
    setEvolutionLabel(config.label);
    setEvolutionDescription(config.description);
    playEvolutionTone(config.stage);

    if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
    evolutionTimerRef.current = setTimeout(() => {
      setEvolutionStage('idle');
      setEvolutionLabel('觸碰太極，觀察萬象演化');
      setEvolutionDescription('');
      evolutionTimerRef.current = null;
    }, config.durationMs + 1600);
  };

  const triggerMantra = (level: 3 | 6 | 12 | 24) => {
    setMantraLevel(level);
    if (mantraTimerRef.current) clearTimeout(mantraTimerRef.current);
    const soundLevel = level === 3 ? 1 : level === 6 ? 2 : level === 12 ? 3 : 4;
    playBowlSound(soundLevel);
    mantraTimerRef.current = setTimeout(() => {
      setMantraLevel(0);
      mantraTimerRef.current = null;
    }, level === 24 ? 7800 : level === 12 ? 6200 : level === 6 ? 5000 : 4200);
  };

  const triggerTouchFeedback = (nextTapCount: number) => {
    setTouchPulse((previous) => previous + 1);

    if (touchPulseTimerRef.current) clearTimeout(touchPulseTimerRef.current);
    touchPulseTimerRef.current = setTimeout(() => {
      setTouchPulse(0);
      touchPulseTimerRef.current = null;
    }, 620);

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (nextTapCount === 24) {
        navigator.vibrate([18, 36, 28]);
      } else if (nextTapCount === 12 || nextTapCount === 6 || nextTapCount === 3) {
        navigator.vibrate([14, 24, 14]);
      } else {
        navigator.vibrate(10);
      }
    }
  };

  const handleClick = () => {
    setTapCount((previous) => {
      const next = previous + 1;
      triggerTouchFeedback(next);

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => setTapCount(0), 8000);

      if (next === 1 || next === 2 || next === 4 || next === 8) {
        triggerEvolution(EVOLUTION_CONFIG[next]);
      }
      if (next === 3 || next === 6 || next === 12 || next === 24) {
        triggerMantra(next);
      }
      if (next >= 24) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        return 0;
      }
      return next;
    });
  };


  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    lastTouchTriggerRef.current = Date.now();
    handleClick();
  };

  const handleSafeClick = () => {
    if (Date.now() - lastTouchTriggerRef.current < 650) return;
    handleClick();
  };
  useEffect(() => () => {
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
    if (mantraTimerRef.current) clearTimeout(mantraTimerRef.current);
    if (touchPulseTimerRef.current) clearTimeout(touchPulseTimerRef.current);
    audioTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    audioContextsRef.current.forEach((context) => void context.close().catch(() => {}));
    audioTimersRef.current.clear();
    audioContextsRef.current.clear();
  }, []);

  const luckyAuraLevel =
    mantraLevel === 24 || tapCount >= 24
      ? 24
      : mantraLevel === 12 || tapCount >= 12
        ? 12
        : evolutionStage === 'bagua' || tapCount >= 8
          ? 8
          : mantraLevel === 6 || tapCount >= 6
            ? 6
            : mantraLevel === 3 || tapCount >= 3
              ? 3
              : 0;
  const luckyAuraClass = luckyAuraLevel > 0 ? `unified-taiji-shell--lucky-${luckyAuraLevel}` : '';

  return (
    <div className={`unified-taiji-shell unified-taiji-shell--${evolutionStage} ${luckyAuraClass}`.trim()} data-taiji-stage={evolutionStage} data-tap-level={luckyAuraLevel}>
      <button
        type="button"
        onPointerUp={handlePointerUp}
        onClick={handleSafeClick}
        aria-label="Taiji interaction"
        data-tap-count={tapCount}
        className={`modal-taiji-button taiji-evolution-stage stage-${evolutionStage} group ${auraClass}`}
        title="觸碰太極，觀察一、二、四、八萬象演化；連點 3/6/12/24 觸發彩蛋"
      >
        {auraLabel && (
          <>
            <div className="pointer-events-none absolute -inset-14 rounded-full border border-current opacity-20 blur-[5px] animate-[pulse_3.2s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute -inset-24 rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.14),transparent,rgba(251,191,36,0.16),transparent)] opacity-45 blur-[3px] animate-[spin_22s_linear_infinite]" />
            <span className={`pointer-events-none absolute -bottom-9 rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.2em] backdrop-blur-md ${auraBadgeClass}`}>
              {auraLabel}
            </span>
          </>
        )}
        <div className="modal-taiji-natural-bloom" aria-hidden="true" />
        <div className="modal-taiji-orbit-emblem" aria-hidden="true">
          <div className="taiji-orbit-layer modal-taiji-orbit-layer">
            <div className="taiji-light-orbit taiji-light-orbit--cyan">
              <span className="taiji-light-orbit__head" />
            </div>
            <div className="taiji-light-orbit taiji-light-orbit--violet">
              <span className="taiji-light-orbit__head" />
            </div>
            <div className="taiji-light-orbit taiji-light-orbit--gold">
              <span className="taiji-light-orbit__head" />
            </div>
            <div className="taiji-light-orbit taiji-light-orbit--emerald">
              <span className="taiji-light-orbit__head" />
            </div>
            <div className="taiji-light-orbit taiji-light-orbit--rose">
              <span className="taiji-light-orbit__head" />
            </div>
            <div className="taiji-gold-waves">
              <span className="taiji-gold-wave" />
              <span className="taiji-gold-wave" />
              <span className="taiji-gold-wave" />
            </div>
            <div className="taiji-celestial-mist">
              <span className="taiji-celestial-wisp taiji-celestial-wisp--one" />
              <span className="taiji-celestial-wisp taiji-celestial-wisp--two" />
              <span className="taiji-celestial-wisp taiji-celestial-wisp--three" />
            </div>
          </div>
          <div className={`modal-taiji-3d-core ${active || tapCount > 0 ? 'modal-taiji-3d-core--active' : ''}`}>
            <div className="modal-taiji-core-glaze" />
            <div className="modal-taiji-half modal-taiji-half--yang" />
            <div className="modal-taiji-half modal-taiji-half--yin" />
            <div className="modal-taiji-fish modal-taiji-fish--yang">
              <span />
            </div>
            <div className="modal-taiji-fish modal-taiji-fish--yin">
              <span />
            </div>
            <div className="modal-taiji-core-depth" />
          </div>
        </div>

        {evolutionStage !== 'idle' && (
          <>
            <div className="unified-evolution-screen" aria-hidden="true" />
            <div className="unified-evolution-pulse" aria-hidden="true" />
            <div className="modal-evolution-flare" aria-hidden="true" />
            <div className="modal-evolution-scan" aria-hidden="true" />
            <div className="modal-evolution-orbit modal-evolution-orbit-a" aria-hidden="true" />
            <div className="modal-evolution-orbit modal-evolution-orbit-b" aria-hidden="true" />
            <div className="modal-evolution-rays" aria-hidden="true">
              {Array.from({ length: 16 }, (_, index) => (
                <span key={index} className={`modal-energy-ray modal-energy-ray-${index}`} />
              ))}
            </div>
          </>
        )}

        {evolutionStage === 'taiji' && <div className="modal-evolution-breath" />}

        {evolutionStage === 'liangyi' && (
          <>
            <div className="unified-liangyi-split" aria-hidden="true">
              <span />
              <span />
            </div>
            <div className="modal-evolution-layer modal-liangyi-layer" aria-hidden="true">
              <span className="modal-liangyi-node modal-liangyi-yang">陽</span>
              <span className="modal-liangyi-node modal-liangyi-yin">陰</span>
            </div>
          </>
        )}

        {evolutionStage === 'sixiang' && (
          <>
            <div className="unified-sixiang-cross" aria-hidden="true">
              <span />
              <span />
            </div>
            <div className="modal-evolution-layer modal-sixiang-layer" aria-hidden="true">
              <span className="modal-sixiang-node modal-sixiang-0">少陽</span>
              <span className="modal-sixiang-node modal-sixiang-1">太陽</span>
              <span className="modal-sixiang-node modal-sixiang-2">少陰</span>
              <span className="modal-sixiang-node modal-sixiang-3">太陰</span>
            </div>
          </>
        )}

        {evolutionStage === 'bagua' && (
          <>
            <div className="unified-bagua-mandala" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => (
                <span key={index} className={`unified-bagua-line unified-bagua-line-${index}`} />
              ))}
            </div>
            <div className="modal-evolution-layer modal-bagua-layer" aria-hidden="true">
              {BAGUA_SYMBOLS.map(([name, symbol], index) => (
                <span key={name} className={`modal-bagua-node modal-bagua-${index}`}>
                  <b>{symbol}</b>
                  <small>{name}</small>
                </span>
              ))}
            </div>
          </>
        )}
        {touchPulse > 0 && <span key={touchPulse} className="taiji-touch-ripple" aria-hidden="true" />}
        <div className="modal-taiji-ground-glow" aria-hidden="true" />
      </button>

      {showLabel && (
        <p className="mt-8 min-h-[34px] text-center text-xs font-semibold tracking-[0.18em] text-cyan-100/85" aria-live="polite">
          {evolutionLabel}
          {evolutionDescription && (
            <span className="mt-1 block text-[10px] tracking-[0.14em] text-amber-200/75">
              {evolutionDescription}
            </span>
          )}
        </p>
      )}

      {mantraLevel > 0 && (
        <div className={`unified-mantra-badge unified-mantra-badge--${mantraLevel} pointer-events-none animate-fade-in`} aria-hidden="true" style={{ display: 'none' }}>
          <span className="unified-mantra-title">
            {mantraLevel === 3 ? '三響開光' : mantraLevel === 6 ? '六合共鳴' : mantraLevel === 12 ? '十二宮輪' : '二十四天門'}
          </span>
          <span className="unified-mantra-subtitle">
            TAIJI TAP {mantraLevel}
          </span>
        </div>
      )}
    </div>
  );
}
