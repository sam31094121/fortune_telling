import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

export function createRequestId() {
  return randomUUID();
}

export function hashedCacheKey(parts: Array<string | number | null | undefined>) {
  return createHash('sha256')
    .update(parts.map((part) => String(part ?? '')).join('|'))
    .digest('hex');
}

export function friendlyErrorResponse(
  requestId: string,
  code: string,
  message: string,
  status: number,
  /** 額外標頭，例如 429 要帶的 Retry-After。省略時行為與原本完全相同。 */
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(
    {
      ok: false,
      requestId,
      code,
      error: message,
      message,
    },
    {
      status,
      headers: { 'Cache-Control': 'no-store', ...extraHeaders },
    },
  );
}
