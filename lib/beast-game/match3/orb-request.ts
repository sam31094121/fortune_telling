import { recordOrbDiagnostic } from './orb-diagnostics';
/** Retry only the identical command. The shared server deduplicates by version + controls. */
export async function postOrbTurn(body: string, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const started = performance.now();
    try {
      const response = await fetch('/api/beast-game/orb-turn', { method: 'POST', headers, body, signal });
      recordOrbDiagnostic('response', performance.now() - started, response.status);
      if (response.status >= 500 && attempt === 0 && !signal.aborted) continue;
      return response;
    } catch (error) {
      recordOrbDiagnostic(signal.aborted ? 'aborted' : 'network-error', performance.now() - started);
      if (signal.aborted || attempt > 0) throw error;
    }
  }
}
