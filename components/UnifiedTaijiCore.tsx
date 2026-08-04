'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import TaijiCoreVisual from '@/components/taiji/TaijiCoreVisual';
import { decideTaijiEntryStage } from '@/lib/taiji-adaptive-stage';
import {
  TAIJI_CINEMA_SEGMENT_COUNT,
  TAIJI_CINEMA_SEGMENT_DURATION_MS,
  TAIJI_CORE_CONFIG,
  buildTaijiCoreSnapshot,
  getTaijiCinemaSegmentForTap,
  getTaijiCoreConfigForTap,
  getTaijiLuckyAuraLevel,
  getTaijiTapTone,
  type TaijiCinemaSegment,
  type TaijiCoreConfig,
  type TaijiVisualStage,
} from '@/lib/taiji-core-engine';

type EvolutionStage = TaijiVisualStage;
type UnifiedTaijiCoreProps = {
  active?: boolean;
  auraClass?: string;
  auraBadgeClass?: string;
  auraLabel?: string;
  showLabel?: boolean;
  limitToLiangyi?: boolean;
  holdEvolutionStages?: boolean;
  adaptiveEntry?: boolean;
};

type TaijiCinemaStyle = CSSProperties & {
  '--taiji-segment-hue': string;
  '--taiji-segment-rotation': string;
  '--taiji-segment-scale': string;
  '--taiji-segment-glow': string;
};

const FIVE_STAR_KEYS = ['space', 'fire', 'air', 'water', 'earth'] as const;

