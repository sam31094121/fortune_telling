/** Bounded retry for the read-only card catalog. Never retries a deal, stake or inventory write. */
export async function readBeastCatalog<T>(signal: AbortSignal, timeoutMs = 12000): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let retryable = true;
    try {
      signal.throwIfAborted();
      const response = await fetch('/api/beast-game', { signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) });
      if (!response.ok) {
        retryable = response.status >= 500;
        throw new Error('卡池連線失敗');
      }
      return await response.json() as T;
    } catch (error) {
      if (signal.aborted || !retryable || attempt === 1) throw error;
    }
  }
  throw new Error('卡池暫時無法載入');
}
