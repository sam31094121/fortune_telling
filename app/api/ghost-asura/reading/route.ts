/**
 * 鬼魅阿修羅 — 後端解盤端點（POST /api/ghost-asura/reading）
 *
 * 輸入：與 /ghost-asura 頁相同的生辰欄位（birthDate, birthTime, gender, birthHourBranch?, name?）。
 * 輸出：{ data: AsuraDisplay } —— 只有已分組／篩選／排序的可顯示文字，不含四柱干支或任何原始命理資料。
 *
 * 速率限制沿用 lib/dual-chart-auth 的 checkAPIRateLimit（設定未改）。
 * 同一 IP 重送「相同生辰」時直接回短期快取，不重算、不扣額度（同 IP 友善）。
 */

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkAPIRateLimit, sameOrigin } from '@/lib/dual-chart-auth';
import { computeGhostAsuraDisplay, normalizeAsuraInput } from '@/lib/server/ghost-asura-display';
import type { AsuraDisplay } from '@/lib/ghost-asura-display-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 200;
const cacheState = globalThis as typeof globalThis & {
  ghostAsuraReadingCache?: Map<string, { at: number; data: AsuraDisplay }>;
};

function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function clientIP(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function readCache(key: string) {
  const cache = (cacheState.ghostAsuraReadingCache ??= new Map());
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function writeCache(key: string, data: AsuraDisplay) {
  const cache = (cacheState.ghostAsuraReadingCache ??= new Map());
  cache.set(key, { at: Date.now(), data });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: '請從本站開啟。' }, 403);

  const text = await request.text().catch(() => '');
  if (text.length === 0) return reply({ error: '請先填寫生辰。' }, 400);
  if (text.length > 2048) return reply({ error: '輸入內容過長。' }, 400);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reply({ error: '請求格式不正確。' }, 400);
  }

  const input = normalizeAsuraInput(raw);
  if (typeof input.birthDate !== 'string' || input.birthDate === '') {
    return reply({ error: '缺少出生日期。' }, 400);
  }

  // 同 IP、同一份生辰：短期內直接回原結果，不扣速率額度。
  const cacheKey = createHash('sha256').update(`${clientIP(request)}|${JSON.stringify(input)}`).digest('hex');
  const cached = readCache(cacheKey);
  if (cached) return reply({ data: cached }, 200, { 'X-Asura-Cache': 'hit' });

  const limit = checkAPIRateLimit(request);
  const limitHeaders = {
    'X-RateLimit-Remaining': String(limit.remaining),
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + limit.resetSeconds),
  };
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.resetSeconds / 60));
    return reply(
      { error: `戰局開得太密。刀先歇著，約 ${minutes} 分鐘後再來。` },
      429,
      { ...limitHeaders, 'Retry-After': String(limit.resetSeconds) }
    );
  }

  try {
    const data = computeGhostAsuraDisplay(input);
    writeCache(cacheKey, data);
    return reply({ data }, 200, limitHeaders);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : '出生資料無法排盤。' }, 400, limitHeaders);
  }
}