export default function UnifiedTaijiCore({
  active = false,
  auraClass = '',
  auraBadgeClass = '',
  auraLabel = '',
  showLabel = false,
  limitToLiangyi = false,
  holdEvolutionStages = false,
  adaptiveEntry = false,
}: UnifiedTaijiCoreProps) {
  const [tapCount, setTapCount] = useState(0);
  const [evolutionStage, setEvolutionStage] = useState<EvolutionStage>('idle');
  const [evolutionLabel, setEvolutionLabel] = useState('AI 導演待命｜點擊太極開演');
  const [evolutionDescription, setEvolutionDescription] = useState('');
  const [cinemaSegment, setCinemaSegment] = useState<TaijiCinemaSegment | null>(null);
  const [cinemaLocked, setCinemaLocked] = useState(false);
  const [liangyiReturning, setLiangyiReturning] = useState(false);
  const [liangyiSettled, setLiangyiSettled] = useState(false);
  const [liangyiSpinLevel, setLiangyiSpinLevel] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [mantraLevel, setMantraLevel] = useState<0 | 3 | 6 | 12 | 24>(0);
  const [touchPulse, setTouchPulse] = useState(0);
  const [highlightElement, setHighlightElement] = useState<'EARTH' | 'WATER' | 'FIRE' | 'AIR' | 'SPACE' | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolutionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cinemaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recenterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liangyiReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liangyiSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mantraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchTriggerRef = useRef(0);
  const cinemaLockedRef = useRef(false);
  const liangyiSpinClickLockRef = useRef(0);
  const audioContextsRef = useRef<Set<AudioContext>>(new Set());
  const audioTimersRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!adaptiveEntry) return;
    const decision = decideTaijiEntryStage();
    setHighlightElement(decision.highlightElement);
    if (decision.stage === 'idle') return;
    const stageConfig = Object.values(TAIJI_CORE_CONFIG).find((config) => config.stage === decision.stage);
    setEvolutionStage(decision.stage as EvolutionStage);
    setEvolutionLabel(stageConfig?.label ?? 'AI 導演已接管太極核心');
    setEvolutionDescription(decision.reason);
    if (decision.stage === 'liangyi') setLiangyiSettled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adaptiveEntry]);

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

  const isTaijiLiteFeedbackDevice = () => {
    if (typeof document === 'undefined') return false;
    const body = document.body;
    return body.classList.contains('app-lite-effects')
      || body.classList.contains('app-low-power-device')
      || body.classList.contains('app-social-browser')
      || body.classList.contains('app-reduced-motion')
      || body.classList.contains('app-touching')
      || body.classList.contains('app-stress-mode');
  };

  const createAudioContext = (respectLiteMode = true) => {
    if (typeof window === 'undefined' || (respectLiteMode && isTaijiLiteFeedbackDevice())) return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass() as AudioContext;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const playTouchTone = (nextTapCount: number) => {
    try {
      // Every tap must produce its Hz tone -- audio playback itself is cheap (no
      // rendering/GPU cost), unlike the visual lite-effects this gate was built for,
      // so this specific tone bypasses the low-power/reduced-motion skip.
      const ctx = createAudioContext(false);
      if (!ctx) return;
      const now = ctx.currentTime;
      const { frequency, pulseHz } = getTaijiTapTone(nextTapCount);
      const duration = 0.62;

      // Loud, immediate "wake-up hit": gain is pushed to the ceiling and everything
      // routes through a limiter so it can go loud without ugly digital clipping.
      // The Hz sequence itself (pitch, isochronic pulse) is untouched -- only
      // volume/attack changed, per explicit request: keep the frequency character
      // light, but make the hit strong enough to actually be felt.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-6, now);
      limiter.knee.setValueAtTime(2, now);
      limiter.ratio.setValueAtTime(14, now);
      limiter.attack.setValueAtTime(0.001, now);
      limiter.release.setValueAtTime(0.15, now);
      limiter.connect(ctx.destination);

      // Percussive transient: a very short filtered noise burst at the instant of
      // contact. A pure sine fading in, however loud, still reads as "soft" --
      // this sharp attack-only click is what makes a tone register as an
      // immediate strike instead of a swell.
      const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.05), ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i += 1) {
        noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(Math.max(600, frequency * 2), now);
      noiseFilter.Q.setValueAtTime(1.1, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.9, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(limiter);
      noiseSource.start(now);
      noiseSource.stop(now + 0.06);

      // Carrier tone: this tap's step in the 24-step Solfeggio-anchored ascending
      // sequence (see TAIJI_TAP_FREQUENCIES_HZ). Kept a pure sine -- the pitch
      // stays clean even though the overall hit is loud.
      const gainNode = ctx.createGain();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.06, now + 0.16);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.95, now + 0.006);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Isochronic pulse: amplitude-modulate the carrier at a brainwave-range rate
      // (theta -> alpha -> low-beta across the 24 taps, see TAIJI_TAP_PULSE_HZ).
      // This is what actually gives a tone "brainwave entrainment" character --
      // a single static tone alone doesn't.
      const pulseOsc = ctx.createOscillator();
      const pulseDepth = ctx.createGain();
      pulseOsc.type = 'sine';
      pulseOsc.frequency.setValueAtTime(pulseHz, now);
      pulseDepth.gain.setValueAtTime(0.055, now);
      pulseOsc.connect(pulseDepth);
      pulseDepth.connect(gainNode.gain);

      osc.connect(gainNode);
      gainNode.connect(limiter);
      osc.start(now);
      osc.stop(now + duration + 0.05);
      pulseOsc.start(now);
      pulseOsc.stop(now + duration + 0.05);
      closeAudioLater(ctx, Math.ceil((duration + 0.3) * 1000));
    } catch (error) {
      console.warn('[UnifiedTaijiCore] touch tone skipped:', error);
    }
  };

  const playBowlSound = (level: 1 | 2 | 3 | 4) => {
    if (typeof window === 'undefined') return;
    try {
      const ctx = createAudioContext();
      if (!ctx) return;
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
      const ctx = createAudioContext();
      if (!ctx) return;
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

  const resetCinemaAfterPlayback = (resetTapCount = true, forceIdle = false) => {
    if (!forceIdle && (holdEvolutionStages || (limitToLiangyi && evolutionStage === 'liangyi'))) {
      setEvolutionDescription('');
      if (resetTapCount) setTapCount(0);
      setCinemaSegment(null);
      setCinemaLocked(false);
      cinemaLockedRef.current = false;
      return;
    }
    if (liangyiSettleTimerRef.current) clearTimeout(liangyiSettleTimerRef.current);
    setLiangyiSettled(false);
    setLiangyiSpinLevel(0);
    setEvolutionStage('idle');
    setEvolutionLabel('AI 導演待命｜點擊太極開演');
    setEvolutionDescription('');
    setCinemaSegment(null);
    setCinemaLocked(false);
    cinemaLockedRef.current = false;
    if (resetTapCount) setTapCount(0);
  };

  const enterEvolutionStage = (config: TaijiCoreConfig) => {
    if (liangyiReturnTimerRef.current) clearTimeout(liangyiReturnTimerRef.current);
    if (liangyiSettleTimerRef.current) clearTimeout(liangyiSettleTimerRef.current);
    setLiangyiReturning(false);
    setLiangyiSettled(false);
    setLiangyiSpinLevel(config.stage === 'liangyi' ? 1 : 0);
    setEvolutionStage(config.stage);
    setEvolutionLabel(config.label);
    setEvolutionDescription(config.description);
    playEvolutionTone(config.stage);

    if (config.stage === 'liangyi') {
      liangyiSettleTimerRef.current = setTimeout(() => {
        setLiangyiSettled(true);
        liangyiSettleTimerRef.current = null;
      }, 1720);
    }

    if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
    evolutionTimerRef.current = setTimeout(() => {
      resetCinemaAfterPlayback(false);
      evolutionTimerRef.current = null;
    }, config.durationMs);
  };

  const triggerEvolution = (config: TaijiCoreConfig) => {
    if (recenterTimerRef.current) clearTimeout(recenterTimerRef.current);
    if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
    if (cinemaTimerRef.current) clearTimeout(cinemaTimerRef.current);
    if (liangyiReturnTimerRef.current) clearTimeout(liangyiReturnTimerRef.current);
    if (liangyiSettleTimerRef.current) clearTimeout(liangyiSettleTimerRef.current);

    setLiangyiReturning(false);
    setLiangyiSettled(false);
    setLiangyiSpinLevel(0);
    setCinemaSegment(null);
    setCinemaLocked(false);
    cinemaLockedRef.current = false;

    if (config.stage === 'taiji') {
      enterEvolutionStage(config);
      return;
    }

    setEvolutionStage('taiji');
    setEvolutionLabel(config.label);
    setEvolutionDescription('太極核心先歸中，再自然展開下一層。');

    recenterTimerRef.current = setTimeout(() => {
      recenterTimerRef.current = null;
      enterEvolutionStage(config);
    }, 260);
  };

  const triggerCinemaSegment = (segment: TaijiCinemaSegment) => {
    if (recenterTimerRef.current) clearTimeout(recenterTimerRef.current);
    if (evolutionTimerRef.current) clearTimeout(evolutionTimerRef.current);
    if (cinemaTimerRef.current) clearTimeout(cinemaTimerRef.current);
    if (liangyiReturnTimerRef.current) clearTimeout(liangyiReturnTimerRef.current);
    if (liangyiSettleTimerRef.current) clearTimeout(liangyiSettleTimerRef.current);

    cinemaLockedRef.current = true;
    setCinemaLocked(true);
    setCinemaSegment(segment);
    setLiangyiReturning(false);
    setLiangyiSettled(false);
    setLiangyiSpinLevel(segment.stage === 'liangyi' ? Math.min(5, Math.max(1, Math.ceil(segment.tap / 5))) as 1 | 2 | 3 | 4 | 5 : 0);
    setEvolutionStage(segment.stage);
    setEvolutionLabel(segment.label);
    setEvolutionDescription(segment.description);
    playEvolutionTone(segment.stage);

    if (segment.stage === 'liangyi') {
      liangyiSettleTimerRef.current = setTimeout(() => {
        setLiangyiSettled(true);
        liangyiSettleTimerRef.current = null;
      }, 1720);
    }

    cinemaTimerRef.current = setTimeout(() => {
      const shouldReturnToIdle = segment.tap >= TAIJI_CINEMA_SEGMENT_COUNT;
      resetCinemaAfterPlayback(shouldReturnToIdle, shouldReturnToIdle);
      cinemaTimerRef.current = null;
    }, TAIJI_CINEMA_SEGMENT_DURATION_MS);
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
    playTouchTone(nextTapCount);
    setTouchPulse((previous) => previous + 1);

    if (touchPulseTimerRef.current) clearTimeout(touchPulseTimerRef.current);
    touchPulseTimerRef.current = setTimeout(() => {
      setTouchPulse(0);
      touchPulseTimerRef.current = null;
    }, 620);

    if (!isTaijiLiteFeedbackDevice() && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
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
    if (cinemaLockedRef.current) return;
    setTapCount((previous) => {
      if (limitToLiangyi && previous >= 2) {
        triggerTouchFeedback(previous + 1);
        setEvolutionStage('liangyi');
        setLiangyiReturning(false);
        setLiangyiSettled(true);
        const now = Date.now();
        if (now - liangyiSpinClickLockRef.current > 320) {
          liangyiSpinClickLockRef.current = now;
          setLiangyiSpinLevel((level) => Math.min(5, Math.max(1, level) + 1) as 1 | 2 | 3 | 4 | 5);
        }
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => setTapCount(0), TAIJI_CINEMA_SEGMENT_DURATION_MS);
        return previous;
      }

      const next = !limitToLiangyi && previous >= TAIJI_CINEMA_SEGMENT_COUNT ? 1 : previous + 1;
      triggerTouchFeedback(next);

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

      const cinemaConfig = getTaijiCinemaSegmentForTap(next);
      triggerCinemaSegment(cinemaConfig);

      if (!limitToLiangyi && (next === 3 || next === 6 || next === 12 || next === 24)) {
        triggerMantra(next);
      }
      if (limitToLiangyi) {
        const stageConfig = getTaijiCoreConfigForTap(next, limitToLiangyi);
        if (stageConfig) triggerEvolution(stageConfig);
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
    if (cinemaTimerRef.current) clearTimeout(cinemaTimerRef.current);
    if (recenterTimerRef.current) clearTimeout(recenterTimerRef.current);
    if (liangyiReturnTimerRef.current) clearTimeout(liangyiReturnTimerRef.current);
    if (liangyiSettleTimerRef.current) clearTimeout(liangyiSettleTimerRef.current);
    if (mantraTimerRef.current) clearTimeout(mantraTimerRef.current);
    if (touchPulseTimerRef.current) clearTimeout(touchPulseTimerRef.current);
    audioTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    audioContextsRef.current.forEach((context) => void context.close().catch(() => {}));
    audioTimersRef.current.clear();
    audioContextsRef.current.clear();
  }, []);

  const luckyAuraLevel = getTaijiLuckyAuraLevel({ mantraLevel, tapCount, stage: evolutionStage });
  const coreSnapshot = buildTaijiCoreSnapshot(evolutionStage);
  const luckyAuraClass = luckyAuraLevel > 0 ? `unified-taiji-shell--lucky-${luckyAuraLevel}` : '';
  const liangyiReturnClass = liangyiReturning ? 'unified-taiji-shell--liangyi-return' : '';
  const liangyiSettledClass = liangyiSettled ? 'unified-taiji-shell--liangyi-settled' : '';
  const liangyiSpinClass = liangyiSpinLevel > 0 ? `unified-taiji-shell--liangyi-spin-${liangyiSpinLevel}` : '';
  const taijiLayer = cinemaSegment?.layer ?? (evolutionStage === 'bagua'
    ? '3-space-glow'
    : evolutionStage === 'sixiang'
      ? '3-space-glow'
      : evolutionStage === 'liangyi'
        ? '2-five-star-orbit'
        : evolutionStage === 'taiji'
          ? '1-taiji-core'
          : '0-idle');
  const cinemaStyle: TaijiCinemaStyle = {
    '--taiji-segment-hue': `${cinemaSegment?.hue ?? 42}deg`,
    '--taiji-segment-rotation': `${cinemaSegment?.rotationDeg ?? 0}deg`,
    '--taiji-segment-scale': `${cinemaSegment?.scale ?? 1}`,
    '--taiji-segment-glow': `${cinemaSegment?.glow ?? 0.72}`,
  };

  return (
    <div
      className={`unified-taiji-shell unified-taiji-shell--${evolutionStage} ${luckyAuraClass} ${liangyiReturnClass} ${liangyiSettledClass} ${liangyiSpinClass}`.trim()}
      style={cinemaStyle}
      data-taiji-engine={coreSnapshot.engine}
      data-taiji-version={coreSnapshot.version}
      data-taiji-store={coreSnapshot.store}
      data-taiji-event={coreSnapshot.event}
      data-taiji-stage={evolutionStage}
      data-taiji-layer={taijiLayer}
      data-taiji-layer-one="taiji-core"
      data-taiji-layer-two="five-star-365-orbit"
      data-taiji-layer-three="space-glow-field"
      data-taiji-material="wikimedia-commons-esoteric-taijitu-public-domain"
      data-cinema-playing={cinemaSegment ? 'true' : 'false'}
      data-cinema-locked={cinemaLocked ? 'true' : 'false'}
      data-cinema-segment={cinemaSegment?.tap ?? 0}
      data-cinema-phase={cinemaSegment?.phase ?? 'idle'}
      data-cinema-duration-ms={TAIJI_CINEMA_SEGMENT_DURATION_MS}
      data-tap-level={luckyAuraLevel}
    >
      <button
        type="button"
        onPointerUp={handlePointerUp}
        onClick={handleSafeClick}
        aria-label="AI導演太極互動劇場"
        aria-busy={cinemaLocked}
        disabled={cinemaLocked}
        data-tap-count={tapCount}
        data-cinema-segment={cinemaSegment?.tap ?? 0}
        data-cinema-locked={cinemaLocked ? 'true' : 'false'}
        className={`modal-taiji-button taiji-evolution-stage stage-${evolutionStage} group ${auraClass}`}
        title="點擊太極推進 24 段影片；每段 6 秒，太極分兩儀、兩儀分四象、四象分八卦。"
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
        <div className="taiji-cinema-space-field" aria-hidden="true" />

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
            <div className="taiji-second-space-plane" aria-hidden="true" />
            <div className="taiji-cinema-star-field" aria-hidden="true">
              {FIVE_STAR_KEYS.map((key, index) => (
                <span key={key} className={`taiji-cinema-star taiji-cinema-star-${index}`} data-element={key}>
                  <span className="taiji-cinema-star-core" />
                </span>
              ))}
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
            <div className="taiji-premium-depth-disc" />
            <div className="taiji-premium-energy-grid" />
            <TaijiCoreVisual active={active || tapCount > 0} stage={evolutionStage} highlightElement={highlightElement} className="taiji-core-symbol-overlay" />
            <div className="taiji-premium-core-lens">
              <img
                className="taiji-licensed-core-asset"
                src="/assets/taiji/esoteric-taijitu-public-domain.svg"
                alt=""
                aria-hidden="true"
                draggable={false}
              />
              <span className="taiji-premium-core-glint" />
            </div>
            <div className="taiji-premium-segment-ticks" aria-hidden="true">
              {Array.from({ length: 24 }, (_, index) => (
                <span key={index} className={`taiji-premium-segment-tick taiji-premium-segment-tick-${index}`} />
              ))}
            </div>
            <div className="taiji-premium-orbital-rim" />
            <div className="modal-taiji-core-glaze" />
            <div className="modal-taiji-core-depth" />
          </div>
        </div>

        {(evolutionStage === 'sixiang' || evolutionStage === 'bagua') && (
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
          <div className="unified-liangyi-split" aria-hidden="true">
            <span />
            <span />
          </div>
        )}

        {evolutionStage === 'sixiang' && (
          <div className="unified-sixiang-cross" aria-hidden="true">
            <span />
            <span />
          </div>
        )}

        {evolutionStage === 'bagua' && (
          <div className="unified-bagua-mandala" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} className={`unified-bagua-line unified-bagua-line-${index}`} />
            ))}
          </div>
        )}
        {touchPulse > 0 && <span key={touchPulse} className="taiji-touch-ripple" aria-hidden="true" />}
        <div className="modal-taiji-ground-glow" aria-hidden="true" />
      </button>

      {showLabel && (
        <p className="taiji-director-caption" aria-live="polite">
          {evolutionLabel}
          {evolutionDescription && (
            <span className="taiji-director-caption__sub">
              {evolutionDescription}
            </span>
          )}
        </p>
      )}

      {mantraLevel > 0 && (
        <div className={`unified-mantra-badge unified-mantra-badge--${mantraLevel} pointer-events-none animate-fade-in`} aria-hidden="true" style={{ display: 'none' }}>
          <span className="unified-mantra-title">
            {mantraLevel === 3 ? '三才開聲' : mantraLevel === 6 ? '六律巡光' : mantraLevel === 12 ? '十二息成圓' : '二十四段回歸'}
          </span>
          <span className="unified-mantra-subtitle">
            TAIJI TAP {mantraLevel}
          </span>
        </div>
      )}
    </div>
  );
}