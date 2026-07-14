const RETRYABLE_STATUS = new Set([502, 503, 504]);

export type SafeFetchResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

export type SafeFetchOptions = Omit<RequestInit, 'signal'> & {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
};

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function safeJsonFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult<T>> {
  const { timeoutMs = 12_000, retries = 2, signal, ...fetchOptions } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const requestController = new AbortController();
    const timeoutId = window.setTimeout(() => requestController.abort(), timeoutMs);
    const abortRequest = () => requestController.abort();
    if (signal?.aborted) {
      requestController.abort();
    }
    signal?.addEventListener('abort', abortRequest, { once: true });

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: requestController.signal,
      });

      const data = await response.json().catch(() => null) as T;
      if (response.ok || !RETRYABLE_STATUS.has(response.status)) {
        return { ok: response.ok, status: response.status, data };
      }

      lastError = new Error(`HTTP_${response.status}`);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abortRequest);
    }

    if (attempt < retries) {
      await wait(500 * 2 ** attempt);
    }
  }

  throw lastError;
}
