'use client';
import { useEffect } from 'react';
import { recordOrbDiagnostic, setOrbDiagnosticPhase, type OrbPhase } from '@/lib/beast-game/match3/orb-diagnostics';

export function useOrbDiagnostics(phase: OrbPhase, busy: boolean): void {
  useEffect(() => { setOrbDiagnosticPhase(phase, busy); }, [phase, busy]);
  useEffect(() => {
    const changed = () => recordOrbDiagnostic('visibility');
    document.addEventListener('visibilitychange', changed);
    return () => { document.removeEventListener('visibilitychange', changed); recordOrbDiagnostic('leave'); };
  }, []);
  useEffect(() => {
    if (!busy) return;
    // Observation only: never unlock, retry, settle or alter animation timelines.
    const started = performance.now();
    const timer = window.setTimeout(() => recordOrbDiagnostic('slow', performance.now() - started), 30000);
    return () => window.clearTimeout(timer);
  }, [busy]);
}
