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

/** 伺服器明確回報「本回合未套用、戰局狀態沒變」的拒絕：前端就地還原即可，不必重讀存檔重掛整局。 */
const IN_PLACE_REJECTIONS = new Set(['ORB_TOO_LARGE', 'ORB_BAD_JSON', 'ORB_BAD_FIELDS', 'ORB_BAD_BOARD', 'ORB_BAD_MAGIC', 'ORB_BAD_PATH', 'ORB_BAD_UNITS', 'ORB_BAD_STATE', 'ORB_BAD_TREASURES', 'ORB_BAD_ACTION', 'ORB_TARGET_UNAVAILABLE']);
/** 網路中斷／逾時／5xx／版本或憑證問題（結果不明或本機落後）才需要重新讀取已保存的戰局。 */
export function orbTurnNeedsResync(error: unknown): boolean {
  const failure = error as { status?: unknown; orbCode?: unknown } | null;
  if (!failure || typeof failure.status !== 'number' || failure.status >= 500) return true;
  if (failure.status === 413) return false;
  return !(typeof failure.orbCode === 'string' && IN_PLACE_REJECTIONS.has(failure.orbCode));
}
