import { NextResponse } from 'next/server';
import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';
import { getVerifiedZiweiChart } from '@/lib/ziwei-chart-store';
import { buildPalaceContext, ZIWEI_TEACHER_PALACE_ORDER } from '@/lib/ziwei-teacher/palace-context';
import { runEntertainmentTeacher } from '@/lib/ziwei-teacher/entertainment';
import type { EntertainmentTeacherId } from '@/lib/ziwei-teacher/entertainment-types';
import type { PalaceId } from '@/lib/ziwei-teacher/types';

/**
 * 紫微娛樂老師 API（恐怖／鬼魅）
 * POST /api/ziwei/:analysisId/entertainment-analysis
 * Body: { palaceId, teacherId }
 *
 * 跟 /api/ziwei/:analysisId/teacher-analysis（專業三老師）是完全獨立的路由與快取，
 * 不共用、不混合。一樣不吃前端丟來的命盤，只用 analysisId 從 chart store 查回已驗證命盤。
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROMPT_VERSION = 'entertainment-v1';

type RouteContext = { params: Promise<{ analysisId: string }> };

const VALID_PALACE_IDS: readonly PalaceId[] = ZIWEI_TEACHER_PALACE_ORDER;
const VALID_TEACHER_IDS: readonly EntertainmentTeacherId[] = ['HORROR', 'GHOST'];

type EntertainmentCacheEntry = { result: unknown; timestamp: number };
const entertainmentCache = ((globalThis as typeof globalThis & { __ziweiEntertainmentCache?: Map<string, EntertainmentCacheEntry> }).__ziweiEntertainmentCache ??= new Map());
const CACHE_DURATION_MS = 30 * 60 * 1000;

export async function POST(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { analysisId } = await context.params;

  let body: { palaceId?: string; teacherId?: string };
  try {
    body = await request.json();
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '請求格式有誤。', 400);
  }

  const palaceId = body.palaceId as PalaceId;
  const teacherId = body.teacherId as EntertainmentTeacherId;

  if (!VALID_PALACE_IDS.includes(palaceId)) {
    return friendlyErrorResponse(requestId, 'INVALID_PALACE_ID', '宮位參數不正確。', 400);
  }
  if (!VALID_TEACHER_IDS.includes(teacherId)) {
    return friendlyErrorResponse(requestId, 'INVALID_TEACHER_ID', '老師參數不正確。', 400);
  }

  const chart = getVerifiedZiweiChart(analysisId);
  if (!chart) {
    return friendlyErrorResponse(requestId, 'CHART_NOT_FOUND', '找不到已驗證的命盤，請重新完成一次紫微分析。', 404);
  }

  const cacheKey = hashedCacheKey([analysisId, palaceId, teacherId, chart.engineVersion, PROMPT_VERSION]);
  const cached = entertainmentCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json({ ok: true, requestId, cached: true, data: cached.result }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const palaceContext = buildPalaceContext(chart, palaceId, analysisId);
    const result = await runEntertainmentTeacher(teacherId, palaceContext);
    entertainmentCache.set(cacheKey, { result, timestamp: Date.now() });
    return NextResponse.json({ ok: true, requestId, cached: false, data: result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('ZIWEI_ENTERTAINMENT_ANALYSIS_FAILED', { analysisId, palaceId, teacherId, error });
    const message = error instanceof Error ? error.message : '老師故事生成失敗，請稍後再試。';
    return friendlyErrorResponse(requestId, 'ENTERTAINMENT_ANALYSIS_FAILED', message, 502);
  }
}
