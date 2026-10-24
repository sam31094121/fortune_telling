'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
export const DROP_CUE_MS = 300;
export const DROP_FLIGHT_MS = 850;
export const DROP_HOLD_MS = 350;
const LAND = DROP_CUE_MS + DROP_FLIGHT_MS;
const END = LAND + DROP_HOLD_MS;

export function useDropPlayback(total: number, enabled = true) {
  const [state, setState] = useState({ step: 0, landed: false, run: 0 });
  const [mode, setModeState] = useState<'auto' | 'manual'>('auto');
  const [paused, setPaused] = useState(false);
  const [animateFinish, setAnimateFinish] = useState(false);
  const [manualRunning, setManualRunning] = useState(false);
  const clock = useRef({ key: '', elapsed: 0 });
  const setStep = useCallback((step: number) => {
    setState((s) => ({ step, landed: false, run: s.run + 1 }));
    setPaused(false); setManualRunning(false); setAnimateFinish(false);
  }, []);
  const setMode = (value: 'auto' | 'manual') => {
    setModeState(value); setPaused(false); setManualRunning(false);
    // Switching to step mode stops before the current unlanded step.
    if (value === 'manual') setState((s) => s.step < total ? { ...s, run: s.run + 1 } : s);
  };
  const next = () => {
    if (state.step >= total || manualRunning) return;
    setState((s) => ({ step: s.landed ? s.step + 1 : s.step, landed: false, run: s.run + 1 }));
    setPaused(false); setManualRunning(true);
  };
  const active = mode === 'auto' || manualRunning;
  const playing = enabled && !paused && active && state.step < total;
  useEffect(() => {
    const key = state.step + ':' + state.run;
    if (clock.current.key !== key) clock.current = { key, elapsed: 0 };
    if (!playing) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let landing: ReturnType<typeof setTimeout> | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const completeStep = () => {
      if (state.step + 1 >= total) setAnimateFinish(true);
      if (mode === 'auto' || state.step + 1 >= total) {
        setState((s) => ({ ...s, step: Math.min(total, s.step + 1), landed: false }));
      } else setState((s) => ({ ...s, landed: true }));
      setManualRunning(false);
    };
    const reduce = () => {
      if (!motion.matches) return;
      clearTimeout(landing); clearTimeout(finishTimer);
      if (mode === 'auto') setStep(total);
      else completeStep();
    };
    if (motion.matches) { reduce(); return; }
    if (!state.landed) landing = setTimeout(() => setState((s) => ({ ...s, landed: true })), Math.max(0, LAND - clock.current.elapsed));
    finishTimer = setTimeout(completeStep, Math.max(0, END - clock.current.elapsed));
    motion.addEventListener('change', reduce);
    return () => {
      clock.current.elapsed += Date.now() - started;
      clearTimeout(landing); clearTimeout(finishTimer);
      motion.removeEventListener('change', reduce);
    };
  }, [playing, mode, total, state.step, state.run, setStep]);
  return { ...state, animateFinish, setStep, mode, setMode, paused, setPaused, next, manualRunning,
    shown: Math.min(total, state.step + Number(state.landed)), playing,
    flightVisible: active && state.step < total,
  };
}
