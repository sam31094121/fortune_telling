'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import TaijiCoreVisual from '@/components/taiji/TaijiCoreVisual';
import { buildTaijiCoreSnapshot, type TaijiVisualStage } from '@/lib/taiji-core-engine';
import styles from './UnifiedTaijiCore.module.css';

const MAX_STEP = 24;

type UnifiedTaijiCoreProps = {
  /** 外部旅程傳入時，圖騰只顯示同一份 1～24 層狀態，不再自行計數。 */
  step24?: number;
  onCoreClick?: () => void;
  active?: boolean;
  auraClass?: string;
  auraBadgeClass?: string;
  auraLabel?: string;
  showLabel?: boolean;
  limitToLiangyi?: boolean;
  holdEvolutionStages?: boolean;
  adaptiveEntry?: boolean;
  cleanThreeAct?: boolean;
};

type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

const ELEMENTS: readonly {
  name: string;
  key: ElementKey;
  orbit: number;
  angle: number;
  duration: number;
  delay: number;
}[] = [
  { name: '木', key: 'wood', orbit: 1, angle: -88, duration: 24, delay: 0 },
  { name: '火', key: 'fire', orbit: 2, angle: -16, duration: 28, delay: -4.2 },
  { name: '土', key: 'earth', orbit: 3, angle: 56, duration: 32, delay: -8.4 },
  { name: '金', key: 'metal', orbit: 4, angle: 128, duration: 36, delay: -12.6 },
  { name: '水', key: 'water', orbit: 5, angle: 200, duration: 40, delay: -16.8 },
];

const BAGUA = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'] as const;

const FOUR_SYMBOLS = [
  { label: '太陽', angle: 45 },
  { label: '少陰', angle: 135 },
  { label: '太陰', angle: 225 },
  { label: '少陽', angle: 315 },
] as const;

function getStage(step: number): { label: string; visualStage: TaijiVisualStage } {
  if (step <= 1) return { label: '太極', visualStage: 'taiji' };
  if (step <= 3) return { label: '兩儀', visualStage: 'liangyi' };
  if (step <= 7) return { label: '四象', visualStage: 'sixiang' };
  if (step <= 23) return { label: '八卦演化', visualStage: 'bagua' };
  return { label: '天地共鳴', visualStage: 'bagua' };
}

function clampStep(step: number) {
  return Math.max(1, Math.min(MAX_STEP, step));
}

