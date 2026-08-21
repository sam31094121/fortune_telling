import { NextResponse } from 'next/server';
import { createRequestId, friendlyErrorResponse, hashedCacheKey } from '@/lib/api-stability';
import { resolveVerifiedZiweiChart } from '@/lib/ziwei-chart-store';
import { buildPalaceContext, ZIWEI_TEACHER_PALACE_ORDER } from '@/lib/ziwei-teacher/palace-context';
import { runTeacher } from '@/lib/ziwei-teacher/teachers';
import type { PalaceId, TeacherId } from '@/lib/ziwei-teacher/types';
import type { ZiweiBirthInput } from '@/lib/ziwei/engine';

/**
 * 紫微三老師 API（規格「十七」）
 * POST /api/ziwei/:analysisId/teacher-analysis
 * Body: { palaceId, teacherId }
 *
 * 前端不丟命盤——後端自己用 analysisId 從 ziwei-chart-store 查回已驗證的正式命盤。
 * 查不到就是查不到，不會補一份假的出來讓老師解讀。
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROMPT_VERSION = 'teacher-v13-palace-topic-game-intro';

type RouteContext = { params: Promise<{ analysisId: string }> };

const VALID_PALACE_IDS: readonly PalaceId[] = ZIWEI_TEACHER_PALACE_ORDER;
const VALID_TEACHER_IDS: readonly TeacherId[] = ['STRUCTURE_MASTER', 'LIFE_MASTER', 'NARRATIVE_MASTER'];

type TeacherCacheEntry = { result: unknown; timestamp: number };
const teacherCache = ((globalThis as typeof globalThis & { __ziweiTeacherCache?: Map<string, TeacherCacheEntry> }).__ziweiTeacherCache ??= new Map());
const CACHE_DURATION_MS = 30 * 60 * 1000; // 老師輸出比較「貴」，快取久一點，避免同一宮位同一老師重複燒 token

export async function POST(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { analysisId } = await context.params;

  let body: { palaceId?: string; teacherId?: string; birthInput?: ZiweiBirthInput; timeSeed?: { birthDate?: string; annualYear?: number; annualTheme?: string; annualLevel?: string } };
  try {
    body = await request.json();
  } catch {
    return friendlyErrorResponse(requestId, 'INVALID_JSON', '請求格式有誤。', 400);
  }

  const palaceId = body.palaceId as PalaceId;
  const teacherId = body.teacherId as TeacherId;

  if (!VALID_PALACE_IDS.includes(palaceId)) {
    return friendlyErrorResponse(requestId, 'INVALID_PALACE_ID', '宮位參數不正確。', 400);
  }
  if (!VALID_TEACHER_IDS.includes(teacherId)) {
    return friendlyErrorResponse(requestId, 'INVALID_TEACHER_ID', '老師參數不正確。', 400);
  }

  // Vercel serverless 執行個體不共用記憶體：查不到已存的命盤時，若前端附上原始
  // birthInput（出生年月日時辰性別），用同一顆決定性引擎當場重算，不是補假資料。
  const record = resolveVerifiedZiweiChart(analysisId, body.birthInput, body.timeSeed ?? {});
  if (!record) {
    // 規格「十三」的 Gate 精神：查不到已驗證命盤，老師不解讀
    return friendlyErrorResponse(requestId, 'CHART_NOT_FOUND', '找不到已驗證的命盤，請重新完成一次紫微分析。', 404);
  }

  const chart = record.chart;
  const nowBucket = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).format(new Date());
  const cacheKey = hashedCacheKey([analysisId, palaceId, teacherId, chart.engineVersion, PROMPT_VERSION, nowBucket]);
  const cached = teacherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json({ ok: true, requestId, cached: true, data: cached.result }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const context = buildPalaceContext(chart, palaceId, analysisId, record.timeSeed);
    const result = await runTeacher(teacherId, context);
    teacherCache.set(cacheKey, { result, timestamp: Date.now() });
    return NextResponse.json({ ok: true, requestId, cached: false, data: result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('ZIWEI_TEACHER_ANALYSIS_FAILED', { analysisId, palaceId, teacherId, error });
    const message = error instanceof Error ? error.message : '老師解讀失敗，請稍後再試。';
    return friendlyErrorResponse(requestId, 'TEACHER_ANALYSIS_FAILED', message, 502);
  }
}
