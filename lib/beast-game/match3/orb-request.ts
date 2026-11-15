/** Retry only the identical command. The shared server deduplicates by version + controls. */
export async function postOrbTurn(body: string, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch('/api/beast-game/orb-turn', { method: 'POST', headers, body, signal });
      if (response.status >= 500 && attempt === 0 && !signal.aborted) continue;
      return response;
    } catch (error) {
      if (signal.aborted || attempt > 0) throw error;
    }
  }
}