export default function UnifiedTaijiCore({
  step24,
  onCoreClick,
  active = false,
  auraClass = '',
  auraBadgeClass = '',
  auraLabel = '',
  showLabel = false,
  limitToLiangyi = false,
}: UnifiedTaijiCoreProps) {
  const [step, setStep] = useState(0);
  const [pulseId, setPulseId] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const touchRef = useRef(0);

  const controlledStep = typeof step24 === 'number' ? clampStep(step24 || 1) : null;
  const currentStep = controlledStep ?? clampStep(step || 1);
  const cappedStep = limitToLiangyi ? Math.min(currentStep, 2) : currentStep;
  const stage = getStage(cappedStep);
  const progress = useMemo(() => cappedStep / MAX_STEP, [cappedStep]);
  const coreSnapshot = buildTaijiCoreSnapshot(stage.visualStage);
  const shellStyle = {
    '--taiji-step': cappedStep,
    '--taiji-progress': progress,
  } as CSSProperties;

  const createAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  };

  const playFinalUnlock = (ctx: AudioContext, startTime: number) => {
    [220, 277.18, 329.63, 440, 554.37].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const t = startTime + index * 0.075;

      osc.type = index === 4 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(frequency, t);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600 + index * 180, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(index === 4 ? 0.09 : 0.12, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.82);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  };

  const playInteractiveSound = (index: number) => {
    try {
      const ctx = createAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const normalized = (index - 1) / (MAX_STEP - 1);
      const duration = 0.72 - normalized * 0.48;
      const attack = 0.012;
      const release = Math.max(0.09, duration * 0.7);
      const frequency = 118 + normalized * 105;

      const oscillator = ctx.createOscillator();
      const subOscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const subGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const delay = ctx.createDelay(1);
      const feedback = ctx.createGain();
      const master = ctx.createGain();

      oscillator.type = 'sine';
      subOscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.035, now + duration);
      subOscillator.frequency.setValueAtTime(frequency / 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1350 + normalized * 1000, now);
      filter.Q.setValueAtTime(1.1, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.24, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);

      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.exponentialRampToValueAtTime(0.11, now + attack);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.12, duration * 0.55));

      delay.delayTime.setValueAtTime(Math.max(0.055, 0.13 - normalized * 0.065), now);
      feedback.gain.setValueAtTime(Math.max(0.08, 0.19 - normalized * 0.08), now);
      master.gain.setValueAtTime(0.75, now);

      oscillator.connect(gain);
      subOscillator.connect(subGain);
      gain.connect(filter);
      subGain.connect(filter);
      filter.connect(master);
      filter.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(master);
      master.connect(ctx.destination);

      oscillator.start(now);
      subOscillator.start(now);
      oscillator.stop(now + duration + 0.18);
      subOscillator.stop(now + duration + 0.18);

      if (index === MAX_STEP) playFinalUnlock(ctx, now + 0.08);
    } catch (error) {
      console.warn('[UnifiedTaijiCore] interactive sound skipped:', error);
    }
  };

  const handleTaijiClick = () => {
    if (controlledStep !== null) {
      onCoreClick?.();
      return;
    }
    const next = limitToLiangyi ? (step >= 2 ? 1 : step + 1) : (step >= MAX_STEP ? 1 : step + 1);
    setStep(next);
    setPulseId((value) => value + 1);
    playInteractiveSound(next);

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(next === MAX_STEP ? [18, 36, 28] : 10);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    touchRef.current = Date.now();
    handleTaijiClick();
  };

  const handleSafeClick = () => {
    if (Date.now() - touchRef.current < 650) return;
    handleTaijiClick();
  };

  useEffect(() => () => {
    if (audioContextRef.current) void audioContextRef.current.close().catch(() => {});
  }, []);

  return (
    <section
      className={[
        styles.scene,
        styles[`stage${cappedStep}`],
        cappedStep >= 2 ? styles.liangyiOn : '',
        cappedStep >= 4 ? styles.sixiangOn : '',
        cappedStep >= 8 ? styles.baguaOn : '',
        cappedStep === MAX_STEP ? styles.finalOn : '',
        active ? styles.active : '',
        auraClass,
      ].filter(Boolean).join(' ')}
      style={shellStyle}
      data-taiji-engine={coreSnapshot.engine}
      data-taiji-version="taiji_five_layer_core_v1"
      data-taiji-store={coreSnapshot.store}
      data-taiji-event={coreSnapshot.event}
      data-taiji-stage={stage.visualStage}
      data-taiji-layer-one="taiji-core"
      data-taiji-layer-two="five-elements"
      data-taiji-layer-three="space-light-field"
      data-taiji-layer-four="24-step-interaction"
      data-taiji-layer-five="24-step-sound"
      data-taiji-step={cappedStep}
      data-taiji-progress={progress.toFixed(3)}
    >
      <div className={styles.spaceField} aria-hidden="true">
        <span className={styles.sunField} />
        <span className={styles.depthOne} />
        <span className={styles.depthTwo} />
        <span className={styles.particles} />
      </div>

      <div className={styles.universe}>
        <div className={styles.elementSystem} aria-hidden="true">
          {ELEMENTS.map((element) => (
            <span
              key={element.key}
              className={`${styles.elementOrbit} ${styles[`orbit${element.orbit}`]}`}
              style={{
                '--element-angle': `${element.angle}deg`,
                '--element-counter-angle': `${-element.angle}deg`,
                '--element-duration': `${element.duration}s`,
                '--element-delay': `${element.delay}s`,
              } as CSSProperties}
            >
              <span className={`${styles.elementPlanet} ${styles[element.key]}`}>
                <span>{element.name}</span>
              </span>
            </span>
          ))}
        </div>

        <div className={styles.fourSymbolRing} aria-hidden="true">
          {FOUR_SYMBOLS.map((symbol) => (
            <span
              key={symbol.label}
              style={{
                '--ring-angle': `${symbol.angle}deg`,
                '--ring-counter-angle': `${-symbol.angle}deg`,
              } as CSSProperties}
            >
              {symbol.label}
            </span>
          ))}
        </div>

        <div className={styles.baguaRing} aria-hidden="true">
          {BAGUA.map((gua, index) => (
            <span
              key={gua}
              style={{
                '--ring-angle': `${index * 45}deg`,
                '--ring-counter-angle': `${-index * 45}deg`,
              } as CSSProperties}
            >
              {gua}
            </span>
          ))}
        </div>

        <button
          type="button"
          className={styles.taijiButton}
          onPointerUp={handlePointerUp}
          onClick={handleSafeClick}
          aria-label={`太極互動，目前第 ${cappedStep} 次，共 24 次`}
        >
          <span className={styles.taijiHalo} aria-hidden="true" />
          <span className={styles.coreShell} aria-hidden="true">
            <TaijiCoreVisual
              active={active || cappedStep > 1}
              stage="taiji"
              highlightElement={null}
              className={styles.coreVisual}
            />
          </span>
          {pulseId > 0 && <span key={pulseId} className={styles.touchRipple} aria-hidden="true" />}
          {cappedStep === MAX_STEP && <span className={styles.finalUnlock} aria-hidden="true" />}
        </button>
      </div>

      {showLabel && (
        <p className={styles.caption} aria-live="polite">
          <span>{stage.label}</span>
          {auraLabel && <small className={auraBadgeClass}>{auraLabel}</small>}
        </p>
      )}
    </section>
  );
}
