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
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
